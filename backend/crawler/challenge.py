import atexit
import logging
import os
import random
import threading
import time
from urllib.parse import urlencode

from playwright.sync_api import Playwright, Page, sync_playwright

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_playwright: Playwright | None = None
_page: Page | None = None
_request_count = 0

# Renova a sessão preventivamente a cada N requests para evitar que o WAF bloqueie
_MAX_REQUESTS_PER_SESSION = 5

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
    global _playwright, _page, _request_count
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
    _page.wait_for_function(
        "() => document.body.innerText.trim().length > 50",
        timeout=30_000,
    )
    title = _page.title()
    url = _page.url
    cookies = context.cookies()
    ts_cookies = [c["name"] for c in cookies if c["name"].startswith("TS")]
    logger.info("PNCP pronto (title=%r, url=%s, ts_cookies=%s)", title, url, ts_cookies)
    _request_count = 0
    atexit.register(_cleanup)


def _refresh_session() -> None:
    """Navega de volta à home do PNCP para renovar cookies TS sem reiniciar o browser."""
    global _page, _request_count
    if _page is None:
        return
    try:
        logger.info("Renovando cookies PNCP (sessão %d requests)...", _request_count)
        _page.goto(_PNCP_HOME, wait_until="domcontentloaded", timeout=30_000)
        _page.wait_for_function(
            "() => document.body.innerText.trim().length > 50",
            timeout=15_000,
        )
        _request_count = 0
        logger.info("Sessão renovada.")
    except Exception as exc:
        logger.warning("Falha ao renovar sessão: %s — reiniciando browser...", exc)
        _full_reset()


def _full_reset() -> None:
    """Fecha tudo e força reinicialização completa do browser."""
    global _page, _request_count
    _cleanup()
    _page = None
    _request_count = 0


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
    global _request_count

    for attempt in range(3):
        with _lock:
            # Refresh preventivo antes que o WAF detecte
            if _page is not None and _request_count >= _MAX_REQUESTS_PER_SESSION:
                _refresh_session()
                time.sleep(random.uniform(3.0, 6.0))
            _init()
            page = _page

        url = f"/api/consulta{path}?{urlencode(params)}"

        try:
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

            with _lock:
                _request_count += 1
            # Jitter entre requests para imitar comportamento humano
            time.sleep(random.uniform(2.0, 4.5))
            return result

        except Exception as exc:
            msg = str(exc)
            is_waf = "WAF bloqueou" in msg
            if is_waf and attempt < 2:
                wait = random.uniform(15.0, 30.0) * (attempt + 1)
                logger.warning(
                    "WAF detectado (tentativa %d/3) — aguardando %.0fs e fazendo refresh...",
                    attempt + 1,
                    wait,
                )
                time.sleep(wait)
                with _lock:
                    _refresh_session()
                continue
            raise
