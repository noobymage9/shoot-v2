export class QR {
  /**
   * Render a QR code into a container element.
   * Requires qrcode.js (davidshimjs) loaded via CDN script tag.
   *
   * @param {HTMLElement} container
   * @param {string} text
   */
  static render(container, text) {
    container.innerHTML = '';
    new window.QRCode(container, {
      text,
      width: 200,
      height: 200,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.M,
    });
  }
}
