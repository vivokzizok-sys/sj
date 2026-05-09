(function initMobileBridge() {
  const isNative = () => !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());

  function scannerPlugin() {
    return window.Capacitor?.Plugins?.CapacitorBarcodeScanner || null;
  }

  function applyBarcodeResult(barcode, fieldId, mode) {
    if (!barcode) return;
    if (mode === 'field' && fieldId) {
      const field = document.getElementById(fieldId);
      if (field) {
        field.value = barcode;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        if (typeof toast === 'function') toast('OK: ' + barcode, 'ok');
        return;
      }
    }
    if (typeof handleBarcodeScanned === 'function') {
      handleBarcodeScanned(barcode);
      if (typeof toast === 'function') toast('OK: ' + barcode, 'ok');
      return;
    }
    if (mode === 'pos' && typeof bcPOS === 'function') bcPOS(barcode);
    else if (mode === 'cashier' && typeof bcCashier === 'function') bcCashier(barcode);
  }

  async function scanWithCamera(fieldId = null, mode = 'auto') {
    const plugin = scannerPlugin();
    if (!isNative() || !plugin?.scanBarcode) {
      if (typeof toast === 'function') toast('\u0642\u0627\u0631\u0626 \u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0627 \u064a\u0639\u0645\u0644 \u062f\u0627\u062e\u0644 \u062a\u0637\u0628\u064a\u0642 Android \u0641\u0642\u0637', 'err');
      return;
    }

    try {
      const result = await plugin.scanBarcode({
        hint: 17,
        scanInstructions: '\u0648\u062c\u0651\u0647 \u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0627 \u0646\u062d\u0648 \u0627\u0644\u0628\u0627\u0631\u0643\u0648\u062f',
        scanButton: false,
        cameraDirection: 1,
        scanOrientation: 1,
        android: { scanningLibrary: 'mlkit' }
      });
      const barcode = String(result?.ScanResult || result?.scanResult || '').trim();
      if (barcode) applyBarcodeResult(barcode, fieldId, mode);
    } catch (e) {
      if (typeof toast === 'function') toast('\u062a\u0639\u0630\u0631 \u062a\u0634\u063a\u064a\u0644 \u0643\u0627\u0645\u064a\u0631\u0627 \u0627\u0644\u0628\u0627\u0631\u0643\u0648\u062f', 'err');
      console.warn('Mobile barcode scan failed:', e);
    }
  }

  const originalActivateBarcodeScanner = window.activateBarcodeScanner;
  window.activateBarcodeScanner = function activateMobileBarcodeScanner(fieldId, mode = 'field') {
    if (isNative() && scannerPlugin()) {
      scanWithCamera(fieldId, mode);
      return;
    }
    if (typeof originalActivateBarcodeScanner === 'function') {
      originalActivateBarcodeScanner(fieldId, mode);
    }
  };

  window.mobileScanBarcode = function mobileScanBarcode() {
    scanWithCamera(null, 'auto');
  };

  function ensureScanButton() {
    if (document.getElementById('mobile-scan-fab')) return;
    const btn = document.createElement('button');
    btn.id = 'mobile-scan-fab';
    btn.className = 'mobile-scan-fab';
    btn.type = 'button';
    btn.title = '\u0645\u0633\u062d \u0627\u0644\u0628\u0627\u0631\u0643\u0648\u062f';
    btn.setAttribute('aria-label', '\u0645\u0633\u062d \u0627\u0644\u0628\u0627\u0631\u0643\u0648\u062f');
    btn.addEventListener('click', () => scanWithCamera(null, 'auto'));
    document.body.appendChild(btn);
  }

  function setNavText(selector, label) {
    const btn = document.querySelector(selector);
    if (!btn || btn.dataset.mobileLabelApplied) return;
    const textNode = Array.from(btn.childNodes).reverse().find((node) => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
    if (textNode) textNode.nodeValue = label;
    else btn.appendChild(document.createTextNode(label));
    btn.dataset.mobileLabelApplied = '1';
  }

  function enhanceMobileNavigation() {
    setNavText('#btn-dashboard', '\u0644\u0648\u062d\u0629');
    setNavText('#btn-inventory', '\u0645\u062e\u0632\u0648\u0646');
    setNavText('#btn-pos', '\u0628\u064a\u0639');
    setNavText('button[onclick*="installments"]', '\u062a\u0642\u0633\u064a\u0637');
    setNavText('button[onclick*="debts"]', '\u062f\u064a\u0648\u0646');
    setNavText('button[onclick*="repairs"]', '\u062a\u0635\u0644\u064a\u062d');
    setNavText('#btn-warranties', '\u0636\u0645\u0627\u0646');
    setNavText('button[onclick*="cashier"]', '\u0643\u0627\u0634\u064a\u0631');
    setNavText('button[onclick*="worker"]', '\u0639\u0627\u0645\u0644');
    setNavText('button[onclick*="settings"]', '\u0625\u0639\u062f\u0627\u062f\u0627\u062a');
  }

  function initMobileUi() {
    ensureScanButton();
    enhanceMobileNavigation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileUi);
  } else {
    initMobileUi();
  }
})();
