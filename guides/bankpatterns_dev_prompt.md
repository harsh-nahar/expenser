# Expenser - BankPatterns Development Prompt

Use this prompt when you need any AI to add a new bank or fix/enhance existing patterns in BankPatterns.js.

---

## How to Use

1. Copy the entire `BankPatterns.js` file
2. Copy 2-3 sample SMS or email texts from the new bank
3. Paste both into any AI (ChatGPT, Copilot, Claude, etc.) along with the prompt below

---

## Prompt

```
I have an expense tracking system that auto-parses bank SMS and email alerts on iOS. The parsing logic is in BankPatterns.js (attached below).

Here is the current BankPatterns.js:
<paste BankPatterns.js here>

Here are sample SMS/email messages from [BANK NAME]:
<paste 2-3 samples here>

Please do the following:

1. UNDERSTAND the existing structure:
   - Each bank has: smsSenders, emailSenders, accountRules, merchantRules (sms + email arrays)
   - accountRules determine if the transaction is from a savings account or credit card
   - merchantRules extract the merchant/payee name using regex with capture groups
   - There are also GENERIC_SMS_MERCHANT_PATTERNS and GENERIC_EMAIL_MERCHANT_PATTERNS as fallbacks
   - identifyAccountSMS/identifyAccountEmail use extractLast4 to get account last 4 digits, then match against user's config
   - extractLast4 regex: /(?:XX|ending\s*|x{2,6}|\*{1,6}|account\s*|Card\s*x?)(\d{3,4})\b/i

2. ANALYZE the sample messages and identify:
   - SMS sender ID (e.g. "HDFCBN", "AXISBK")
   - Email sender address (e.g. "alerts@hdfcbank.net")
   - How the amount appears (e.g. "Rs.2844.00", "INR 1,214.00")
   - How the account number appears (e.g. "XX5678", "ending 8765", "Card x4001")
   - How the merchant/payee name appears
   - How to distinguish savings vs credit card transactions
   - Whether the message is a debit, credit, or non-transaction (mandate reminder, promo, etc.)

3. GENERATE the bank entry to add to the BANKS object:
   - Follow the exact same structure as existing banks
   - Use regex patterns that are specific enough to avoid false matches
   - Merchant regex should use capture group (group 1) for the merchant name
   - Account rules should be ordered: most specific first, fallback last
   - Add comments explaining each pattern

4. CHECK if any changes are needed in:
   - extractLast4 - does the account number format require a new prefix pattern?
   - SMSParser.js - any new skip patterns needed (mandate reminders, promos)?
   - Generic patterns - would the new bank benefit from a new generic fallback?

5. OUTPUT:
   - The complete new bank entry ready to paste into the BANKS object
   - Any other file changes needed (with exact code snippets)
   - Test cases: for each sample, show what the parser should extract (amount, type, account, merchant)

IMPORTANT:
- Do NOT modify existing bank patterns unless there's a bug
- Do NOT change the overall structure of BankPatterns.js
- Merchant regex should handle variations (e.g. "at MERCHANT on DATE" vs "at MERCHANT.")
- Account number matching should work with extractLast4 - don't bypass it
- Keep patterns case-insensitive where appropriate
```

---

## Example Usage

"Here are 3 SMS from Kotak Bank:

1. `Your Kotak Bank A/c XX4523 is debited for Rs 1,500.00 on 15-APR-26 (UPI Ref No 412345678901). Updated Bal: Rs 23,456.78`

2. `Rs 850.00 spent on Kotak Credit Card ending 7890 at AMAZON on 15-Apr-26. Avl limit: Rs 45,000`

3. `Dear Customer, your Kotak A/c XX4523 is credited with Rs 25,000.00 on 15-APR-26. UPI Ref 412345678902. Bal: Rs 48,456.78`

Please add Kotak Bank support to BankPatterns.js."

---

## Notes

- Always test new patterns against existing samples (run test_sms.js) to ensure no regressions
- The system supports 4 banks currently: HDFC, HSBC, ICICI, Axis
- SMS sender IDs are 6-char codes used by Indian banks (e.g. HDFCBN, ICICIT, AXISBK)
- Email senders vary: some banks use multiple addresses for different products
