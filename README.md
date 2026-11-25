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

Node 22 or later: `npm test`. Tests cover challenge integrity, selection, answer shuffling, scoring, hints and incomplete runs. Browser end-to-end tests are not included.

## Deploy

Enable GitHub Pages in Settings > Pages, choose Deploy from a branch, main and / (root). Alternatively deploy as a static site on any host. No build command or backend is needed.

## Security and limitations

Snippets are illustrative, not production implementations. Example secrets are fictional. All snippet rendering uses textContent. Scores and answers reside client-side and are not suitable for high-stakes assessments. Browser history uses localStorage, not a server. The CSP disables network connections and inline scripts. Some deployment headers, such as frame-ancestors, must be configured at the hosting layer.

Reference: https://cwe.mitre.org/ and https://cheatsheetseries.owasp.org/.
