# ⚡ Temu Quick Scraper

**[→ Visit the extension page](https://stevegates24.github.io/Temu-Quick-Scraper/)**

Extract price, brand, seller, shipping info, and ATC URL from any Temu product page — auto-copied to clipboard the moment scraping finishes. Data **persists between sessions** so you can close the popup, paste in your tool, and come back whenever.

---

## ✨ What it scrapes

| Field    | Example |
|----------|---------|
| Price    | `6.61` (number only, no currency symbol) |
| Brand    | `Mia Rug` (or `N/A` if not listed) |
| Seller   | `Mia Rug Store` |
| Shipping | `May 3-15` or `Fastest delivery in 3 days` |
| ATC URL  | `https://www.temu.com/goods.html?goods_id=...` |

---

## 📥 Installation

### Chrome / Edge
1. [Download the ZIP](https://github.com/Stevegates24/Temu-Quick-Scraper/archive/refs/heads/main.zip) and extract it
2. Open `chrome://extensions/`
3. Enable **Developer Mode** (toggle, top right)
4. Click **Load Unpacked**
5. Select the extracted folder

### Firefox
Install directly from the Firefox Add-ons store — no developer mode needed:

**[→ Install on Firefox](https://addons.mozilla.org/en-US/firefox/addon/temu-quick-scraper/)**

---

## ⚡ Usage

1. Open any Temu product page and let it fully load
2. Click the extension icon — scraping starts **automatically**
3. All 5 fields are **copied to your clipboard** as tab-separated text instantly
4. Paste into your spreadsheet or tool in one shot (`Ctrl+V`)
5. Or reopen the popup and click any individual field to copy just that value

### Shipping source setting
Click the **⚙️ gear icon** in the popup to choose how shipping is scraped:

| Mode | Speed | How it works |
|------|-------|--------------|
| **⚡ Page** (default) | Instant | Reads delivery text already visible on the page — no clicks |
| **🔍 Modal** | ~1.5s | Opens the shipping panel, reads the delivery table — more thorough |

Your choice is saved and persists between sessions.

### Persistence behaviour
- **Same product:** reopen popup → last scraped data loads instantly, no re-scrape needed
- **New product:** popup detects a different product and auto-scrapes automatically
- **Non-Temu page:** last scraped data is still shown so you can keep copying fields while working in your tool

---

## 🔒 Privacy

Everything runs locally in your browser.  
No data is collected, stored externally, or sent anywhere.

---

*Built by Steve Gates · v1.2 · Not affiliated with Temu or Whaleco Inc.*
