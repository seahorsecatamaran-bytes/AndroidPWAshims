/**
 * DualMode PWA Toolkit - Environment Probe
 * Inspects host environment capabilities (sandbox, HTTPS, Service Workers, WebXR, Android Hardware, etc.)
 */
export const EnvProbe = {
  /**
   * Check if running inside an iframe or sandboxed container
   */
  isIframe() {
    try {
      return window.self !== window.top;
    } catch {
      return true; // Origin access blocked = sandboxed iframe
    }
  },

  /**
   * Check if running in a secure context (HTTPS or localhost)
   */
  isSecure() {
    return Boolean(
      window.isSecureContext &&
      (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    );
  },

  /**
   * Check core PWA feature availability
   */
  hasServiceWorker() {
    return 'serviceWorker' in navigator && this.isSecure();
  },

  hasGeolocation() {
    return 'geolocation' in navigator;
  },

  hasWakeLock() {
    return 'wakeLock' in navigator;
  },

  hasNotifications() {
    return 'Notification' in window;
  },

  hasWebXR() {
    return 'xr' in navigator;
  },

  hasIndexedDB() {
    return 'indexedDB' in window;
  },

  hasPersistentStorage() {
    return 'storage' in navigator && typeof navigator.storage.persist === 'function';
  },

  /**
   * Android & Extended Hardware Probes
   */
  hasVibration() {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
  },

  hasBattery() {
    return typeof navigator !== 'undefined' && 'getBattery' in navigator;
  },

  hasBluetooth() {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  },

  hasOrientation() {
    return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
  },

  hasShare() {
    return typeof navigator !== 'undefined' && 'share' in navigator;
  },

  hasBadging() {
    return typeof navigator !== 'undefined' && 'setAppBadge' in navigator;
  },

  hasNetworkInfo() {
    return typeof navigator !== 'undefined' && 'connection' in navigator;
  },

  /**
   * Determines if the current environment is constrained/restricted.
   * A limited environment typically means: inside an iframe sandbox, insecure HTTP,
   * or running where Service Workers and hardware permissions are unavailable.
   */
  isRestricted() {
    return this.isIframe() || !this.isSecure() || !('serviceWorker' in navigator);
  },

  /**
   * Run a full capability audit and return a detailed report
   */
  async getAuditReport() {
    let swState = 'unsupported';
    if ('serviceWorker' in navigator) {
      swState = this.isSecure() ? (navigator.serviceWorker.controller ? 'active' : 'supported') : 'insecure-blocked';
    }

    let xrSupport = { ar: false, vr: false, inline: false };
    if ('xr' in navigator) {
      try {
        xrSupport.ar = await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);
        xrSupport.vr = await navigator.xr.isSessionSupported('immersive-vr').catch(() => false);
        xrSupport.inline = await navigator.xr.isSessionSupported('inline').catch(() => false);
      } catch {
        // Ignored in strict sandboxes
      }
    }

    let storageEstimate = null;
    if ('storage' in navigator && typeof navigator.storage.estimate === 'function') {
      try {
        storageEstimate = await navigator.storage.estimate();
      } catch {
        // Ignored
      }
    }

    return {
      timestamp: new Date().toISOString(),
      isRestricted: this.isRestricted(),
      isIframe: this.isIframe(),
      isSecure: this.isSecure(),
      protocol: location.protocol,
      host: location.host,
      capabilities: {
        serviceWorker: swState,
        geolocation: this.hasGeolocation(),
        wakeLock: this.hasWakeLock(),
        notifications: this.hasNotifications() ? Notification.permission : 'unsupported',
        webxr: xrSupport,
        indexedDB: this.hasIndexedDB(),
        persistentStorage: this.hasPersistentStorage(),
        vibration: this.hasVibration(),
        battery: this.hasBattery(),
        bluetooth: this.hasBluetooth(),
        orientation: this.hasOrientation(),
        share: this.hasShare(),
        badging: this.hasBadging(),
        networkInfo: this.hasNetworkInfo(),
        storageEstimate
      }
    };
  }
};
