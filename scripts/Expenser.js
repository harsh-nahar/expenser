// ============================================================
// Expenser.js - Pure Expense Tracker for Scriptable (iOS)
// Triggered via iOS Shortcuts or run directly in Scriptable
// ZERO network calls - fully offline, iCloud sync only
// ============================================================

// --- File Path Setup ---
// Uses bookmarked path to access iCloud Drive > My Documents > expenses
// User must set up bookmark once in Scriptable: Settings > File Bookmarks > Add > pick the expenses folder
// Bookmark name: "expenser"
const fm = FileManager.iCloud();
let BASE;
try {
  BASE = fm.bookmarkedPath("expenser");
} catch (e) {
  let a = new Alert();
  a.title = "Setup Required";
  a.message = "Please set up a file bookmark in Scriptable:\n\n1. Go to Scriptable Settings (gear icon)\n2. Tap 'File Bookmarks'\n3. Tap '+' to add\n4. Name it: expenser\n5. Pick folder: iCloud Drive > My Documents > expenses\n\nThen run this script again.";
  a.addAction("OK");
  await a.presentAlert();
  Script.complete();
  return;
}
const CONFIG_PATH = BASE + "/config.json";
const EXPENSES_PATH = BASE + "/expenses.json";

// --- Category Keywords (for auto-categorization) ---

const CATEGORY_KEYWORDS = {
  "Food & Dining": ["swiggy","zomato","restaurant","cafe","dominos","mcdonalds","kfc","pizza","biryani","burger","starbucks","chaayos","haldiram","tea","coffee","food","eat"],
  "Groceries": ["bigbasket","blinkit","zepto","grocery","dmart","more","jiomart","nature","basket","supermarket","vegetables","milk","fruits"],
  "Transport": ["uber","ola","metro","rapido","auto","cab","taxi","parking","bus","train"],
  "Fuel": ["fuel","petrol","diesel","indian oil","hp","bharat petroleum","iocl","bpcl","hpcl"],
  "Shopping": ["amazon","flipkart","myntra","ajio","meesho","nykaa","mall","market","bazaar","store"],
  "Entertainment": ["pvr","inox","bookmyshow","movie","cinema","game"],
  "Subscription": ["netflix","spotify","hotstar","prime","youtube","apple","disney","icloud"],
  "Health & Medical": ["hospital","pharmacy","apollo","medplus","practo","1mg","doctor","clinic","lab","diagnostic","dental","eye","medicine"],
  "Fitness": ["gym","fitness","yoga","sport","swim"],
  "Utilities & Bills": ["airtel","jio","vodafone","electricity","gas","water","broadband","tata play","dth","postpaid","prepaid","recharge","electric","wifi","bsnl","vi"],
  "Rent & Housing": ["rent","maintenance","society","housing","broker"],
  "EMI & Loans": ["emi","loan","bajaj finserv","bajaj finance","interest"],
  "Insurance": ["insurance","lic","policy","premium"],
  "Education": ["udemy","coursera","book","education","school","college","tuition","coaching","exam","fee"],
  "Travel": ["irctc","makemytrip","goibibo","cleartrip","yatra","flight","hotel","booking","resort","airbnb","oyo","trip"],
  "Personal Care": ["salon","barber","spa","grooming","parlour","beauty","laundry","dry clean","tailor","haircut"],
  "Gifts & Donations": ["gift","donation","charity","temple","church","mosque","zakat"],
  "Self Transfer": [],
  "Cash Withdrawal": ["atm","cash withdrawal","withdrawn","cash","withdraw"],
  "Income": ["salary","sal credit","interest","refund","cashback","dividend"],
  "Investments": ["zerodha","kite","coin","groww","vested","mutual fund","sip","nps","ppf","fd","fixed deposit","stock","share","smallcase","dhan","upstox","angel"]
};

// --- Default Config ---

const DEFAULT_CONFIG = {
  accounts: {},
  categories: ["Food & Dining","Groceries","Transport","Fuel","Shopping","Entertainment","Subscription","Health & Medical","Fitness","Utilities & Bills","Rent & Housing","EMI & Loans","Insurance","Education","Travel","Personal Care","Gifts & Donations","Self Transfer","Cash Withdrawal","Miscellaneous","Income","Investments"],
  merchant_map: {},
  budget: {
    monthly_limit: 7000,
    excluded_categories: ["Rent & Housing", "EMI & Loans", "Income", "Investments", "Self Transfer", "Cash Withdrawal", "Insurance"]
  }
};

// --- File I/O Helpers ---

