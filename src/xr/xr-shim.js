/**
 * DualMode PWA Toolkit - WebXR Virtual Device & Session Shim
 * Polyfills navigator.xr, XRSession, XRReferenceSpace, XRFrame, and hit-testing
 * so 3D/AR applications can be tested in non-XR desktop browsers and sandboxed iframes.
 */
export class XRShim {
  constructor(options = {}) {
    this.sessionActive = false;
    this.viewerPose = {
      position: { x: 0, y: 1.6, z: 2.5 },
      orientation: { pitch: -15, yaw: 0, roll: 0 }
    };
    this.planes = [
      { id: 'floor', y: 0, normal: [0, 1, 0] }
    ];
    this.animCallbacks = new Map();
    this.animIdCounter = 1;
    this.rafLoop = null;
  }

  /**
   * Install the polyfill onto navigator.xr if missing or forced
   */
  installPolyfill(force = false) {
    if (typeof navigator === 'undefined') return;
    if (!navigator.xr || force) {
      navigator.xr = {
        isSessionSupported: async (mode) => {
          return ['inline', 'immersive-ar', 'immersive-vr'].includes(mode);
        },
        requestSession: async (mode, options = {}) => {
          return this.createVirtualSession(mode, options);
        },
        addEventListener: () => {},
        removeEventListener: () => {}
      };
      console.log('[XRShim] WebXR Virtual Polyfill installed');
    }
  }

  createVirtualSession(mode = 'immersive-ar', options = {}) {
    this.sessionActive = true;
    const session = {
      mode,
      renderState: { baseLayer: null },
      updateRenderState: (state) => {
        Object.assign(session.renderState, state);
      },
      requestReferenceSpace: async (type) => {
        return {
          type,
          getOffsetReferenceSpace: () => this,
          addEventListener: () => {},
          removeEventListener: () => {}
        };
      },
      requestHitTestSource: async (options) => {
        return {
          cancel: () => {},
          _virtualSource: true
        };
      },
      requestAnimationFrame: (callback) => {
        const id = this.animIdCounter++;
        this.animCallbacks.set(id, callback);
        if (!this.rafLoop) {
          this._startRenderLoop();
        }
        return id;
      },
      cancelAnimationFrame: (id) => {
        this.animCallbacks.delete(id);
      },
      end: async () => {
        this.sessionActive = false;
        if (this.rafLoop) {
          cancelAnimationFrame(this.rafLoop);
          this.rafLoop = null;
        }
        this.animCallbacks.clear();
        session.onend?.();
      },
      addEventListener: () => {},
      removeEventListener: () => {}
    };

    return session;
  }

  _startRenderLoop() {
    const tick = (time) => {
      if (!this.sessionActive) return;

      const frame = this._createVirtualFrame(time);
      const callbacks = Array.from(this.animCallbacks.values());
      this.animCallbacks.clear();

      for (const cb of callbacks) {
        try {
          cb(time, frame);
        } catch (err) {
          console.error('[XRShim] Error in XR animation callback:', err);
        }
      }

      this.rafLoop = requestAnimationFrame(tick);
    };
    this.rafLoop = requestAnimationFrame(tick);
  }

  _createVirtualFrame(time) {
    return {
      session: this,
      time,
      getViewerPose: (referenceSpace) => {
        return {
          transform: {
            position: { ...this.viewerPose.position, w: 1 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
            matrix: this._computeViewMatrix()
          },
          views: [
            {
              eye: 'none',
              projectionMatrix: this._computeProjectionMatrix(),
              transform: {
                position: { ...this.viewerPose.position, w: 1 },
                orientation: { x: 0, y: 0, z: 0, w: 1 }
              }
            }
          ]
        };
      },
      getHitTestResults: (hitTestSource) => {
        // Return simulated intersection on ground plane y = 0
        return [
          {
            getPose: (refSpace) => ({
              transform: {
                position: { x: 0, y: 0, z: -2, w: 1 },
                orientation: { x: 0, y: 0, z: 0, w: 1 },
                matrix: new Float32Array([
                  1, 0, 0, 0,
                  0, 1, 0, 0,
                  0, 0, 1, 0,
                  0, 0, -2, 1
                ])
              }
            })
          }
        ];
      }
    };
  }

  setViewerPosition(x, y, z) {
    this.viewerPose.position = { x, y, z };
  }

  setViewerOrientation(pitch, yaw, roll = 0) {
    this.viewerPose.orientation = { pitch, yaw, roll };
  }

  _computeViewMatrix() {
    // 4x4 column-major identity-based translation matrix
    const { x, y, z } = this.viewerPose.position;
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      x, y, z, 1
    ]);
  }

  _computeProjectionMatrix() {
    // Standard 60-degree vertical FOV perspective projection matrix
    const fov = (60 * Math.PI) / 180;
    const aspect = 16 / 9;
    const near = 0.1;
    const far = 1000.0;
    const f = 1.0 / Math.tan(fov / 2);

    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) / (near - far), -1,
      0, 0, (2 * far * near) / (near - far), 0
    ]);
  }
}
