/**
 * DualMode PWA Toolkit - Main Entry Point
 * Comprehensive toolkit for sandbox-aware PWAs with hardware shims,
 * Android Chrome capabilities, persistent storage migrations, and client-side ZIP packaging.
 */

export { EnvProbe } from './env/env-probe.js';
export { HAL, AndroidHardwareAdapter } from './hal/index.js';
export { GeoShim } from './hal/geo-shim.js';
export { AudioShim } from './hal/audio-shim.js';
export { NotificationShim } from './hal/notification-shim.js';
export { WakeLockShim } from './hal/wakelock-shim.js';
export { StorageVault } from './storage/storage-vault.js';
export { ServiceWorkerManager } from './sw/sw-manager.js';
export { generateServiceWorkerSource } from './sw/sw-template.js';
export { XRShim } from './xr/xr-shim.js';
export { PWABundler } from './packager/pwa-bundler.js';

/**
 * Convenience bootstrap helper: initializes environment check,
 * mounts HAL, unlocks audio on first click, and attaches WebXR shim if needed.
 */
export async function createDualModeApp(options = {}) {
  const { EnvProbe } = await import('./env/env-probe.js');
  const { HAL, AndroidHardwareAdapter } = await import('./hal/index.js');
  const { StorageVault } = await import('./storage/storage-vault.js');
  const { ServiceWorkerManager } = await import('./sw/sw-manager.js');
  const { XRShim } = await import('./xr/xr-shim.js');
  const { PWABundler } = await import('./packager/pwa-bundler.js');

  const hal = new HAL(options.hal);
  const storage = new StorageVault(options.storage);
  const sw = new ServiceWorkerManager(options.sw);
  const xr = new XRShim(options.xr);
  const bundler = new PWABundler(options.bundler);
  const android = hal.android || new AndroidHardwareAdapter(options.android);

  // Auto-install XR shim if running in restricted mode or explicitly asked
  if (EnvProbe.isRestricted() || options.forceXRShim) {
    xr.installPolyfill(true);
  }

  // Attach audio unlocking listener
  if (options.autoUnlockAudio !== false) {
    hal.audioShim.attachUnlockGesture();
  }

  return {
    EnvProbe,
    hal,
    android,
    storage,
    sw,
    xr,
    bundler
  };
}
