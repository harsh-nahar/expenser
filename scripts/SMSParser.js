// ============================================================
// SMSParser.js - Expenser SMS Auto-Logger for Scriptable (iOS)
// Called from iOS Shortcuts automation on incoming bank SMS
// ZERO network calls - fully offline, private
// ============================================================

// --- File Path Setup ---
const fm = FileManager.iCloud();
let BASE;
try {
  BASE = fm.bookmarkedPath("expenser");
} catch (e) {
  let n = new Notification();
  n.title = "Expenser SMS";
  n.body = "Bookmark 'expenser' not set up in Scriptable.";
  n.sound = "failure";
  await n.schedule();
  Script.setShortcutOutput("Error: bookmark not configured");
  Script.complete();
  return;
}
const CONFIG_PATH = BASE + "/config.json";
const EXPENSES_PATH = BASE + "/expenses.json";

// --- Import shared bank patterns ---
let BP;
try {
  BP = importModule("BankPatterns");
} catch (e) {
  let n = new Notification();
  n.title = "Expenser SMS";
  n.body = "BankPatterns module not found. Copy BankPatterns.js to Scriptable.";
  n.sound = "failure";
  await n.schedule();
  Script.setShortcutOutput("Error: BankPatterns module missing");
  Script.complete();
  return;
}

// --- Category keyword map for auto-categorization ---
const CATEGORY_KEYWORDS = {
  "swiggy|zomato|restaurant|cafe|tea|coffee|food|eat|biryani|pizza|burger": "Food & Dining",
  "uber|ola|rapido|metro|bus|train|irctc|flight|makemytrip|goibibo|petrol|diesel|fuel|parking": "Transport",
  "amazon|flipkart|myntra|ajio|shopping|mall|store|market|bazaar": "Shopping",
  "netflix|hotstar|spotify|prime|youtube|movie|cinema|game|book": "Entertainment",
  "rent|maintenance|society|housing|broker": "Rent & Housing",
  "electricity|electric|water|gas|broadband|wifi|jio|airtel|vi|vodafone|bsnl|recharge|postpaid": "Utilities & Bills",
  "doctor|hospital|medical|pharmacy|medicine|apollo|medplus|health|dental|eye|lab\\b|diagnostic": "Health & Medical",
  "gym|fitness|yoga|sport|swim": "Fitness",
  "grocery|bigbasket|blinkit|zepto|dmart|supermarket|vegetables|milk|fruits": "Groceries",
  "school|college|course|udemy|book|tuition|coaching|exam|fee": "Education",
  "insurance|lic|policy|premium": "Insurance",
  "mutual fund|sip|zerodha|groww|investment|stock|share|nps|ppf|fd|deposit": "Investments",
  "emi|loan|interest": "EMI & Loans",
  "salon|haircut|spa|beauty|grooming|laundry|dry clean|tailor": "Personal Care",
  "gift|donation|charity|temple|church|mosque|zakat": "Gifts & Donations",
  "travel|hotel|resort|airbnb|oyo|booking|trip": "Travel",
  "atm|cash|withdraw": "Cash Withdrawal"
};

// --- File I/O Helpers ---

async function loadConfig() {
  try {
    if (fm.fileExists(CONFIG_PATH)) {
      await fm.downloadFileFromiCloud(CONFIG_PATH);
      return JSON.parse(fm.readString(CONFIG_PATH));
    }
    return null;
  } catch (e) {
    return null;
  }
}


async function loadExpenses() {
  try {
    if (fm.fileExists(EXPENSES_PATH)) {
      await fm.downloadFileFromiCloud(EXPENSES_PATH);
      return JSON.parse(fm.readString(EXPENSES_PATH));
    }
    return [];
  } catch (e) {
    return [];
  }
}

async function saveExpenses(expenses) {
  fm.writeString(EXPENSES_PATH, JSON.stringify(expenses, null, 2));
}

// --- Utility Helpers ---

