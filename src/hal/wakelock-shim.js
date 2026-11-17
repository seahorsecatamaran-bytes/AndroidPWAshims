/**
 * DualMode PWA Toolkit - WakeLock Shim
 * Polyfills Screen Wake Lock API when unavailable or rejected by permissions policy.
 */
export class WakeLockShim {
  constructor() {
    this.active = false;
    this.type = 'screen';
    this.releaseCallbacks = new Set();
  }

  async request(type = 'screen') {
    this.type = type;
    this.active = true;

    const sentinel = {
      released: false,
      type: this.type,
      release: async () => {
        if (!sentinel.released) {
          sentinel.released = true;
          this.active = false;
          sentinel.onrelease?.();
          this.releaseCallbacks.forEach((cb) => cb());
        }
      },
      addEventListener: (evt, cb) => {
        if (evt === 'release') this.releaseCallbacks.add(cb);
      },
      removeEventListener: (evt, cb) => {
        if (evt === 'release') this.releaseCallbacks.delete(cb);
      }
    };

    return sentinel;
  }
}
