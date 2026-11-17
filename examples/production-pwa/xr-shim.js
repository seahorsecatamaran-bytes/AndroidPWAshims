/* WebXR Spatial Session Probe & Fallback Shim */
export async function probeXrCapabilities() {
  if (!navigator.xr || !navigator.xr.isSessionSupported) {
    return { ar: false, vr: false, inline: false, fallback: 'webgl-sea-plane' };
  }
  const [ar, vr, inline] = await Promise.all([
    navigator.xr.isSessionSupported('immersive-ar'),
    navigator.xr.isSessionSupported('immersive-vr'),
    navigator.xr.isSessionSupported('inline')
  ]);
  return { ar, vr, inline, fallback: ar ? 'native-ar' : 'webgl-sea-plane' };
}