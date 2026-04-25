# ⚡ Temu Quick Scraper

[TEMU QUICK SCRAPER](https://stevegates24.github.io/Temu-Quick-Scraper/)

Extract price, brand, seller, shipping info, and ATC URL from any Temu product page.  
Data **persists between sessions** — close the popup, go paste in your tool, come back and the data is still there.

---

## ✨ What it scrapes

| Field    | Example                        |
|----------|--------------------------------|
| Price    | `6.61` (number only, no symbol)|
| Brand    | `Mia Rug` (or `N/A`)          |
| Seller   | `Mia Rug Store`                |
| Shipping | `4-8 business days`            |
| ATC URL  | `https://www.temu.com/goods.html?...` |

---

## 📥 Installation

### Chrome / Edge
1. Download and extract the ZIP
2. Open `chrome://extensions/`
3. Enable **Developer Mode** (top right)
4. Click **Load Unpacked**
5. Select the extracted folder

### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.json` from the extracted folder

> **Note:** You need to supply your own icon files named `icon_16.png`, `icon_32.png`, `icon_48.png`, `icon_128.png` in the folder. You can reuse the `premium_icon_*.png` files from the original scraper — just rename them.

---

## ⚡ Usage

1. Open any Temu product page
2. Click the extension icon — it **auto-scrapes** immediately
3. Click any field to copy that value individually
4. Or click **Copy All** to copy all fields tab-separated (paste into Excel/Sheets)

### Persistence behaviour
- **Same product:** reopen popup → last scraped data is shown instantly, no re-scrape needed
- **New product:** popup detects a different product URL and auto-scrapes automatically
- **Non-Temu page:** popup shows last scraped data so you can still copy fields while working in your tool

---

## 🔒 Privacy

All processing happens locally in your browser.  
No data is sent anywhere.
