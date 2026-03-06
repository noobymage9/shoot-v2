/**
 * Render a QR code into a container element.
 * Requires qrcode.js (davidshimjs) loaded via CDN script tag before this module runs.
 *
 * @param {HTMLElement} container  Will be cleared and filled with QR canvas/image
 * @param {string} text            URL or text to encode
 */
export function renderQR(container, text) {
  // Clear previous QR
  container.innerHTML = '';
  // QRCode is a global injected by the CDN script
  new window.QRCode(container, {
    text,
    width: 200,
    height: 200,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: window.QRCode.CorrectLevel.M,
  });
}
