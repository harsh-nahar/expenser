# SMS Patterns Reference

Bank SMS formats and regex patterns for parsing transaction details.
**All formats based on real Indian bank SMS patterns (April 2026). Account numbers shown are examples - replace with your own.**

---

## Sender IDs (as shown in iOS Messages)

| iOS Sender ID | Bank/CC | Notes |
|---------------|---------|-------|
| `AXISBK-S` | Axis Bank Savings | All Axis bank transactions |
| `HSBCIN-S` | HSBC Bank + CC | Both savings and Rupay CC |
| `HDFCBN-S` | HDFC Bank | Savings transactions (no txn SMS seen yet) |
| `ICICIT-S` | ICICI Amazon CC | Actual spends + payments received |
| `ICICIT-T` | ICICI Amazon CC | Standing instruction notices (future - skip most) |
| `JX-ICICIT-T` | ICICI Amazon CC | Standing instruction processed (actual txn - log) |
| `HSBCIM-S` | HSBC (non-txn) | Maintenance notices, downtime - **always skip** |

> **Note:** iOS shows sender IDs with a `-S` or `-T` suffix. The SMS automation "Sender" field should match these exact IDs.

---

## Regex Patterns (used in Shortcut `Match Text` actions)

### Amount
```
(?:Rs\.?|INR|₹)\s?([\d,]+\.?\d*)
```
Captures: `450`, `1,200.50`, `25000.00`, `15000.0`

### Debit or Credit
```
(?i)(debited|credited|spent|paid from|received|withdrawn|deposited|charged|reversed|refund)
```
Note: HSBC uses "is paid from" for debits, "is credited with" for credits.

### Available Balance (only some SMS include this)
```
(?:Avl\.?\s?Bal|Available Balance|Avl Bal|Avl Lmt|Avl Limit)[:\s]*(?:is\s)?(?:Rs\.?|INR|₹)?\s?([\d,]+\.?\d*)
```
- ✅ Present in: HSBC credit/salary SMS
- ✅ Present in: ICICI CC spend (as "Avl Limit" / "Avl Lmt")
- ❌ Missing from: Axis debit/credit, HSBC debit, HSBC CC spend

### Merchant / Payee
Bank-specific - see formats below. General fallback:
```
(?:to|at|from|Info:)\s+([A-Za-z0-9@\s\.\-]+?)(?:\s+on|\s+Ref|\s+NEFT|\.|$)
```

### Date
```
(\d{2}[\-/]\d{2}[\-/]\d{2,4})
```
Note: Axis uses `dd-MM-yy` (02-04-26). HSBC debit uses `dd-Mon-yy` (18-Feb-26). HSBC credit uses `ddMON` (27FEB).

### Account Last 4 Digits
```
(?:A/?c\s*(?:no\.)?\s*(?:XX|xx|\*\*)|Card\s*(?:XX|xx)|ending)\s*(\d{4})
```

---

## Bank-Specific SMS Formats (Real)

### Axis Bank (Sender: `AXISBK-S`) - Account XX5678

**UPI Debit (multi-line):**
```
INR 2100.00 debited
A/c no. XX5678
06-04-26, 10:29:23
UPI/P2M/102922856956/Axis Bank
Not you? SMS BLOCKUPI Cust ID to 919951860002
Axis Bank
```
- Amount: line 1 after "INR"
- Type: line 1 "debited" or "credited"
- Account: line 2 "A/c no. XX5678"
- Date/time: line 3
- Merchant: line 4 after last `/` (e.g., "Axis Bank", "Zerodha Broking Lim")
- ❌ No available balance

**Non-UPI Debit (IPPF/transfer, multi-line):**
```
Debit INR 500.00
Axis Bank A/c XX5678
02-04-26 10:38:24
IPPF/1195PPF0000000000022/WhatsApp BAL to 917036165000
Not You? SMS BLOCKALL CustID to 919951860002
```
- Starts with "Debit INR" instead of "INR ... debited"
- Line 4: IPPF = bank transfer, not UPI
- "WhatsApp BAL" = WhatsApp balance top-up

