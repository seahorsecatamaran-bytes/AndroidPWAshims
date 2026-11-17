/**
 * Android Hardware & Chrome Capabilities Adapter & Shims
 * Provides unified access to Android-specific PWA APIs with sandbox/desktop fallbacks.
 */

export class AndroidHardwareAdapter {
  constructor(options = {}) {
    this.simulatedBatteryLevel = options.batteryLevel ?? 0.85;
    this.simulatedBatteryCharging = options.batteryCharging ?? false;
    this.simulatedCompassHeading = options.compassHeading ?? 42; // degrees
    this.simulatedPitch = options.pitch ?? 0;
    this.simulatedRoll = options.roll ?? 0;
    this.simulatedBadgeCount = 0;
    this.onStatusChange = options.onStatusChange || (() => {});
  }

  // =========================================================================
  // 1. VIBRATION & HAPTICS (navigator.vibrate)
  // =========================================================================
  vibrate(pattern = [200, 100, 200]) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        const success = navigator.vibrate(pattern);
        if (success) {
          this.onStatusChange('HAPTICS', `Native vibration triggered with pattern [${pattern.join(', ')}]ms`);
          return true;
        }
      } catch (e) {
        // Fallback below
      }
    }

    // Visual & audio haptic simulation
    this.onStatusChange('HAPTICS', `[SIMULATED] Haptic pulse: [${Array.isArray(pattern) ? pattern.join(', ') : pattern}]ms`);
    if (typeof document !== 'undefined') {
      const container = document.body;
      container.style.transition = 'transform 0.05s ease';
      container.style.transform = 'translate(3px, -2px)';
      setTimeout(() => { container.style.transform = 'translate(-3px, 2px)'; }, 50);
      setTimeout(() => { container.style.transform = 'translate(0, 0)'; }, 100);
    }
    return true;
  }

  // =========================================================================
  // 2. BATTERY STATUS API (navigator.getBattery)
  // =========================================================================
  async getBatteryStatus() {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        return {
          supported: true,
          simulated: false,
          level: Math.round(battery.level * 100),
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
          raw: battery
        };
      } catch (e) {
        // Fallback below
      }
    }

    return {
      supported: false,
      simulated: true,
      level: Math.round(this.simulatedBatteryLevel * 100),
      charging: this.simulatedBatteryCharging,
      chargingTime: Infinity,
      dischargingTime: 14400,
      raw: null
    };
  }

  setSimulatedBattery(level, charging) {
    this.simulatedBatteryLevel = Math.max(0, Math.min(1, level / 100));
    this.simulatedBatteryCharging = !!charging;
    this.onStatusChange('BATTERY', `Simulated battery updated: ${level}% (Charging: ${this.simulatedBatteryCharging})`);
  }

  // =========================================================================
  // 3. COMPASS & DEVICE ORIENTATION
  // =========================================================================
  async requestOrientationPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        return response === 'granted';
      } catch (e) {
        return false;
      }
    }
    return true;
  }

  watchHeading(callback) {
    const hasDeviceOrientation = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;

    if (hasDeviceOrientation) {
      const listener = (event) => {
        let heading = null;
        if (event.webkitCompassHeading !== undefined) {
          // iOS Safari
          heading = event.webkitCompassHeading;
        } else if (event.alpha !== null) {
          // Android Chrome / Standard
          heading = 360 - event.alpha;
        }

        if (heading !== null) {
          callback({
            heading: Math.round(heading) % 360,
            pitch: Math.round(event.beta || 0),
            roll: Math.round(event.gamma || 0),
            simulated: false
          });
        }
      };

      window.addEventListener('deviceorientation', listener);
      return () => window.removeEventListener('deviceorientation', listener);
    }

    // Simulated interval
    const interval = setInterval(() => {
      callback({
        heading: this.simulatedCompassHeading,
        pitch: this.simulatedPitch,
        roll: this.simulatedRoll,
        simulated: true
      });
    }, 500);

    return () => clearInterval(interval);
  }

  setSimulatedOrientation(heading, pitch = 0, roll = 0) {
    this.simulatedCompassHeading = (heading + 360) % 360;
    this.simulatedPitch = pitch;
    this.simulatedRoll = roll;
    this.onStatusChange('COMPASS', `Simulated heading: ${this.simulatedCompassHeading}°, Pitch: ${pitch}°, Roll: ${roll}°`);
  }

  // =========================================================================
  // 4. WEB BLUETOOTH (navigator.bluetooth)
  // =========================================================================
  async connectMarineSensor(serviceUuid = 0x180D) {
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      try {
        this.onStatusChange('BLE', 'Requesting Web Bluetooth device...');
        const device = await navigator.bluetooth.requestDevice({
          filters: [{ services: [serviceUuid] }],
          optionalServices: ['generic_access']
        });
        const server = await device.gatt.connect();
        this.onStatusChange('BLE', `Connected to BLE device: ${device.name || device.id}`);
        return { success: true, simulated: false, device, server };
      } catch (e) {
        this.onStatusChange('BLE', `Web Bluetooth request cancelled or unavailable: ${e.message}`);
      }
    }

    // Simulated BLE Device
    this.onStatusChange('BLE', '[SIMULATED] Linked to Virtual NMEA 2000 Depth & Anchor Windlass BLE Sensor');
    return {
      success: true,
      simulated: true,
      device: { name: 'Virtual-NMEA-AnchorBeacon', id: 'SIM-BLE-007' }
    };
  }

  // =========================================================================
  // 5. WEB SHARE API (navigator.share)
  // =========================================================================
  async shareSession(data = {}) {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share(data);
        this.onStatusChange('SHARE', 'Native Android share sheet launched successfully.');
        return { success: true, method: 'native' };
      } catch (e) {
        if (e.name !== 'AbortError') {
          this.onStatusChange('SHARE', `Native share failed: ${e.message}`);
        }
      }
    }

    // Fallback: Clipboard write
    const shareText = `${data.title || ''}\n${data.text || ''}\n${data.url || ''}`.trim();
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareText);
        this.onStatusChange('SHARE', '[FALLBACK] Share link copied to system clipboard.');
        return { success: true, method: 'clipboard' };
      } catch (e) {}
    }

    this.onStatusChange('SHARE', `[SIMULATED] Share contents: ${shareText}`);
    return { success: true, method: 'simulated' };
  }

  // =========================================================================
  // 6. APP BADGING (navigator.setAppBadge)
  // =========================================================================
  async setBadge(count = 1) {
    this.simulatedBadgeCount = count;
    if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
      try {
        await navigator.setAppBadge(count);
        this.onStatusChange('BADGE', `Native Android app badge set to: ${count}`);
        return;
      } catch (e) {}
    }

    // Browser tab title fallback
    if (typeof document !== 'undefined') {
      const cleanTitle = document.title.replace(/^$$\d+$$ /, '');
      document.title = count > 0 ? `(${count}) ${cleanTitle}` : cleanTitle;
      this.onStatusChange('BADGE', `[SIMULATED] App badge displayed in title: (${count})`);
    }
  }

  async clearBadge() {
    this.simulatedBadgeCount = 0;
    if (typeof navigator !== 'undefined' && 'clearAppBadge' in navigator) {
      try {
        await navigator.clearAppBadge();
        this.onStatusChange('BADGE', 'Native Android app badge cleared.');
        return;
      } catch (e) {}
    }

    if (typeof document !== 'undefined') {
      document.title = document.title.replace(/^$$\d+$$ /, '');
      this.onStatusChange('BADGE', '[SIMULATED] App badge cleared.');
    }
  }

  // =========================================================================
  // 7. NETWORK INFORMATION (navigator.connection)
  // =========================================================================
  getNetworkInfo() {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const conn = navigator.connection;
      return {
        supported: true,
        type: conn.type || 'unknown',
        effectiveType: conn.effectiveType || '4g',
        downlink: conn.downlink || 10,
        rtt: conn.rtt || 50,
        saveData: !!conn.saveData
      };
    }

    return {
      supported: false,
      type: 'cellular',
      effectiveType: '4g',
      downlink: 12.5,
      rtt: 45,
      saveData: false,
      simulated: true
    };
  }

  // =========================================================================
  // 8. FULLSCREEN MODE
  // =========================================================================
  async toggleFullscreen(element = document.documentElement) {
    if (typeof document === 'undefined') return false;

    if (!document.fullscreenElement) {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
        this.onStatusChange('FULLSCREEN', 'Immersive full-screen entered.');
        return true;
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        this.onStatusChange('FULLSCREEN', 'Exited full-screen.');
        return false;
      }
    }
    return false;
  }
}
