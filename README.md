# DualMode PWA Toolkit & Android Hardware Harness (v2.0)

A production-grade architecture and library for writing Progressive Web Apps that adapt seamlessly between constrained sandbox/iframe runtimes and native HTTPS mobile environments (specifically targeting Android Chrome and WebXR).

## What is New in v2.0

* Android Chrome Hardware Harness:
  * Haptics and Vibration: Multi-pulse alarm patterns with visual viewport shake and audio fallbacks.
  * Battery Status API: Live charge/discharge telemetry with simulated overnight battery-drain sliders.
  * Compass and Gyroscope: 360-degree heading indicator and pitch/roll detection with virtual heading controls.
  * Web Bluetooth: Connects to marine NMEA depth sounders or BLE beacons; includes a virtual beacon discovery shim.
  * Screen Wake Lock: Prevents display sleep during active anchor watches.
  * Web Share API: Launches native Android share sheets to broadcast coordinates or QR watcher links.
  * App Badging: Shows live breach counters on Android launchers and browser tabs.
  * Network Information: Telemetry for 4G/WiFi downlinks, RTT, and data-saver modes.
* 3D WebXR Sea-Surface Overlay:
  * Interactive Three.js 3D viewport rendering sea-surface grid, floating anchor buoy, catenary chain, and perimeter breach cylinders.
  * WebXR session probing and hit-testing fallback for devices without native AR/VR hardware.
* Persistent Storage Vault & Schema Migrations:
  * IndexedDB schema versioning (v1 to v2) with zero data loss.
  * Binary audio WAV blob generation and playback directly from client storage.
* In-Browser ZIP Packager:
  * One-click compilation of all production files ready for deployment to any web server.

## Repository Structure

dualmode-pwa-toolkit/
├── index.html                      # GitHub Pages portal
├── package.json                    # Package manifest & metadata
├── LICENSE                         # MIT License
├── README.md                       # Documentation & API reference
├── src/                            # Modular ES6 Library Source
│   ├── index.js                    # Main library entry point
│   ├── env/
│   │   └── env-probe.js            # Environment detection & capability audit
│   ├── hal/
│   │   ├── index.js                # Hardware Abstraction Layer router
│   │   ├── android-hardware.js     # Android vibration, battery, compass, BLE, badging
│   │   ├── geo-shim.js             # Virtual GPS, drift simulator & key navigation
│   │   ├── audio-shim.js           # Web Audio alert synthesizer & WAV encoder
│   │   ├── notification-shim.js    # Floating toast notifications
│   │   └── wakelock-shim.js        # Screen Wake Lock mock sentinel
│   ├── storage/
│   │   └── storage-vault.js        # IndexedDB migrations & binary audio blob store
│   ├── sw/
│   │   ├── sw-manager.js           # Service Worker registration & auto-update lifecycle
│   │   └── sw-template.js          # Self-updating Service Worker source
│   ├── xr/
│   │   └── xr-shim.js              # WebXR session probe & spatial anchor polyfill
│   └── packager/
│       └── pwa-bundler.js          # In-browser ZIP compiler
└── examples/
    ├── demo-app/                   # Full v4 Interactive Test Harness (Cockpit & 3D Viewport)
    └── production-pwa/             # Unpacked Standalone Production Deployment

## Live Demo & GitHub Pages URLs

Once pushed to GitHub with Pages enabled on main branch:
* Portal Hub: https://<your-username>.github.io/<repo-name>/
* Interactive Test Harness (v4): https://<your-username>.github.io/<repo-name>/examples/demo-app/
* Production PWA: https://<your-username>.github.io/<repo-name>/examples/production-pwa/

## How to Update Your GitHub Repository

1. Extract the downloaded dualmode-pwa-toolkit-v2.zip into your local git repository folder.
2. In your terminal:
   git add .
   git commit -m "Update toolkit to v2.0 with Android hardware harness and WebXR overlay"
   git push origin main
3. In your GitHub repository settings under Pages, ensure Source is set to Deploy from a branch: main / (root).

License: MIT
