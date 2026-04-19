// ExpenserWidget.js - D/W/M Spending Widget
// Shows Today, This Week, This Month spending at a glance.
// Apple HIG-inspired. Supports small, medium, large.

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

const fm = FileManager.iCloud();
let BASE;
try {
  BASE = fm.bookmarkedPath("expenser");
} catch (e) {
  let w = new ListWidget();
  w.addText("Setup needed").font = Font.semiboldSystemFont(15);
  w.addText("Add 'expenser' bookmark").font = Font.systemFont(12);
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayStr() {
  let df = new DateFormatter();
  df.dateFormat = "yyyy-MM-dd";
  return df.string(new Date());
}

function weekStartStr() {
  let now = new Date();
  let dow = now.getDay();
  let diff = dow === 0 ? 6 : dow - 1;
  let ws = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  let df = new DateFormatter();
  df.dateFormat = "yyyy-MM-dd";
  return df.string(ws);
}

function monthStartStr() {
  let now = new Date();
  let df = new DateFormatter();
  df.dateFormat = "yyyy-MM-dd";
  return df.string(new Date(now.getFullYear(), now.getMonth(), 1));
}

function shortCurrency(num) {
  if (num == null || num === 0) return "0";
  let n = Math.abs(num);
  if (n >= 100000) {
    let v = (n / 100000).toFixed(1);
    return v.replace(/\.0$/, "") + "L";
  }
  if (n >= 10000) {
    let v = (n / 1000).toFixed(1);
    return v.replace(/\.0$/, "") + "k";
  }
  // Full Indian format below 10,000
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/, ",");
}

// ---------------------------------------------------------------------------
// Load and process data
// ---------------------------------------------------------------------------

let expenses = (await loadJSON(BASE + "/expenses.json")) || [];

let today = todayStr();
let weekStart = weekStartStr();
let monthStart = monthStartStr();

let daySpent = 0, weekSpent = 0, monthSpent = 0;

expenses.forEach(tx => {
  if (tx.type !== "debit") return;
  if (!tx.date) return;
  let amt = tx.amount || 0;
  if (tx.date >= monthStart && tx.date <= today) monthSpent += amt;
  if (tx.date >= weekStart && tx.date <= today) weekSpent += amt;
  if (tx.date === today) daySpent += amt;
});

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

let bg = Color.dynamic(new Color("#ffffff"), new Color("#1c1c1e"));
let primary = Color.dynamic(new Color("#1d1d1f"), new Color("#f5f5f7"));
let dimLabel = Color.dynamic(new Color("#aeaeb2"), new Color("#636366"));

// ---------------------------------------------------------------------------
// Widget size
// ---------------------------------------------------------------------------

let widgetSize = config.widgetFamily || "medium";

// ---------------------------------------------------------------------------
// Build widget
// ---------------------------------------------------------------------------

let w = new ListWidget();
w.backgroundColor = bg;

function addDWMRow(parent, letter, amount, amtSize, lblSize) {
  let row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();

  let lbl = row.addText(letter);
  lbl.font = Font.boldRoundedSystemFont(lblSize);
  lbl.textColor = dimLabel;
  lbl.lineLimit = 1;

  row.addSpacer(6);

  let val = row.addText(shortCurrency(amount));
  val.font = Font.boldSystemFont(amtSize);
  val.textColor = primary;
  val.minimumScaleFactor = 0.5;
  val.lineLimit = 1;

  row.addSpacer();
}

// ---- SMALL ----
if (widgetSize === "small") {
  w.setPadding(14, 14, 14, 14);

  addDWMRow(w, "D", daySpent, 24, 14);
  w.addSpacer();
  addDWMRow(w, "W", weekSpent, 24, 14);
  w.addSpacer();
  addDWMRow(w, "M", monthSpent, 24, 14);

// ---- MEDIUM ----
} else if (widgetSize === "medium") {
  w.setPadding(16, 20, 16, 20);

  let row = w.addStack();
  row.layoutHorizontally();

  function addCol(parent, letter, amount) {
    let col = parent.addStack();
    col.layoutVertically();
    let lbl = col.addText(letter);
    lbl.font = Font.boldRoundedSystemFont(13);
    lbl.textColor = dimLabel;
    lbl.lineLimit = 1;
    col.addSpacer(6);
    let val = col.addText(shortCurrency(amount));
    val.font = Font.boldSystemFont(28);
    val.textColor = primary;
    val.minimumScaleFactor = 0.6;
    val.lineLimit = 1;
    col.addSpacer();
  }

  function addDiv(parent) {
    parent.addSpacer();
    let div = parent.addStack();
    div.backgroundColor = Color.dynamic(new Color("#d1d1d6"), new Color("#48484a"));
    div.size = new Size(1, 55);
    parent.addSpacer();
  }

  addCol(row, "D", daySpent);
  addDiv(row);
  addCol(row, "W", weekSpent);
  addDiv(row);
  addCol(row, "M", monthSpent);

// ---- LARGE ----
} else {
  w.setPadding(18, 20, 18, 20);

  addDWMRow(w, "D", daySpent, 34, 18);
  w.addSpacer();
  addDWMRow(w, "W", weekSpent, 34, 18);
  w.addSpacer();
  addDWMRow(w, "M", monthSpent, 34, 18);
}

Script.setWidget(w);
Script.complete();
