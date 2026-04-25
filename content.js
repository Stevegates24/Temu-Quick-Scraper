// content.js — Temu Quick Scraper v1.1

(function () {
  if (window.__temuQuickScraperInjected) return;
  window.__temuQuickScraperInjected = true;

  const BIZ_RANGE_PATTERN  = /(\d+)\s*[-–]\s*(\d+)\s*business\s*days?/i;
  const BIZ_SINGLE_PATTERN = /(\d+)\s*business\s*days?/i;

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

  // ── SHIPPING ─────────────────────────────────────────────────
  // Extract ONLY from the modal shipping table — the most reliable source.
  // The table row is: Delivery time | 4-8 business days
  // We do NOT fall back to page text to avoid grabbing "Fastest delivery: N days"
  // banners which are misleading / duplicate / wrong.

  function isNavigationAnchor(el) {
    let node = el;
    while (node && node !== document.body) {
      const tag  = node.tagName?.toLowerCase();
      const href = node.getAttribute?.("href") || "";
      if (tag === "a" && href && !href.startsWith("#") && href !== "javascript:void(0)") return true;
      node = node.parentElement;
    }
    return false;
  }

  // Extract delivery text ONLY from the modal's shipping table
  // Returns e.g. "4-8 business days" or "1-7 business days"
  function extractShippingFromModal(modal) {
    if (!modal) return "";

    // Priority 1: table row with "Delivery time" label
    for (const row of modal.querySelectorAll("tr")) {
      const cells = Array.from(row.querySelectorAll("td"));
      for (let i = 0; i < cells.length; i++) {
        const label = cells[i]?.innerText?.trim();
        if (/delivery\s*time/i.test(label)) {
          // Value is in an aria-label span inside the next cell
          const nextCell = cells[i + 1];
          if (nextCell) {
            // Try aria-label span first (most reliable)
            const ariaSpan = nextCell.querySelector("span[aria-label]");
            if (ariaSpan) {
              const val = ariaSpan.getAttribute("aria-label")?.trim();
              if (val && val.length < 60) return val;
            }
            // Fallback: innerText of the cell
            const val = nextCell.innerText?.trim().split("\n")[0].trim();
            if (val && val.length < 60) return val;
          }
        }
      }
    }

    // Priority 2: any span with aria-label containing business days range
    for (const span of modal.querySelectorAll("span[aria-label]")) {
      const val = span.getAttribute("aria-label")?.trim();
      if (val && BIZ_RANGE_PATTERN.test(val) && val.length < 60) return val;
    }

    // Priority 3: any td/span containing a business days range (not histogram)
    for (const el of modal.querySelectorAll("td, span")) {
      const t = el.innerText?.trim();
      if (!t || t.length > 60) continue;
      // Skip histogram labels like "≤4 business days", ">8 business days"
      if (/^[≤<>]/.test(t)) continue;
      // Skip "Fastest delivery in N business days" — that's a banner, not the range
      if (/fastest/i.test(t)) continue;
      if (BIZ_RANGE_PATTERN.test(t)) return t;
    }

    // Priority 4: single business days only if it's a clean "N business days" from a td
    for (const td of modal.querySelectorAll("td")) {
      const t = td.innerText?.trim();
      if (!t || t.length > 60) continue;
      if (/^[≤<>]/.test(t) || /fastest/i.test(t)) continue;
      if (BIZ_SINGLE_PATTERN.test(t)) return t;
    }

    return "";
  }

  async function scrapeShipping() {
    // Always open the shipping modal — never rely on page text
    // because page banners show "Fastest delivery: N days" which is misleading

    const candidates = [
      document.querySelector('[aria-label*="Ships from this seller"]'),
      document.querySelector('[aria-label*="ships from"]'),
      document.querySelector('[class*="_15GwfeZv"]'),
      // Free shipping row / shipping section clickable button
      ...Array.from(document.querySelectorAll('[role="button"]')).filter(el => {
        const text = (el.innerText?.trim() || "") + (el.getAttribute("aria-label") || "");
        const tag  = el.tagName?.toLowerCase();
        return /ships from|free shipping|standard.*delivery|delivery.*standard/i.test(text) &&
               text.length < 400 &&
               (tag === "div" || tag === "span") &&
               !isNavigationAnchor(el);
      }),
      // Delivery time row
      ...Array.from(document.querySelectorAll('[role="button"]')).filter(el => {
        const text = el.innerText?.trim() || "";
        return /business\s*days?|delivery\s*time/i.test(text) &&
               text.length < 200 && !isNavigationAnchor(el);
      }),
      // The "> Free shipping" link/button at top of product page
      ...Array.from(document.querySelectorAll("div, span, a")).filter(el => {
        const t = el.innerText?.trim();
        const tag = el.tagName?.toLowerCase();
        return t && /^free\s*shipping$/i.test(t) &&
               (tag === "div" || tag === "span" || tag === "a") &&
               el.style?.cursor === "pointer" || el.getAttribute("role") === "button";
      }),
    ].filter(Boolean);

    const seen = new Set();
    const triggers = candidates.filter(el => {
      if (seen.has(el)) return false;
      seen.add(el); return true;
    });

    for (const trigger of triggers) {
      try {
        trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
        await sleep(1800);

        // Find the opened modal
        const modal =
          document.querySelector('[role="dialog"]') ||
          Array.from(document.querySelectorAll("div")).find(el => {
            const cls = typeof el.className === "string" ? el.className : "";
            return /modal|Modal|dialog|Dialog/i.test(cls) &&
                   el.offsetParent !== null &&
                   (el.querySelector("td") || el.querySelector('[class*="PjdWJn3s"]'));
          });

        if (modal) {
          const result = extractShippingFromModal(modal);

          // Close modal
          const closeBtn =
            modal.querySelector('[aria-label="Close"]') ||
            modal.querySelector('[aria-label="close"]') ||
            document.querySelector('[aria-label="Close"]') ||
            document.querySelector('[class*="_1SgweZv"]') ||
            document.querySelector('[data-ignore-height="true"][role="button"]');
          if (closeBtn) closeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          else document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
          await sleep(400);

          if (result) return result;
        }
      } catch (e) {}
    }

    // Last resort: try reading delivery text from the page's shipping section
    // but ONLY a range (e.g. "1-7 business days"), never "Fastest delivery" text
    for (const el of document.querySelectorAll("span, div")) {
      const t = el.innerText?.trim();
      if (!t || t.length > 60 || /^[≤<>]/.test(t) || /fastest/i.test(t)) continue;
      if (BIZ_RANGE_PATTERN.test(t)) return t;
    }

    // Check the "Standard: FREE. Delivery: May 1-8" text visible on page
    for (const el of document.querySelectorAll("span, div, p")) {
      const t = el.innerText?.trim();
      if (!t || t.length > 200) continue;
      if (/delivery\s*:/i.test(t)) {
        const part = t.replace(/^.*delivery\s*:\s*/i, "").split("|")[0].trim();
        if (part && part.length < 60 && !/fastest/i.test(part)) return part;
      }
    }

    return "";
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
      const allEls = document.querySelectorAll("[data-sku-id], [data-skuid], [data-sku]");
      for (const el of allEls) {
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

  function scrapeAtcUrl() {
    const goodsId = extractGoodsId();
    const skuId   = extractSkuId();
    return buildAtcUrl(goodsId, skuId);
  }

  // ── MAIN ─────────────────────────────────────────────────────
  async function scrapeAll() {
    await sleep(1000);
    // Run price, brand, seller, atcUrl in parallel; shipping needs modal so runs after
    const [price, brand, atcUrl] = await Promise.all([
      Promise.resolve(scrapePrice()),
      scrapeBrand(),
      Promise.resolve(scrapeAtcUrl()),
    ]);
    const seller   = scrapeSeller();
    const shipping = await scrapeShipping();
    return { price, brand, seller, shipping, atcUrl };
  }

  // ── MESSAGE LISTENER ─────────────────────────────────────────
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "QUICK_SCRAPE") {
      window.__temuQuickScraperInjected = false;
      scrapeAll().then(data => sendResponse(data));
      return true;
    }
  });
})();
