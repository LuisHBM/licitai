import atexit
import logging
import os
import threading
from urllib.parse import urlencode

from playwright.sync_api import Playwright, Page, sync_playwright

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_playwright: Playwright | None = None
_page: Page | None = None

_PNCP_HOME = "https://pncp.gov.br/app/editais"

_STEALTH = """
Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3]});
Object.defineProperty(navigator, 'languages', {get: () => ['pt-BR', 'pt', 'en-US']});
window.chrome = {runtime: {}};
"""

_LAUNCH_ARGS = [
    "--disable-blink-features=AutomationControlled",
    "--no-sandbox",
    "--disable-dev-shm-usage",
]


def _init() -> None:
    global _playwright, _page
    if _page is not None:
        return
    logger.info("Iniciando browser e carregando PNCP...")
    _playwright = sync_playwright().start()
    headless = os.environ.get("BROWSER_HEADLESS", "true").lower() != "false"
    browser = _playwright.chromium.launch(channel="chrome", headless=headless, args=_LAUNCH_ARGS)
    context = browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        viewport={"width": 1280, "height": 800},
        locale="pt-BR",
    )
    context.add_init_script(_STEALTH)
    _page = context.new_page()
    _page.goto(_PNCP_HOME, wait_until="domcontentloaded", timeout=60_000)
    # aguarda o SPA montar — o React renderiza conteúdo no body
    _page.wait_for_function(
        "() => document.body.innerText.trim().length > 50",
        timeout=30_000,
    )
    title = _page.title()
    url = _page.url
    cookies = context.cookies()
    ts_cookies = [c["name"] for c in cookies if c["name"].startswith("TS")]
    logger.info("PNCP pronto (title=%r, url=%s, ts_cookies=%s)", title, url, ts_cookies)
    atexit.register(_cleanup)


def _cleanup() -> None:
    global _playwright, _page
    if _page:
        try:
            _page.close()
        except Exception:
            pass
        _page = None
    if _playwright:
        try:
            _playwright.stop()
        except Exception:
            pass
        _playwright = None


def fetch_json(path: str, params: dict, timeout: int = 90) -> dict:
    """Faz fetch() de dentro do browser autenticado no PNCP — bypassa WAF F5."""
    with _lock:
        _init()
        page = _page

    url = f"/api/consulta{path}?{urlencode(params)}"

    result = page.evaluate(
        """async ([url, timeoutMs]) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const resp = await fetch(url, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'pt-BR,pt;q=0.9',
                    }
                });
                clearTimeout(timer);
                const ct = resp.headers.get('content-type') || '';
                if (ct.includes('text/html')) throw new Error('WAF bloqueou: ' + resp.status);
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                return await resp.json();
            } catch (e) {
                clearTimeout(timer);
                throw e;
            }
        }""",
        [url, timeout * 1000],
    )
    return result
