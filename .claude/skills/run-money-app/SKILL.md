---
name: run-money-app
description: Run, start, screenshot, verify, or test the money-app — Expo React Native personal finance dashboard (web target driven by Playwright)
---

# run-money-app

Money App is a personal finance dashboard (Expo SDK 56, React Native Web) with five tabs: Home, Expenses, Invest, Coach, and Profile. The web target runs at `http://localhost:8081` served by the Expo Metro bundler. The driver at `.claude/skills/run-money-app/driver.mjs` uses Playwright (already in `devDependencies`) to launch a headless Chromium browser, visit all tabs, take screenshots, and report JS errors.

## Prerequisites

- Node 18+ (tested on v24)
- Playwright browser binaries — install once:
  ```
  npx playwright install chromium
  ```
  (Playwright itself is already in `devDependencies`.)

## Start the dev server

```bash
cd money-app2
npx expo start
```

The Metro bundler starts and listens on port 8081. The first HTTP request triggers bundling and can take up to **30 seconds** — this is normal. Subsequent requests are fast (hot cache). The server stays running until you Ctrl-C it.

> **Windows background start:** open a second terminal and run `npx expo start` there, or use `Start-Process -NoNewWindow -FilePath npx -ArgumentList "expo","start"` in PowerShell to keep it in the background.

## Run (agent path) — smoke driver

From the `money-app2` directory, with the dev server already running:

```bash
node .claude/skills/run-money-app/driver.mjs [outDir]
```

- `outDir` defaults to `C:/Users/user/AppData/Local/Temp/money-app-ss`
- Visits all 5 tabs, takes screenshots `01-home.png` through `05-profile.png`
- Reports JS errors; exits 1 if any were detected

Example run:

```
Loading app (first load may take up to 30s)...
Language picker shown — selecting English...
App loaded.

[Home]
  screenshot -> C:\...\01-home.png
  Has greeting: true
  Has "LEFT OVER": true
  Has "Savings history": true
...
JS errors: none
```

## Run (human path)

```bash
cd money-app2
npm run web      # starts Metro and opens http://localhost:8081 in the default browser
```

Press Ctrl-C to stop.

## Feature-specific verify scripts

The root of `money-app2` contains focused Playwright scripts for specific flows:

| Script | What it tests |
|---|---|
| `verify_coach.mjs` | 3-question coach onboarding flow |
| `verify_coach2.mjs` | Coach + AI plan API response |
| `verify_coach3.mjs` | (same pattern, extended) |
| `verify_reset.mjs` | "Reset to demo data" on Profile tab |
| `verify-i18n.mjs` | Language switching (EN → BM → ZH → EN) |

All target `http://localhost:8081` — requires the dev server to be running.

## Gotchas

- **First load times out at 30s**: the `waitUntil: 'networkidle'` call in Playwright uses a 35s timeout. If Metro is still cold, the page will hang. Wait until you see `packager-status:running` at `http://localhost:8081/status` before running the driver.
- **Language picker on first load**: when AsyncStorage has no stored language preference (fresh install or after a data reset), the app shows a "Choose language" screen instead of the dashboard. The driver detects this and clicks "English" automatically. Feature verify scripts may need the same handling.
- **`document.body.textContent` is unreliable**: React Native Web renders text in leaf DOM nodes. Use `document.body.innerText` for full-page text checks, or scan with `[...document.querySelectorAll('*')].find(el => el.childNodes.length === 1 && el.childNodes[0].nodeType === 3 && el.textContent.trim() === 'target')` for exact element matching.
- **Clicking by text**: use mouse coordinates obtained via `getBoundingClientRect()` + `page.mouse.click()` rather than `element.click()` — React Native Web gesture handlers fire on pointer events, not synthetic click events on the element itself.
- **AsyncStorage = localStorage in web**: data stored by the app lives in `localStorage` under the key `money-hub-data`. Use `page.evaluate(() => localStorage.getItem('money-hub-data'))` to inspect or seed state without going through the UI.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `TimeoutError: waitUntil networkidle exceeded 30000ms` | The Metro server is cold — wait for it to finish its first bundle before running the driver |
| `Error: browserType.launch: Executable doesn't exist` | Run `npx playwright install chromium` |
| All tab-content checks return `false` | Use `document.body.innerText`, not `document.body.textContent` |
| Language picker showing unexpectedly | Means AsyncStorage was cleared (e.g. by `verify_reset.mjs`); driver handles it, but stand-alone scripts need to click "English" first |
