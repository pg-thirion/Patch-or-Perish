# Patch or Perish

A dependency-free secure coding training game. Diagnose a fictional vulnerability, then select the safest patch. No displayed snippet is executed.

## Features

- 24 hand-authored challenges across eight vulnerability families and three difficulty levels.
- Two-stage code review, shuffled answer choices, optional hints, code with line numbers, explanations and CWE identifiers.
- Untimed practice and a three-minute incident response mode.
- Mission filtering, configurable challenge counts, partial credit, debriefs and local score history.
- Responsive keyboard-accessible interface. No accounts, external requests, tracking or API keys.

## Run

`python -m http.server 8000` from the repository root, then visit http://localhost:8000. ES modules require HTTP rather than opening the file directly.

## Test

Node 22 or later: `npm test`. Tests cover challenge integrity, selection, answer shuffling, scoring, hints and incomplete runs. The browser suite uses Chromium through its DevTools protocol, without npm dependencies. Run `npm run test:browser` with Chromium or Chrome installed (`CHROME_BIN` may specify the binary). GitHub Actions runs both suites on every push to main and pull request.

## Deploy

Import this repository into Vercel using the Other framework preset. The included vercel.json runs the unit tests and copies only the public assets into dist. Production deployments use main. GitHub Actions independently runs the Chromium regression suite.

## Security and limitations

Snippets are illustrative, not production implementations. Example secrets are fictional. All snippet rendering uses textContent. Scores and answers reside client-side and are not suitable for high-stakes assessments. Browser history uses localStorage, not a server. The CSP disables network connections and inline scripts. Vercel also sends CSP, frame restrictions, nosniff, referrer and permissions policy headers. No runtime functions are needed.

Reference: https://cwe.mitre.org/ and https://cheatsheetseries.owasp.org/.