function generateId() {
  let ts = Date.now();
  let rand = Math.random().toString(36).substring(2, 5);
  return "txn_" + ts + "_" + rand;
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

// Extract transaction date from SMS text, fallback to today
function extractDate(text) {
  let months = { jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12" };

  // DD-MM-YYYY or DD/MM/YYYY (Axis format)
  let m1 = text.match(/(\d{2})[-\/](\d{2})[-\/](\d{4})/);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;

  // DD Mon YYYY or DD-Mon-YYYY (HSBC format: "11 Apr 2026")
  let m2 = text.match(/(\d{1,2})[\s-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s-](\d{4})/i);
  if (m2) {
    let day = m2[1].padStart(2, "0");
    let mon = months[m2[2].toLowerCase().substring(0, 3)];
    return `${m2[3]}-${mon}-${day}`;
  }

  // DD/MM/YY
  let m3 = text.match(/(\d{2})[-\/](\d{2})[-\/](\d{2})(?!\d)/);
  if (m3) return `20${m3[3]}-${m3[2]}-${m3[1]}`;

  return todayStr();
}

// Extract time from SMS text, fallback to now
function extractTime(text) {
  let m = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(?:IST|ist)?/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  return nowTimeStr();
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

// --- Auto-categorization ---

function categorize(merchant, config) {
  if (!merchant) return "Uncategorized";
  let m = merchant.toLowerCase();

  // Check config merchant_map first (user overrides)
  if (config && config.merchant_map) {
    let mapped = config.merchant_map[m] || config.merchant_map[merchant];
    if (mapped) return mapped;
  }

  // Keyword-based matching
  for (let pattern in CATEGORY_KEYWORDS) {
    let keywords = pattern.split("|");
    if (keywords.some(kw => m.includes(kw))) {
      return CATEGORY_KEYWORDS[pattern];
    }
  }

  return "Uncategorized";
}

// --- SMS Skip Detection ---
// Returns true if the SMS is non-transactional and should be ignored

function shouldSkipSMS(text, sender) {
  if (!text) return true;

  // HSBCIM sender is always non-transactional (marketing/info)
  if (sender && /HSBCIM/i.test(sender)) return true;

  let lower = text.toLowerCase();

  // Non-transaction patterns
  let skipPatterns = [
    "is due by",
    "will be debited",
    "upcoming mandate",
    "requested money",
    "usage settings",
    "service update",
    "eligible for",
    "will be unavailable"
  ];
  if (skipPatterns.some(p => lower.includes(p))) return true;

  // Must contain a debit/credit keyword
  let txnKeywords = /(?:debited|credited|spent|paid from|is\s+paid|received|withdrawn|deposited|charged|reversed|refund|payment.*received|sent\s+rs|processed\s+payment)/i;
  if (!txnKeywords.test(text)) return true;

  // Must contain an amount
  let amountRegex = /(?:Rs\.?|INR|₹)\s?([\d,]+\.?\d*)/;
  if (!amountRegex.test(text)) return true;

  return false;
}

// --- Account Identification (delegated to BankPatterns) ---

function identifyAccount(text, sender, config) {
  return BP.identifyAccountSMS(text, sender, config);
}

// --- Amount Extraction ---

function extractAmount(text) {
  let match = text.match(/(?:Rs\.?|INR|₹)\s?([\d,]+\.?\d*)/);
  if (!match) return null;
  let raw = match[1].replace(/,/g, "");
  let amount = parseFloat(raw);
  if (isNaN(amount) || amount <= 0) return null;
  return Math.round(amount * 100) / 100;
}

// --- Transaction Type Detection ---

function detectType(text) {
  // Special case: "Payment of Rs X has been received on your...Credit Card"
  // This is a credit card bill payment (credit to CC)
  if (/payment\s.*received\s.*credit\s*card/i.test(text)) return "credit";

  // Standing instruction / mandate: "processed payment of INR X to Merchant"
  if (/processed\s+payment/i.test(text)) return "debit";

  let match = text.match(/\b(debited|credited|spent|paid from|is\s+paid|received|withdrawn|deposited|charged|reversed|refund|sent)\b/i);
  if (!match) return null;

  let keyword = match[1].toLowerCase();
  let debitWords = ["debited", "spent", "paid from", "is paid", "withdrawn", "charged", "sent"];
  let creditWords = ["credited", "received", "deposited", "reversed", "refund"];

  if (debitWords.includes(keyword)) return "debit";
  if (creditWords.includes(keyword)) return "credit";
  return null;
}

// --- Merchant Extraction (delegated to BankPatterns) ---

function extractMerchant(text, sender, account) {
  return BP.extractMerchantSMS(text, sender, account);
}

// --- Salary Detection ---

function isSalary(text) {
  return /\b(?:SALARY|SAL\b|PAYROLL)\b/i.test(text);
}

// --- Duplicate Detection ---
// Prevents same transaction being logged by both SMS and email
// Matches on amount + account + date + merchant

function isDuplicate(expenses, amount, accountKey, dateStr, merchant, ref) {
  let recent = expenses.slice(-50);
  // If ref exists, match by ref alone (strongest dedup - works across SMS and email)
  if (ref) {
    if (recent.some(tx => tx.ref === ref)) return true;
  }
  // Fallback: match by amount + account + date + merchant
  let m = (merchant || "").toLowerCase();
  return recent.some(tx =>
    tx.amount === amount &&
    tx.account === accountKey &&
    tx.date === dateStr &&
    (tx.source === "sms" || tx.source === "email") &&
    (tx.merchant || "").toLowerCase() === m
  );
}

// --- Main SMS Parser ---
// Returns a parsed transaction object or null if unparseable

function parseSMS(smsText, sender, config) {
  if (!smsText || typeof smsText !== "string") return null;

  let text = smsText.trim();
  if (shouldSkipSMS(text, sender)) return null;

  let amount = extractAmount(text);
  if (!amount) return null;

  let type = detectType(text);
  if (!type) return null;

  // Skip credit transactions - we only track expenses (debits)
  if (type === "credit") return null;

  let account = identifyAccount(text, sender, config);
  if (!account) return null;

  let merchant = extractMerchant(text, sender, account);

  // Determine category
  let category = "Uncategorized";

  // Self-transfer detection - customize the regex below with your own name
  // Example: /\bjohn\s+doe\b/i or /\byour\s+name\b/i
  if (merchant && /\byour\s+name\s+here\b/i.test(merchant)) {
    category = "Self Transfer";
  }
  // ATM / cash withdrawal
  else if (/\bwithdra(?:wn|wal)\b/i.test(text) || /\bATM\b/i.test(text)) {
    category = "Cash Withdrawal";
    if (!merchant || /unknown/i.test(merchant)) merchant = "ATM";
  }
  // EMI detection
  else if (/\bEMI\b/i.test(text)) {
    category = "EMI & Loans";
    if (!merchant) merchant = "EMI";
  }

  // Extract UPI/transaction reference (12-digit ID)
  let ref = null;
  let refMatch = text.match(/(?:UPI[:\s]*|Ref[:\s]*|ref\s+)(\d{12})\b/i)
    || text.match(/UPI\/\w+\/(\d{12})\b/i);
  if (refMatch) ref = refMatch[1];

  return {
    amount: amount,
    type: type,
    account: account,
    merchant: merchant,
    category: category,
    ref: ref,
    rawText: text
  };
}

// --- Notification Helper ---

async function showNotification(title, body) {
  let n = new Notification();
  n.title = title;
  n.body = body;
  n.sound = "default";
  await n.schedule();
}

// --- Main Entry Point ---

async function main() {
  try {
    // 1. Get SMS input from Shortcuts or manual test
    let input = args.shortcutParameter;
    
    // If no input (run directly in Scriptable), offer manual test
    if (!input) {
      let a = new Alert();
      a.title = "SMSParser Test Mode";
      a.message = "Paste a bank SMS to test parsing:";
      a.addTextField("SMS text", "");
      a.addTextField("Sender (e.g. AXISBK)", "");
      a.addAction("Parse");
      a.addCancelAction("Cancel");
      let idx = await a.presentAlert();
      if (idx < 0) return;
      let testText = a.textFieldValue(0);
      let testSender = a.textFieldValue(1);
      if (!testText) {
        await showNotification("Expenser SMS", "No text entered.");
        return;
      }
      input = JSON.stringify({ text: testText, sender: testSender });
    }

    // Input can be plain string or JSON dict: {"text":"...","sender":"AXISBK"}
    let smsText = "";
    let sender = "";

    if (typeof input === "string") {
      // Try parsing as JSON first
      try {
        let parsed = JSON.parse(input);
        if (parsed && typeof parsed === "object") {
          smsText = parsed.text || parsed.body || parsed.message || "";
          sender = parsed.sender || parsed.from || "";
        } else {
          smsText = input;
        }
      } catch (e) {
        smsText = input;
      }
    } else if (typeof input === "object" && input !== null) {
      smsText = input.text || input.body || input.message || "";
      sender = input.sender || input.from || "";
    }

    if (!smsText) {
      await showNotification("Expenser SMS", "Empty SMS text received.");
      Script.setShortcutOutput("Error: empty SMS");
      return;
    }

    // 2. Load config first (needed for account identification)
    let config = await loadConfig();
    if (!config || !config.accounts) {
      await showNotification("Expenser SMS", "Config file missing or invalid.");
      Script.setShortcutOutput("Error: config not found");
      return;
    }

    // 3. Parse the SMS
    let parsed = parseSMS(smsText, sender, config);
    if (!parsed) {
      await showNotification("Expenser SMS", "Could not parse SMS - skipped.");
      Script.setShortcutOutput("Skipped: not a transaction SMS");
      return;
    }

    let expenses = await loadExpenses();

    // 4. Auto-categorize if not already set
    if (parsed.category === "Uncategorized") {
      parsed.category = categorize(parsed.merchant, config);
    }

    // 5. Extract date and time from SMS
    let dateStr = extractDate(smsText);
    let timeStr = extractTime(smsText);

    // 6. Check for duplicates
    if (isDuplicate(expenses, parsed.amount, parsed.account, dateStr, parsed.merchant, parsed.ref)) {
      await showNotification("Expenser SMS", "Duplicate transaction skipped.");
      Script.setShortcutOutput("Skipped: duplicate");
      return;
    }

    // 7. Build transaction object
    let txn = {
      id: generateId(),
      date: dateStr,
      time: timeStr,
      amount: parsed.amount,
      type: parsed.type,
      category: parsed.category,
      merchant: parsed.merchant,
      account: parsed.account,
      source: "sms",
      ref: parsed.ref,
      note: ""
    };

    // 7. Save transaction
    expenses.push(txn);
    await saveExpenses(expenses);

    // 8. Build confirmation message
    let acctName = config.accounts[parsed.account]
      ? config.accounts[parsed.account].name
      : parsed.account;
    let summary = `${formatCurrency(parsed.amount)} ${parsed.type === "debit" ? "from" : "to"} ${acctName}`;
    if (parsed.merchant) summary += `\n${parsed.merchant}`;
    summary += `\n${parsed.category}`;

    // 9. Show notification and return output
    await showNotification("Expenser", summary);
    Script.setShortcutOutput(summary);

  } catch (e) {
    // Generic error handler - do NOT leak SMS content
    await showNotification("Expenser SMS", "Failed to process SMS.");
    Script.setShortcutOutput("Error: processing failed");
  }
}

// --- Run ---
await main();
Script.complete();
