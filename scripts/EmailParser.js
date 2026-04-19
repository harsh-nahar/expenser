// ============================================================
// EmailParser.js - Expenser Email Auto-Logger
// Runs in Scriptable, called from iOS Shortcuts
// ZERO network calls - fully offline
// ============================================================

// --- File Path Setup ---
const fm = FileManager.iCloud();
let BASE;
try {
  BASE = fm.bookmarkedPath("expenser");
} catch (e) {
  let n = new Notification();
  n.title = "Expenser";
  n.body = "Bookmark 'expenser' not set up. Open Expenser.js first.";
  n.sound = "failure";
  await n.schedule();
  Script.setShortcutOutput("Error: Bookmark not configured");
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
  n.title = "Expenser";
  n.body = "BankPatterns module not found. Copy BankPatterns.js to Scriptable.";
  n.sound = "failure";
  await n.schedule();
  Script.setShortcutOutput("Error: BankPatterns module missing");
  Script.complete();
  return;
}

// --- Category Keywords ---
const CATEGORY_KEYWORDS = {
  "Food & Dining": /swiggy|zomato|restaurant|cafe|tea|coffee|food|eat|biryani|pizza|burger|dominos|mcdonalds|kfc|starbucks|chaayos|haldiram/i,
  "Transport": /uber|ola|rapido|metro|bus|train|irctc|flight|makemytrip|goibibo|petrol|diesel|fuel|parking|cab|taxi|auto/i,
  "Shopping": /amazon|flipkart|myntra|ajio|shopping|mall|store|market|bazaar|meesho|nykaa/i,
  "Entertainment": /netflix|hotstar|spotify|prime|youtube|movie|cinema|game|pvr|inox|bookmyshow/i,
  "Rent & Housing": /rent|maintenance|society|housing|broker/i,
  "Utilities & Bills": /electricity|electric|water|gas|broadband|wifi|jio|airtel|vi|vodafone|bsnl|recharge|postpaid|prepaid|tata play|dth/i,
  "Health & Medical": /doctor|hospital|medical|pharmacy|medicine|apollo|medplus|health|dental|eye|lab\b|diagnostic|practo|1mg/i,
  "Fitness": /gym|fitness|yoga|sport|swim/i,
  "Groceries": /grocery|bigbasket|blinkit|zepto|dmart|supermarket|vegetables|milk|fruits|jiomart|more supermarket/i,
  "Education": /school|college|course|udemy|coursera|book|tuition|coaching|exam|fee|education/i,
  "Insurance": /insurance|lic|policy|premium/i,
  "Investments": /mutual fund|sip|zerodha|groww|investment|stock|share|nps|ppf|fd|deposit/i,
  "EMI & Loans": /emi|loan|interest|bajaj finserv|bajaj finance/i,
  "Personal Care": /salon|haircut|spa|beauty|grooming|laundry|dry clean|tailor|barber|parlour/i,
  "Gifts & Donations": /gift|donation|charity|temple|church|mosque|zakat/i,
  "Travel": /travel|hotel|resort|airbnb|oyo|booking|trip|cleartrip|yatra/i,
  "Cash Withdrawal": /atm|cash|withdraw/i
};

// --- Regex Patterns ---
const AMOUNT_RE = /(?:Rs\.?|INR|₹)\s?([\d,]+\.?\d*)/i;
const TYPE_RE = /\b(debited|credited|spent|charged|payment\s*received|refund(?:ed)?|reversed|withdrawn|deposited|used\s+for)\b/i;
const LAST4_RE = /(?:XX|xx|\*\*|\*{4}|ending\s*|x{2,4}|account\s*)(\d{4})\b/gi;
const SALARY_RE = /\b(salary|sal\b|payroll)\b/i;

// Patterns to skip
const SKIP_SUBJECT_RE = /\b(statement|monthly statement|offer|reward points|cashback offer|otp|one time password)\b/i;

// Promotional footer markers - truncate email body at these
const PROMO_MARKERS = /\b(enjoy|offer|exclusive|download|terms and conditions|unsubscribe|manage preferences|click here|visit us|follow us|disclaimer|important:|note:|this is an auto|do not reply)\b/i;

