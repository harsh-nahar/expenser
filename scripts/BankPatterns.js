// BankPatterns.js - Shared bank-specific patterns for SMS and Email parsing
// Used by SMSParser.js and EmailParser.js via importModule("BankPatterns")
//
// TO ADD A NEW BANK:
// 1. Add a new entry under the "banks" object below
// 2. Fill in smsSenders, emailSenders, accountRules, and merchantRules
// 3. Copy this file to Scriptable on your phone
// 4. Add a Shortcut automation for the new account's last4 digits
//
// STRUCTURE:
// - smsSenders: uppercase substrings found in SMS sender IDs
// - emailSenders: regex patterns matching email From addresses
// - accountRules: ordered rules to determine account key from SMS/email text
//   - "when" contains regex patterns that ALL must match (AND logic)
//   - "account" is the config key to return
//   - Last rule should have no "when" (default fallback)
// - merchantRules.sms: ordered rules for extracting merchant from SMS
//   - "account" (optional): only apply if this account was identified
//   - "regex": pattern with capture group 1 = merchant name
//   - "value" (optional): fixed merchant name instead of regex capture
// - merchantRules.email: ordered rules for extracting merchant from emails

const BANKS = {
  hdfc: {
    smsSenders: ["HDFCBN", "HDFCBK"],
    emailSenders: [/alerts@hdfcbank\.(net|com)/i],
    accountRules: [
      { when: [/credit\s*card/i], type: "cc" },
      { when: [/\bcard\b/i, /\bspent\b/i], type: "cc" },
      { type: "savings" }
    ],
    merchantRules: {
      sms: [
        // HDFC Savings: check VPA first (for credits that show "from VPA name@bank")
        { account: "savings", regex: /from\s+VPA\s+([^\s(]+)/i },
        // HDFC Savings: "Sent Rs.X To MERCHANT On DATE"
        { account: "savings", regex: /To\s+(.+?)\s+On\s+\d/i },
        // HDFC Savings EMI: "Info: EMI XXXXXXX"
        { account: "savings", regex: /Info:\s*EMI\b/i, value: "EMI" },
        // HDFC CC: "Spent Rs.X At MERCHANT On DATE"
        { account: "cc", regex: /\bAt\s+(.+?)\s+On\s+\d/i },
        // HDFC CC fallback: "at MERCHANT on DATE"
        { account: "cc", regex: /\bat\s+(.+?)\s+on\s+\d/i }
      ],
      email: [
        // "to VPA addr NAME on" - extract human name after VPA address
        { regex: /to\s+VPA\s+\S+\s+([A-Za-z][A-Za-z ]{2,40}?)\s+on\s+\d/i },
        // "towards MERCHANT on DATE" (HDFC CC emails)
        { regex: /towards\s+([A-Za-z][A-Za-z0-9 &.'_-]{1,40}?)\s+on\s+\d/i }
      ]
    }
  },

  hsbc: {
    smsSenders: ["HSBCIN"],
    emailSenders: [/hsbcnet\.com/i, /hsbc/i],
    accountRules: [
      { when: [/credit\s*card/i], type: "cc" },
      { type: "savings" }
    ],
    merchantRules: {
      sms: [
        // HSBC Savings: "is paid from HSBC account XXX to MERCHANT on DATE"
        { account: "savings", regex: /to\s+(.+?)\s+on\s+\d/i, context: /paid\s+from/i },
        // HSBC Savings credit: "of DESCRIPTION"
        { account: "savings", regex: /\bof\s+(.+?)(?:\.\s|$)/i, context: /credited/i },
        // HSBC CC: "at MERCHANT on DATE" (strip leading store codes)
        { account: "cc", regex: /\bat\s+(.+?)\s+on\s+\d/i, stripLeadingDigits: true }
      ],
      email: []
    }
  },

  icici: {
    smsSenders: ["ICICIT"],
    emailSenders: [/credit_cards@icicibank\.com/i, /alerts@icicibank\.com/i],
    accountRules: [
      { type: "cc" }
    ],
    merchantRules: {
      sms: [
        // "XX123 debited for Rs X; MERCHANT credited."
        { regex: /;\s*([A-Za-z][A-Za-z &.'-]+?)\s+credited/i },
        // Standing instruction: "processed payment to Merchant NAME"
        { regex: /(?:to\s+)?[Mm]erchant\s+([A-Za-z0-9_ .&-]+?)(?:\s*[,.]|\s+on\s|\s*$)/ },
        // "on DATE on/at MERCHANT"
        { regex: /on\s+\d{1,2}[-\/]\w{3}[-\/]?\d{0,4}\s+(?:on|at)\s+(.+?)(?:\.\s|$)/i },
        // Fallback: "at MERCHANT"
        { regex: /\bat\s+(.+?)(?:\.\s|$)/i }
      ],
      email: [
        // "Info: MERCHANT." (ICICI CC emails)
        { regex: /Info:\s*([A-Za-z][A-Za-z0-9 &.'_-]{1,40}?)(?:\.\s*$|\s*$)/im }
      ]
    }
  },

  axis: {
    smsSenders: ["AXISBK"],
    emailSenders: [/alerts@axis\.?bank\.?(in|com)/i],
    accountRules: [
      { type: "savings" }
    ],
    merchantRules: {
      sms: [
        // Mandate/autopay: "debited towards MERCHANT for INR"
        { regex: /debited\s+towards\s+([A-Za-z][A-Za-z0-9 &.'_-]+?)\s+for\s+(?:INR|Rs)/i },
        // "towards MERCHANT for Create Mandate" (upcoming that slips through)
        { regex: /towards\s+([A-Za-z][A-Za-z0-9 &.'_-]+?)\s+for\s+/i }
      ],
      email: []
    }
  }
};

// --- Generic patterns used as fallback for any bank ---
const GENERIC_SMS_MERCHANT_PATTERNS = [
  // UPI pattern: UPI/P2A/ref/NAME or UPI/P2M/ref/MERCHANT
  { regex: /(?:UPI|IPPF|NEFT|IMPS)\/[^\/\n]+\/[^\/\n]+\/([^\n]+)/i, postProcess: "upi" },
  // Generic: "to/at/from MERCHANT on DATE"
  { regex: /(?:to|at|from)\s+([A-Za-z][A-Za-z0-9 &.'_-]{2,30})(?:\s+on\s+\d|\.\s|$)/i },
  // Broader: "to/at/from NAME" at end
  { regex: /(?:to|at|from)\s+([A-Za-z][A-Za-z .']{2,30})\s*[\n]*$/i }
];

const GENERIC_EMAIL_MERCHANT_PATTERNS = [
  // UPI format in email
  { regex: /UPI\/\w+\/\d+\/([A-Za-z][A-Za-z0-9 &.'_-]{1,40})/i },
  // "to VPA addr NAME on"
  { regex: /to\s+VPA\s+\S+\s+([A-Za-z][A-Za-z ]{2,40}?)\s+on\s+\d/i },
  // "Info: MERCHANT"
  { regex: /Info:\s*([A-Za-z][A-Za-z0-9 &.'_-]{1,40}?)(?:\.\s*$|\s*$)/im },
  // "at MERCHANT for/on/via"
  { regex: /(?:at|@)\s+([A-Za-z0-9][\w\s&.*'-]{1,40}?)(?:\s+(?:for|on|via|using|through)\b)/i },
  // "to/towards MERCHANT on"
  { regex: /(?:to|towards)\s+([A-Za-z0-9][\w\s&.*'-]{1,40}?)(?:\s+(?:on|from|via|using|through|for|has)\b)/i },
  // "at MERCHANT" at end of line
  { regex: /(?:at|@)\s+([A-Za-z0-9][\w\s&.*'-]{1,40}?)(?:\s*\.?\s*$|\s+on\s)/im },
  // "to MERCHANT" at end
  { regex: /(?:to)\s+([A-Za-z0-9][\w\s&.*'-]{1,40}?)(?:\s*\.?\s*$)/im }
];

// --- Helper: identify bank from SMS sender ---
function identifyBankFromSender(sender) {
  if (!sender) return null;
  let upper = sender.toUpperCase();
  for (let bankId in BANKS) {
    if (BANKS[bankId].smsSenders.some(s => upper.includes(s))) return bankId;
  }
  return null;
}

// --- Helper: identify bank from email sender ---
function identifyBankFromEmail(fromAddress) {
  if (!fromAddress) return null;
  for (let bankId in BANKS) {
    if (BANKS[bankId].emailSenders.some(re => re.test(fromAddress))) return bankId;
  }
  return null;
}

// --- Helper: identify bank from text content ---
function identifyBankFromText(text) {
  let upper = text.toUpperCase();
  if (upper.includes("HSBC")) return "hsbc";
  if (upper.includes("HDFC")) return "hdfc";
  if (upper.includes("ICICI")) return "icici";
  if (upper.includes("AXIS")) return "axis";
  return null;
}

// --- Determine account type (savings/cc) from bank rules ---
function resolveAccountType(bankId, text) {
  let bank = BANKS[bankId];
  if (!bank) return null;
  let upper = text.toUpperCase();
  for (let rule of bank.accountRules) {
    if (!rule.when) return rule.type; // default
    if (rule.when.every(re => re.test(upper))) return rule.type;
  }
  return "savings"; // safe default
}

// --- Find config account key from bank + type + last4 ---
function findAccountKey(config, bankId, accountType, last4) {
  if (!config || !config.accounts) return null;
  let accounts = config.accounts;

  // First: try exact last4 match
  if (last4) {
    for (let key in accounts) {
      if (accounts[key].last4 === last4) return key;
    }
  }

  // Second: match by bank name + type
  let isCC = accountType === "cc";
  for (let key in accounts) {
    if (key.includes(bankId) && (isCC ? key.includes("cc") : !key.includes("cc"))) {
      return key;
    }
  }

  return null;
}

// --- Extract last 4 digits from text ---
function extractLast4(text) {
  let m = text.match(/(?:XX|ending\s*|x{2,6}|\*{1,6}|account\s*|Card\s*x?)(\d{3,4})\b/i);
  return m ? m[1] : null;
}

// --- Full account identification (SMS) ---
function identifyAccountSMS(text, sender, config) {
  let bankId = identifyBankFromSender(sender) || identifyBankFromText(text);
  if (!bankId) {
    // Try last4 only
    let last4 = extractLast4(text);
    return last4 ? findAccountKey(config, "", "", last4) : null;
  }
  let accountType = resolveAccountType(bankId, text);
  let last4 = extractLast4(text);
  return findAccountKey(config, bankId, accountType, last4);
}

// --- Full account identification (Email) ---
function identifyAccountEmail(text, fromAddress, config) {
  let bankId = identifyBankFromEmail(fromAddress) || identifyBankFromText(text);
  if (!bankId) {
    let last4 = extractLast4(text);
    return last4 ? findAccountKey(config, "", "", last4) : null;
  }
  let accountType = resolveAccountType(bankId, text);
  let last4 = extractLast4(text);
  return findAccountKey(config, bankId, accountType, last4);
}

// --- Extract merchant from SMS ---
function extractMerchantSMS(text, sender, accountKey) {
  let bankId = identifyBankFromSender(sender) || identifyBankFromText(text);
  let bank = bankId ? BANKS[bankId] : null;

  // Determine if this account is CC or savings type
  let isCC = accountKey ? accountKey.includes("cc") : false;
  let acctType = isCC ? "cc" : "savings";

  // Try bank-specific patterns first
  if (bank && bank.merchantRules.sms) {
    for (let rule of bank.merchantRules.sms) {
      // Filter by account type if specified
      if (rule.account && rule.account !== acctType) continue;
      // Check context condition if specified
      if (rule.context && !rule.context.test(text)) continue;

      let m = text.match(rule.regex);
      if (m) {
        if (rule.value) return rule.value;
        let merchant = m[1].trim();
        if (rule.stripLeadingDigits) merchant = merchant.replace(/^\d+\s*/, "");
        return merchant || null;
      }
    }
  }

  // Try generic patterns
  for (let rule of GENERIC_SMS_MERCHANT_PATTERNS) {
    let m = text.match(rule.regex);
    if (m) {
      let raw = m[1].trim();
      if (rule.postProcess === "upi") {
        raw = raw.replace(/\s*(?:Not you|Didn'?t do this|Trxn\.?\s*not\s+done|Call\s|Visit\s|If not|Report\s|Dial\s|Contact\s).*/i, "").trim();
        raw = raw.replace(/[^A-Za-z0-9 .&'-]+$/, "").trim();
        raw = raw.replace(/\s+(?:on|at|for|via|ref|dt|dated)\s*.*$/i, "").trim();
        raw = raw.replace(/^\d+\s*/, "").trim();
        let words = raw.split(/\s+/).filter(w => /[A-Za-z]/.test(w)).slice(0, 3).join(" ");
        if (words.length >= 2) return words;
      } else {
        return raw;
      }
    }
  }

  // Last resort: last line that looks like a name
  let lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  for (let i = lines.length - 1; i >= 0; i--) {
    let line = lines[i];
    if (/^[A-Z][a-zA-Z .']{3,30}$/.test(line) && line.includes(" ")) {
      return line;
    }
  }

  return "";
}

// --- Extract merchant from Email ---
function extractMerchantEmail(text, fromAddress) {
  let bankId = identifyBankFromEmail(fromAddress) || identifyBankFromText(text);
  let bank = bankId ? BANKS[bankId] : null;

  // Try bank-specific email patterns
  if (bank && bank.merchantRules.email) {
    for (let rule of bank.merchantRules.email) {
      let m = text.match(rule.regex);
      if (m && m[1]) {
        let merchant = m[1].trim().replace(/\s+/g, " ").replace(/[.\s]+$/, "").replace(/^[.\s]+/, "");
        if (merchant.length >= 2 && merchant.length <= 40) {
          if (/^(a\/c|account|card|your|the|an?)\b/i.test(merchant)) continue;
          if (/^\d+$/.test(merchant)) continue;
          return merchant;
        }
      }
    }
  }

  // Try generic email patterns
  for (let rule of GENERIC_EMAIL_MERCHANT_PATTERNS) {
    let m = text.match(rule.regex);
    if (m && m[1]) {
      let merchant = m[1].trim().replace(/\s+/g, " ").replace(/[.\s]+$/, "").replace(/^[.\s]+/, "");
      if (merchant.length >= 2 && merchant.length <= 40) {
        if (/^(a\/c|account|card|your|the|an?)\b/i.test(merchant)) continue;
        if (/^\d+$/.test(merchant)) continue;
        return merchant;
      }
    }
  }

  return null;
}

// --- Supported banks list (for Manage Accounts UI) ---
function getSupportedBanks() {
  return Object.keys(BANKS).map(id => ({
    id: id,
    name: id.toUpperCase(),
    hasCC: BANKS[id].accountRules.some(r => r.type === "cc"),
    hasSavings: BANKS[id].accountRules.some(r => r.type === "savings" || !r.when)
  }));
}

module.exports = {
  BANKS,
  identifyBankFromSender,
  identifyBankFromEmail,
  identifyBankFromText,
  identifyAccountSMS,
  identifyAccountEmail,
  extractMerchantSMS,
  extractMerchantEmail,
  extractLast4,
  getSupportedBanks
};