**UPI Credit (multi-line):**
```
INR 300.00 credited
A/c no. XX5678
05-04-26, 14:22:10
UPI/P2P/142210654321/Amit Kumar
Not you? SMS BLOCKUPI Cust ID to 919951860002
Axis Bank
```

**Merchant extraction for Axis (regex on line 4):**
```
(?:UPI|IPPF|NEFT|IMPS)/(?:[A-Za-z0-9]+/)*([A-Za-z0-9\s\.\-]+?)$
```
This captures the last segment after the final `/`.

**Key: Axis has NO available balance in any transaction SMS.**

---

### HSBC Savings (Sender: `HSBCIN-S`) - Account XXXXXX1234

**Debit (UPI/NEFT/IMPS):**
```
INR 15000.00 is paid from HSBC account XXXXXX1234 to RAJESH KUMAR on 18-Feb-26 with ref 604975476999. If this is not done by you, call 18002673456 to report.
```
- "is paid from" = debit
- Recipient after "to" before "on"
- Date: dd-Mon-yy format
- ❌ No available balance

**Credit / Salary (NEFT):**
```
HSBC: A/c 082-XXX***-234 is credited with INR 50,000.00+ on 27FEB at 03.36.50 with UTR CITIN26628371502 as NEFT from CITI A/c ***1103 of ACME-CORP-SALARY*** . Your Avl Bal is INR 1,25,000.00 .
```
- "is credited with" = credit
- Amount has trailing `+` sign - strip it
- Date: `ddMON` format (27FEB, 27MAR)
- Sender info after "of": `ACME-CORP-SALARY***` → salary detection!
- ✅ **Has Avl Bal** at end of message
- Account shown as `082-XXX***-234` (same account XXXXXX1234)

**Salary detection regex for HSBC:**
```
(?i)SALARY
```
Present in the NEFT description field ("ACME-CORP-SALARY***").

**Merchant extraction:**
- Debit: capture text between "to " and " on " → `RAJESH KUMAR`, `PRIYA SHARMA`
- Credit: capture text after "of " at end → `ACME-CORP-SALARY***`

---

### HSBC Rupay CC (Sender: `HSBCIN-S`) - Card ending 9876

**CC Spend:**
```
HSBC: Rs 426.56 spent on your HSBC Credit Card ending 9876 at 14491 Apollo Pharmacy on 11 Apr 2026 through UPI: 646747726706. Trxn. not done by you? Call 18002673456.
```
```
HSBC: Rs 214.0 spent on your HSBC Credit Card ending 9876 at Swiggy on 11 Apr 2026 through UPI: 192937955214. Trxn. not done by you? Call 18002673456.
```
- "spent on your HSBC Credit Card" = CC debit
- Card: "ending 9876"
- Merchant: after "at" before "on" - may have leading numbers (e.g., "14491 Apollo Pharmacy")
- Date: `dd Mon yyyy` format (11 Apr 2026)
- ❌ No available limit shown

**Merchant extraction regex:**
```
at\s+(?:\d+\s+)?([A-Za-z][A-Za-z0-9\s\.]+?)\s+on\s+\d
```
The `(?:\d+\s+)?` handles leading store codes like "14491".

**Distinguish HSBC bank vs CC:**
- Contains "Credit Card" → `hsbc_rupay_cc`
- Contains "HSBC account" or "A/c" → `hsbc_savings`

---

### ICICI Amazon CC - Card XX6543

**Three different senders with different purposes:**

#### Sender: `ICICIT-S` - Actual transactions ✅

**CC Spend (format 1):**
```
INR 585.00 spent using ICICI Bank Card XX6543 on 01-Apr-26 on INSTAMART. Avl Limit: INR 66,893.96. If not you, call 1800 2662/SMS BLOCK 6543 to 9215676766.
```
- "spent using ICICI Bank Card" = CC debit
- Merchant after second "on" (or "at")
- ✅ Has "Avl Limit" (available credit limit, not outstanding)

