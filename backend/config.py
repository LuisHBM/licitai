import os
import tomllib
from pathlib import Path

from dynaconf import Dynaconf

_root = Path(__file__).parent

if "ENV_FOR_DYNACONF" not in os.environ:
    for _f in ("settings.toml", "settings.local.toml"):
        _path = _root / _f
        if _path.exists():
            with open(_path, "rb") as _fp:
                _val = tomllib.load(_fp).get("ENV_FOR_DYNACONF")
            if _val:
                os.environ["ENV_FOR_DYNACONF"] = _val

settings = Dynaconf(
    envvar_prefix="LICITAI",
    root_path=_root,
    settings_files=["settings.toml", ".secrets.toml", ".secrets.local.toml"],
    environments=True,
    env_switcher="ENV_FOR_DYNACONF",
    default_env="development",
)
