/**
 * DualMode PWA Toolkit - Service Worker Lifecycle Manager
 * Handles registration, update discovery, and auto-reload prompts in unrestricted environments.
 */
import { EnvProbe } from '../env/env-probe.js';

export class ServiceWorkerManager {
  constructor(options = {}) {
    this.swUrl = options.swUrl || './sw.js';
    this.scope = options.scope || './';
    this.onUpdateAvailable = options.onUpdateAvailable || null;
    this.registration = null;
    this.refreshing = false;
  }

  async register() {
    if (!EnvProbe.hasServiceWorker()) {
      return { status: 'skipped', reason: 'Restricted sandbox or unsupported browser' };
    }

    try {
      this.registration = await navigator.serviceWorker.register(this.swUrl, { scope: this.scope });
      console.log('[SW Manager] Service Worker registered with scope:', this.registration.scope);

      // Handle updates discovered during runtime
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW Manager] New release ready for activation');
            if (typeof this.onUpdateAvailable === 'function') {
              this.onUpdateAvailable(() => this.applyUpdate(newWorker));
            }
          }
        });
      });

      // Reload window when new service worker takes control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!this.refreshing) {
          this.refreshing = true;
          window.location.reload();
        }
      });

      return { status: 'registered', registration: this.registration };
    } catch (err) {
      console.warn('[SW Manager] Registration failed:', err);
      return { status: 'error', error: err };
    }
  }

  applyUpdate(workerInstance) {
    const target = workerInstance || (this.registration && this.registration.waiting);
    if (target) {
      target.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  async checkForUpdate() {
    if (this.registration) {
      return this.registration.update();
    }
  }
}