async function ensureDataFiles() {
  if (!fm.fileExists(CONFIG_PATH)) {
    fm.writeString(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }
  if (!fm.fileExists(EXPENSES_PATH)) {
    fm.writeString(EXPENSES_PATH, JSON.stringify([], null, 2));
  }
}

async function loadConfig() {
  try {
    await fm.downloadFileFromiCloud(CONFIG_PATH);
    let config = JSON.parse(fm.readString(CONFIG_PATH));
    // Merge any new default categories into existing config
    let defaultCats = DEFAULT_CONFIG.categories;
    if (config.categories) {
      defaultCats.forEach(c => {
        if (!config.categories.includes(c)) config.categories.push(c);
      });
    } else {
      config.categories = defaultCats;
    }
    // Merge new excluded_categories defaults
    if (config.budget) {
      let defExcl = DEFAULT_CONFIG.budget.excluded_categories;
      let excl = config.budget.excluded_categories || [];
      defExcl.forEach(c => {
        if (!excl.includes(c)) excl.push(c);
      });
      config.budget.excluded_categories = excl;
    }
    // Merge default accounts if missing
    if (!config.accounts) {
      config.accounts = JSON.parse(JSON.stringify(DEFAULT_CONFIG.accounts));
    }
    return config;
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
}

async function saveConfig(config) {
  fm.writeString(CONFIG_PATH, JSON.stringify(config, null, 2));
}

async function loadExpenses() {
  try {
    await fm.downloadFileFromiCloud(EXPENSES_PATH);
    return JSON.parse(fm.readString(EXPENSES_PATH));
  } catch (e) {
    return [];
  }
}

async function saveExpenses(expenses) {
  fm.writeString(EXPENSES_PATH, JSON.stringify(expenses, null, 2));
}

// --- Utility Helpers ---

function generateId() {
  let df = new DateFormatter();
  df.dateFormat = "yyyyMMdd_HHmmss";
  return "txn_" + df.string(new Date());
}

function todayStr() {
  let df = new DateFormatter();
  df.dateFormat = "yyyy-MM-dd";
  return df.string(new Date());
}

function nowTimeStr() {
  let df = new DateFormatter();
  df.dateFormat = "HH:mm";
  return df.string(new Date());
}

function formatCurrency(num) {
  if (num === null || num === undefined) return "₹0.00";
  let n = Math.abs(num);
  let s = n.toFixed(2);
  let parts = s.split(".");
  let intPart = parts[0];
  let decPart = parts[1];
  let lastThree = intPart.slice(-3);
  let rest = intPart.slice(0, -3);
  if (rest.length > 0) {
    lastThree = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  }
  return (num < 0 ? "-" : "") + "₹" + lastThree + "." + decPart;
}

function categorize(merchant, config) {
  if (!merchant) return "Uncategorized";
  let m = merchant.toLowerCase();
  for (let cat in CATEGORY_KEYWORDS) {
    if (CATEGORY_KEYWORDS[cat].some(kw => m.includes(kw))) return cat;
  }
  if (config.merchant_map && config.merchant_map[m]) {
    return config.merchant_map[m];
  }
  return "Uncategorized";
}

function filterByDateRange(expenses, startDate, endDate) {
  return expenses.filter(tx => tx.date >= startDate && tx.date <= endDate);
}

// --- Alert Helpers ---

async function pickFromList(title, options) {
  if (options.length <= 10) {
    let a = new Alert();
    a.title = title;
    options.forEach(o => a.addAction(o));
    a.addCancelAction("Cancel");
    let idx = await a.presentAlert();
    return idx < 0 ? null : options[idx];
  }
  let page = 0;
  const perPage = 8;
  while (true) {
    let a = new Alert();
    let start = page * perPage;
    let slice = options.slice(start, start + perPage);
    a.title = title + ` (${start + 1}-${start + slice.length} of ${options.length})`;
    slice.forEach(o => a.addAction(o));
    if (start + perPage < options.length) a.addAction("▶ More…");
    if (page > 0) a.addAction("◀ Back…");
    a.addCancelAction("Cancel");
    let idx = await a.presentAlert();
    if (idx < 0) return null;
    if (idx < slice.length) return slice[idx];
    if (idx === slice.length && start + perPage < options.length) { page++; continue; }
    if ((page > 0 && idx === slice.length + 1) || (page > 0 && !(start + perPage < options.length) && idx === slice.length)) { page--; continue; }
    return null;
  }
}

async function promptText(title, placeholder, defaultVal) {
  let a = new Alert();
  a.title = title;
  a.addTextField(placeholder || "", defaultVal || "");
  a.addAction("OK");
  a.addCancelAction("Cancel");
  let idx = await a.presentAlert();
  if (idx < 0) return null;
  return a.textFieldValue(0);
}

async function confirm(title, message) {
  let a = new Alert();
  a.title = title;
  if (message) a.message = message;
  a.addAction("Yes");
  a.addCancelAction("No");
  return (await a.presentAlert()) === 0;
}

async function showNotification(body) {
  let n = new Notification();
  n.title = "Expenser";
  n.body = body;
  n.sound = "default";
  await n.schedule();
}

function acctDisplayName(config, key) {
  if (config.accounts && config.accounts[key]) return config.accounts[key].name || key;
  return key || "Unknown";
}

async function pickAccount(config, title, filterType) {
  let keys = Object.keys(config.accounts);
  if (filterType) keys = keys.filter(k => config.accounts[k].type === filterType);
  let names = keys.map(k => config.accounts[k].name);
  let picked = await pickFromList(title || "Pick Account", names);
  if (!picked) return null;
  return keys[names.indexOf(picked)];
}

async function pickCategory(config) {
  let cats = config.categories.concat(["Uncategorized"]);
  return await pickFromList("Pick Category", cats);
}

// --- Feature: Quick Entry ---

async function quickEntry() {
  let config = await loadConfig();
  let expenses = await loadExpenses();

  let typeAlert = new Alert();
  typeAlert.title = "Transaction Type";
  typeAlert.addAction("Debit (Expense)");
  typeAlert.addAction("Credit (Income)");
  typeAlert.addCancelAction("Cancel");
  let typeIdx = await typeAlert.presentAlert();
  if (typeIdx < 0) return;

  let txnType = ["debit", "credit"][typeIdx];

  let amountStr = await promptText("Enter Amount", "Amount in ₹");
  if (!amountStr) return;
  let amount = parseFloat(amountStr.replace(/,/g, ""));
  if (isNaN(amount) || amount <= 0) {
    let e = new Alert(); e.title = "Invalid amount"; e.addAction("OK"); await e.presentAlert();
    return;
  }

  let accountKey = await pickAccount(config, "Account");
  if (!accountKey) return;

  let category = await pickCategory(config);
  if (!category) return;

  let merchant = await promptText("Merchant (optional)", "e.g. Swiggy") || "";
  if (merchant && category === "Uncategorized") {
    let autoCategory = categorize(merchant, config);
    if (autoCategory !== "Uncategorized") category = autoCategory;
  }

  let note = await promptText("Note (optional)", "Any notes") || "";

  let txn = {
    id: generateId(),
    date: todayStr(),
    time: nowTimeStr(),
    amount: amount,
    type: txnType,
    category: category,
    merchant: merchant,
    account: accountKey,
    source: "manual",
    note: note
  };

  expenses.push(txn);
  await saveExpenses(expenses);

  let acctName = config.accounts[accountKey].name;
  let msg = `${formatCurrency(amount)} ${txnType} - ${acctName} (${category})`;
  await showNotification(msg);
  Script.setShortcutOutput(msg);
}

// --- Feature: Scan Receipt ---

function parseReceiptText(ocrText) {
  let lines = ocrText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  let fullText = ocrText.toLowerCase();

  // --- Detect source app ---
  let isGPay = /google\s*pay|g\s*pay|pay\s*again/i.test(ocrText) || /UPI\s*(Lite|transaction\s*ID)/i.test(ocrText);
  let isBHIM = /bhim/i.test(ocrText);
  let isUPIApp = isGPay || isBHIM;

  // --- Amount ---
  let amount = 0;

  // iOS OCR mangles ₹ symbol: ₹ → ¥, · (middle dot), or merges with digits
  // Normalize: replace ¥ with ₹; replace ·/• only at line start (where ₹ would appear)
  let normalizedText = ocrText
    .replace(/¥/g, "₹")
    .replace(/^[·•]\s?(?=\d)/gm, "₹");

  // For GPay/BHIM: look for the displayed amount
  if (isUPIApp) {
    // Try: ₹ (or OCR variant) followed by number
    let upiAmtMatch = normalizedText.match(/₹\s?([\d,]+\.?\d*)/);
    if (upiAmtMatch) {
      amount = parseFloat(upiAmtMatch[1].replace(/,/g, ""));
    }
    // Fallback: line that is purely a number or starts with digits (OCR may prefix junk)
    if (!amount) {
      for (let line of lines) {
        // Strip leading non-digit chars (OCR artifacts like "P", "B", etc.)
        let cleaned = line.replace(/^[^0-9₹¥·•]+/, "").replace(/^[₹¥·•]\s?/, "");
        if (/^[\d,]+\.?\d{0,2}$/.test(cleaned) && !(/^\d{10,}$/.test(cleaned))) {
          let val = parseFloat(cleaned.replace(/,/g, ""));
          if (val > 0 && val < 1000000) { amount = val; break; }
        }
      }
    }
  }

  // General receipt patterns (also used as fallback for UPI apps)
  if (!amount) {
    let totalPatterns = [
      /(?:grand\s*total|total\s*amount|amount\s*payable|net\s*payable|total\s*due|bill\s*amount)[:\s]*(?:Rs\.?|INR|₹)\s?([\d,]+\.?\d*)/i,
      /(?:grand\s*total|total\s*amount|amount\s*payable|net\s*payable|total\s*due|bill\s*amount)[:\s]*([\d,]+\.?\d*)/i,
      /(?:total)[:\s]*(?:Rs\.?|INR|₹)\s?([\d,]+\.?\d*)/i,
      /(?:Rs\.?|INR|₹)\s?([\d,]+\.?\d*)/i
    ];
    for (let pat of totalPatterns) {
      let m = normalizedText.match(pat);
      if (m) {
        let val = parseFloat(m[1].replace(/,/g, ""));
        if (val > 0) { amount = val; break; }
      }
    }
  }

  // --- Merchant ---
  let merchant = "";

  if (isGPay) {
    // GPay: "To PERSON NAME" at the top, or "To: PERSON/MERCHANT" in details
    let toMatch = ocrText.match(/^To\s+([A-Z][A-Za-z\s.]+)/m);
    if (toMatch) merchant = toMatch[1].trim().substring(0, 40);
    // If the note line exists (e.g., "uber", "3 cans"), grab it as a note
    // but keep merchant from "To" line
  }

  if (isBHIM && !merchant) {
    // BHIM: "Banking Name\nSwiggy" or "To UPI ID" section
    let bankNameMatch = ocrText.match(/Banking\s*Name\s*\n\s*([^\n]+)/i);
    if (bankNameMatch) merchant = bankNameMatch[1].trim().substring(0, 40);
  }

  // General patterns
  if (!merchant) {
    let merchantPatterns = [
      /(?:paid\s+to|sent\s+to|transferred\s+to)\s+([A-Z][A-Za-z\s.]+)/,
      /^To\s+([A-Z][A-Za-z\s.]+)/m,
      /(?:at|from)\s+([A-Z][A-Za-z\s.&']+)/,
      /UPI\/\w+\/\d+\/([^\s\/]+)/i,
    ];
    for (let pat of merchantPatterns) {
      let m = ocrText.match(pat);
      if (m && m[1].trim().length >= 3) {
        merchant = m[1].trim().substring(0, 40);
        break;
      }
    }
  }

  // Fallback: scan lines for a text-like line (skip junk)
  if (!merchant) {
    let skipPatterns = [
      /^(tax\s*invoice|receipt|bill|invoice|cash\s*memo|duplicate|original)/i,
      /^(date|time|gstin|gst|cin|fssai|tel|phone|mob|email|www|http)/i,
      /^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/,
      /^(total|subtotal|grand|amount|paid|balance|change|cash|card|upi)/i,
      /^(rs\.?|inr|₹)\s?\d/i,
      /^(debit|credit|transaction|txn|ref|ack|completed|process|payment|banking|remarks|powered|more\s*details)/i,
      /^(google|bhim|split|tag|share|upi\s*help|pay\s*again)/i,
      /^(to:|from:|upi\s*transaction|google\s*transaction)/i,
      /^\+?\d[\d\s-]{8,}/,
      /^[a-zA-Z0-9._-]+@[a-zA-Z]/,
    ];
    let reversed = [...lines].reverse();
    for (let line of reversed) {
      if (line.length < 3 || line.length > 60) continue;
      let skip = false;
      for (let sp of skipPatterns) {
        if (sp.test(line)) { skip = true; break; }
      }
      if (skip) continue;
      let letterCount = (line.match(/[a-zA-Z]/g) || []).length;
      if (letterCount < 3) continue;
      if (/^\d+$/.test(line.replace(/[\s,.-]/g, ""))) continue;
      merchant = line.substring(0, 40);
      break;
    }
  }

  // Clean merchant: strip trailing junk words
  merchant = merchant.replace(/\s*(?:Not you|Trxn|Call\s|Visit\s).*/i, "").trim();
  // Limit to first 3-4 meaningful words
  let mWords = merchant.split(/\s+/).filter(w => /[A-Za-z]/.test(w)).slice(0, 4).join(" ");
  if (mWords.length >= 3) merchant = mWords;

  // --- Account detection (from OCR text) ---
  // Matches account names/last4 from your config.json automatically.
  let account = "";
  if (/UPI\s*Lite/i.test(ocrText)) {
    // Find any upi_lite account in config
    for (let [k, v] of Object.entries(config.accounts || {})) {
      if (v.type === "upi_lite") { account = k; break; }
    }
  } else {
    // Try to match by last4 digits found in OCR text
    let last4Match = ocrText.match(/(?:ending|last\s*4|x{2,4}|[*]{2,4})[\s:]*(\d{4})/i);
    if (last4Match) {
      for (let [k, v] of Object.entries(config.accounts || {})) {
        if (v.last4 === last4Match[1]) { account = k; break; }
      }
    }
    // Fallback: match by account name keywords in OCR text
    if (!account) {
      let lower = ocrText.toLowerCase();
      for (let [k, v] of Object.entries(config.accounts || {})) {
        let words = (v.name || "").toLowerCase().split(/\s+/);
        if (words.length >= 1 && words.some(w => w.length > 2 && lower.includes(w))) {
          account = k; break;
        }
      }
    }
  }

  // --- Date ---
  let date = todayStr();
  let datePatterns = [
    /(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*[\s,]+(\d{2,4})/i,
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*[\s,]+(\d{4})/i,
    /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,
    /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})/,
  ];
  let monthMap = {jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12"};
  for (let pat of datePatterns) {
    let m = ocrText.match(pat);
    if (m) {
      let d, mo, y;
      if (/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(m[2])) {
        d = m[1].replace(/\D/g, "").padStart(2, "0");
        mo = monthMap[m[2].substring(0, 3).toLowerCase()];
        y = m[3].length === 2 ? "20" + m[3] : m[3];
      } else {
        d = m[1].padStart(2, "0");
        mo = m[2].padStart(2, "0");
        y = m[3].length === 2 ? "20" + m[3] : m[3];
      }
      if (parseInt(d) <= 31 && parseInt(mo) <= 12) {
        date = `${y}-${mo}-${d}`;
        break;
      }
    }
  }

  return { amount, merchant, date, account };
}

async function scanReceipt(ocrText, fromShortcut) {
  let config = await loadConfig();
  let expenses = await loadExpenses();

  if (!ocrText || ocrText.trim().length === 0) {
    if (fromShortcut) {
      Script.setShortcutOutput("No text received for scanning");
      return;
    }
    ocrText = await promptText("Paste receipt text", "Receipt text from OCR") || "";
    if (!ocrText) return;
  }

  let parsed = parseReceiptText(ocrText);
  let amount = parsed.amount;
  let merchant = parsed.merchant;
  let txnDate = parsed.date;
  let accountKey = parsed.account || "";
  let category = categorize(merchant, config);

  if (fromShortcut) {
    // Non-interactive: log directly with parsed data, notify, output result
    if (!amount || amount <= 0) {
      Script.setShortcutOutput("Could not detect amount from scan");
      return;
    }
    if (!accountKey) accountKey = "unknown";

    let txn = {
      id: generateId(),
      date: txnDate,
      time: nowTimeStr(),
      amount: amount,
      type: "debit",
      category: category,
      merchant: merchant || "Unknown",
      account: accountKey,
      source: "scan",
      note: ""
    };

    expenses.push(txn);
    await saveExpenses(expenses);

    let msg = `Logged: ${formatCurrency(amount)} - ${merchant || "Unknown"} (${category}) [${acctDisplayName(config, accountKey)}]`;
    let n = new Notification();
    n.title = "Expenser - Scan Logged";
    n.body = msg;
    n.sound = "default";
    await n.schedule();
    Script.setShortcutOutput(msg);
    return;
  }

  // Interactive mode (run from Scriptable app)
  let a = new Alert();
  a.title = "Scanned Receipt";
  let acctLabel = parsed.account ? acctDisplayName(config, parsed.account) : "Not detected";
  a.message = `Amount: ₹${parsed.amount}\nMerchant: ${parsed.merchant}\nDate: ${parsed.date}\nAccount: ${acctLabel}`;
  a.addTextField("Amount", String(parsed.amount));
  a.addTextField("Merchant", parsed.merchant);
  a.addTextField("Date", parsed.date);
  a.addAction("Continue");
  a.addCancelAction("Cancel");
  let idx = await a.presentAlert();
  if (idx < 0) return;

  amount = parseFloat(a.textFieldValue(0).replace(/,/g, ""));
  merchant = a.textFieldValue(1);
  txnDate = a.textFieldValue(2) || todayStr();
  if (isNaN(amount) || amount <= 0) return;

  if (parsed.account) {
    let useDetected = await confirm("Account", `Detected: ${acctDisplayName(config, parsed.account)}. Use this?`);
    if (!useDetected) accountKey = null;
  }
  if (!accountKey) {
    accountKey = await pickAccount(config, "Account");
    if (!accountKey) return;
  }

  if (category === "Uncategorized") {
    category = await pickCategory(config);
    if (!category) return;
  } else {
    let useAuto = await confirm("Category", `Auto-detected: ${category}. Use this?`);
    if (!useAuto) {
      category = await pickCategory(config);
      if (!category) return;
    }
  }

  let note = await promptText("Note (optional)", "Any notes") || "";

  let txn = {
    id: generateId(),
    date: txnDate,
    time: nowTimeStr(),
    amount: amount,
    type: "debit",
    category: category,
    merchant: merchant,
    account: accountKey,
    source: "scan",
    note: note
  };

  expenses.push(txn);
  await saveExpenses(expenses);

  let msg = `Scanned: ${formatCurrency(amount)} - ${merchant} (${category})`;
  await showNotification(msg);
  Script.setShortcutOutput(msg);
}

// --- Feature: Edit / Review ---

async function editReview() {
  let config = await loadConfig();
  let expenses = await loadExpenses();

  let menuAlert = new Alert();
  menuAlert.title = "Edit / Review";
  menuAlert.addAction("Edit Last");
  menuAlert.addAction("Review Today");
  menuAlert.addAction("Review Uncategorized");
  menuAlert.addAction("Search by Date");
  menuAlert.addCancelAction("Cancel");
  let mIdx = await menuAlert.presentAlert();
  if (mIdx < 0) return;

  if (mIdx === 0 && expenses.length > 0) {
    await editTransaction(config, expenses, expenses.length - 1);
  } else if (mIdx === 1) {
    let todayTxns = expenses.map((tx, i) => ({ tx, i })).filter(o => o.tx.date === todayStr());
    if (todayTxns.length === 0) {
      let a = new Alert(); a.title = "No transactions today"; a.addAction("OK"); await a.presentAlert();
      return;
    }
    await showTxnList(config, expenses, todayTxns);
  } else if (mIdx === 2) {
    let uncat = expenses.map((tx, i) => ({ tx, i })).filter(o => o.tx.category === "Uncategorized");
    if (uncat.length === 0) {
      let a = new Alert(); a.title = "No uncategorized transactions"; a.addAction("OK"); await a.presentAlert();
      return;
    }
    await showTxnList(config, expenses, uncat);
  } else if (mIdx === 3) {
    let dateStr = await promptText("Enter Date", "YYYY-MM-DD", todayStr());
    if (!dateStr) return;
    let dateTxns = expenses.map((tx, i) => ({ tx, i })).filter(o => o.tx.date === dateStr);
    if (dateTxns.length === 0) {
      let a = new Alert(); a.title = `No transactions on ${dateStr}`; a.addAction("OK"); await a.presentAlert();
      return;
    }
    await showTxnList(config, expenses, dateTxns);
  }
}

async function showTxnList(config, expenses, txnList) {
  let names = txnList.map(o => {
    let tx = o.tx;
    let acctName = config.accounts[tx.account] ? config.accounts[tx.account].name : tx.account;
    return `${formatCurrency(tx.amount)} | ${tx.category} | ${tx.merchant || "-"} | ${acctName}`;
  });
  let picked = await pickFromList("Select Transaction", names);
  if (!picked) return;
  let idx = names.indexOf(picked);
  await editTransaction(config, expenses, txnList[idx].i);
}

async function editTransaction(config, expenses, index) {
  let tx = expenses[index];
  let acctName = config.accounts[tx.account] ? config.accounts[tx.account].name : tx.account;

  let details = `${formatCurrency(tx.amount)} ${tx.type}\n${tx.category} | ${tx.merchant || "-"}\n${acctName} | ${tx.date} ${tx.time}`;
  if (tx.note) details += `\nNote: ${tx.note}`;

  let a = new Alert();
  a.title = "Edit Transaction";
  a.message = details;
  a.addAction("Change Category");
  a.addAction("Change Merchant");
  a.addAction("Change Amount");
  a.addAction("Change Account");
  a.addAction("Change Note");
  a.addDestructiveAction("Delete");
  a.addCancelAction("Cancel");
  let idx = await a.presentAlert();
  if (idx < 0) return;

  if (idx === 0) {
    let newCat = await pickCategory(config);
    if (!newCat) return;
    tx.category = newCat;
    if (tx.merchant) {
      let remember = await confirm("Remember?", `Always categorize "${tx.merchant}" as ${newCat}?`);
      if (remember) {
        config.merchant_map[tx.merchant.toLowerCase()] = newCat;
      }
    }
  } else if (idx === 1) {
    let newMerch = await promptText("New Merchant", "Merchant name", tx.merchant);
    if (newMerch === null) return;
    tx.merchant = newMerch;
  } else if (idx === 2) {
    let newAmt = await promptText("New Amount", "Amount", String(tx.amount));
    if (newAmt === null) return;
    let oldAmt = tx.amount;
    tx.amount = parseFloat(newAmt.replace(/,/g, ""));
  } else if (idx === 3) {
    let acctKeys = Object.keys(config.accounts);
    let acctNames = acctKeys.map(k => config.accounts[k].name || k);
    let pick = await pickFromList("Change Account", acctNames);
    if (!pick) return;
    let newKey = acctKeys[acctNames.indexOf(pick)];
    tx.account = newKey;
  } else if (idx === 4) {
    let newNote = await promptText("New Note", "Note", tx.note);
    if (newNote === null) return;
    tx.note = newNote;
  } else if (idx === 5) {
    let sure = await confirm("Delete?", `Remove ${formatCurrency(tx.amount)} ${tx.category}?`);
    if (!sure) return;
    expenses.splice(index, 1);
    await saveExpenses(expenses);
    let da = new Alert();
    da.title = "Deleted";
    da.message = `${formatCurrency(tx.amount)} ${tx.category} removed.`;
    da.addAction("OK");
    await da.presentAlert();
    return;
  }

  expenses[index] = tx;
  await saveExpenses(expenses);
  await saveConfig(config);
  await showNotification("Transaction updated");
  Script.setShortcutOutput("Transaction updated");
}

// --- Feature: Undo Last ---

async function undoLast() {
  let expenses = await loadExpenses();

  if (expenses.length === 0) {
    let a = new Alert(); a.title = "No transactions to undo"; a.addAction("OK"); await a.presentAlert();
    return;
  }

  let config = await loadConfig();
  let tx = expenses[expenses.length - 1];
  let acctName = config.accounts[tx.account] ? config.accounts[tx.account].name : tx.account;
  let details = `${formatCurrency(tx.amount)} ${tx.type}\n${tx.category} | ${tx.merchant || "-"}\n${acctName} | ${tx.date} ${tx.time}`;

  let sure = await confirm("Undo Last Transaction?", details);
  if (!sure) return;

  expenses.pop();
  await saveExpenses(expenses);

  let msg = `Undone: ${formatCurrency(tx.amount)} ${tx.category}`;
  await showNotification(msg);
  Script.setShortcutOutput(msg);
}

// --- Feature: Export CSV ---

async function exportData() {
  let expenses = await loadExpenses();
  let config = await loadConfig();

  let rangeAlert = new Alert();
  rangeAlert.title = "Export Range";
  rangeAlert.addAction("All Time");
  rangeAlert.addAction("This Month");
  rangeAlert.addAction("Custom Range");
  rangeAlert.addCancelAction("Cancel");
  let rIdx = await rangeAlert.presentAlert();
  if (rIdx < 0) return;

  let filtered = expenses;
  let today = todayStr();
  if (rIdx === 1) {
    let monthStart = today.substring(0, 8) + "01";
    filtered = filterByDateRange(expenses, monthStart, today);
  } else if (rIdx === 2) {
    let start = await promptText("Start Date", "YYYY-MM-DD") || today;
    let end = await promptText("End Date", "YYYY-MM-DD") || today;
    filtered = filterByDateRange(expenses, start, end);
  }

  let headers = "Date,Time,Amount,Type,Category,Merchant,Account,Source,Note";
  let rows = filtered.map(tx => {
    let acctName = config.accounts[tx.account] ? config.accounts[tx.account].name : tx.account;
    let escapedNote = (tx.note || "").replace(/"/g, '""');
    let escapedMerchant = (tx.merchant || "").replace(/"/g, '""');
    return `${tx.date},${tx.time},${tx.amount},${tx.type},"${tx.category}","${escapedMerchant}","${acctName}",${tx.source},"${escapedNote}"`;
  });

  let csv = headers + "\n" + rows.join("\n");
  let csvPath = BASE + "/export.csv";
  fm.writeString(csvPath, csv);

  let a = new Alert();
  a.title = "Export Complete";
  a.message = `${filtered.length} transactions exported.\nCSV saved to expenses/export.csv`;
  a.addAction("OK");
  a.addAction("Copy to Clipboard");
  let shareIdx = await a.presentAlert();
  if (shareIdx === 1) {
    Pasteboard.copy(csv);
  }

  Script.setShortcutOutput(`Exported ${filtered.length} transactions`);
}

// --- Feature: Set Budget ---

async function setBudget() {
  let config = await loadConfig();
  if (!config.budget) config.budget = { monthly_limit: 7000, excluded_categories: ["Rent & Housing", "EMI & Loans", "Income", "Investments", "Self Transfer", "Cash Withdrawal", "Insurance"] };

  let a = new Alert();
  a.title = "Monthly Budget";
  a.message = `Current: ${formatCurrency(config.budget.monthly_limit)}/month\nExcludes: ${config.budget.excluded_categories.join(", ")}`;
  a.addAction("Change Budget Amount");
  a.addAction("Edit Excluded Categories");
  a.addCancelAction("Cancel");
  let idx = await a.presentAlert();
  if (idx < 0) return;

  if (idx === 0) {
    let newAmt = await promptText("Monthly Budget", "Amount in ₹", String(config.budget.monthly_limit));
    if (!newAmt) return;
    let amt = parseFloat(newAmt.replace(/,/g, ""));
    if (isNaN(amt) || amt <= 0) return;
    config.budget.monthly_limit = amt;
    await saveConfig(config);
    await showNotification(`Budget set to ${formatCurrency(amt)}/month`);
  } else {
    // Toggle categories in/out of exclusion
    let allCats = config.categories;
    let excluded = config.budget.excluded_categories || [];
    let options = allCats.map(c => (excluded.includes(c) ? "[X] " : "[ ] ") + c);
    let picked = await pickFromList("Tap to toggle (X = excluded)", options);
    if (!picked) return;
    let catName = picked.replace(/^\[.\] /, "");
    if (excluded.includes(catName)) {
      config.budget.excluded_categories = excluded.filter(c => c !== catName);
    } else {
      config.budget.excluded_categories.push(catName);
    }
    await saveConfig(config);
    await showNotification(`Updated excluded categories`);
  }
}

// --- Feature: Manage Accounts ---

async function manageAccounts() {
  let config = await loadConfig();
  if (!config.accounts) config.accounts = {};

  let keys = Object.keys(config.accounts);
  let options = keys.map(k => {
    let a = config.accounts[k];
    let typeLabel = a.type === "credit_card" ? "CC" : a.type === "upi_lite" ? "UPI Lite" : "Savings";
    return `${a.name || k} (${a.last4 || "-"}) [${typeLabel}]`;
  });
  options.push("➕ Add New Account");

  let picked = await pickFromList("Manage Accounts", options);
  if (!picked) return;

  if (picked === "➕ Add New Account") {
    // Add new account
    let last4 = await promptText("Last 4 Digits", "e.g. 1234", "");
    if (!last4 || !/^\d{4}$/.test(last4.trim())) {
      await showNotification("Invalid: must be exactly 4 digits");
      return;
    }
    last4 = last4.trim();

    // Pick account type
    let typeAlert = new Alert();
    typeAlert.title = "Account Type";
    typeAlert.addAction("Savings / Bank Account");
    typeAlert.addAction("Credit Card");
    typeAlert.addAction("UPI Lite / Wallet");
    typeAlert.addCancelAction("Cancel");
    let typeIdx = await typeAlert.presentAlert();
    if (typeIdx < 0) return;
    let types = ["bank", "credit_card", "upi_lite"];
    let acctType = types[typeIdx];

    // Pick bank (supported banks)
    let bankAlert = new Alert();
    bankAlert.title = "Bank";
    bankAlert.addAction("HDFC");
    bankAlert.addAction("HSBC");
    bankAlert.addAction("ICICI");
    bankAlert.addAction("Axis");
    bankAlert.addAction("Other");
    bankAlert.addCancelAction("Cancel");
    let bankIdx = await bankAlert.presentAlert();
    if (bankIdx < 0) return;
    let bankNames = ["HDFC", "HSBC", "ICICI", "Axis", "Other"];
    let bankIds = ["hdfc", "hsbc", "icici", "axis", "other"];
    let bankName = bankNames[bankIdx];
    let bankId = bankIds[bankIdx];

    // Custom name
    let defaultName = bankName + (acctType === "credit_card" ? " CC" : " Savings");
    let name = await promptText("Account Name", "e.g. HDFC Regalia CC", defaultName);
    if (!name) return;

    // Generate key
    let key = bankId + "_" + (acctType === "credit_card" ? name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_+$/, "") : "savings_" + last4);
    // Avoid duplicate keys
    if (config.accounts[key]) key = key + "_" + last4;

    config.accounts[key] = { name: name.trim(), type: acctType, last4: last4 };
    await saveConfig(config);
    await showNotification(`Added: ${name.trim()} (${last4})\n\nRemember to create a Shortcut automation for SMS containing "${last4}"`);

  } else {
    // Edit existing account
    let idx = options.indexOf(picked);
    let key = keys[idx];
    let acct = config.accounts[key];

    let editAlert = new Alert();
    editAlert.title = acct.name || key;
    editAlert.message = `Last 4: ${acct.last4 || "-"}\nType: ${acct.type || "bank"}`;
    editAlert.addAction("Rename");
    editAlert.addAction("Change Last 4 Digits");
    editAlert.destructiveAction = 2;
    editAlert.addAction("Remove Account");
    editAlert.addCancelAction("Cancel");
    let editIdx = await editAlert.presentAlert();
    if (editIdx < 0) return;

    if (editIdx === 0) {
      let newName = await promptText("Rename Account", "New name", acct.name || "");
      if (newName && newName.trim()) {
        config.accounts[key].name = newName.trim();
        await saveConfig(config);
        await showNotification(`Renamed to: ${newName.trim()}`);
      }
    } else if (editIdx === 1) {
      let newLast4 = await promptText("Last 4 Digits", "e.g. 1234", acct.last4 || "");
      if (newLast4 && /^\d{4}$/.test(newLast4.trim())) {
        config.accounts[key].last4 = newLast4.trim();
        await saveConfig(config);
        await showNotification(`Updated last 4 to: ${newLast4.trim()}\n\nUpdate your Shortcut automation trigger too.`);
      }
    } else if (editIdx === 2) {
      let sure = await confirm("Remove Account", `Delete "${acct.name}"? This won't delete transactions.`);
      if (sure) {
        delete config.accounts[key];
        await saveConfig(config);
        await showNotification(`Removed: ${acct.name}`);
      }
    }
  }
}

// --- Main Menu (only works when run directly in Scriptable app) ---

async function showMainMenu() {
  try {
    let config = await loadConfig();
    // First-run: guide user to add accounts if none exist
    if (!config.accounts || Object.keys(config.accounts).length === 0) {
      let welcome = new Alert();
      welcome.title = "Welcome to Expenser!";
      welcome.message = "No accounts configured yet. Add your bank accounts and cards to get started.";
      welcome.addAction("Add Accounts");
      welcome.addAction("Help & Setup Guide");
      welcome.addCancelAction("Later");
      let wIdx = await welcome.presentAlert();
      if (wIdx === 0) {
        await manageAccounts();
        return;
      } else if (wIdx === 1) {
        try {
          let help = importModule("ExpenserHelp");
          await help.showHelp();
        } catch (e) {
          await showNotification("ExpenserHelp script not found.");
        }
        return;
      }
      return;
    }

    let a = new Alert();
    a.title = "Expenser";
    a.message = "What would you like to do?";
    a.addAction("Quick Entry");
    a.addAction("Scan Receipt");
    a.addAction("Edit / Review");
    a.addAction("Undo Last");
    a.addAction("Export CSV");
    a.addAction("Set Budget");
    a.addAction("Manage Accounts");
    a.addAction("Help & Setup Guide");
    a.addCancelAction("Cancel");
    let idx = await a.presentAlert();

    switch (idx) {
      case 0: await quickEntry(); break;
      case 1: await scanReceipt(""); break;
      case 2: await editReview(); break;
      case 3: await undoLast(); break;
      case 4: await exportData(); break;
      case 5: await setBudget(); break;
      case 6: await manageAccounts(); break;
      case 7:
        try {
          let help = importModule("ExpenserHelp");
          await help.showHelp();
        } catch (e) {
          await showNotification("ExpenserHelp script not found. Add it to Scriptable.");
        }
        break;
    }
  } catch (e) {
    Script.setShortcutOutput(
      "Open Scriptable to use the menu, or pass a command from your Shortcut:\n" +
      "quick_entry, scan, edit, undo, export, budget"
    );
  }
}

// --- Main Router ---

async function main() {
  await ensureDataFiles();

  // Collect input from all possible Shortcuts sources
  let input = args.shortcutParameter || "";
  let fromShortcut = !!input;
  if (!input && args.plainTexts && args.plainTexts.length > 0) {
    input = args.plainTexts[0];
    fromShortcut = true;
  }
  if (!input && args.widgetParameter) {
    input = args.widgetParameter;
    fromShortcut = true;
  }
  if (typeof input !== "string") input = String(input || "");

  // Support JSON input for scan: {"cmd":"scan","text":"..."}
  if (typeof input === "string" && input.trim().startsWith("{")) {
    try {
      let parsed = JSON.parse(input);
      if (parsed.cmd === "scan") {
        await scanReceipt(parsed.text || "", true);
        return;
      }
      input = parsed.cmd || "";
    } catch (e) {
      // Not valid JSON, treat as plain command
    }
  }

  switch (input) {
    case "quick_entry": await quickEntry(); break;
    case "scan": await scanReceipt("", fromShortcut); break;
    case "edit": await editReview(); break;
    case "undo": await undoLast(); break;
    case "export": await exportData(); break;
    case "budget": await setBudget(); break;
    default:
      // If input is long text (not a command), treat as scan receipt OCR text
      if (typeof input === "string" && input.length > 10) {
        await scanReceipt(input, fromShortcut);
      } else {
        await showMainMenu();
      }
      break;
  }
}

await main();
Script.complete();
