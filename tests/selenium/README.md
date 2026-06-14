# Selenium UI test — AI Prediction

A single happy-path Selenium test (Python + pytest) covering the AI Prediction
feature: sign in via Clerk test mode → reach `/predict` as a Patient → submit the
Symptoms form → assert the result card renders.

It deliberately asserts only that the result card appears (not its contents),
since the prediction comes from Gemini and is non-deterministic.

## Prerequisites

The test drives the real app, so the full stack must be running:

- Web on `:3000` — `pnpm dev:web`
- API on `:4000` — `pnpm dev:api` (needs Postgres up and a working `GEMINI` key;
  the result card only renders on a successful prediction)
- Chrome installed. The driver is resolved automatically by Selenium Manager
  (built into `selenium >= 4.6`) — no manual chromedriver install.

You also need a Clerk **test-mode** user that can act as a Patient. Easiest one-time
setup: sign up once in the browser with a `+clerk_test` email address (Clerk test
mode accepts the one-time code `424242`). Reuse that email as `TEST_EMAIL`.

## Configuration (env vars)

| Var             | Default                 | Notes                                                              |
| --------------- | ----------------------- | ------------------------------------------------------------------ |
| `TEST_EMAIL`    | _(required)_            | A Clerk test-mode email, e.g. `yourname+clerk_test@example.com`.   |
| `TEST_PASSWORD` | _(optional)_            | Only if your Clerk instance uses **password** as the first factor. |
| `BASE_URL`      | `http://localhost:3000` | Web app base URL.                                                  |
| `HEADLESS`      | `1`                     | Set `0` to watch the browser drive the flow.                       |

The test handles both Clerk first-factor strategies: if an OTP field appears it
enters `424242`; if a password field appears it uses `TEST_PASSWORD`.

Because each run uses a fresh browser profile, Clerk treats it as a new device and
shows a **"new device" email verification** step (`/sign-in/factor-two`). This is
expected — not a 2FA misconfiguration. The test auto-fills it with `424242` (valid
for any `+clerk_test` address; no real mailbox needed) and the field auto-submits.

## Run

```bash
cd tests/selenium
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export TEST_EMAIL="yourname+clerk_test@example.com"   # + TEST_PASSWORD if needed
HEADLESS=0 pytest -v          # watch it; omit HEADLESS to run headless
```

## Notes

- Once signed in via the browser, the prediction request's Bearer token is fetched
  automatically by the page (Clerk `useAuth().getToken()`), so no extra auth setup
  is needed in the test.
- Sanity check that it really exercises the prediction path: stop the API server and
  re-run — the test should fail waiting for the result card (the page shows an error
  instead).
- CI is out of scope (would need API + Postgres + Gemini + Chrome in the runner).
