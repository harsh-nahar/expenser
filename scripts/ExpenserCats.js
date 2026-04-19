// ============================================================
// ExpenserCats.js - Category Spending Breakdown Widget
// Scriptable iOS home screen widget - offline, no network calls
// ============================================================

// --- Data Loading ---

const fm = FileManager.iCloud();
let BASE;
try {
  BASE = fm.bookmarkedPath("expenser");
} catch (e) {
  let w = new ListWidget();
  w.addText("Setup needed");
  Script.setWidget(w);
  Script.complete();
  return;
}

async function loadJSON(path) {
  try {
    if (fm.fileExists(path)) {
      await fm.downloadFileFromiCloud(path);
      return JSON.parse(fm.readString(path));
    }
  } catch (e) {}
  return null;
}

let expenses = (await loadJSON(BASE + "/expenses.json")) || [];

// --- Widget Size Detection (uses Scriptable global config) ---

let size = config.widgetFamily || "medium";

// --- Category Colors (muted palette) ---

const CAT_COLORS = {
  "Food & Dining": "#ff6b6b",
  "Groceries": "#51cf66",
  "Transport": "#339af0",
  "Fuel": "#ffa94d",
  "Shopping": "#cc5de8",
  "Entertainment": "#ffd43b",
  "Subscription": "#f06595",
  "Health & Medical": "#20c997",
  "Fitness": "#66d9e8",
  "Utilities & Bills": "#868e96",
  "Rent & Housing": "#a0755a",
  "EMI & Loans": "#748ffc",
  "Insurance": "#da77f2",
  "Education": "#22b8cf",
  "Travel": "#ff922b",
  "Personal Care": "#a9e34b",
  "Gifts & Donations": "#e64980",
  "Self Transfer": "#ced4da",
  "Cash Withdrawal": "#adb5bd",
  "Miscellaneous": "#adb5bd",
  "Uncategorized": "#ced4da",
  "Income": "#38d9a9",
  "Investments": "#69db7c"
};

// --- Color Palette ---

let bg = Color.dynamic(new Color("#ffffff"), new Color("#1c1c1e"));
let primary = Color.dynamic(new Color("#1d1d1f"), new Color("#f5f5f7"));
let secondary = Color.dynamic(new Color("#86868b"), new Color("#86868b"));
let barTrack = Color.dynamic(new Color("#f2f2f7"), new Color("#2c2c2e"));

// --- Helpers ---

function todayStr() {
  let df = new DateFormatter();
  df.dateFormat = "yyyy-MM-dd";
  return df.string(new Date());
}

function monthLabel() {
  let df = new DateFormatter();
  if (size === "small") {
    df.dateFormat = "MMM yyyy";
  } else {
    df.dateFormat = "MMMM";
  }
  return size === "small" ? df.string(new Date()) : df.string(new Date()) + " Spending";
}

function formatShort(num) {
  if (num === null || num === undefined || num === 0) return "0";
  let n = Math.abs(num);
  if (n >= 100000) {
    let v = (n / 100000).toFixed(1);
    return v.replace(/\.0$/, "") + "L";
  }
  if (n >= 10000) {
    let v = (n / 1000).toFixed(1);
    return v.replace(/\.0$/, "") + "k";
  }
  return formatIndian(n);
}

function formatIndian(num) {
  let n = Math.abs(Math.round(num));
  let s = n.toString();
  if (s.length <= 3) return s;
  let last3 = s.slice(-3);
  let rest = s.slice(0, -3);
  let formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return formatted + "," + last3;
}

function formatCurrency(num) {
  if (num === null || num === undefined || num === 0) return "0";
  if (size === "small") return formatShort(num);
  return formatIndian(num);
}

// --- Aggregate Data ---

let today = todayStr();
let monthStart = today.substring(0, 8) + "01";
let monthTxns = expenses.filter(tx => tx.date >= monthStart && tx.date <= today);

// Category totals - include ALL debit categories
let catTotals = {};
let totalSpent = 0;

monthTxns.forEach(tx => {
  if (tx.type === "debit") {
    totalSpent += tx.amount;
    catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount;
  }
});

let sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
let maxAmount = sorted.length > 0 ? sorted[0][1] : 1;

// --- Layout Parameters ---

