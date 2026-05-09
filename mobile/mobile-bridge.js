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

  function closeMobileMenu() {
    document.documentElement.classList.remove('mobile-menu-open');
    document.getElementById('mobile-menu-btn')?.setAttribute('aria-expanded', 'false');
  }

  function toggleMobileMenu() {
    const root = document.documentElement;
    const open = !root.classList.contains('mobile-menu-open');
    root.classList.toggle('mobile-menu-open', open);
    document.getElementById('mobile-menu-btn')?.setAttribute('aria-expanded', String(open));
  }

  function ensureMenuButton() {
    const topbarRight = document.querySelector('.topbar-right');
    if (!topbarRight || document.getElementById('mobile-menu-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'mobile-menu-btn';
    btn.className = 'mobile-menu-btn';
    btn.type = 'button';
    btn.title = '\u0627\u0644\u0642\u0627\u0626\u0645\u0629';
    btn.setAttribute('aria-label', '\u0641\u062a\u062d \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0648\u0627\u062c\u0647\u0627\u062a');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span></span>';
    btn.addEventListener('click', toggleMobileMenu);

    const sync = document.getElementById('sync-indicator');
    topbarRight.insertBefore(btn, sync || topbarRight.firstChild);
  }

  const mobilePages = [
    { id: 'dashboard', label: '\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645', shortLabel: '\u0644\u0648\u062d\u0629', icon: '\ud83d\udcca', selector: '#btn-dashboard' },
    { id: 'inventory', label: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u062e\u0632\u0648\u0646', shortLabel: '\u0645\u062e\u0632\u0648\u0646', icon: '\ud83d\udce6', selector: '#btn-inventory' },
    { id: 'pos', label: '\u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064a\u0639', shortLabel: '\u0628\u064a\u0639', icon: '\ud83d\uded2', selector: '#btn-pos' },
    { id: 'installments', label: '\u0632\u0628\u0627\u0626\u0646 \u0627\u0644\u062a\u0642\u0633\u064a\u0637', shortLabel: '\u062a\u0642\u0633\u064a\u0637', icon: '\ud83d\udcc5', selector: 'button[onclick*="installments"]' },
    { id: 'debts', label: '\u0633\u062c\u0644 \u0627\u0644\u062f\u064a\u0648\u0646', shortLabel: '\u062f\u064a\u0648\u0646', icon: '\ud83d\udccb', selector: 'button[onclick*="debts"]' },
    { id: 'repairs', label: '\u062a\u0635\u0644\u064a\u062d \u0627\u0644\u0623\u0639\u0637\u0627\u0644', shortLabel: '\u062a\u0635\u0644\u064a\u062d', icon: '\ud83d\udd27', selector: 'button[onclick*="repairs"]' },
    { id: 'warranties', label: '\u0633\u062c\u0644 \u0627\u0644\u0636\u0645\u0627\u0646', shortLabel: '\u0636\u0645\u0627\u0646', icon: '\ud83d\udee1\ufe0f', selector: '#btn-warranties' },
    { id: 'cashier', label: '\u0627\u0644\u0643\u0627\u0634\u064a\u0631', shortLabel: '\u0643\u0627\u0634\u064a\u0631', icon: '\ud83d\udda5\ufe0f', selector: 'button[onclick*="cashier"]' },
    { id: 'worker', label: '\u0627\u0644\u0639\u0627\u0645\u0644', shortLabel: '\u0639\u0627\u0645\u0644', icon: '\ud83d\udc77', selector: 'button[onclick*="worker"]' },
    { id: 'settings', label: '\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a', shortLabel: '\u0625\u0639\u062f\u0627\u062f\u0627\u062a', icon: '\u2699\ufe0f', selector: 'button[onclick*="settings"]' }
  ];

  function setActiveDrawerItem(pageId) {
    document.querySelectorAll('.mobile-drawer-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.page === pageId);
    });
  }

  function navigateMobile(page) {
    const originalButton = document.querySelector(page.selector);
    if (page.id === 'dashboard' && typeof window.openDashboard === 'function') {
      window.openDashboard(originalButton);
    } else if (typeof window.goPage === 'function') {
      window.goPage(page.id, originalButton);
    } else if (typeof goPage === 'function') {
      goPage(page.id, originalButton);
    } else {
      originalButton?.click();
    }
    setActiveDrawerItem(page.id);
    closeMobileMenu();
  }

  function ensureMobileDrawer() {
    if (document.getElementById('mobile-drawer')) return;
    const drawer = document.createElement('aside');
    drawer.id = 'mobile-drawer';
    drawer.className = 'mobile-drawer';
    drawer.setAttribute('aria-label', '\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0648\u0627\u062c\u0647\u0627\u062a');

    const title = document.createElement('div');
    title.className = 'mobile-drawer-title';
    title.innerHTML = '<span>\u0627\u0644\u0648\u0627\u062c\u0647\u0627\u062a</span>';

    const close = document.createElement('button');
    close.className = 'mobile-drawer-close';
    close.type = 'button';
    close.textContent = '\u00d7';
    close.setAttribute('aria-label', '\u0625\u063a\u0644\u0627\u0642 \u0627\u0644\u0642\u0627\u0626\u0645\u0629');
    close.addEventListener('click', closeMobileMenu);
    title.appendChild(close);

    const nav = document.createElement('nav');
    nav.className = 'mobile-drawer-nav';
    mobilePages.forEach((page) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `mobile-drawer-item${page.id === 'pos' ? ' active' : ''}`;
      btn.dataset.page = page.id;
      btn.innerHTML = `<span class="ni">${page.icon}</span><span>${page.label}</span>`;
      btn.addEventListener('click', () => navigateMobile(page));
      nav.appendChild(btn);
    });

    drawer.append(title, nav);
    document.body.appendChild(drawer);
  }

  function ensureMenuBackdrop() {
    if (document.getElementById('mobile-menu-backdrop')) return;
    const backdrop = document.createElement('div');
    backdrop.id = 'mobile-menu-backdrop';
    backdrop.className = 'mobile-menu-backdrop';
    backdrop.addEventListener('click', closeMobileMenu);
    document.body.appendChild(backdrop);
  }

  function bindMenuCloseEvents() {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMobileMenu();
    });
  }

  function initMobileUi() {
    ensureMenuBackdrop();
    ensureMenuButton();
    ensureMobileDrawer();
    ensureScanButton();
    enhanceMobileNavigation();
    bindMenuCloseEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileUi);
  } else {
    initMobileUi();
  }
})();