**CC Spend (format 2):**
```
...13,390.00 spent on ICICI Bank Card XX6543 on 30-Mar-26 at SAHRUDAYA HEALT. Avl Lmt: Rs 50,733.96. To dispute, call 18002662/SMS...
```
- May be truncated at start ("...") - still has amount
- "Avl Lmt" variant

**CC Payment Received:**
```
Payment of Rs 640.00 has been received on your ICICI Bank Credit Card XX6543 through Bharat Bill Payment System on 08-MAR-26.
```
```
Payment of Rs 16,950.00 has been received on your ICICI Bank Credit Card XX6543 through Bharat Bill Payment System on 30-MAR-26.
```
- "Payment... received on your... Credit Card" = CC payment (outstanding DOWN)
- Set `txn_type` = `credit` (reduces outstanding)
- Set `category` = `CC Bill Payment`

**Non-transaction (filter out):**
```
We have applied Usage Settings on ICICI Bank Credit Card XX6543. Log in to iMobile Pay/Net Banking > View/Manage Card Usage. For details call 1800 1080.
```
- No amount, no spend/debit/credit keyword → filtered by regex

#### Sender: `ICICIT-T` / `JM-ICICIT-T` - Standing instruction notices

**Upcoming debit (NOT a transaction - SKIP):**
```
Payment of INR 299.00 towards Merchant Youtube to be debited from ICICI Bank Credit Card 6543, as per Standing Instruction XiHOzdGU8F, is due by 03/04/2026. To cancel this debit or your Standing...
```
- Contains "is due by" → **this is a future notice, not an actual charge**
- **SKIP this** - the actual charge will come from `JX-ICICIT-T`

**Detection to skip:** `sms_text contains "is due by"`

#### Sender: `JX-ICICIT-T` - Standing instruction processed ✅

**Actual charge:**
```
We have successfully processed payment of INR 299.00 to Merchant Youtube, as per Standing Instruction XiHOzdGU8F on 03/04/2026 for ICICI Bank Credit Card 6543. To manage your Standing Instructions, visit www.icici.bank.in
```
- "successfully processed payment" = actual CC debit
- Merchant: after "to Merchant" before comma
- This IS a real transaction - log it

**Merchant extraction:**
```
(?:to |towards )Merchant\s+([A-Za-z0-9\s\.]+?)(?:,|\s+to be)
```

---

### HDFC Bank (Sender: `HDFCBN-S`) - Account xx4321

**⚠️ No transaction SMS seen in screenshots - only promotional.**

Promotional (skip):
```
Service Update
Your HDFC Bank A/c ending xx4321 is eligible for a Lifetime FREE RuPay Credit Card. Check:https://1.hdfc.bank.in/...
```
- No amount, no debit/credit keyword → auto-filtered

**Assumed debit format (needs verification):**
```
Rs {amount} debited from HDFC Bank A/c **4321 on {dd-MM-yy}. Avl bal:Rs {balance}. Not you? Call 18002586161.
```

**Assumed UPI format (needs verification):**
```
Money sent! Rs.{amount} from HDFC Bank A/c **4321 to {merchant} on {dd-MM-yy}. Ref {ref}. Avl Bal: Rs.{balance}.
```

> **TODO:** Verify HDFC formats when real transaction SMS arrive. The parser will still work for basic cases since the amount/debit-credit regex is generic.

### HDFC Regalia CC - ⚠️ No SMS seen

**Assumed spend format (needs verification):**
```
Your HDFC Bank Credit Card XX{last4} has been used for Rs.{amount} at {merchant} on {dd-Mon-yy}. Avl limit: Rs.{limit}.
```

> **TODO:** Verify when a real HDFC CC transaction SMS arrives.

---

## Non-Transaction SMS to Filter

