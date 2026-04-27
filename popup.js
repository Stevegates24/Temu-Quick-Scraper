// popup.js — Temu Quick Scraper v1.3

let scrapedData  = null;
let shippingMode = "page";
let animEnabled  = true;

// Field reveal order + delays (ms) — spaced so each one is visible
const FIELDS = [
  { key: "price",    id: "f-price",    delay: 0   },
  { key: "brand",    id: "f-brand",    delay: 260 },
  { key: "seller",   id: "f-seller",   delay: 460 },
  { key: "shipping", id: "f-shipping", delay: 660 },
  { key: "atcUrl",   id: "f-atc",      delay: 860 },
];
const FIELD_BY_KEY = Object.fromEntries(FIELDS.map(f => [f.key, f]));
const PROGRESS_AT  = { price: 20, brand: 40, seller: 60, shipping: 80, atcUrl: 100 };

// ── Status ─────────────────────────────────────────────────
function setStatus(text, type = "") {
  document.getElementById("sDot").className = "status-dot " + type;
  const lbl = document.getElementById("sTxt");
  lbl.className = "status-label " + type;
  lbl.textContent = text;
  document.getElementById("statusBar").className = "status " + type;
}

function setProgress(pct) {
  document.getElementById("progressFill").style.width = pct + "%";
}

// ── Shimmer (pending state) ─────────────────────────────────
function showShimmer(key) {
  const f = FIELD_BY_KEY[key];
  if (!f) return;
  const el = document.getElementById(f.id);
  if (!el) return;
  el.classList.add("pending");
  const valEl = el.querySelector(".field-val");
  if (!valEl) return;
  valEl.className = "field-val";
  valEl.innerHTML = `<div class="shimmer-wrap"><div class="shimmer wide"></div></div>`;
}

function showAllShimmers() {
  FIELDS.forEach(f => showShimmer(f.key));
}

// ── Reveal a field with animation ───────────────────────────
function revealField(key, value, flash = false) {
  const f = FIELD_BY_KEY[key];
  if (!f) return;
  const el = document.getElementById(f.id);
  if (!el) return;

  el.classList.remove("pending");

  const valEl = el.querySelector(".field-val");
  if (!valEl) return;

  const isEmpty = !value || value === "—" || value === "N/A";
  let cls = "field-val";
  if (isEmpty)         cls += " na";
  else if (key === "atcUrl") cls += " link";
  valEl.className = cls;
  valEl.textContent = isEmpty ? "—" : value;

  if (animEnabled) {
    el.classList.remove("reveal-in", "reveal-flash");
    void el.offsetWidth; // force reflow to restart animation
    el.classList.add(flash ? "reveal-flash" : "reveal-in");
  }
}

// Render all at once (for restoring persisted data — no stagger needed)
function renderData(data, animate = false) {
  if (!animate) {
    FIELDS.forEach(f => revealField(f.key, data[f.key]));
  } else {
    // Staggered reveal — each field appears one by one
    FIELDS.forEach(f => {
      setTimeout(() => {
        revealField(f.key, data[f.key], true);
        setProgress(PROGRESS_AT[f.key] || 0);
      }, f.delay);
    });
    // Final copy + status after last field
    const lastDelay = FIELDS[FIELDS.length - 1].delay + 400;
    setTimeout(async () => {
      setProgress(100);
      const copied = await copyText(buildTsv(data));
      setTimeout(() => setProgress(0), 800);
      setStatus(copied ? "Done — all copied to clipboard" : "Done — click field to copy", "ok");
      document.getElementById("copyAllBtn").disabled = false;
      chrome.storage.local.set({ temuLastScrape: data });
    }, lastDelay);
  }
}

// ── Copy helpers ────────────────────────────────────────────
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (_) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy");
      document.body.removeChild(ta); return true;
    } catch (_) { return false; }
  }
}

function flashCopied(key) {
  const f = FIELD_BY_KEY[key];
  if (!f) return;
  const el = document.getElementById(f.id);
  if (!el) return;
  el.classList.add("copied");
  setTimeout(() => el.classList.remove("copied"), 1500);
}

function buildTsv(data) {
  return [data.price||"", data.brand||"", data.seller||"", data.shipping||"", data.atcUrl||""].join("\t");
}

// ── Field click-to-copy ─────────────────────────────────────
function setupFieldClicks() {
  const getters = {
    price:    () => scrapedData?.price,
    brand:    () => scrapedData?.brand,
    seller:   () => scrapedData?.seller,
    shipping: () => scrapedData?.shipping,
    atcUrl:   () => scrapedData?.atcUrl,
  };
  FIELDS.forEach(({ key, id }) => {
    document.getElementById(id)?.addEventListener("click", async () => {
      if (!scrapedData) return;
      const val = getters[key]?.();
      if (!val || val === "—" || val === "N/A") return;
      if (await copyText(val)) flashCopied(key);
    });
  });
}

// ── Copy All ────────────────────────────────────────────────
document.getElementById("copyAllBtn").addEventListener("click", async () => {
  if (!scrapedData) return;
  if (await copyText(buildTsv(scrapedData))) {
    const btn = document.getElementById("copyAllBtn");
    const orig = btn.innerHTML;
    btn.textContent = "✓ Copied";
    setTimeout(() => { btn.innerHTML = orig; }, 1600);
    setStatus("All fields copied", "ok");
  }
});

