import logging
import logging.handlers
import sys
from pathlib import Path

_COLORS = {
    "DEBUG": "\033[36m",
    "INFO": "\033[32m",
    "WARNING": "\033[33m",
    "ERROR": "\033[31m",
    "CRITICAL": "\033[35m",
    "RESET": "\033[0m",
}


class _ColorFormatter(logging.Formatter):
    def format(self, record):
        color = _COLORS.get(record.levelname, "")
        reset = _COLORS["RESET"]
        record.levelname = f"{color}{record.levelname}{reset}"
        return super().format(record)


def get_logger(
    name: str,
    level: int = logging.DEBUG,
    log_file: str | None = None,
    max_bytes: int = 5 * 1024 * 1024,
    backup_count: int = 3,
) -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    logger.setLevel(level)

    console = logging.StreamHandler(sys.stdout)
    console.setLevel(level)
    console.setFormatter(
        _ColorFormatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    )
    logger.addHandler(console)

    if log_file:
        Path(log_file).parent.mkdir(parents=True, exist_ok=True)
        rotating = logging.handlers.RotatingFileHandler(
            log_file, maxBytes=max_bytes, backupCount=backup_count, encoding="utf-8"
        )
        rotating.setLevel(level)
        rotating.setFormatter(
            logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
        )
        logger.addHandler(rotating)

    return logger
