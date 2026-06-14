"""Minimal Selenium happy-path test for the AI Prediction feature.

Flow: open /predict (redirects to Clerk sign-in) -> sign in via Clerk test mode
-> land on /predict as a Patient (handling the /role-gate fallback) -> submit the
Symptoms form -> assert the prediction result card renders.

Assertion is intentionally tolerant of Gemini's non-deterministic output: it only
checks that the result card appears, not its contents.
"""

import time

from selenium.common.exceptions import (
    StaleElementReferenceException,
    TimeoutException,
    WebDriverException,
)
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

# Clerk test-mode one-time code. Works for any *+clerk_test* identifier when the
# instance is in development/test mode.
CLERK_TEST_OTP = "424242"

SHORT = 10  # seconds — UI interactions
AUTH = 12  # seconds — waiting for the post-sign-in redirect off /sign-in
NAV = 15  # seconds — in-app navigation (post-signin -> predict/role-gate)
LONG = 60  # seconds — the Gemini-backed prediction round-trip


def _wait(driver, timeout=SHORT):
    return WebDriverWait(driver, timeout)


def _send_keys_when_ready(driver, by, selector, value, timeout=SHORT):
    el = _wait(driver, timeout).until(EC.element_to_be_clickable((by, selector)))
    el.clear()
    el.send_keys(value)
    return el


def _click_clerk_continue(driver):
    # The Clerk prebuilt component submits the active step with a "Continue" button.
    btn = _wait(driver).until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(normalize-space(.), 'Continue')]")
        )
    )
    btn.click()


def _code_inputs(driver):
    # Clerk's verification-code field is a single <input> (autocomplete
    # one-time-code, inputmode numeric, empty name/class) overlaid on visual
    # segment <div>s. Match by those attributes — NOT by name='code'.
    found = []
    for el in driver.find_elements(By.CSS_SELECTOR, "input"):
        if not el.is_displayed():
            continue
        name = el.get_attribute("name") or ""
        cls = (el.get_attribute("class") or "").lower()
        autocomplete = el.get_attribute("autocomplete") or ""
        inputmode = el.get_attribute("inputmode") or ""
        if (
            name == "code"
            or "otp" in cls
            or autocomplete == "one-time-code"
            or inputmode in ("numeric", "tel")
        ):
            found.append(el)
    return found


def _enter_otp(driver, code):
    # `input-otp` may not be hydrated the instant factor-two renders, so a single
    # type can be dropped. Type, verify the value stuck, and retry if not. The
    # field auto-submits once full — do NOT click Continue here (by then it's a
    # disabled, loading button and the click gets intercepted).
    _wait(driver, SHORT).until(lambda d: _code_inputs(d))

    def _typed(d):
        inputs = _code_inputs(d)
        if not inputs:
            return False
        try:
            if len(inputs) >= len(code):  # segmented variant: one box per digit
                for box, ch in zip(inputs, code):
                    box.click()
                    box.send_keys(ch)
                got = "".join(b.get_attribute("value") or "" for b in inputs[: len(code)])
            else:  # single-input variant (current Clerk)
                box = inputs[0]
                box.click()
                existing = box.get_attribute("value") or ""
                if existing:
                    box.send_keys(Keys.BACKSPACE * len(existing))
                box.send_keys(code)
                got = box.get_attribute("value") or ""
        except (StaleElementReferenceException, WebDriverException):
            return False  # element re-rendered mid-type; the page may have moved on
        return got == code

    try:
        _wait(driver, SHORT).until(_typed)
    except (TimeoutException, StaleElementReferenceException):
        # If the code already submitted (page navigated away), that's success.
        if "/sign-in" not in driver.current_url:
            return
        raise
    time.sleep(0.3)  # let the auto-submit fire


def _wait_for_second_factor(driver, timeout=SHORT):
    # Return "code" or "password" as soon as that input appears — whichever
    # comes first — so a password instance isn't penalised by an OTP wait.
    def _either(d):
        if _code_inputs(d):
            return "code"
        if d.find_elements(By.CSS_SELECTOR, "input[name='password']"):
            return "password"
        return False

    try:
        return _wait(driver, timeout).until(_either)
    except TimeoutException:
        raise AssertionError(
            "After submitting the email, neither an OTP nor a password field "
            "appeared. Check the Clerk sign-in configuration / test user."
        )


def _present(driver, by, selector, timeout=SHORT):
    try:
        _wait(driver, timeout).until(EC.presence_of_element_located((by, selector)))
        return True
    except TimeoutException:
        return False


