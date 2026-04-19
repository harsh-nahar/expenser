// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: chart-bar;

// ExpenserDash.js - Native UITable expense dashboard for Scriptable

const fm = FileManager.iCloud();
let BASE;
try {
  BASE = fm.bookmarkedPath("expenser");
} catch (e) {
  let a = new Alert();
  a.title = "Setup needed";
  a.message = "Add 'expenser' bookmark in Scriptable";
  a.addAction("OK");
  await a.presentAlert();
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

let CONFIG = (await loadJSON(BASE + "/config.json")) || {};
let expenses = (await loadJSON(BASE + "/expenses.json")) || [];

function fmt(n) {
  if (n === null || n === undefined) return "0.00";
  let abs = Math.abs(n);
  let s = abs.toFixed(2);
  let parts = s.split(".");
  let intPart = parts[0];
  let decPart = parts[1];
  let last3 = intPart.slice(-3);
  let rest = intPart.slice(0, -3);
  if (rest.length > 0) last3 = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
  return (n < 0 ? "-" : "") + last3 + "." + decPart;
}

function todayStr() {
  let df = new DateFormatter();
  df.dateFormat = "yyyy-MM-dd";
  return df.string(new Date());
}

function friendlyDate(s) {
  if (!s) return "";
  let p = s.split("-");
  let months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return parseInt(p[2]) + " " + months[parseInt(p[1]) - 1];
}

function acctName(key) {
  if (CONFIG.accounts && CONFIG.accounts[key]) return CONFIG.accounts[key].name || key;
  return key || "Unknown";
}

async function pickPeriod() {
  let a = new Alert();
  a.title = "Select Period";
  a.addAction("Today");
  a.addAction("This Week");
  a.addAction("This Month");
  a.addAction("Last 30 Days");
  a.addAction("This Year");
  a.addAction("All Time");
  a.addCancelAction("Cancel");
  let idx = await a.presentAlert();
  if (idx < 0) return null;
  let now = new Date();
  let y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  let start, label;
  let df = new DateFormatter();
  df.dateFormat = "yyyy-MM-dd";
  if (idx === 0) { start = todayStr(); label = "Today"; }
  else if (idx === 1) {
    let dow = now.getDay();
    let diff = dow === 0 ? 6 : dow - 1;
    start = df.string(new Date(y, m, d - diff)); label = "This Week";
  }
  else if (idx === 2) { start = df.string(new Date(y, m, 1)); label = "This Month"; }
  else if (idx === 3) { start = df.string(new Date(y, m, d - 30)); label = "Last 30 Days"; }
  else if (idx === 4) { start = y + "-01-01"; label = "This Year"; }
  else { start = "2000-01-01"; label = "All Time"; }
  return { start, end: todayStr(), label };
}

async function showDashboard(period) {
  let filtered = expenses.filter(e => e.date >= period.start && e.date <= period.end);
  let debits = filtered.filter(e => e.type === "debit" || (!e.type && e.amount > 0));
  let spendExclude = ["Self Transfer", "Cash Withdrawal", "Income", "Investments"];
  let realDebits = debits.filter(e => !spendExclude.includes(e.category));
  let totalSpent = realDebits.reduce((s, e) => s + (e.amount || 0), 0);

  let table = new UITable();
  table.showSeparators = true;

  // Period header
  let hdr = new UITableRow();
  hdr.isHeader = true;
  hdr.height = 54;
  let hdrCell = hdr.addText(period.label, period.start + " to " + period.end);
  hdrCell.titleFont = Font.boldSystemFont(18);
  hdrCell.subtitleFont = Font.systemFont(12);
  hdrCell.subtitleColor = Color.gray();
  table.addRow(hdr);

  // Overview
  addSection(table, "Overview");
  addKV(table, "Spent", "\u20B9" + fmt(totalSpent), Color.red());
  addKV(table, "Transactions", String(filtered.length));

  // Budget - only show for "This Month" period
  let budgetCfg = CONFIG.budget || {};
  let budgetLimit = budgetCfg.monthly_limit || 0;
  let excludedCats = budgetCfg.excluded_categories || ["Rent & Housing","EMI & Loans","Income","Investments","Self Transfer","Cash Withdrawal","Insurance"];
  let isMonthly = period.label === "This Month";
  if (budgetLimit > 0 && isMonthly) {
    addSection(table, "Budget");
    let budgetSpent = debits.filter(e => !excludedCats.includes(e.category))
      .reduce((s, e) => s + (e.amount || 0), 0);
    let pct = Math.round((budgetSpent / budgetLimit) * 100);
    let remaining = budgetLimit - budgetSpent;
    addKV(table, "Budgeted Spend", "\u20B9" + fmt(budgetSpent) + " / \u20B9" + fmt(budgetLimit));
    let barRow = new UITableRow();
    barRow.height = 24;
    let filled = Math.min(Math.round(pct / 5), 20);
    let barText = "\u2588".repeat(filled) + "\u2591".repeat(20 - filled) + " " + pct + "%";
    let barCell = barRow.addText(barText);
    barCell.titleFont = Font.systemFont(10);
    barCell.titleColor = pct <= 60 ? new Color("#34c759") : pct <= 85 ? new Color("#ff9f0a") : Color.red();
    table.addRow(barRow);
    if (remaining >= 0) {
      addKV(table, "Remaining", "\u20B9" + fmt(remaining), new Color("#34c759"));
    } else {
      addKV(table, "Over budget by", "\u20B9" + fmt(Math.abs(remaining)), Color.red());
    }
  }

  // Categories
  let catTotals = {};
  debits.forEach(e => { catTotals[e.category || "Uncategorized"] = (catTotals[e.category || "Uncategorized"] || 0) + (e.amount || 0); });
  let allDebitTotal = debits.reduce((s, e) => s + (e.amount || 0), 0);
  let sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  if (sortedCats.length > 0) {
    addSection(table, "Categories");
    sortedCats.forEach(([cat, total]) => {
      let pct = allDebitTotal > 0 ? Math.round(total / allDebitTotal * 100) : 0;
      let row = new UITableRow();
      row.height = 44;
      let nameCell = row.addText(cat, pct + "% of spending");
      nameCell.titleFont = Font.systemFont(15);
      nameCell.subtitleFont = Font.systemFont(11);
      nameCell.subtitleColor = Color.gray();
      nameCell.widthWeight = 65;
      let amtCell = row.addText("\u20B9" + fmt(total));
      amtCell.titleFont = Font.mediumSystemFont(15);
      amtCell.rightAligned();
      amtCell.widthWeight = 35;
      table.addRow(row);
    });
  }

  // Accounts
  let acctTotals = {};
  debits.forEach(e => { let a = e.account || "Default"; acctTotals[a] = (acctTotals[a] || 0) + (e.amount || 0); });
  let sortedAccts = Object.entries(acctTotals).sort((a, b) => b[1] - a[1]);
  if (sortedAccts.length > 0) {
    addSection(table, "By Account");
    sortedAccts.forEach(([acc, total]) => {
      let row = new UITableRow();
      row.height = 44;
      let nameCell = row.addText(acctName(acc));
      nameCell.titleFont = Font.systemFont(15);
      nameCell.widthWeight = 65;
      let amtCell = row.addText("\u20B9" + fmt(total));
      amtCell.titleFont = Font.mediumSystemFont(15);
      amtCell.rightAligned();
      amtCell.widthWeight = 35;
      table.addRow(row);
    });
  }

  // Daily spending
  let dailyTotals = {};
  debits.forEach(e => { dailyTotals[e.date] = (dailyTotals[e.date] || 0) + (e.amount || 0); });
  let sortedDays = Object.entries(dailyTotals).sort((a, b) => b[0].localeCompare(a[0]));
  if (sortedDays.length > 0) {
    let maxDay = Math.max(...sortedDays.map(d => d[1]));
    addSection(table, "Daily Spending");
    sortedDays.slice(0, 14).forEach(([day, total]) => {
      let row = new UITableRow();
      row.height = 36;
      let dateCell = row.addText(friendlyDate(day));
      dateCell.titleFont = Font.systemFont(13);
      dateCell.widthWeight = 25;
      let barW = maxDay > 0 ? Math.round(total / maxDay * 20) : 0;
      let barCell = row.addText("\u2588".repeat(barW));
      barCell.titleFont = Font.systemFont(11);
      barCell.titleColor = new Color("#007aff");
      barCell.widthWeight = 45;
      let amtCell = row.addText("\u20B9" + fmt(total));
      amtCell.titleFont = Font.systemFont(13);
      amtCell.rightAligned();
      amtCell.widthWeight = 30;
      table.addRow(row);
    });
  }

  // Recent transactions
  let recent = filtered.sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || ""))).slice(0, 20);
  if (recent.length > 0) {
    addSection(table, "Recent Transactions");
    recent.forEach(tx => {
      let row = new UITableRow();
      row.height = 52;
      let isDebit = tx.type === "debit" || (!tx.type && tx.amount > 0);
      let sign = isDebit ? "-" : "+";
      let label = tx.merchant || tx.category || "Unknown";
      let sub = friendlyDate(tx.date) + " " + (tx.time || "") + "  " + (tx.category || "") + "  " + acctName(tx.account);
      let nameCell = row.addText(label, sub);
      nameCell.titleFont = Font.systemFont(15);
      nameCell.subtitleFont = Font.systemFont(11);
      nameCell.subtitleColor = Color.gray();
      nameCell.widthWeight = 65;
      let amtCell = row.addText(sign + "\u20B9" + fmt(tx.amount));
      amtCell.titleFont = Font.mediumSystemFont(15);
      amtCell.titleColor = isDebit ? Color.red() : new Color("#34c759");
      amtCell.rightAligned();
      amtCell.widthWeight = 35;
      row.dismissOnSelect = false;
      row.onSelect = async () => { await editTx(tx); };
      table.addRow(row);
    });
  }

  // Actions
  addSection(table, "Actions");
  let cpRow = new UITableRow();
  cpRow.height = 44;
  let cpCell = cpRow.addText("Change Period");
  cpCell.titleFont = Font.systemFont(16);
  cpCell.titleColor = new Color("#007aff");
  cpRow.dismissOnSelect = true;
  cpRow.onSelect = async () => {
    let p = await pickPeriod();
    if (p) await showDashboard(p);
  };
  table.addRow(cpRow);

  await table.present(false);
}

