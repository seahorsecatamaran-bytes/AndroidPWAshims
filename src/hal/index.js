/**
 * DualMode PWA Toolkit - Hardware Abstraction Layer (HAL)
 * Routes hardware queries (GPS, Audio, Notifications, WakeLock, Android Capabilities)
 * to Native APIs or Virtual Shims depending on environment restrictions or user preference.
 */
import { EnvProbe } from '../env/env-probe.js';
import { GeoShim } from './geo-shim.js';
import { AudioShim } from './audio-shim.js';
import { NotificationShim } from './notification-shim.js';
import { WakeLockShim } from './wakelock-shim.js';
import { AndroidHardwareAdapter } from './android-hardware.js';

export class HAL {
  constructor(options = {}) {
    this.forceMock = options.forceMock ?? EnvProbe.isRestricted();
    this.geoShim = new GeoShim(options.geo);
    this.audioShim = new AudioShim(options.audio);
    this.notificationShim = new NotificationShim(options.notification);
    this.wakeLockShim = new WakeLockShim(options.wakeLock);
    this.android = new AndroidHardwareAdapter(options.android);
  }

  setForceMock(enable) {
    this.forceMock = Boolean(enable);
  }

  isUsingMock() {
    return this.forceMock;
  }

  // --- GEOLOCATION ---
  getCurrentPosition(success, error, options) {
    if (!this.forceMock && EnvProbe.hasGeolocation()) {
      return navigator.geolocation.getCurrentPosition(success, error, options);
    }
    return this.geoShim.getCurrentPosition(success, error, options);
  }

  watchPosition(success, error, options) {
    if (!this.forceMock && EnvProbe.hasGeolocation()) {
      return navigator.geolocation.watchPosition(success, error, options);
    }
    return this.geoShim.watchPosition(success, error, options);
  }

  clearWatch(id) {
    if (!this.forceMock && EnvProbe.hasGeolocation()) {
      return navigator.geolocation.clearWatch(id);
    }
    return this.geoShim.clearWatch(id);
  }

  // --- AUDIO ---
  playTone(opts) {
    return this.audioShim.playTone(opts);
  }

  playSiren(cycles) {
    return this.audioShim.playSiren(cycles);
  }

  unlockAudio() {
    return this.audioShim.ensureContext();
  }

  // --- NOTIFICATIONS ---
  async requestNotificationPermission() {
    if (!this.forceMock && EnvProbe.hasNotifications()) {
      try {
        return await Notification.requestPermission();
      } catch {
        // Fall back to shim on failure
      }
    }
    return this.notificationShim.requestPermission();
  }

  showNotification(title, options = {}) {
    if (!this.forceMock && EnvProbe.hasNotifications() && Notification.permission === 'granted') {
      try {
        return new Notification(title, options);
      } catch {
        // Fall back to toast
      }
    }
    return this.notificationShim.notify(title, options);
  }

  // --- WAKE LOCK ---
  async requestWakeLock(type = 'screen') {
    if (!this.forceMock && EnvProbe.hasWakeLock()) {
      try {
        return await navigator.wakeLock.request(type);
      } catch {
        // Fall back to shim
      }
    }
    return this.wakeLockShim.request(type);
  }

  // --- ANDROID HARDWARE SHORTCUTS ---
  vibrate(pattern) {
    return this.android.vibrate(pattern);
  }

  getBatteryStatus() {
    return this.android.getBatteryStatus();
  }

  watchHeading(callback) {
    return this.android.watchHeading(callback);
  }

  connectBluetoothSensor(serviceUuid) {
    return this.android.connectMarineSensor(serviceUuid);
  }

  share(data) {
    return this.android.shareSession(data);
  }

  setBadge(count) {
    return this.android.setBadge(count);
  }

  clearBadge() {
    return this.android.clearBadge();
  }

  getNetworkInfo() {
    return this.android.getNetworkInfo();
  }

  toggleFullscreen(el) {
    return this.android.toggleFullscreen(el);
  }
}

export { GeoShim, AudioShim, NotificationShim, WakeLockShim, AndroidHardwareAdapter };