def _sign_in(driver, base_url, email, password):
    driver.get(f"{base_url}/predict")  # middleware bounces us to /sign-in

    # Step 1: identifier (email).
    _send_keys_when_ready(driver, By.CSS_SELECTOR, "input[name='identifier']", email)
    _click_clerk_continue(driver)

    # Step 2: second factor — Clerk shows either an OTP code field or a password
    # field depending on instance configuration. Wait for whichever appears
    # first (no per-strategy penalty), then handle it.
    kind = _wait_for_second_factor(driver)
    if kind == "code":
        _enter_otp(driver, CLERK_TEST_OTP)  # auto-submits when full
    else:  # "password"
        assert password, (
            "Clerk asked for a password but TEST_PASSWORD is not set — "
            "see tests/selenium/README.md"
        )
        _send_keys_when_ready(
            driver, By.CSS_SELECTOR, "input[name='password']", password
        )
        _click_clerk_continue(driver)

    _handle_optional_2fa(driver)

    # Fail fast and loud: a successful sign-in leaves /sign-in for /post-signin.
    # If it doesn't, surface the Clerk error instead of a silent later timeout.
    try:
        _wait(driver, AUTH).until_not(EC.url_contains("/sign-in"))
    except TimeoutException:
        raise AssertionError(
            "Sign-in did not complete — still on /sign-in. "
            f"kind={kind}; url={driver.current_url}; "
            f"clerk error={_clerk_error_text(driver) or '(none found)'}. "
            "If stuck on /factor-two, the test user's 2FA is an authenticator "
            "app (TOTP), which can't be automated — use a Clerk test phone 2FA "
            "(code 424242) or disable 2FA for the test user."
        )


def _handle_optional_2fa(driver):
    # After the first factor, a fresh browser triggers Clerk's "new device"
    # email-code verification at /sign-in/factor-two. The +clerk_test address
    # accepts the test code 424242; entering it auto-submits.
    def _next(d):
        if "/sign-in" not in d.current_url:
            return "done"
        if "factor-two" in d.current_url and _code_inputs(d):
            return "2fa"
        return False

    try:
        state = _wait(driver, AUTH).until(_next)
    except TimeoutException:
        return  # the caller's fail-fast check will report the stall
    if state == "2fa":
        _enter_otp(driver, CLERK_TEST_OTP)


def _clerk_error_text(driver):
    # Clerk's prebuilt component renders inline errors in a few shapes; return
    # the first non-empty match so failures are self-explanatory.
    selectors = (
        "[class*='cl-formFieldErrorText']",
        "[class*='cl-formFieldWarningText']",
        "[role='alert']",
        "[class*='Error']",
    )
    for sel in selectors:
        for el in driver.find_elements(By.CSS_SELECTOR, sel):
            text = el.text.strip()
            if text:
                return text
    return ""


def _reach_predict(driver, base_url):
    # post-signin dispatches to /predict (Patient) or, if the webhook hasn't
    # synced locally, /role-gate. Accept either, then resolve role-gate.
    _wait(driver, NAV).until(
        lambda d: any(p in d.current_url for p in ("/predict", "/role-gate"))
    )

    if "/role-gate" in driver.current_url:
        btn = _wait(driver).until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(normalize-space(.), 'Continue as Patient')]")
            )
        )
        btn.click()
        _wait(driver, NAV).until(EC.url_contains("/predict"))


def test_symptom_prediction_renders_result_card(
    driver, base_url, test_email, test_password
):
    _sign_in(driver, base_url, test_email, test_password)
    _reach_predict(driver, base_url)

    # Symptoms tab is the default. Fill the complaint and analyze.
    _send_keys_when_ready(
        driver,
        By.ID,
        "symptoms",
        "Persistent headache for 3 days with a mild fever and fatigue.",
        timeout=30,
    )
    analyze = _wait(driver).until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[normalize-space()='Analyze Symptoms']")
        )
    )
    analyze.click()

    # Wait for the Gemini-backed result card.
    _wait(driver, LONG).until(
        EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(), 'Prediction Result')]")
        )
    )
    assert _present(
        driver, By.XPATH, "//*[contains(text(), 'Possible Conditions')]", timeout=10
    ), "Result card rendered without a 'Possible Conditions' section."

    # Loading skeletons should be gone once the result is shown.
    assert not driver.find_elements(By.CSS_SELECTOR, ".skeleton"), (
        "Loading skeletons still present after the result rendered."
    )

    # Visual hold so the result card is observable before the browser quits
    # (handy when watching with HEADLESS=0); not a functional wait.
    time.sleep(5)