async function editTx(tx) {
  let acctName = CONFIG.accounts && CONFIG.accounts[tx.account] ? CONFIG.accounts[tx.account].name : (tx.account || "Unknown");
  let a = new Alert();
  a.title = "Edit Transaction";
  a.message = (tx.merchant || "Unknown") + "\n\u20B9" + fmt(tx.amount) + " on " + tx.date + "\n" + acctName;
  a.addAction("Change Category");
  a.addAction("Change Merchant");
  a.addAction("Change Amount");
  a.addAction("Change Account");
  a.addAction("Change Note");
  a.addDestructiveAction("Delete");
  a.addCancelAction("Cancel");
  let idx = await a.presentAlert();
  if (idx < 0) return;
  let txIdx = expenses.findIndex(e => e.id === tx.id);
  if (txIdx < 0) return;

  if (idx === 0) {
    let cats = CONFIG.categories || ["Food & Dining","Groceries","Transport","Shopping","Utilities & Bills","Miscellaneous"];
    let ca = new Alert();
    ca.title = "Select Category";
    cats.forEach(c => ca.addAction(c));
    ca.addCancelAction("Cancel");
    let ci = await ca.presentAlert();
    if (ci >= 0 && ci < cats.length) {
      expenses[txIdx].category = cats[ci];
      if (tx.merchant) {
        let ra = new Alert();
        ra.title = "Remember?";
        ra.message = `Always categorize "${tx.merchant}" as ${cats[ci]}?`;
        ra.addAction("Yes");
        ra.addCancelAction("No");
        if ((await ra.presentAlert()) === 0) {
          if (!CONFIG.merchant_map) CONFIG.merchant_map = {};
          CONFIG.merchant_map[tx.merchant.toLowerCase()] = cats[ci];
          fm.writeString(BASE + "/config.json", JSON.stringify(CONFIG, null, 2));
        }
      }
      await save("Category updated");
    }
  } else if (idx === 1) {
    let ma = new Alert();
    ma.title = "Merchant Name";
    ma.addTextField("Merchant", tx.merchant || "");
    ma.addAction("Save");
    ma.addCancelAction("Cancel");
    if ((await ma.presentAlert()) === 0) {
      expenses[txIdx].merchant = ma.textFieldValue(0);
      await save("Merchant updated");
    }
  } else if (idx === 2) {
    let aa = new Alert();
    aa.title = "Amount";
    aa.addTextField("Amount", String(tx.amount || 0));
    aa.addAction("Save");
    aa.addCancelAction("Cancel");
    if ((await aa.presentAlert()) === 0) {
      let val = parseFloat(aa.textFieldValue(0));
      if (!isNaN(val) && val > 0) { expenses[txIdx].amount = val; await save("Amount updated"); }
    }
  } else if (idx === 3) {
    let acctKeys = Object.keys(CONFIG.accounts || {});
    if (acctKeys.length === 0) return;
    let acctNames = acctKeys.map(k => CONFIG.accounts[k].name || k);
    let pa = new Alert();
    pa.title = "Change Account";
    acctNames.forEach(n => pa.addAction(n));
    pa.addCancelAction("Cancel");
    let pi = await pa.presentAlert();
    if (pi >= 0 && pi < acctKeys.length) {
      expenses[txIdx].account = acctKeys[pi];
      await save("Account updated");
    }
  } else if (idx === 4) {
    let na = new Alert();
    na.title = "Note";
    na.addTextField("Note", tx.note || "");
    na.addAction("Save");
    na.addCancelAction("Cancel");
    if ((await na.presentAlert()) === 0) {
      expenses[txIdx].note = na.textFieldValue(0);
      await save("Note updated");
    }
  } else if (idx === 5) {
    let da = new Alert();
    da.title = "Delete this transaction?";
    da.message = (tx.merchant || "Unknown") + " \u2014 \u20B9" + fmt(tx.amount);
    da.addDestructiveAction("Delete");
    da.addCancelAction("Cancel");
    if ((await da.presentAlert()) === 0) { expenses.splice(txIdx, 1); await save("Transaction deleted"); }
  }
}

