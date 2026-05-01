#!/usr/bin/env python3
"""
auto_review.py — Auto-fill a Google Business Review form using Selenium.

Requirements:
    pip install selenium webdriver-manager flask flask-cors

Usage (standalone):
    python auto_review.py --url "GOOGLE_REVIEW_URL" --text "Your review" --stars 5

Usage (as a local API server the web app can call):
    python auto_review.py --server
    # Starts a local Flask server on http://localhost:5175
    # The web app POSTs to http://localhost:5175/fill-review
"""

import argparse
import platform
import sys
import time
from pathlib import Path

from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException, TimeoutException, WebDriverException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

try:
    from webdriver_manager.chrome import ChromeDriverManager
    USE_MANAGER = True
except ImportError:
    USE_MANAGER = False


# ── Chrome profile helpers ─────────────────────────────────────────────────────

def default_chrome_profile_dir() -> str:
    """Return the Chrome user-data-dir for the current OS."""
    home = Path.home()
    system = platform.system()
    if system == "Darwin":
        return str(home / "Library" / "Application Support" / "Google" / "Chrome")
    if system == "Windows":
        return str(home / "AppData" / "Local" / "Google" / "Chrome" / "User Data")
    return str(home / ".config" / "google-chrome")


def build_chrome_options(use_existing_profile: bool = True) -> Options:
    opts = Options()

    if use_existing_profile:
        profile = default_chrome_profile_dir()
        opts.add_argument(f"--user-data-dir={profile}")
        opts.add_argument("--profile-directory=Default")
        print(f"[chrome] Using profile: {profile}")

    # Reduce Selenium bot-detection fingerprints
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_argument("--start-maximized")
    return opts


def make_driver(use_existing_profile: bool = True) -> webdriver.Chrome:
    opts = build_chrome_options(use_existing_profile)
    try:
        if USE_MANAGER:
            service = Service(ChromeDriverManager().install())
            return webdriver.Chrome(service=service, options=opts)
        return webdriver.Chrome(options=opts)
    except WebDriverException as exc:
        print(
            "\n[ERROR] Could not start Chrome.\n"
            "Make sure ChromeDriver is installed and matches your Chrome version.\n"
            "Install it automatically with:  pip install webdriver-manager\n"
            f"Detail: {exc}"
        )
        sys.exit(1)


# ── Star-rating selector ───────────────────────────────────────────────────────

# Google's review dialog DOM varies by surface (Maps, Search, etc.).
# We try several XPath strategies until one works.
def _star_xpaths(rating: int) -> list[str]:
    return [
        f"(//div[@data-rating='{rating}'])[1]",
        f"(//span[@aria-label='{rating} star'])[1]",
        f"(//span[@aria-label='{rating} stars'])[1]",
        f"(//div[@role='radiogroup']//div[@role='radio'])[{rating}]",
        f"(//g-radio-button)[{rating}]",
        f"(//div[contains(@class,'star')][@data-value='{rating}'])[1]",
        f"(//span[@data-value='{rating}'])[1]",
    ]


def select_stars(wait: WebDriverWait, rating: int) -> bool:
    for xpath in _star_xpaths(rating):
        try:
            el = wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))
            el.click()
            time.sleep(0.4)
            print(f"[stars] ✓ Selected {rating} star(s)")
            return True
        except (TimeoutException, NoSuchElementException):
            continue
    print(f"[stars] ✗ Could not select {rating} star(s) — please tap manually")
    return False


# ── Review-text filler ─────────────────────────────────────────────────────────

def _textarea_xpaths() -> list[str]:
    return [
        "//textarea[contains(@aria-label, 'Share details')]",
        "//textarea[contains(@aria-label, 'review')]",
        "//textarea[contains(@aria-label, 'Review')]",
        "//textarea[contains(@aria-label, 'Write')]",
        "//textarea[@jsname]",
        "//div[@contenteditable='true' and contains(@aria-label, 'review')]",
        "//div[@contenteditable='true' and contains(@aria-label, 'Review')]",
    ]


def fill_review_text(driver: webdriver.Chrome, wait: WebDriverWait, text: str) -> bool:
    for xpath in _textarea_xpaths():
        try:
            box = wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))
            box.click()
            time.sleep(0.3)
            box.clear()
            box.send_keys(text)
            # Verify the text actually appeared
            time.sleep(0.3)
            value = box.get_attribute("value") or driver.execute_script(
                "return arguments[0].innerText;", box
            )
            if text[:40] in (value or ""):
                print(f"[text]  ✓ Filled {len(text)} chars")
                return True
        except (TimeoutException, NoSuchElementException):
            continue

    # Last resort: JS injection into focused element
    try:
        driver.execute_script(
            "document.activeElement.value = arguments[0];", text
        )
        print("[text]  ✓ Filled via JS injection")
        return True
    except Exception:
        pass

    print("[text]  ✗ Could not find review textarea — please paste manually")
    return False


