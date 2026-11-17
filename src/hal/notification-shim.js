/**
 * DualMode PWA Toolkit - Notification Fallback Shim
 * Provides an on-screen toast notification system when native Web Notifications
 * are unavailable or blocked in sandboxed iframes.
 */
export class NotificationShim {
  constructor(options = {}) {
    this.containerId = options.containerId || 'dualmode-toast-container';
    this.permission = 'granted'; // Always simulated as granted in shim mode
    this._ensureContainer();
  }

  _ensureContainer() {
    if (typeof document === 'undefined') return;
    let container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      Object.assign(container.style, {
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: '999999',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
        maxWidth: '360px',
        width: 'calc(100% - 32px)',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      });
      document.body.appendChild(container);
    }
    this.container = container;
  }

  requestPermission() {
    return Promise.resolve(this.permission);
  }

  /**
   * Display a notification (simulates `new Notification(title, options)`)
   */
  notify(title, options = {}) {
    this._ensureContainer();
    if (!this.container) return;

    const toast = document.createElement('div');
    Object.assign(toast.style, {
      background: 'rgba(15, 23, 42, 0.95)',
      color: '#ffffff',
      borderLeft: '4px solid #0d9488',
      borderRadius: '8px',
      padding: '12px 16px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      fontSize: '13px',
      pointerEvents: 'auto',
      animation: 'slideInRight 0.25s ease-out',
      transition: 'opacity 0.2s ease, transform 0.2s ease'
    });

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const titleEl = document.createElement('strong');
    titleEl.textContent = title;
    titleEl.style.fontSize = '14px';
    titleEl.style.color = '#38bdf8';
    header.appendChild(titleEl);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    Object.assign(closeBtn.style, {
      background: 'transparent',
      border: 'none',
      color: '#94a3b8',
      cursor: 'pointer',
      fontSize: '14px',
      padding: '0 4px'
    });
    closeBtn.onclick = () => this._removeToast(toast);
    header.appendChild(closeBtn);
    toast.appendChild(header);

    if (options.body) {
      const bodyEl = document.createElement('div');
      bodyEl.textContent = options.body;
      bodyEl.style.color = '#cbd5e1';
      bodyEl.style.lineHeight = '1.4';
      toast.appendChild(bodyEl);
    }

    const footer = document.createElement('div');
    footer.style.fontSize = '10px';
    footer.style.color = '#64748b';
    footer.style.marginTop = '2px';
    footer.textContent = 'Simulated PWA Notification';
    toast.appendChild(footer);

    this.container.appendChild(toast);

    const autoClose = options.duration ?? 4500;
    if (autoClose > 0) {
      setTimeout(() => this._removeToast(toast), autoClose);
    }

    return toast;
  }

  _removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 200);
  }
}