let maxBars= size === "small" ? 3 : size === "large" ? 8 : 5;
let displayCats = sorted.slice(0, maxBars);

// --- Build Widget ---

let w = new ListWidget();
w.backgroundColor = bg;

// --- Small Widget ---

if (size === "small") {
  w.setPadding(12, 14, 12, 14);

  let hdr = w.addText(monthLabel());
  hdr.font = Font.boldSystemFont(12);
  hdr.textColor = primary;
  hdr.lineLimit = 1;
  w.addSpacer(6);

  if (displayCats.length === 0) {
    w.addSpacer();
    let nd = w.addText("No expenses");
    nd.font = Font.systemFont(11);
    nd.textColor = secondary;
    w.addSpacer();
  } else {
    displayCats.forEach(([cat, amount]) => {
      let barPct = maxAmount > 0 ? amount / maxAmount : 0;

      let row = w.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      let catLbl = row.addText(cat);
      catLbl.font = Font.mediumSystemFont(11);
      catLbl.textColor = primary;
      catLbl.lineLimit = 1;
      catLbl.minimumScaleFactor = 0.8;
      row.addSpacer(4);
      let amtLbl = row.addText(formatCurrency(amount));
      amtLbl.font = Font.semiboldSystemFont(11);
      amtLbl.textColor = secondary;
      amtLbl.lineLimit = 1;
      amtLbl.minimumScaleFactor = 0.7;

      w.addSpacer(2);

      let barOuter = w.addStack();
      barOuter.layoutHorizontally();
      barOuter.cornerRadius = 2.5;
      barOuter.size = new Size(130, 5);
      barOuter.backgroundColor = barTrack;
      let barInner = barOuter.addStack();
      let catColor = CAT_COLORS[cat] || "#adb5bd";
      barInner.backgroundColor = new Color(catColor, 0.65);
      barInner.cornerRadius = 2.5;
      barInner.size = new Size(Math.max(barPct * 130, 4), 5);
      barOuter.addSpacer();

      w.addSpacer(4);
    });

    if (sorted.length > maxBars) {
      let othersAmt = sorted.slice(maxBars).reduce((s, [, a]) => s + a, 0);
      let line = w.addText("+" + (sorted.length - maxBars) + " more · " + formatCurrency(othersAmt));
      line.font = Font.systemFont(10);
      line.textColor = secondary;
      line.lineLimit = 1;
      line.minimumScaleFactor = 0.7;
    }
  }
  w.addSpacer();

// --- Medium Widget ---

} else if (size === "medium") {
  w.setPadding(14, 20, 12, 20);

  let barWidth = 280;

  let headerRow = w.addStack();
  headerRow.layoutHorizontally();
  headerRow.centerAlignContent();
  let hdr = headerRow.addText(monthLabel());
  hdr.font = Font.boldSystemFont(13);
  hdr.textColor = primary;
  hdr.lineLimit = 1;
  headerRow.addSpacer();
  let totalLbl = headerRow.addText(formatCurrency(totalSpent));
  totalLbl.font = Font.boldSystemFont(13);
  totalLbl.textColor = secondary;
  totalLbl.lineLimit = 1;
  totalLbl.minimumScaleFactor = 0.7;
  w.addSpacer(6);

  if (displayCats.length === 0) {
    w.addSpacer();
    let nd = w.addText("No expenses yet");
    nd.font = Font.systemFont(12);
    nd.textColor = secondary;
    nd.centerAlignText();
    nd.lineLimit = 1;
    w.addSpacer();
  } else {
    displayCats.forEach(([cat, amount]) => {
      let pct = totalSpent > 0 ? (amount / totalSpent * 100).toFixed(0) : "0";
      let barPct = maxAmount > 0 ? amount / maxAmount : 0;

      let row = w.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      let catLbl = row.addText(cat);
      catLbl.font = Font.mediumSystemFont(12);
      catLbl.textColor = primary;
      catLbl.lineLimit = 1;
      catLbl.minimumScaleFactor = 0.75;
      row.addSpacer(6);
      let amtLbl = row.addText(formatCurrency(amount) + " (" + pct + "%)");
      amtLbl.font = Font.systemFont(11);
      amtLbl.textColor = secondary;
      amtLbl.lineLimit = 1;
      amtLbl.minimumScaleFactor = 0.7;

      let barOuter = w.addStack();
      barOuter.layoutHorizontally();
      barOuter.cornerRadius = 3;
      barOuter.size = new Size(barWidth, 5);
      barOuter.backgroundColor = barTrack;
      let barInner = barOuter.addStack();
      let catColor = CAT_COLORS[cat] || "#adb5bd";
      barInner.backgroundColor = new Color(catColor, 0.6);
      barInner.cornerRadius = 3;
      barInner.size = new Size(Math.max(barPct * barWidth, 4), 5);
      barOuter.addSpacer();

      w.addSpacer(4);
    });

    if (sorted.length > maxBars) {
      let othersAmt = sorted.slice(maxBars).reduce((s, [, a]) => s + a, 0);
      let othersPct = totalSpent > 0 ? (othersAmt / totalSpent * 100).toFixed(0) : "0";
      let line = w.addText("+" + (sorted.length - maxBars) + " more · " + formatCurrency(othersAmt) + " (" + othersPct + "%)");
      line.font = Font.systemFont(10);
      line.textColor = secondary;
      line.lineLimit = 1;
      line.minimumScaleFactor = 0.7;
    }
  }
  w.addSpacer();

// --- Large Widget ---

} else {
  w.setPadding(16, 22, 14, 22);

  let barWidth = 310;

  let headerRow = w.addStack();
  headerRow.layoutHorizontally();
  headerRow.centerAlignContent();
  let hdr = headerRow.addText(monthLabel());
  hdr.font = Font.boldSystemFont(15);
  hdr.textColor = primary;
  hdr.lineLimit = 1;
  headerRow.addSpacer();
  let totalLbl = headerRow.addText(formatCurrency(totalSpent));
  totalLbl.font = Font.boldSystemFont(15);
  totalLbl.textColor = secondary;
  totalLbl.lineLimit = 1;
  totalLbl.minimumScaleFactor = 0.7;
  w.addSpacer(8);

  if (displayCats.length === 0) {
    w.addSpacer();
    let nd = w.addText("No expenses yet");
    nd.font = Font.systemFont(14);
    nd.textColor = secondary;
    nd.centerAlignText();
    nd.lineLimit = 1;
    w.addSpacer();
  } else {
    displayCats.forEach(([cat, amount]) => {
      let pct = totalSpent > 0 ? (amount / totalSpent * 100).toFixed(0) : "0";
      let barPct = maxAmount > 0 ? amount / maxAmount : 0;

      let row = w.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      let catLbl = row.addText(cat);
      catLbl.font = Font.mediumSystemFont(13);
      catLbl.textColor = primary;
      catLbl.lineLimit = 1;
      catLbl.minimumScaleFactor = 0.75;
      row.addSpacer(6);
      let amtLbl = row.addText(formatCurrency(amount) + " (" + pct + "%)");
      amtLbl.font = Font.systemFont(12);
      amtLbl.textColor = secondary;
      amtLbl.lineLimit = 1;
      amtLbl.minimumScaleFactor = 0.7;

      let barOuter = w.addStack();
      barOuter.layoutHorizontally();
      barOuter.cornerRadius = 3;
      barOuter.size = new Size(barWidth, 6);
      barOuter.backgroundColor = barTrack;
      let barInner = barOuter.addStack();
      let catColor = CAT_COLORS[cat] || "#adb5bd";
      barInner.backgroundColor = new Color(catColor, 0.6);
      barInner.cornerRadius = 3;
      barInner.size = new Size(Math.max(barPct * barWidth, 4), 6);
      barOuter.addSpacer();

      w.addSpacer(5);
    });

    if (sorted.length > maxBars) {
      let othersAmt = sorted.slice(maxBars).reduce((s, [, a]) => s + a, 0);
      let othersPct = totalSpent > 0 ? (othersAmt / totalSpent * 100).toFixed(0) : "0";
      let line = w.addText("+" + (sorted.length - maxBars) + " more · " + formatCurrency(othersAmt) + " (" + othersPct + "%)");
      line.font = Font.systemFont(11);
      line.textColor = secondary;
      line.lineLimit = 1;
      line.minimumScaleFactor = 0.7;
    }
  }
  w.addSpacer();
}

Script.setWidget(w);
Script.complete();
