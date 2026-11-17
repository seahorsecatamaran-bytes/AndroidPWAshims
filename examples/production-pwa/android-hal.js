/* Unified Android Chrome Hardware Abstraction Layer */
export const AndroidHAL = {
  vibrateAlarm(pattern = [200, 100, 200, 100, 500]) {
    if (typeof navigator.vibrate === 'function') return navigator.vibrate(pattern);
    return false;
  },
  async requestWakeLock() {
    if (navigator.wakeLock && navigator.wakeLock.request) {
      return navigator.wakeLock.request('screen');
    }
    return { simulated: true, release: async () => {} };
  },
  async setBadge(count) {
    if (typeof navigator.setAppBadge === 'function') {
      return count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge();
    }
  }
};