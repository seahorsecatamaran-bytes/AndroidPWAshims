/**
 * DualMode PWA Toolkit - Virtual Geolocation Shim
 * Simulates GPS watchPosition / getCurrentPosition with keyboard nudging, waypoint routes, and drift simulation.
 */
export class GeoShim {
  constructor(options = {}) {
    this.lat = options.initialLat ?? 37.7749;
    this.lng = options.initialLng ?? -122.4194;
    this.altitude = options.initialAltitude ?? 5;
    this.accuracy = options.accuracy ?? 3.5;
    this.speed = options.speed ?? 0;
    this.heading = options.heading ?? 0;
    this.watchers = new Map();
    this.watcherIdCounter = 1;
    this.driftInterval = null;
    this.driftStepMeters = options.driftStepMeters ?? 1.5;

    this._boundKeyHandler = this._handleKeyDown.bind(this);
    if (options.enableKeyControls !== false && typeof window !== 'undefined') {
      window.addEventListener('keydown', this._boundKeyHandler);
    }
  }

  destroy() {
    this.stopDrift();
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._boundKeyHandler);
    }
    this.watchers.clear();
  }

  getCurrentPosition(success, error, options) {
    setTimeout(() => {
      success(this._createPositionObject());
    }, 10);
  }

  watchPosition(success, error, options) {
    const id = this.watcherIdCounter++;
    this.watchers.set(id, { success, error, options });
    setTimeout(() => {
      success(this._createPositionObject());
    }, 10);
    return id;
  }

  clearWatch(id) {
    this.watchers.delete(id);
  }

  setPosition(lat, lng, heading = this.heading, speed = this.speed) {
    this.lat = lat;
    this.lng = lng;
    this.heading = heading;
    this.speed = speed;
    this._notifyWatchers();
  }

  /**
   * Move the position by delta meters in north/south and east/west
   */
  nudgeMeters(dNorth, dEast) {
    const dLat = dNorth / 111111;
    const dLng = dEast / (111111 * Math.cos((this.lat * Math.PI) / 180));
    this.lat += dLat;
    this.lng += dLng;
    this.heading = (Math.atan2(dEast, dNorth) * 180 / Math.PI + 360) % 360;
    this.speed = Math.hypot(dNorth, dEast);
    this._notifyWatchers();
  }

  startDrift(intervalMs = 2000, angleDeg = 45) {
    this.stopDrift();
    this.driftInterval = setInterval(() => {
      // Add slight jitter to simulate nautical or atmospheric drift
      const rad = ((angleDeg + (Math.random() * 20 - 10)) * Math.PI) / 180;
      const dNorth = Math.cos(rad) * this.driftStepMeters;
      const dEast = Math.sin(rad) * this.driftStepMeters;
      this.nudgeMeters(dNorth, dEast);
    }, intervalMs);
  }

  stopDrift() {
    if (this.driftInterval) {
      clearInterval(this.driftInterval);
      this.driftInterval = null;
    }
  }

  _handleKeyDown(e) {
    // Only capture if not inside an input/textarea
    if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    const step = e.shiftKey ? 10 : 2; // meters
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        this.nudgeMeters(step, 0);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.nudgeMeters(-step, 0);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.nudgeMeters(0, -step);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.nudgeMeters(0, step);
        break;
    }
  }

  _notifyWatchers() {
    const pos = this._createPositionObject();
    for (const watcher of this.watchers.values()) {
      try {
        watcher.success(pos);
      } catch (err) {
        console.error('Error in GeoShim watcher callback:', err);
      }
    }
  }

  _createPositionObject() {
    return {
      coords: {
        latitude: this.lat,
        longitude: this.lng,
        altitude: this.altitude,
        accuracy: this.accuracy,
        altitudeAccuracy: 1.0,
        heading: this.heading,
        speed: this.speed
      },
      timestamp: Date.now()
    };
  }
}
