# 06 - Adding New Bank Patterns

## Overview

Expenser ships with built-in support for **HSBC, Axis Bank, HDFC, and ICICI**. But Indian banks number in the dozens, and yours might not be on that list yet.

The good news: you can add support for **any Indian bank** in about 15 minutes - no coding experience required. You'll collect a few sample messages from your bank, hand them to an AI assistant (ChatGPT, Claude, etc.), and paste the result into a single file.

This guide walks you through every step.

---

## Step 1: Collect Sample Messages

You'll need a handful of real transaction alerts from your bank. The more variety, the better the AI can build accurate patterns.

**SMS messages - save 3–5 samples, covering:**

- A debit (purchase or UPI payment)
- A credit (salary, refund, or transfer received)
- An ATM withdrawal (if you have one)
- Any other format your bank uses (EMI deductions, bill payments, etc.)

**Email alerts - save 2–3 samples (if your bank sends them):**

- A purchase or debit alert email
- A credit alert email
- Copy the **subject line** and the **full email body** for each

> **Tip:** Open your SMS app and search for your bank's name, or check your email for "transaction alert" to find samples quickly.

---

## Step 2: Redact Personal Information

> **⚠️ CRITICAL - Read this before going any further.**
>
> Expenser is privacy-first. Your financial data lives on YOUR device and nowhere else. But in this step you'll be sharing sample messages with an external AI service. **You MUST remove personal information first.**

Here's exactly what to redact:

| What to find | Replace with |
|---|---|
| Your account number (e.g., XX9999) | `XXXX1234` |
| Your name | `YOUR NAME` |
| UPI IDs (e.g., john.doe@okaxis) | `name@okbank` |
| Phone numbers | `98XXXXXX00` |
| Email addresses | `name@example.com` |
| Sensitive merchant names (medical, legal, etc.) | A generic name like `MERCHANT` |

Transaction amounts and dates are fine to keep - they aren't personally identifying.

### Before & After Example

**❌ BEFORE - DO NOT share this with an AI service:**

```
INR 2,450.00 debited from A/c XX9999 on 15-Apr-26. UPI/john.doe@okaxis/Ref 412345678901.
Avl Bal: INR 34,521.50. If not done by you, call 18001234567.
```

**✅ AFTER - safe to share:**

```
INR 2,450.00 debited from A/c XXXX1234 on 15-Apr-26. UPI/name@okbank/Ref 412345678901.
Avl Bal: INR 34,521.50. If not done by you, call 18001234567.
```

Take a minute to go through every sample and scrub it. It's worth the effort.

---

## Step 3: Use the AI Prompt

Open [ChatGPT](https://chat.openai.com), [Claude](https://claude.ai), or any AI assistant you prefer. Paste the prompt below, fill in your bank name and redacted samples, and send it.

````
I use an iOS expense tracker called Expenser that parses bank SMS/email alerts
using JavaScript regex patterns in a file called BankPatterns.js.

Here is the format each bank pattern follows:

```javascript
{
  smsPatterns: [
    {
      sender: "XX-BANKID",  // SMS sender code
      patterns: [
        {
          regex: /pattern/i,
          extract: (m) => ({ amount, merchant, type, balance })
        }
      ]
    }
  ],
  emailPatterns: [
    {
      from: "alerts@bank.com",
      subject: /pattern/i,
      extract: (html, subjectMatch) => ({ amount, merchant, type })
    }
  ]
}
```

Here are sample messages from my bank [BANK NAME]:

SMS samples:
[paste your redacted SMS samples here]

Email samples (if any):
[paste your redacted email samples here, including subject lines]

Please generate a BankPatterns.js entry for this bank following the exact
format above. Include:
1. SMS sender ID detection
2. Regex patterns for debit, credit, and any other message types
3. Amount extraction (handle Indian number format: 1,23,456.78)
4. Merchant/payee extraction where available
5. Balance extraction where available
6. Type detection (debit/credit)
````

The AI will return a JavaScript code block. Copy it - you'll need it in the next step.

---

## Step 4: Add the Pattern to BankPatterns.js

1. Open the **BankPatterns.js** file in any text editor (VS Code, Notepad, TextEdit - anything works).
2. Scroll down until you see the existing bank entries. They look like this:

   ```javascript
   const bankPatterns = {
     hsbc: { smsPatterns: [ ... ], emailPatterns: [ ... ] },
     axis: { smsPatterns: [ ... ], emailPatterns: [ ... ] },
     // other banks ...
   };
   ```

3. Add a comma after the last bank entry, then paste the code the AI generated. For example:

   ```javascript
   const bankPatterns = {
     hsbc:  { /* ... */ },
     axis:  { /* ... */ },
     hdfc:  { /* ... */ },
     icici: { /* ... */ },
     yourbank: {            // ← your new entry
       smsPatterns: [ ... ],
       emailPatterns: [ ... ]
     }
   };
   ```

4. Save the file.

---

## Step 5: Update config.json

Your new bank also needs an entry in **config.json** so Expenser knows which account to associate transactions with.

Open `config.json` and add your bank account to the `accounts` section:

```json
{
  "accounts": {
    "yourbank_savings": {
      "name": "Your Bank Savings",
      "type": "bank",
      "last4": "1234"
    }
  }
}
```

- **`yourbank_savings`** - A unique key for this account (used internally).
- **`name`** - A friendly label (shown in the dashboard).
- **`last4`** - The last four digits of the account number (helps match when you have multiple accounts).
- **`type`** - `bank`, `credit_card`, or `upi_lite`.

Save the file.

---

## Step 6: Set Up SMS Automation

If you haven't already, follow **[Guide 02 - SMS Automation](02-sms-automation.md)** to set up the iOS Shortcut that forwards bank SMS messages to Expenser.

If you already have the automation running for other banks, you just need to add your new bank's **SMS sender ID** to the filter list. The sender ID is the short code at the top of your bank's SMS messages (e.g., `AD-HDFCBK`, `VM-AXISBK`). Check the sender field in any of the sample messages you collected earlier.

---

## Tips

- **Test before you trust.** Run a few real messages through Expenser manually and check that amounts, merchants, and types parse correctly before relying on the automation.
- **Check the console if parsing fails.** Open the Scriptable app, run the script, and look at the console output - it will tell you which message couldn't be parsed and why.
- **Missed transactions aren't lost.** You can always categorise or add transactions manually through the Expenser dashboard.
- **Patterns can be refined.** If the AI-generated pattern misses an edge case, paste the failing message back into the AI and ask it to update the regex. Small tweaks are normal.

---

## Privacy Reminder

It's worth saying one more time:

> **Expenser never sends your financial data anywhere.** Everything - your transactions, balances, and bank messages - stays on your device.
>
> The **only** time your financial information leaves your device is if **you** choose to share sample messages with an AI service to generate patterns. That's why Step 2 matters: **always redact personal details before sharing.**

Once your patterns are in place, the entire pipeline runs locally on your iPhone. No servers, no cloud, no tracking.

---

*Next: Return to the [main guide list](../readme.md) or check out [Guide 02 - SMS Automation](02-sms-automation.md) if you haven't set that up yet.*
