// ExpenserBudget.js - Standalone Budget Widget
// Shows monthly budget progress with bar, spent/limit, and remaining.
// Supports small, medium, large widget sizes.

const fm = FileManager.iCloud();
let BASE;
try {
  BASE = fm.bookmarkedPath("expenser");
} catch (e) {
  let w = new ListWidget();
  w.addText("Setup needed").font = Font.semiboldSystemFont(14);
  w.addText("Add 'expenser' bookmark").font = Font.systemFont(11);
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

// --- Helpers ---

function todayStr() {
  let df = new DateFormatter();
  df.dateFormat = "yyyy-MM-dd";
  return df.string(new Date());
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

function monthLabel() {
  let df = new DateFormatter();
  df.dateFormat = "MMMM";
  return df.string(new Date());
}

function daysLeftInMonth() {
  let now = new Date();
  let lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate();
}

// --- Load Data ---

let cfgData = await loadJSON(BASE + "/config.json");
let expenses = (await loadJSON(BASE + "/expenses.json")) || [];

let budget = (cfgData && cfgData.budget) || {};
let budgetLimit = (budget && budget.monthly_limit) || 0;
let excludedCats = budget.excluded_categories || ["Rent & Housing", "EMI & Loans", "Income", "Investments", "Self Transfer", "Cash Withdrawal", "Insurance"];

let today = todayStr();
let monthStart = today.substring(0, 8) + "01";
let monthTxns = expenses.filter(tx => tx.date >= monthStart && tx.date <= today);

let budgetSpent = 0;
monthTxns.forEach(tx => {
  if (tx.type === "debit" && !excludedCats.includes(tx.category)) {
    budgetSpent += tx.amount;
  }
});

let budgetPct = budgetLimit > 0 ? budgetSpent / budgetLimit : 0;
let budgetRemaining = budgetLimit - budgetSpent;
let daysLeft = daysLeftInMonth();

// --- Colors ---

let bg = Color.dynamic(new Color("#ffffff"), new Color("#1c1c1e"));
let primary = Color.dynamic(new Color("#1d1d1f"), new Color("#f5f5f7"));
let secondary = Color.dynamic(new Color("#86868b"), new Color("#86868b"));
let dimLabel = Color.dynamic(new Color("#aeaeb2"), new Color("#636366"));
let barTrackColor = Color.dynamic(new Color("#e8e8ed"), new Color("#38383a"));

let green = new Color("#34c759");
let amber = new Color("#ff9f0a");
let red = new Color("#ff3b30");
let budgetColor = budgetPct < 0.6 ? green : budgetPct < 0.9 ? amber : red;

// --- Widget ---

let size = config.widgetFamily || "medium";
let w = new ListWidget();
w.backgroundColor = bg;

if (budgetLimit <= 0) {
  w.setPadding(16, 16, 16, 16);
  let t = w.addText("No Budget Set");
  t.font = Font.semiboldSystemFont(14);
  t.textColor = secondary;
  t.lineLimit = 1;
  w.addSpacer();
  let h = w.addText("Set budget in Expenser → Set Budget");
  h.font = Font.systemFont(11);
  h.textColor = dimLabel;
  h.lineLimit = 2;
  h.minimumScaleFactor = 0.8;
} else if (size === "small") {
  w.setPadding(14, 14, 14, 14);

  let hdr = w.addText(monthLabel() + " Budget");
  hdr.font = Font.boldSystemFont(12);
  hdr.textColor = primary;
  hdr.lineLimit = 1;
  w.addSpacer(8);

  // Spent amount
  let spentTxt = w.addText(formatShort(budgetSpent));
  spentTxt.font = Font.boldSystemFont(26);
  spentTxt.textColor = budgetColor;
  spentTxt.minimumScaleFactor = 0.6;
  spentTxt.lineLimit = 1;

  let ofTxt = w.addText("of " + formatShort(budgetLimit));
  ofTxt.font = Font.systemFont(12);
  ofTxt.textColor = secondary;
  ofTxt.lineLimit = 1;
  w.addSpacer(8);

  // Bar
  let track = w.addStack();
  track.layoutHorizontally();
  track.cornerRadius = 4;
  track.size = new Size(130, 8);
  track.backgroundColor = barTrackColor;
  let fillW = Math.max(0, Math.min(budgetPct, 1)) * 130;
  if (fillW > 0) {
    let fill = track.addStack();
    fill.backgroundColor = budgetColor;
    fill.cornerRadius = 4;
    fill.size = new Size(fillW, 8);
  }
  track.addSpacer();
  w.addSpacer(4);

  // Remaining
  let remText = budgetRemaining >= 0
    ? formatShort(budgetRemaining) + " left"
    : formatShort(Math.abs(budgetRemaining)) + " over";
  let rem = w.addText(remText);
  rem.font = Font.mediumSystemFont(11);
  rem.textColor = budgetColor;
  rem.lineLimit = 1;
  rem.minimumScaleFactor = 0.7;
  w.addSpacer();

} else if (size === "medium") {
  w.setPadding(16, 20, 16, 20);

  // Header row
  let headerRow = w.addStack();
  headerRow.layoutHorizontally();
  headerRow.centerAlignContent();
  let hdr = headerRow.addText(monthLabel() + " Budget");
  hdr.font = Font.boldSystemFont(14);
  hdr.textColor = primary;
  hdr.lineLimit = 1;
  headerRow.addSpacer();
  let pctText = headerRow.addText(Math.round(budgetPct * 100) + "%");
  pctText.font = Font.boldSystemFont(14);
  pctText.textColor = budgetColor;
  pctText.lineLimit = 1;
  w.addSpacer(10);

  // Spent / Limit
  let amtRow = w.addStack();
  amtRow.layoutHorizontally();
  amtRow.centerAlignContent();
  let spentLbl = amtRow.addText(formatShort(budgetSpent));
  spentLbl.font = Font.boldSystemFont(28);
  spentLbl.textColor = budgetColor;
  spentLbl.minimumScaleFactor = 0.6;
  spentLbl.lineLimit = 1;
  let ofLbl = amtRow.addText("  /  " + formatShort(budgetLimit));
  ofLbl.font = Font.systemFont(16);
  ofLbl.textColor = secondary;
  ofLbl.minimumScaleFactor = 0.7;
  ofLbl.lineLimit = 1;
  w.addSpacer(10);

  // Bar
  let barWidth = 290;
  let track = w.addStack();
  track.layoutHorizontally();
  track.cornerRadius = 5;
  track.size = new Size(barWidth, 10);
  track.backgroundColor = barTrackColor;
  let fillW = Math.max(0, Math.min(budgetPct, 1)) * barWidth;
  if (fillW > 0) {
    let fill = track.addStack();
    fill.backgroundColor = budgetColor;
    fill.cornerRadius = 5;
    fill.size = new Size(fillW, 10);
  }
  track.addSpacer();
  w.addSpacer(6);

  // Footer
  let footRow = w.addStack();
  footRow.layoutHorizontally();
  let remText = budgetRemaining >= 0
    ? formatShort(budgetRemaining) + " left"
    : formatShort(Math.abs(budgetRemaining)) + " over";
  let rem = footRow.addText(remText);
  rem.font = Font.mediumSystemFont(12);
  rem.textColor = budgetColor;
  rem.lineLimit = 1;
  rem.minimumScaleFactor = 0.7;
  footRow.addSpacer();
  let days = footRow.addText(daysLeft + " days left");
  days.font = Font.systemFont(11);
  days.textColor = dimLabel;
  days.lineLimit = 1;

} else {
  // Large
  w.setPadding(18, 22, 18, 22);

  let hdr = w.addText(monthLabel() + " Budget");
  hdr.font = Font.boldSystemFont(16);
  hdr.textColor = primary;
  hdr.lineLimit = 1;
  w.addSpacer(12);

  // Big spent amount
  let spentTxt = w.addText(formatShort(budgetSpent));
  spentTxt.font = Font.boldSystemFont(38);
  spentTxt.textColor = budgetColor;
  spentTxt.minimumScaleFactor = 0.6;
  spentTxt.lineLimit = 1;

  let ofTxt = w.addText("of " + formatShort(budgetLimit));
  ofTxt.font = Font.systemFont(16);
  ofTxt.textColor = secondary;
  ofTxt.lineLimit = 1;
  w.addSpacer(14);

  // Bar
  let barWidth = 310;
  let track = w.addStack();
  track.layoutHorizontally();
  track.cornerRadius = 6;
  track.size = new Size(barWidth, 12);
  track.backgroundColor = barTrackColor;
  let fillW = Math.max(0, Math.min(budgetPct, 1)) * barWidth;
  if (fillW > 0) {
    let fill = track.addStack();
    fill.backgroundColor = budgetColor;
    fill.cornerRadius = 6;
    fill.size = new Size(fillW, 12);
  }
  track.addSpacer();
  w.addSpacer(8);

  // Remaining + days
  let footRow = w.addStack();
  footRow.layoutHorizontally();
  let remText = budgetRemaining >= 0
    ? formatShort(budgetRemaining) + " left"
    : formatShort(Math.abs(budgetRemaining)) + " over";
  let rem = footRow.addText(remText);
  rem.font = Font.mediumSystemFont(14);
  rem.textColor = budgetColor;
  rem.lineLimit = 1;
  rem.minimumScaleFactor = 0.7;
  footRow.addSpacer();
  let days = footRow.addText(daysLeft + " days left");
  days.font = Font.systemFont(13);
  days.textColor = dimLabel;
  days.lineLimit = 1;

  w.addSpacer();

  // Daily allowance hint
  if (budgetRemaining > 0 && daysLeft > 0) {
    let daily = Math.round(budgetRemaining / daysLeft);
    let hint = w.addText("~" + formatShort(daily) + "/day safe to spend");
    hint.font = Font.systemFont(12);
    hint.textColor = dimLabel;
    hint.lineLimit = 1;
    hint.minimumScaleFactor = 0.7;
  }
}

Script.setWidget(w);
Script.complete();
