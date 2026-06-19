# Money App

A personal finance dashboard built with Expo (React Native) that works on iOS, Android, and web.

## Features

- **Dashboard** — monthly snapshot with net savings, income split, spending by payment method, and savings history chart
- **Expenses** — view, add, edit, and delete expenses; filter by payment method (card, e-wallet, cash, bank transfer)
- **Invest & Goals** — track savings goals with progress bars and projected completion time; add, edit, and delete goals with a custom icon picker
- **Profile** — manage income streams (salary + side hustles); view independence goal tracker; reset all data to demo defaults

All data is stored on-device with AsyncStorage and persists across sessions.

## Tech Stack

- [Expo](https://expo.dev) SDK 56
- [expo-router](https://expo.github.io/router) for file-based navigation
- React Native + React Native Web
- `@react-native-async-storage/async-storage` for persistence
- React Context for global state
- Plus Jakarta Sans via `@expo-google-fonts`

## Getting Started

```bash
npm install
npx expo start
```

Press `w` to open in the browser, or scan the QR code with Expo Go on your phone.

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run web` | Start and open in browser |
| `npm run android` | Open on Android emulator/device |
| `npm run ios` | Open on iOS simulator/device |
