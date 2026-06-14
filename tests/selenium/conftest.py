from __future__ import annotations

import os
from pathlib import Path

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options


def _load_dotenv() -> None:
    # Populate os.environ from a sibling .env (plain KEY=value). Real shell
    # exports take precedence, so we never overwrite an already-set var.
    env_path = Path(__file__).parent / ".env"
    if not env_path.is_file():
        return
    for raw in env_path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].lstrip()
        key, sep, value = line.partition("=")
        if not sep:
            continue
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_dotenv()


def _env_flag(name: str, default: str = "1") -> bool:
    return os.getenv(name, default).strip().lower() in ("1", "true", "yes", "on")


@pytest.fixture(scope="session")
def base_url() -> str:
    return os.getenv("BASE_URL", "http://localhost:3000").rstrip("/")


@pytest.fixture(scope="session")
def test_email() -> str:
    email = os.getenv("TEST_EMAIL")
    if not email:
        pytest.skip("TEST_EMAIL not set — see tests/selenium/README.md")
    return email


@pytest.fixture(scope="session")
def test_password() -> str | None:
    # Optional: only needed if the Clerk instance uses password as first factor.
    return os.getenv("TEST_PASSWORD")


@pytest.fixture()
def driver():
    # Selenium Manager (built into selenium >=4.6) resolves chromedriver
    # automatically — no manual driver install required.
    options = Options()
    if _env_flag("HEADLESS"):
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1280,900")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    drv = webdriver.Chrome(options=options)
    drv.set_page_load_timeout(30)
    yield drv
    drv.quit()


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    # On a failed test, drop a screenshot + final URL next to the tests so the
    # stall point (e.g. a Clerk error banner) is visible without re-running.
    outcome = yield
    report = outcome.get_result()
    if report.when != "call" or not report.failed:
        return
    drv = item.funcargs.get("driver")
    if drv is None:
        return
    try:
        shot = Path(__file__).parent / "failure.png"
        drv.save_screenshot(str(shot))
        print(f"\n[selenium] failure screenshot: {shot}")
        print(f"[selenium] final URL: {drv.current_url}")
    except Exception:
        pass