async function save(msg) {
  fm.writeString(BASE + "/expenses.json", JSON.stringify(expenses, null, 2));
  let d = new Alert();
  d.title = "✅ " + (msg || "Saved");
  d.addAction("OK");
  await d.presentAlert();
}

function addSection(table, title) {
  // Spacer row for visual breathing room
  let spacer = new UITableRow();
  spacer.height = 12;
  spacer.backgroundColor = Color.dynamic(new Color("#f2f2f7"), new Color("#000000"));
  table.addRow(spacer);

  let row = new UITableRow();
  row.isHeader = true;
  row.height = 40;
  let cell = row.addText(title.toUpperCase());
  cell.titleFont = Font.boldSystemFont(13);
  cell.titleColor = Color.gray();
  table.addRow(row);
}

function addKV(table, label, value, valueColor) {
  let row = new UITableRow();
  row.height = 44;
  let lc = row.addText(label);
  lc.titleFont = Font.systemFont(15);
  lc.widthWeight = 55;
  let vc = row.addText(value);
  vc.titleFont = Font.mediumSystemFont(15);
  vc.rightAligned();
  vc.widthWeight = 45;
  if (valueColor) vc.titleColor = valueColor;
  table.addRow(row);
}

let period = await pickPeriod();
if (period) await showDashboard(period);
Script.complete();