These SMS come from bank senders but are NOT transactions. The parser should skip them.

| Pattern to Detect | Action |
|-------------------|--------|
| No amount found (regex returns empty) | Stop - not a transaction |
| No debit/credit/spent keyword found | Stop - not a transaction |
| Contains "is due by" | Stop - future standing instruction notice |
| Contains "requested money" | Stop - payment request, not actual debit |
| Contains "Usage Settings" | Stop - account settings change |
| Contains "Service Update" | Stop - promotional |
| Contains "eligible for" | Stop - promotional |
| Contains "will be unavailable" | Stop - maintenance notice |
| Sender is `HSBCIM-S` | Stop - always non-transactional |

**The safest filter:** If both amount AND debit/credit keyword are found, it's a transaction. Otherwise skip.

---

## Account Identification Logic

1. **Check sender + message content:**

| Sender | Contains | Account Key |
|--------|----------|-------------|
| `AXISBK-S` | (always bank) | `axis_savings` |
| `HSBCIN-S` | "Credit Card" | `hsbc_rupay_cc` |
| `HSBCIN-S` | "HSBC account" or "A/c" | `hsbc_savings` |
| `HDFCBN-S` | "Credit Card" | `hdfc_regalia_cc` |
| `HDFCBN-S` | (no "Credit Card") | `hdfc_savings` |
| `ICICIT-S` | (always CC) | `icici_amazon_cc` |
| `ICICIT-T` | (always CC) | `icici_amazon_cc` |
| `JX-ICICIT-T` | (always CC) | `icici_amazon_cc` |
| `HSBCIM-S` | (skip) | - |

2. **Verify with account number if needed:**
   - `XX5678` → `axis_savings`
   - `XXXXXX1234` or `082-XXX***-234` → `hsbc_savings`
   - `xx4321` or `**4321` → `hdfc_savings`
   - `XX6543` or `6543` → `icici_amazon_cc`
   - `9876` → `hsbc_rupay_cc`

---

## Balance Handling per Bank

| Bank/CC | Balance in SMS? | Strategy |
|---------|----------------|----------|
| Axis Savings | ❌ Never | Calculate: `current - amount` (debit) or `current + amount` (credit) |
| HSBC Savings debit | ❌ No | Calculate from current balance |
| HSBC Savings credit | ✅ "Avl Bal" | Use SMS balance directly (most accurate) |
| HSBC Rupay CC | ❌ No | Calculate: outstanding + amount (spend) |
| ICICI Amazon CC spend | ✅ "Avl Limit" | **This is available limit, NOT outstanding.** Outstanding = credit_limit - avl_limit. Or just calculate: outstanding + amount. |
| ICICI CC payment | ❌ No | Calculate: outstanding - amount |
| HDFC Savings | ✅ (assumed) | Use SMS balance if present, else calculate |
| HDFC Regalia CC | ✅ (assumed) | Use "Avl limit" if present |

**Important:** For ICICI CC, "Avl Limit" ≠ balance/outstanding. If credit limit is set in config, outstanding = limit - avl_limit. Otherwise, just use calculated balance.

---

## Salary Detection

HSBC salary SMS contains the keyword `SALARY` in the NEFT description:
```
...as NEFT from CITI A/c ***1103 of ACME-CORP-SALARY***...
```

**Regex:**
```
(?i)(SALARY|SAL\b|PAYROLL)
```

When detected: set `category` = `Income`, set `txn_type` = `credit` automatically.

---

## Example Account Numbers (replace with your own)

> **Note:** The account numbers below are examples. Replace them with your real last-4 digits in `config.json`.

| Account | Example Number in SMS |
|---------|--------------|
| Axis Savings | XX5678 |
| HSBC Savings | XXXXXX1234 / 082-XXX***-234 |
| HDFC Savings | xx4321 |
| ICICI Amazon CC | XX6543 / 6543 |
| HSBC Rupay CC | ending 9876 |
| HDFC Regalia CC | (not seen) |
