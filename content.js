// content.js — Temu Quick Scraper v1.2

(function () {
  // Guard: only register listener once per page load.
  // Do NOT reset this flag — resetting it caused the listener to be lost.
  if (window.__temuQuickScraperReady) return;
  window.__temuQuickScraperReady = true;

  const BIZ_RANGE_PATTERN = /(\d+)\s*[-–]\s*(\d+)\s*(?:business\s*)?days?/i;
  const BIZ_SINGLE_PATTERN = /(\d+)\s*(?:business\s*)?days?/i;

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── PRICE ────────────────────────────────────────────────────
  function spanHasLineThrough(el) {
    for (const node of [el, el.parentElement, el.parentElement?.parentElement]) {
      if (!node) continue;
      const style = node.getAttribute && (node.getAttribute("style") || "");
      if (/line-through/i.test(style)) return true;
      try {
        const td = window.getComputedStyle(node).textDecorationLine || "";
        if (/line-through/i.test(td)) return true;
      } catch (e) {}
    }
    const parent = el.parentElement;
    if (parent) {
      for (const sib of parent.querySelectorAll("span")) {
        if (sib === el) continue;
        const style = sib.getAttribute("style") || "";
        if (/line-through/i.test(style)) return true;
      }
    }
    return false;
  }

  function extractPriceFromDiv(div) {
    for (const span of div.querySelectorAll("span")) {
      if (span.querySelector("span")) continue;
      if (span.getAttribute("aria-hidden") === "true") continue;
      if (spanHasLineThrough(span)) continue;
      const t = (span.innerText || "").trim().replace(/^[$€£¥₹,]/g, "").replace(/,/g, ".");
      if (!/^\d+[\.,]\d{1,2}$/.test(t)) continue;
      const n = parseFloat(t.replace(",", "."));
      if (n > 0 && n < 100000) return t.replace(",", ".");
    }
    return null;
  }

  function scrapePrice() {
    const salePriceDiv = document.querySelector('[class*="_1vkz0rqG"]');
    if (salePriceDiv) {
      const p = extractPriceFromDiv(salePriceDiv);
      if (p) return p;
    }
    const goodsPriceEl =
      document.querySelector('#goods_price') ||
      document.querySelector('[class*="goods_price"]') ||
      document.querySelector('[class*="GoodsPrice"]');
    if (goodsPriceEl) {
      const childDivs = Array.from(goodsPriceEl.querySelectorAll(":scope > div, :scope > div > div"));
      for (const div of childDivs) {
        const hasStrike = Array.from(div.querySelectorAll("span")).some(s =>
          /line-through/i.test(s.getAttribute("style") || "")
        );
        if (hasStrike) continue;
        const p = extractPriceFromDiv(div);
        if (p) return p;
      }
      let smallest = Infinity, smallestStr = "";
      for (const span of goodsPriceEl.querySelectorAll("span")) {
        if (span.querySelector("span")) continue;
        if (span.getAttribute("aria-hidden") === "true") continue;
        const t = (span.innerText || "").trim().replace(/^[$€£¥₹]/g, "").replace(",", ".");
        if (!/^\d+\.\d{1,2}$/.test(t)) continue;
        const n = parseFloat(t);
        if (n > 0 && n < smallest) { smallest = n; smallestStr = t; }
      }
      if (smallestStr) return smallestStr;
    }
    for (const container of document.querySelectorAll('[class*="PjdWJn3s"]')) {
      const hasStrike = Array.from(container.querySelectorAll("span")).some(s =>
        /line-through/i.test(s.getAttribute("style") || "")
      );
      if (hasStrike) continue;
      const p = extractPriceFromDiv(container);
      if (p) return p;
    }
    return "";
  }

  // ── BRAND ────────────────────────────────────────────────────
  function extractBrandFromContainer(root) {
    for (const el of root.querySelectorAll("div, td, span, p")) {
      const t = el.innerText?.trim();
      if (!t || t.length > 150) continue;
      if (/^Brand\s*[：:]/i.test(t))
        return t.replace(/^Brand\s*[：:]\s*/i, "").split("\n")[0].trim();
    }
    const allEls = Array.from(root.querySelectorAll("div, td, span, p"));
    for (let i = 0; i < allEls.length - 1; i++) {
      const lbl = allEls[i].innerText?.trim();
      if (!lbl) continue;
      if (/^brand$/i.test(lbl)) {
        const val = allEls[i + 1]?.innerText?.trim().split("\n")[0].trim() ||
                    allEls[i + 2]?.innerText?.trim().split("\n")[0].trim();
        if (val && !/^(origin|brand)$/i.test(val) && val.length < 80) return val;
      }
    }
    return "";
  }

  async function expandProductDetails() {
    const btn =
      document.querySelector('div[class*="_3xcJKtRB"][role="button"]') ||
      Array.from(document.querySelectorAll('[role="button"]')).find(el =>
        /see all details/i.test(el.innerText?.trim()) && el.innerText.trim().length < 40
      ) ||
      Array.from(document.querySelectorAll("span")).find(el =>
        /^see all details$/i.test(el.innerText?.trim())
      );
    if (btn) { try { btn.click(); await sleep(800); } catch (e) {} }
  }

  async function scrapeBrand() {
    const goodsDetail = document.querySelector('#goodsDetail') ||
                        document.querySelector('[id*="goodsDetail"]');
    const root = goodsDetail || document.body;
    let brand = extractBrandFromContainer(root);
    if (!brand) {
      const m = document.body.innerText.match(/Brand\s*[：:]\s*([^\n\r,]{1,60})/i);
      if (m) brand = m[1].trim();
    }
    if (!brand) {
      await expandProductDetails();
      brand = extractBrandFromContainer(goodsDetail || document.body);
      if (!brand) {
        const m = document.body.innerText.match(/Brand\s*[：:]\s*([^\n\r,]{1,60})/i);
        if (m) brand = m[1].trim();
      }
    }
    return brand || "N/A";
  }

  // ── SELLER ───────────────────────────────────────────────────
  function scrapeSeller() {
    const storeLink = document.querySelector('[class*="_3A4F96VH"][role="link"]');
    if (storeLink) {
      const label = storeLink.getAttribute("aria-label");
      if (label && label.length < 100) return label.trim();
      const inner = storeLink.querySelector("div, span");
      if (inner) return inner.innerText?.trim().split("\n")[0] || "";
    }
    const brandStoreSpan = document.querySelector('[class*="_3nBusaAC"]');
    if (brandStoreSpan) {
      const t = brandStoreSpan.innerText?.trim();
      if (t) {
        const m = t.match(/Brand Official Store\s*[:\-·]\s*([^·\n]+)/i);
        if (m) return m[1].trim();
        return t.split("·")[0].replace(/Brand Official Store\s*[:\-]?/i, "").trim();
      }
    }
    const brandBanner = Array.from(document.querySelectorAll("div, span")).find(el => {
      const t = el.innerText?.trim();
      return t && /Brand Official Store/i.test(t) && t.length < 200;
    });
    if (brandBanner) {
      const t = brandBanner.innerText?.trim();
      const m = t.match(/Brand Official Store\s*[:\-·]\s*([A-Za-z0-9 &'._-]{2,50})/i);
      if (m) return m[1].trim().split("·")[0].trim();
    }
    const soldByEl = Array.from(document.querySelectorAll("div, span")).find(el => {
      const t = el.innerText?.trim();
      return t && /^Sold by/i.test(t) && t.length < 200;
    });
    if (soldByEl) {
      for (const k of soldByEl.querySelectorAll("div, span, a")) {
        const t = k.innerText?.trim();
        if (t && !/^Sold by/i.test(t) && t.length > 1 && t.length < 80)
          return t.split("\n")[0].trim();
      }
    }
    const sellerDiv = Array.from(document.querySelectorAll("div, span")).find(el => {
      const t = el.innerText?.trim();
      return t && /followers/i.test(t) && /sold/i.test(t) && t.length < 300;
    });
    if (sellerDiv) {
      for (const child of sellerDiv.querySelectorAll("div, span, p")) {
        const t = child.innerText?.trim().split("\n")[0].trim();
        if (t && t.length > 1 && t.length < 80 && !/followers|sold|rating/i.test(t))
          return t;
      }
    }
    return "";
  }

  // ── SHIPPING — MODE A: PAGE (fast, no click) ─────────────────
  function scrapeShippingFromPage() {
    // The shipping section is always inside div.NJajLuUA on product pages
    const root = document.querySelector('[class*="NJajLuUA"]') || document.body;

    // Strategy 1: "Delivery: <date range>" — e.g. "Delivery: May 3-15"
    for (const el of root.querySelectorAll("span, div, p")) {
      if (el.children.length > 4) continue;
      const t = el.innerText?.trim();
      if (!t || t.length > 400) continue;
      // Match "Delivery: May 3-15" or "Delivery: Apr 29-May 6"
      const m = t.match(/Delivery\s*:\s*([A-Za-z]+\s+\d{1,2}[-–][A-Za-z]*\s*\d{0,2})/i);
      if (m) return m[1].trim();
    }

    // Strategy 2: "Fastest delivery in N days" (local warehouse)
    for (const el of root.querySelectorAll("span, div, p")) {
      if (el.children.length > 3) continue;
      const t = el.innerText?.trim();
      if (!t || t.length > 200) continue;
      const m = t.match(/fastest\s*delivery\s*in\s*(\d+\s*(?:business\s*)?days?)/i);
      if (m) return "Fastest delivery in " + m[1];
    }

    // Strategy 3: plain "Delivery: <text>" without date pattern
    for (const el of root.querySelectorAll("span, div, p")) {
      if (el.children.length > 4) continue;
      const t = el.innerText?.trim();
      if (!t || t.length > 300) continue;
      const m = t.match(/Delivery\s*:\s*([^\.\|\n]{3,60})/i);
      if (m) {
        const val = m[1].trim().replace(/\.$/, "").trim();
        if (val.length > 2 && !/free|shipping|credit/i.test(val)) return val;
      }
    }

    return "";
  }

  // ── SHIPPING — MODE B: MODAL (thorough, one click) ───────────
  function extractShippingFromModal(root) {
    // Priority 1: "Delivery time" table row (standard shipping modal)
    // e.g. "Delivery time | May 3-15"
    for (const row of root.querySelectorAll("tr")) {
      const cells = Array.from(row.querySelectorAll("td"));
      for (let i = 0; i < cells.length; i++) {
        if (/delivery\s*time/i.test(cells[i]?.innerText?.trim())) {
          const next = cells[i + 1];
          if (!next) continue;
          const ariaSpan = next.querySelector("span[aria-label]");
          if (ariaSpan) {
            const v = ariaSpan.getAttribute("aria-label")?.trim();
            if (v && v.length < 80) return v;
          }
          const v = next.innerText?.trim().split("\n")[0].trim();
          if (v && v.length < 80) return v;
        }
      }
    }

    // Priority 2: "Delivery: <date range>" plain text line
    // Local warehouse modal shows: "Delivery: Apr 29-May 6 | Get a $5.00 credit..."
    // We want just the date part before the pipe
    for (const el of root.querySelectorAll("span, div, p")) {
      if (el.children.length > 4) continue;
      const t = el.innerText?.trim();
      if (!t || t.length > 400) continue;
      const m = t.match(/Delivery\s*:\s*([A-Za-z]+\s+\d{1,2}[-–][A-Za-z]*\s*\d{0,2})/i);
      if (m) return m[1].trim();
    }

    // Priority 3: "Fastest delivery in N days" — local warehouse
    for (const el of root.querySelectorAll("span, div, p")) {
      if (el.children.length > 3) continue;
      const t = el.innerText?.trim();
      if (!t || t.length > 200) continue;
      const m = t.match(/fastest\s*delivery\s*in\s*(\d+\s*(?:business\s*)?days?)/i);
      if (m) return "Fastest delivery in " + m[1];
    }

    // Priority 4: aria-label span with a days range
    for (const span of root.querySelectorAll("span[aria-label]")) {
      const v = span.getAttribute("aria-label")?.trim();
      if (v && BIZ_RANGE_PATTERN.test(v) && v.length < 80) return v;
    }

    // Priority 5: visible range text in table cells (skip histogram ≤/>/< rows)
    for (const el of root.querySelectorAll("td, span")) {
      const t = el.innerText?.trim();
      if (!t || t.length > 80 || /^[≤<>]/.test(t) || /fastest/i.test(t)) continue;
      if (BIZ_RANGE_PATTERN.test(t)) return t;
    }

    return "";
  }

  async function closeModal(modal) {
    // Strategy 1: click a visible close button inside the modal
    const closeSelectors = [
      '[aria-label="Close"]',
      '[aria-label="close"]',
      '[data-testid="modal-close"]',
      'button[class*="close"]',
      'button[class*="Close"]',
      // Temu-specific close icon classes seen in devtools
      '[class*="_1SgweZv"]',
      '[class*="closeBtn"]',
      '[class*="close-btn"]',
    ];

    // Search inside the modal first, then the whole document
    const roots = modal ? [modal, document] : [document];
    for (const root of roots) {
      for (const sel of closeSelectors) {
        const btn = root.querySelector(sel);
        if (btn && btn.offsetParent !== null) {
          btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
          await sleep(350);
          // Check if modal is gone
          if (!document.querySelector('[role="dialog"]')) return;
        }
      }
    }

    // Strategy 2: Escape on the modal element itself, then document, then body
    const escEvent = () => new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true, cancelable: true, view: window });
    if (modal) modal.dispatchEvent(escEvent());
    await sleep(150);
    if (!document.querySelector('[role="dialog"]')) return;

    document.dispatchEvent(escEvent());
    await sleep(150);
    if (!document.querySelector('[role="dialog"]')) return;

    document.body.dispatchEvent(escEvent());
    await sleep(150);
    if (!document.querySelector('[role="dialog"]')) return;

    // Strategy 3: click the backdrop overlay (element behind the modal)
    // Temu renders a fixed overlay div; click a corner to dismiss
    const overlay = document.querySelector('[class*="overlay"]') ||
                    document.querySelector('[class*="Overlay"]') ||
                    document.querySelector('[class*="backdrop"]') ||
                    document.querySelector('[class*="mask"]');
    if (overlay && overlay.offsetParent !== null) {
      overlay.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      await sleep(300);
      if (!document.querySelector('[role="dialog"]')) return;
    }

    // Strategy 4: click just outside the modal box (top-left corner of viewport)
    document.elementFromPoint(5, 5)?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, view: window, clientX: 5, clientY: 5 })
    );
    await sleep(300);
  }

  async function scrapeShippingViaModal() {
    // The shipping trigger is ALWAYS inside div.NJajLuUA — the shipping module
    // directly below the ATC/Buy Now buttons on the product page.
    // It has role="button" and aria-label starting with "Ships from" or
    // "Free shipping for this item".
    // We must NEVER click the top nav "Free shipping >" banner.

    const shippingModule = document.querySelector('[class*="NJajLuUA"]');

    let trigger = null;

    if (shippingModule) {
      // First choice: the role=button inside the shipping module
      trigger = shippingModule.querySelector('[role="button"]') ||
                // Sometimes the whole module div is the clickable element
                (shippingModule.getAttribute("role") === "button" ? shippingModule : null) ||
                // Or the chevron ">" anchor/span inside it
                shippingModule.querySelector('[class*="_1VDbay5B"]') ||
                shippingModule.querySelector('svg') ?.closest('[role="button"]');
    }

    // Fallback: find by aria-label containing "Ships from" scoped away from nav/header
    if (!trigger) {
      trigger = Array.from(document.querySelectorAll('[role="button"][aria-label]')).find(el => {
        const label = el.getAttribute("aria-label") || "";
        // Must say "Ships from" or "Free shipping for this item"
        if (!/ships\s*from|free\s*shipping\s*for\s*this\s*item/i.test(label)) return false;
        // Must NOT be inside the top navigation bar
        let node = el;
        while (node && node !== document.body) {
          const tag = node.tagName?.toLowerCase();
          if (tag === "nav" || tag === "header") return false;
          const cls = typeof node.className === "string" ? node.className : "";
          if (/nav|header|topbar|announcement/i.test(cls)) return false;
          node = node.parentElement;
        }
        return true;
      });
    }

    if (!trigger) return "";

    try {
      trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      await sleep(1400);

      const modal =
        document.querySelector('[role="dialog"]') ||
        Array.from(document.querySelectorAll("div")).find(el => {
          const cls = typeof el.className === "string" ? el.className : "";
          return /modal|Modal|dialog|Dialog/i.test(cls) &&
                 el.offsetParent !== null &&
                 (el.querySelector("td") || /delivery/i.test(el.innerText));
        });

      const result = extractShippingFromModal(modal || document);

      // ── Close the modal — try every method in order ──
      await closeModal(modal);

      return result;
    } catch (e) {
      return "";
    }
  }

  // ── ATC URL ──────────────────────────────────────────────────
  function extractGoodsId() {
    const url = window.location.href;
    const m1 = url.match(/g-(\d{10,20})\.html/i);
    if (m1) return m1[1];
    const m2 = url.match(/goods_id=(\d{8,20})/i);
    if (m2) return m2[1];
    const m3 = url.match(/\/(\d{12,20})/);
    if (m3) return m3[1];
    return "";
  }

  function extractSkuId() {
    const urlParams = new URLSearchParams(window.location.search);
    const skuFromUrl = urlParams.get("sku_id") || urlParams.get("skuId");
    if (skuFromUrl) return skuFromUrl;
    try {
      const nextData = window.__NEXT_DATA__;
      if (nextData) {
        const str = JSON.stringify(nextData);
        const m = str.match(/"sku_?[Ii]d"\s*:\s*"?(\d{10,20})"?/);
        if (m) return m[1];
      }
    } catch (e) {}
    try {
      for (const script of document.querySelectorAll("script:not([src])")) {
        const text = script.textContent || "";
        if (!text.includes("sku")) continue;
        const m = text.match(/["']sku_?[Ii]d["']\s*[=:]\s*["']?(\d{10,20})["']?/);
        if (m) return m[1];
      }
    } catch (e) {}
    try {
      for (const el of document.querySelectorAll("[data-sku-id],[data-skuid],[data-sku]")) {
        const sku = el.getAttribute("data-sku-id") || el.getAttribute("data-skuid") || el.getAttribute("data-sku");
        if (sku && /^\d{10,20}$/.test(sku)) return sku;
      }
    } catch (e) {}
    return "";
  }

  function buildAtcUrl(goodsId, skuId) {
    if (!goodsId) return window.location.href;
    const sessId = new URLSearchParams(window.location.search).get("_x_sessn_id") || "";
    let url = `https://www.temu.com/goods.html?_bg_fs=1&goods_id=${goodsId}`;
    if (skuId)  url += `&sku_id=${skuId}`;
    if (sessId) url += `&_x_sessn_id=${sessId}`;
    url += `&_oak_page_source=501`;
    return url;
  }

  // ── MAIN ─────────────────────────────────────────────────────
  async function scrapeAll(mode) {
    await sleep(800);
    const [price, brand, atcUrl] = await Promise.all([
      Promise.resolve(scrapePrice()),
      scrapeBrand(),
      Promise.resolve(buildAtcUrl(extractGoodsId(), extractSkuId())),
    ]);
    const seller = scrapeSeller();
    let shipping = "";
    if (mode === "modal") {
      shipping = await scrapeShippingViaModal();
      if (!shipping) shipping = scrapeShippingFromPage();
    } else {
      shipping = scrapeShippingFromPage();
    }
    return { price, brand, seller, shipping, atcUrl };
  }

  // ── MESSAGE LISTENER ─────────────────────────────────────────
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "QUICK_SCRAPE") {
      scrapeAll(request.shippingMode || "page").then(data => sendResponse(data));
      return true; // keep channel open for async response
    }
  });

})();
