/**
 * DualMode PWA Toolkit - In-Browser Production PWA Bundler
 * Dynamically loads JSZip and packages a complete, unrestricted, offline-ready
 * PWA archive directly from the client and initiates download.
 */
import { generateServiceWorkerSource } from '../sw/sw-template.js';

export class PWABundler {
  constructor(options = {}) {
    this.appName = options.appName || 'DualModeApp';
    this.shortName = options.shortName || options.appName || 'PWA';
    this.themeColor = options.themeColor || '#0d9488';
    this.backgroundColor = options.backgroundColor || '#0f172a';
    this.version = options.version || '1.0.0';
    this.jszipCdnUrl = options.jszipCdnUrl || 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  }

  async ensureJSZip() {
    if (typeof window !== 'undefined' && window.JSZip) {
      return window.JSZip;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = this.jszipCdnUrl;
      script.onload = () => resolve(window.JSZip);
      script.onerror = () => reject(new Error('Failed to load JSZip from CDN'));
      document.head.appendChild(script);
    });
  }

  generateManifest() {
    return {
      name: this.appName,
      short_name: this.shortName,
      start_url: './index.html',
      display: 'standalone',
      background_color: this.backgroundColor,
      theme_color: this.themeColor,
      orientation: 'any',
      icons: [
        {
          src: 'icon-192.svg',
          sizes: '192x192',
          type: 'image/svg+xml',
          purpose: 'any maskable'
        },
        {
          src: 'icon-512.svg',
          sizes: '512x512',
          type: 'image/svg+xml',
          purpose: 'any maskable'
        }
      ]
    };
  }

  generateSvgIcon(size = 192) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d9488"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="22" fill="url(#g)"/>
  <path d="M50 18 L68 50 L56 50 L56 78 L44 78 L44 50 L32 50 Z" fill="#ffffff" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"/>
  <circle cx="50" cy="50" r="6" fill="#38bdf8"/>
</svg>`;
  }

  generateDeploymentReadme() {
    return `# ${this.appName} (v${this.version})

## Production PWA Deployment Guide

This package was generated automatically by the **DualMode PWA Toolkit**.

### 1. Requirements for Full Native Capabilities
To unlock native hardware features (Service Worker caching, home-screen installation, native high-accuracy GPS, Screen Wake Lock, WebXR):
- Serve this folder over **HTTPS** (or \`localhost\` for local testing).
- Modern browser (Chrome/Edge on Android/Desktop, Safari on iOS 16.4+).

### 2. Local Quickstart
\`\`\`bash
# Using Node.js npx serve
npx serve -s .

# Or using Python 3
python3 -m http.server 8080
\`\`\`
Then visit \`http://localhost:8080\` in your browser.

### 3. Deploying to Free HTTPS Hosting
- **GitHub Pages:** Commit these files to a repo, go to **Settings > Pages**, and select the branch root.
- **Cloudflare Pages / Vercel / Netlify:** Drag-and-drop this unzipped folder directly into their deployment console.
`;
  }

  /**
   * Assembles the production ZIP and triggers browser download
   */
  async exportZip(htmlContent, customFiles = {}) {
    const JSZip = await this.ensureJSZip();
    const zip = new JSZip();

    // 1. Manifest
    zip.file('manifest.webmanifest', JSON.stringify(this.generateManifest(), null, 2));

    // 2. Service Worker
    const swCode = generateServiceWorkerSource(this.appName, this.version);
    zip.file('sw.js', swCode);

    // 3. SVG Icons
    zip.file('icon-192.svg', this.generateSvgIcon(192));
    zip.file('icon-512.svg', this.generateSvgIcon(512));

    // 4. README
    zip.file('README.md', this.generateDeploymentReadme());

    // 5. Index HTML
    zip.file('index.html', htmlContent);

    // 6. Custom extra files (e.g. styles, sounds, libraries)
    for (const [path, content] of Object.entries(customFiles)) {
      zip.file(path, content);
    }

    // Generate blob and trigger download
    const blob = await zip.generateAsync({ type: 'blob' });
    const filename = `${this.appName.toLowerCase().replace(/[^a-z0-9_-]/g, '')}-pwa.zip`;

    if (typeof window !== 'undefined') {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    return blob;
  }
}
