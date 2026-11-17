# DevTest // Anchor Watch NG — Production PWA Bundle

Generated in-browser by DevTest v4.0.0-android-spec.

## Included Files
- `index.html` — Production entry page with PWA manifest and SW registration
- `manifest.webmanifest` — Standalone Android PWA configuration & shortcuts
- `sw.js` — Offline-first Service Worker with `SKIP_WAITING` update handler
- `android-hal.js` — Unified Android Chrome HAL (Vibration, Wake Lock, Badging)
- `db.js` — Persistent storage vault with v1 -> v2 schema upgrade
- `xr-shim.js` — WebXR session probe & sea-surface overlay fallback
- `icon-192.svg` & `icon-512.svg` — High-contrast marine anchor icons

## Local & Android Testing
1. Unzip all files into a clean directory.
2. Serve over localhost or HTTPS (e.g. `npx serve -s .` or `python3 -m http.server 8080`).
3. Forward port 8080 to your Android device via `adb reverse tcp:8080 tcp:8080` and open `localhost:8080` in Android Chrome.