// --- File I/O Helpers ---
async function loadJSON(path) {
  try {
    if (fm.fileExists(path)) {
      await fm.downloadFileFromiCloud(path);
      return JSON.parse(fm.readString(path));
    }
  } catch (e) { /* fall through */ }
  return null;
}

function saveJSON(path, data) {
  fm.writeString(path, JSON.stringify(data, null, 2));
}

// --- Utility Helpers ---
function generateId() {
  let df = new DateFormatter();
  df.dateFormat = "yyyyMMdd_HHmmssSSS";
  return "txn_" + df.string(new Date()) + "_e";
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

// Extract transaction date from email text, fallback to today
function extractDate(text) {
  let months = { jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12" };

  // DD-MM-YYYY or DD/MM/YYYY
  let m1 = text.match(/(\d{2})[-\/](\d{2})[-\/](\d{4})/);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;

  // DD Mon YYYY or DD-Mon-YYYY ("11 Apr 2026")
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
  return "₹" + lastThree + "." + decPart;
}

// --- Core Parsing ---

function parseAmount(text) {
  let m = text.match(AMOUNT_RE);
  if (!m) return null;
  let raw = m[1].replace(/,/g, "");
  let val = parseFloat(raw);
  return isNaN(val) || val <= 0 ? null : val;
}

function parseType(text) {
  let m = text.match(TYPE_RE);
  if (!m) return null;
  let word = m[1].toLowerCase();
  if (/credited|received|refund|reversed|deposited/.test(word)) return "credit";
  return "debit";
}

// --- Account & Merchant (delegated to BankPatterns) ---

function identifyAccount(bodyText, fromAddress, config) {
  return BP.identifyAccountEmail(bodyText, fromAddress, config);
}

function extractMerchant(text, fromAddress) {
  return BP.extractMerchantEmail(text, fromAddress);
}

function categorize(merchant, bodyText) {
  let searchText = (merchant || "") + " " + (bodyText || "");

  // Salary/income check first
  if (SALARY_RE.test(searchText)) return "Income";

  let lower = searchText.toLowerCase();
  for (let cat in CATEGORY_KEYWORDS) {
    if (CATEGORY_KEYWORDS[cat].test(lower)) return cat;
  }

  return "Uncategorized";
}

function shouldSkipEmail(subject, bodyText) {
  let combined = (subject || "") + " " + (bodyText || "");

  // Skip non-transaction emails
  if (SKIP_SUBJECT_RE.test(subject || "")) return true;

  // Skip if no amount found at all
  if (!AMOUNT_RE.test(combined)) return true;

  return false;
}

// Strip promotional footer from email body to avoid false category matches
function cleanEmailBody(text) {
  if (!text) return "";
  // Strip HTML tags if present
  if (/<[a-z][\s\S]*>/i.test(text)) {
    text = text.replace(/<br\s*\/?>/gi, "\n")
               .replace(/<\/(?:p|div|tr|li|h\d)>/gi, "\n")
               .replace(/<[^>]+>/g, "")
               .replace(/&nbsp;/gi, " ")
               .replace(/&amp;/gi, "&")
               .replace(/&lt;/gi, "<")
               .replace(/&gt;/gi, ">")
               .replace(/&quot;/gi, '"')
               .replace(/&#?\w+;/gi, "")
               .replace(/\n{3,}/g, "\n\n")
               .trim();
  }
  let match = text.match(PROMO_MARKERS);
  if (match) {
    return text.substring(0, match.index).trim();
  }
  // Fallback: limit to first 1500 chars (enough for any transaction block)
  return text.length > 1500 ? text.substring(0, 1500) : text;
}

function parseEmail(bodyText, subject, fromAddress, config) {
  if (!bodyText || typeof bodyText !== "string" || bodyText.trim().length === 0) {
    return null;
  }

  // Clean promotional content from body before parsing
  let cleanBody = cleanEmailBody(bodyText);

  // Combine subject and cleaned body for analysis
  let fullText = ((subject || "") + " " + cleanBody).trim();

  // Check if we should skip (use original body for amount detection)
  if (shouldSkipEmail(subject, bodyText)) return null;

  // Extract amount
  let amount = parseAmount(fullText);
  if (!amount) return null;

  // Detect transaction type
  let type = parseType(fullText);
  if (!type) {
    type = "debit"; // safe default
  }

  // Skip credit transactions - we only track expenses
  if (type === "credit") return null;

  // Identify account
  let account = identifyAccount(fullText, fromAddress, config);

  // Extract merchant from cleaned body only
  let merchant = extractMerchant(cleanBody, fromAddress);

  // Categorize from merchant name only (not full body - avoids promo text pollution)
  let category = categorize(merchant, "");

  // Self-transfer detection - customize the regex below with your own name
  // Example: /\bjohn\s+doe\b/i or /\byour\s+name\b/i
  if (merchant && /\byour\s+name\s+here\b/i.test(merchant)) {
    category = "Self Transfer";
  }
  // ATM / cash withdrawal
  else if (/\bwithdra(?:wn|wal)\b/i.test(fullText) || /\bATM\b/i.test(fullText)) {
    category = "Cash Withdrawal";
    if (!merchant) merchant = "ATM";
  }
  // EMI detection
  else if (/\bEMI\b/i.test(fullText)) {
    category = "EMI & Loans";
    if (!merchant) merchant = "EMI";
  }

  // Check for salary/income - override type to credit
  if (category === "Income") type = "credit";

  // Extract UPI/transaction reference (12-digit ID)
  let ref = null;
  let refMatch = fullText.match(/(?:UPI[:\s]*|Ref[:\s]*|ref\s+|reference\s+(?:number\s+)?(?:is\s+)?)(\d{12})\b/i)
    || fullText.match(/UPI\/\w+\/(\d{12})\b/i);
  if (refMatch) ref = refMatch[1];

  return {
    amount: amount,
    type: type,
    account: account,
    merchant: merchant,
    category: category,
    ref: ref,
    source: "email"
  };
}

// --- Duplicate Detection ---
// Prevents same transaction being logged by both SMS and email
// Matches on amount + account + date + merchant
function isDuplicate(expenses, parsed, dateStr) {
  let recent = expenses.slice(-50);
  // If ref exists, match by ref alone (strongest dedup - works across SMS and email)
  if (parsed.ref) {
    if (recent.some(tx => tx.ref === parsed.ref)) return true;
  }
  // Fallback: match by amount + account + date + merchant
  let merchant = (parsed.merchant || "").toLowerCase();
  return recent.some(tx =>
    tx.amount === parsed.amount &&
    tx.account === parsed.account &&
    tx.date === dateStr &&
    (tx.source === "email" || tx.source === "sms") &&
    (tx.merchant || "").toLowerCase() === merchant
  );
}

// --- Notification Helper ---
async function notify(title, body, success) {
  let n = new Notification();
  n.title = title;
  n.body = body;
  n.sound = success ? "default" : "failure";
  await n.schedule();
}

// --- Input Parsing ---
function parseInput(input) {
  if (!input) return null;

  // If it's already an object (Shortcuts can pass dictionaries)
  if (typeof input === "object" && input !== null) {
    return {
      text: String(input.text || ""),
      subject: String(input.subject || ""),
      from: String(input.from || "")
    };
  }

  // If it's a string, try JSON first
  if (typeof input === "string") {
    let trimmed = input.trim();
    if (trimmed.startsWith("{")) {
      try {
        let obj = JSON.parse(trimmed);
        return {
          text: String(obj.text || ""),
          subject: String(obj.subject || ""),
          from: String(obj.from || "")
        };
      } catch (e) {
        // Not valid JSON, treat as plain text
      }
    }
    // Plain text email body
    return { text: trimmed, subject: "", from: "" };
  }

  return null;
}

// --- Main ---
async function main() {
  let rawInput = args.shortcutParameter;
  let emailText = "";
  let emailSubject = "";
  let emailFrom = "";


  // Try all possible input sources from Shortcuts
  if (rawInput) {
    if (typeof rawInput === "string") {
      let trimmed = rawInput.trim();
      if (trimmed.startsWith("{")) {
        try {
          let obj = JSON.parse(trimmed);
          emailText = String(obj.text || obj.body || obj.content || "");
          emailSubject = String(obj.subject || "");
          emailFrom = String(obj.from || obj.sender || "");
        } catch (e) {
          emailText = trimmed;
        }
      } else {
        emailText = trimmed;
      }
    } else if (typeof rawInput === "object" && rawInput !== null) {
      // Shortcuts may pass a dictionary/object
      emailText = String(rawInput.text || rawInput.body || rawInput.content || rawInput.Body || "");
      emailSubject = String(rawInput.subject || rawInput.Subject || "");
      emailFrom = String(rawInput.from || rawInput.sender || rawInput.From || rawInput.Sender || "");
    }
  }

  // Also check other Scriptable input sources
  if (!emailText && args.plainTexts && args.plainTexts.length > 0) {
    emailText = args.plainTexts[0];
  }
  if (!emailText && args.urls && args.urls.length > 0) {
    emailText = args.urls[0];
  }
  if (!emailText && args.widgetParameter) {
    emailText = String(args.widgetParameter);
  }

  // If no input at all (run directly in Scriptable), offer manual test
  if (!emailText) {
    // Check if we're in Scriptable app (not from Shortcuts)
    try {
      let a = new Alert();
      a.title = "EmailParser";
      a.message = `No email content received.\n\nPaste email body to test:`;
      a.addTextField("Email body", "");
      a.addTextField("Subject (optional)", "");
      a.addTextField("From (optional)", "");
      a.addAction("Parse");
      a.addCancelAction("Cancel");
      let idx = await a.presentAlert();
      if (idx < 0) return;
      emailText = a.textFieldValue(0);
      emailSubject = a.textFieldValue(1);
      emailFrom = a.textFieldValue(2);
    } catch (e) {
      // Running from Shortcuts but no input
      await notify("Expenser", "No email content received.", false);
      Script.setShortcutOutput("Error: No input");
      return;
    }
  }

  if (!emailText) {
    await notify("Expenser", "No email content received.", false);
    Script.setShortcutOutput("Error: No input");
    return;
  }

  // Load data files
  let config = await loadJSON(CONFIG_PATH);
  if (!config || !config.accounts) {
    await notify("Expenser", "Config file missing. Run Expenser.js first.", false);
    Script.setShortcutOutput("Error: Config missing");
    return;
  }

  let expenses = (await loadJSON(EXPENSES_PATH)) || [];

  // Parse the email
  let parsed = parseEmail(emailText, emailSubject, emailFrom, config);

  if (!parsed) {
    await notify("Expenser", "Could not parse email - not a transaction.", false);
    Script.setShortcutOutput("Skipped: Not a transaction email");
    return;
  }

  let dateStr = extractDate(emailText);
  let timeStr = extractTime(emailText);

  // Duplicate check
  if (isDuplicate(expenses, parsed, dateStr)) {
    await notify("Expenser", "Duplicate transaction skipped.", false);
    Script.setShortcutOutput("Skipped: Duplicate");
    return;
  }

  // Resolve account name for display
  let accountName = parsed.account || "unknown";
  let acctConfig = parsed.account ? config.accounts[parsed.account] : null;
  let displayAccount = acctConfig ? acctConfig.name : accountName;

  // Build transaction
  let txn = {
    id: generateId(),
    date: dateStr,
    time: timeStr,
    amount: parsed.amount,
    type: parsed.type,
    category: parsed.category,
    merchant: parsed.merchant || null,
    account: parsed.account || null,
    source: "email",
    ref: parsed.ref,
    note: null
  };

  // Save
  expenses.push(txn);
  saveJSON(EXPENSES_PATH, expenses);

  // Format confirmation
  let summary = `${formatCurrency(parsed.amount)} ${parsed.type === "credit" ? "credited to" : "debited from"} ${displayAccount}`;
  if (parsed.merchant) summary += ` (${parsed.merchant})`;
  summary += ` [${parsed.category}]`;

  await notify("Expense Logged", summary, true);
  Script.setShortcutOutput(summary);
}

await main();
Script.complete();
