from pathlib import Path

from dynaconf import Dynaconf

_root = Path(__file__).parent.parent

settings = Dynaconf(
    envvar_prefix="LICITAI",
    root_path=_root,
    settings_files=["backend/settings.toml", "backend/.secrets.toml", "backend/.secrets.local.toml"],
    environments=True,
    env_switcher="ENV_FOR_DYNACONF",
    default_env="development",
)
