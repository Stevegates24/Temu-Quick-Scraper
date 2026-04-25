// popup.js — Temu Quick Scraper v1.1

let scrapedData = null;

// ── Status ────────────────────────────────────────────────────
function setStatus(text, type = "") {
  const dot = document.getElementById("sDot");
  const txt = document.getElementById("sTxt");
  dot.className = "status-indicator " + type;
  txt.className = "status-label " + type;
  txt.textContent = text;
}

// ── Render fields ─────────────────────────────────────────────
function setField(fieldId, value, extraClass = "") {
  const field = document.getElementById(fieldId);
  if (!field) return;
  const valEl = field.querySelector(".field-val");
  if (!valEl) return;
  valEl.innerHTML = "";

  if (value && value !== "—") {
    valEl.textContent = value;
    valEl.className = "field-val" + (extraClass ? " " + extraClass : "");
  } else {
    valEl.textContent = "—";
    valEl.className = "field-val na";
  }
}

function renderData(data) {
  setField("f-price",    data.price    || "—");
  setField("f-brand",    data.brand    || "N/A");
  setField("f-seller",   data.seller   || "N/A");
  setField("f-shipping", data.shipping || "N/A");
  setField("f-atc",      data.atcUrl   || "—", "link");
  document.getElementById("copyAllBtn").disabled = false;
}

function showShimmers() {
  ["f-price","f-brand","f-seller","f-shipping","f-atc"].forEach(id => {
    const field = document.getElementById(id);
    if (!field) return;
    const valEl = field.querySelector(".field-val");
    if (valEl) {
      valEl.className = "field-val";
      valEl.innerHTML = '<div class="shimmer-line"></div>';
    }
  });
}

// ── Copy ──────────────────────────────────────────────────────
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

function flashCopied(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.add("copied");
  setTimeout(() => field.classList.remove("copied"), 1400);
}

// ── Per-field click-to-copy ───────────────────────────────────
function setupFieldClicks() {
  const fieldMap = {
    "f-price":    () => scrapedData?.price    || "",
    "f-brand":    () => scrapedData?.brand    || "",
    "f-seller":   () => scrapedData?.seller   || "",
    "f-shipping": () => scrapedData?.shipping || "",
    "f-atc":      () => scrapedData?.atcUrl   || "",
  };
  Object.entries(fieldMap).forEach(([id, getValue]) => {
    document.getElementById(id)?.addEventListener("click", async () => {
      if (!scrapedData) return;
      const val = getValue();
      if (!val || val === "—" || val === "N/A") return;
      if (await copyText(val)) flashCopied(id);
    });
  });
}

// ── Build TSV ─────────────────────────────────────────────────
function buildTsv(data) {
  return [
    data.price    || "",
    data.brand    || "",
    data.seller   || "",
    data.shipping || "",
    data.atcUrl   || "",
  ].join("\t");
}

// ── Copy All ──────────────────────────────────────────────────
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

// ── Scrape ────────────────────────────────────────────────────
document.getElementById("scrapeBtn").addEventListener("click", () => runScrape());

async function runScrape() {
  showShimmers();
  setStatus("Scraping…", "loading");
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
    document.getElementById("scrapeBtn").disabled = false;
    return;
  }

  try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] }); }
  catch (_) {}

  chrome.tabs.sendMessage(tab.id, { type: "QUICK_SCRAPE" }, async (data) => {
    document.getElementById("scrapeBtn").disabled = false;

    if (chrome.runtime.lastError || !data) {
      setStatus("Failed — refresh page & retry", "err");
      return;
    }

    scrapedData = data;
    chrome.storage.local.set({ temuLastScrape: data });
    renderData(data);

    // Auto-copy TSV immediately
    const copied = await copyText(buildTsv(data));
    setStatus(copied ? "Done — all copied to clipboard" : "Done — click field to copy", "ok");
  });
}

// ── Init ──────────────────────────────────────────────────────
async function init() {
  setupFieldClicks();

  let tab;
  try { [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); }
  catch (e) {}

  chrome.storage.local.get("temuLastScrape", ({ temuLastScrape }) => {
    if (temuLastScrape) {
      scrapedData = temuLastScrape;
      renderData(temuLastScrape);

      if (tab?.url?.includes("temu.com")) {
        const cur = (tab.url.match(/g-(\d{10,20})\.html/i) || tab.url.match(/goods_id=(\d{8,20})/i) || [])[1] || "";
        const last = (temuLastScrape?.atcUrl?.match(/goods_id=(\d{8,20})/i) || [])[1] || "";
        if (cur && cur !== last) {
          setStatus("New product — scraping…", "loading");
          setTimeout(() => runScrape(), 200);
        } else {
          setStatus("Data loaded — click to copy or re-scrape", "ok");
        }
      } else {
        setStatus("Data loaded — click any field to copy", "ok");
      }
    } else {
      if (tab?.url?.includes("temu.com")) {
        runScrape();
      } else {
        setStatus("Open a Temu product page first", "err");
      }
    }
  });
}

init();