// ── Settings ────────────────────────────────────────────────
const MODE_CONFIG = {
  page: {
    icon: "⚡",
    note: "<b>Page mode:</b> reads delivery text already visible on the product page. Works for both standard and local warehouse items.",
    sub:  "Click any field to copy individually",
  },
  modal: {
    icon: "🔍",
    note: "<b>Modal mode:</b> clicks the shipping row to open the shipping popup, reads the delivery table. More thorough — slightly slower (~1.5s).",
    sub:  "Shipping: modal mode (thorough)",
  },
};

function applyMode(mode) {
  shippingMode = mode;
  document.getElementById("modePageBtn").classList.toggle("active",  mode === "page");
  document.getElementById("modeModalBtn").classList.toggle("active", mode === "modal");
  const cfg = MODE_CONFIG[mode];
  document.getElementById("settingsNote").innerHTML = cfg.note;
  document.querySelector(".mode-summary-icon").textContent = cfg.icon;
  document.getElementById("headerSub").textContent = cfg.sub;
  chrome.storage.local.set({ temuShippingMode: mode });
}

document.getElementById("gearBtn").addEventListener("click", () => {
  const panel = document.getElementById("settingsPanel");
  const open  = panel.classList.toggle("open");
  document.getElementById("gearBtn").classList.toggle("active", open);
});
document.getElementById("modePageBtn").addEventListener("click",  () => applyMode("page"));
document.getElementById("modeModalBtn").addEventListener("click", () => applyMode("modal"));

// ── Animation toggle ────────────────────────────────────────
document.getElementById("animToggle").addEventListener("change", (e) => {
  animEnabled = e.target.checked;
  document.body.classList.toggle("no-anim", !animEnabled);
  chrome.storage.local.set({ temuAnimEnabled: animEnabled });
});

// ── Scrape ──────────────────────────────────────────────────
document.getElementById("scrapeBtn").addEventListener("click", () => runScrape());

async function runScrape() {
  scrapedData = null;
  showAllShimmers();
  setStatus(shippingMode === "modal" ? "Scraping (modal mode)…" : "Scraping…", "loading");
  setProgress(5);
  document.getElementById("copyAllBtn").disabled = true;
  document.getElementById("scrapeBtn").disabled  = true;

  let tab;
  try { [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); }
  catch (e) {
    setStatus("Cannot access tab", "err");
    document.getElementById("scrapeBtn").disabled = false;
    return;
  }

  if (!tab?.url?.includes("temu.com")) {
    setStatus("Open a Temu product page first", "err");
    FIELDS.forEach(f => revealField(f.key, ""));
    setProgress(0);
    document.getElementById("scrapeBtn").disabled = false;
    return;
  }

  // Small delay so shimmer is visible before scraping starts
  await new Promise(r => setTimeout(r, 300));

  chrome.tabs.sendMessage(tab.id, { type: "QUICK_SCRAPE", shippingMode }, (data) => {
    document.getElementById("scrapeBtn").disabled = false;

    if (chrome.runtime.lastError || !data) {
      setStatus("Failed — refresh page & retry", "err");
      setProgress(0);
      FIELDS.forEach(f => revealField(f.key, ""));
      return;
    }

    scrapedData = data;
    // Animate fields in one by one — this is where the demo-style reveal happens
    renderData(data, true);
    // Status updates to "Scraping" until last field fires
    setStatus(shippingMode === "modal" ? "Scraping (modal mode)…" : "Scraping…", "loading");
  });
}

// ── Init ────────────────────────────────────────────────────
async function init() {
  setupFieldClicks();

  let tab;
  try { [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); }
  catch (e) {}

  chrome.storage.local.get(
    ["temuLastScrape", "temuShippingMode", "temuAnimEnabled"],
    ({ temuLastScrape, temuShippingMode, temuAnimEnabled }) => {

      if (temuAnimEnabled === false) {
        animEnabled = false;
        document.getElementById("animToggle").checked = false;
        document.body.classList.add("no-anim");
      }

      if (temuShippingMode) applyMode(temuShippingMode);

      if (temuLastScrape) {
        scrapedData = temuLastScrape;
        // Restore silently — no animation, instant
        renderData(temuLastScrape, false);
        document.getElementById("copyAllBtn").disabled = false;

        if (tab?.url?.includes("temu.com")) {
          const cur  = (tab.url.match(/g-(\d{10,20})\.html/i) ||
                        tab.url.match(/goods_id=(\d{8,20})/i) || [])[1] || "";
          const last = (temuLastScrape?.atcUrl?.match(/goods_id=(\d{8,20})/i) || [])[1] || "";
          if (cur && cur !== last) {
            setStatus("New product — scraping…", "loading");
            setTimeout(() => runScrape(), 200);
          } else {
            setStatus("Loaded — click to copy or re-scrape", "ok");
          }
        } else {
          setStatus("Loaded — click any field to copy", "ok");
        }
      } else {
        if (tab?.url?.includes("temu.com")) {
          runScrape();
        } else {
          setStatus("Open a Temu product page first", "err");
        }
      }
    }
  );
}

init();