# ── Optional auto-submit ───────────────────────────────────────────────────────

def click_post(wait: WebDriverWait) -> bool:
    xpaths = [
        "//button[normalize-space()='Post']",
        "//button[contains(., 'Post')]",
        "//button[@aria-label='Post review']",
        "//button[contains(@class,'submit') and @type='submit']",
    ]
    for xpath in xpaths:
        try:
            btn = wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))
            btn.click()
            print("[submit] ✓ Clicked Post")
            return True
        except (TimeoutException, NoSuchElementException):
            continue
    print("[submit] ✗ Could not find Post button — click it manually")
    return False


# ── Main automation function ───────────────────────────────────────────────────

def auto_fill_review(
    url: str,
    text: str,
    stars: int = 5,
    use_existing_profile: bool = True,
    auto_submit: bool = False,
) -> dict:
    """
    Open Chrome, navigate to the Google review URL, select stars, fill text.
    Returns {"ok": bool, "message": str}.
    """
    driver = make_driver(use_existing_profile)
    wait = WebDriverWait(driver, 15)
    result = {"ok": False, "message": ""}

    try:
        print(f"\n[nav]   Opening {url}")
        driver.get(url)
        time.sleep(2)  # let page settle and any modals appear

        print(f"\n[stars] Selecting {stars} stars…")
        star_ok = select_stars(wait, stars)

        time.sleep(0.5)

        print("\n[text]  Filling review…")
        text_ok = fill_review_text(driver, wait, text)

        if auto_submit and text_ok:
            time.sleep(0.5)
            print("\n[submit] Submitting…")
            click_post(wait)
            time.sleep(1)
            result = {"ok": True, "message": "Review submitted automatically"}
        elif text_ok:
            result = {"ok": True, "message": "Review filled — please click Post to submit"}
            print("\n✅  Review is filled in. Click Post in the browser to submit.")
            input("   Press Enter here when done to close the browser…\n")
        else:
            result = {"ok": False, "message": "Could not fill review text"}

    except Exception as exc:
        result = {"ok": False, "message": str(exc)}
        print(f"\n[ERROR] {exc}")
        if not auto_submit:
            input("Press Enter to close the browser…")
    finally:
        driver.quit()

    return result


# ── Local Flask server (called by the web app) ─────────────────────────────────

def run_server(port: int = 5175) -> None:
    """
    Start a local API server so the Next.js app can trigger automation.

    The web app sends:
        POST http://localhost:5175/fill-review
        { "url": "...", "text": "...", "stars": 5, "autoSubmit": false }
    """
    try:
        from flask import Flask, jsonify, request
        from flask_cors import CORS
    except ImportError:
        print(
            "[ERROR] Flask not installed.\n"
            "Install with:  pip install flask flask-cors"
        )
        sys.exit(1)

    app = Flask(__name__)
    CORS(app, origins=["http://localhost:3000", "http://localhost:3001"])

    @app.route("/fill-review", methods=["POST"])
    def fill_review_endpoint():
        data = request.get_json(force=True) or {}
        url  = data.get("url", "").strip()
        text = data.get("text", "").strip()
        stars = int(data.get("stars", 5))
        auto_submit = bool(data.get("autoSubmit", False))

        if not url or not text:
            return jsonify({"ok": False, "message": "url and text are required"}), 400

        result = auto_fill_review(url, text, stars=stars, auto_submit=auto_submit)
        return jsonify(result)

    @app.route("/ping")
    def ping():
        return jsonify({"ok": True})

    print(f"\n🤖  Auto-review server running on http://localhost:{port}")
    print("   The ReviewGenius web app will call this automatically.")
    print("   Keep this terminal open while using the review page.\n")
    app.run(host="127.0.0.1", port=port, debug=False)


# ── CLI entry point ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Auto-fill a Google Business review via Selenium"
    )
    parser.add_argument("--url",        help="Google review URL")
    parser.add_argument("--text",       help="Review text to submit")
    parser.add_argument("--stars",      type=int, default=5, choices=[1, 2, 3, 4, 5])
    parser.add_argument("--submit",     action="store_true", help="Auto-click the Post button")
    parser.add_argument("--no-profile", action="store_true", help="Fresh browser (no existing login)")
    parser.add_argument("--server",     action="store_true", help="Run as a local API server")
    parser.add_argument("--port",       type=int, default=5175)
    args = parser.parse_args()

    if args.server:
        run_server(port=args.port)
    elif args.url and args.text:
        auto_fill_review(
            url=args.url,
            text=args.text,
            stars=args.stars,
            use_existing_profile=not args.no_profile,
            auto_submit=args.submit,
        )
    else:
        parser.print_help()
        print("\nExamples:")
        print('  python auto_review.py --url "https://..." --text "Great place!" --stars 5')
        print("  python auto_review.py --server   # run as API server for the web app")
