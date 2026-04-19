# 00 - Setup Guide

Everything you need to get Expenser running on your iPhone. Takes about 10 minutes.

---

## What You're Setting Up

| Component | Purpose |
|-----------|---------|
| **Scriptable** app | Runs JavaScript locally on your iPhone - the brain of Expenser |
| **10 scripts** | 5 required core + 5 optional widget scripts (see below) |
| **2 JSON files** | config.json (accounts/settings), expenses.json (transaction log) |
| **1 folder bookmark** | So Scriptable can read/write your data in iCloud Drive |
| **iOS Shortcuts** | Thin wrappers that call the scripts (built in later guides) |

### Scripts Breakdown

**Required core (5):**

| Script | Purpose |
|--------|---------|
| `Expenser.js` | Main hub - manual entry, receipt scan, edit/review, export, budgets, help |
| `SMSParser.js` | Auto-parses bank SMS into structured transactions |
| `EmailParser.js` | Auto-parses bank/CC transaction emails |
| `BankPatterns.js` | Modular bank pattern definitions (regex for SMS and email parsing) |
| `ExpenserHelp.js` | In-app help guide (rendered locally via WebView) |

**Widgets (5, optional but recommended):**

| Script | Purpose |
|--------|---------|
| `ExpenserWidget.js` | Daily / Weekly / Monthly spending summary widget |
| `ExpenserCats.js` | Category breakdown widget with bar charts |
| `ExpenserBudget.js` | Budget progress widget with daily spending hints |
| `ExpenserMoM.js` | Month-over-month sparkline trend widget |
| `ExpenserDash.js` | Transaction dashboard widget with inline editing |

**Privacy:** Everything runs 100% offline on your device. Zero network calls, zero cloud sync beyond your own iCloud Drive. No data ever leaves your phone.

---

## Step 1: Install Scriptable

1. Open **App Store** on your iPhone
2. Search for **Scriptable**
3. Install it (free, by Simon B. Støvring)
4. Open Scriptable once to let it set up

---

## Step 2: Create the Data Folder

Create a folder in iCloud Drive (e.g., `Scriptable/expenses/`) and create a Scriptable file bookmark named `expenser` pointing to it.

1. Open the **Files** app on your iPhone
2. Navigate to: **iCloud Drive**
3. If a folder called **expenses** doesn't exist yet:
   - Tap the **⋯** (three dots) menu → **New Folder**
   - Name it: `expenses`
   - Tap **Done**

---

## Step 3: Deploy config.json

This file holds your account balances, categories, and settings.

1. In **Files** app, navigate to **iCloud Drive → My Documents → expenses**
2. You need to create `config.json` here. Two options:

### Option A: Copy from Computer (Recommended)
If you have this repo on your Mac/PC:
- Find `icloud-samples/config.json` in the project folder
- AirDrop it to your iPhone, or copy it to iCloud Drive
- Move it into the `expenses` folder

### Option B: Create Manually on iPhone
1. Open any text editor app (e.g., Notes, then copy-paste)
2. Create a file with this content:

```json
{
  "accounts": {
    "hsbc_savings": {
      "name": "HSBC Savings",
      "type": "bank",
      "last4": "1234",
      "balance": 50000.00,
      "updated": "2026-01-01"
    },
    "axis_savings": {
      "name": "Axis Savings",
      "type": "bank",
      "last4": "5678",
      "balance": 25000.00,
      "updated": "2026-01-01"
    },
    "hdfc_savings": {
      "name": "HDFC Savings",
      "type": "bank",
      "last4": "4321",
      "balance": 75000.00,
      "updated": "2026-01-01"
    },
    "hdfc_regalia_cc": {
      "name": "HDFC Regalia CC",
      "type": "credit_card",
      "last4": "8765",
      "balance": 0,
      "limit": 500000,
      "updated": "2026-01-01"
    },
    "hsbc_rupay_cc": {
      "name": "HSBC Rupay CC",
      "type": "credit_card",
      "last4": "9876",
      "balance": 0,
      "limit": 400000,
      "updated": "2026-01-01"
    },
    "icici_amazon_cc": {
      "name": "ICICI Amazon CC",
      "type": "credit_card",
      "last4": "6543",
      "balance": 0,
      "limit": 500000,
      "updated": "2026-01-01"
    },
    "gpay_upi_lite": {
      "name": "GPay UPI Lite",
      "type": "upi_lite",
      "balance": 2000.00,
      "updated": "2026-01-01"
    }
  },
  "categories": [
    "Food", "Groceries", "Transport", "Fuel", "Shopping",
    "Entertainment", "Health", "Bills & Utilities", "Rent",
    "Transfer", "EMI", "Subscription", "Education", "Travel",
    "Personal Care", "Gifts", "Miscellaneous", "Income",
    "CC Bill Payment"
  ],
  "merchant_map": {},
  "budgets": {},
  "recurring": []
}
```

> **⚠️ Customize this!** Replace each account's `last4` with your real account last-4 digits, and set each `balance` to your current real balance. Add or remove accounts to match what you actually use.

3. Save this as `config.json` in the `expenses` folder

> **⚠️ Update your accounts!** Before first use, open config.json and customize each account's `last4` and `balance` to match your real accounts. Add or remove accounts as needed. This is your starting point.

---

## Step 4: Deploy expenses.json

This file stores all your transactions. Start with an empty array.

1. In the `expenses` folder, create a file called `expenses.json`
2. Contents: just `[]` (empty JSON array)

```json
[]
```

That's it - transactions will be added here automatically.

---

## Step 5: Copy Scripts to Scriptable

You need to add all 10 JavaScript files to Scriptable.

### For each script in the `scripts/` folder:

**Required core (5):** Expenser.js, SMSParser.js, EmailParser.js, BankPatterns.js, ExpenserHelp.js

**Widgets (5, optional but recommended):** ExpenserWidget.js, ExpenserCats.js, ExpenserBudget.js, ExpenserMoM.js, ExpenserDash.js

1. Open the script file on your computer (in the `scripts/` folder of this project)
2. **Select all** the code and **Copy** it
3. On your iPhone, open **Scriptable**
4. Tap the **+** button (top right) to create a new script
5. **Paste** the code
6. Tap the script name at the top and rename it to match (without the `.js` extension):
   - `Expenser`, `SMSParser`, `EmailParser`, `BankPatterns`, `ExpenserHelp`
   - `ExpenserWidget`, `ExpenserCats`, `ExpenserBudget`, `ExpenserMoM`, `ExpenserDash`
7. Tap **Done**
8. Repeat for all 10 scripts

> **Tip:** You can AirDrop the .js files to your iPhone, open them in Scriptable directly, or use iCloud sync (Scriptable stores scripts in `iCloud Drive/Scriptable/` - you can drop .js files there from your Mac).

---

## Step 6: Create the File Bookmark (CRITICAL)

This is the most important step. Scriptable needs permission to access your `expenses` folder.

1. Open **Scriptable** on your iPhone
2. Tap the **⚙️ gear icon** (Settings) at top-left
3. Scroll down to **File Bookmarks**
4. Tap **Add File Bookmark** (the + button)
5. A file picker appears - navigate to your `expenses` folder in iCloud Drive
6. Tap **Open** (or **Select** on some iOS versions) to select the folder
7. Back in Scriptable settings, the bookmark appears. Tap it to set the name:
   **Name it exactly:** `expenser` (all lowercase)
8. Tap **Done** to save

> **Why this matters:** Without this bookmark, the scripts can't find your data files. The bookmark name must be exactly `expenser` - this is hardcoded in all scripts.

---

## Step 7: Test the Setup

1. Open **Scriptable**
2. Tap the **Expenser** script to run it
3. You should see the main menu:
   - ➕ Quick Entry
   - 📷 Scan Receipt
   - ✏️ Edit / Review
   - ↩️ Undo Last
   - 📤 Export CSV
   - 📋 Set Budget
   - 🏦 Manage Accounts
   - ❓ Help
4. Tap **🏦 Manage Accounts** to verify your accounts loaded correctly
5. If you see your accounts with correct details - **setup is complete!**

### Troubleshooting

| Problem | Fix |
|---------|-----|
| "Setup Required" alert about bookmark | Go back to Step 6 - bookmark not created or named wrong |
| Script crashes with file error | Check that `config.json` and `expenses.json` exist in the folder |
| Balances show 0 or wrong amounts | Edit config.json and update the balance values |
| Script not found | Make sure you named it exactly `Expenser` in Scriptable |

---

## Step 8: Update Balances to Current

Before you start tracking, make sure all balances match reality:

1. Run **Expenser** → **🏦 Manage Accounts**
2. Pick each account and enter the current real balance:
   - For banks: your current available balance
   - For credit cards: your current outstanding amount (0 if fully paid)
   - For UPI Lite: your current UPI Lite balance in GPay

---

## Step 9: Edit Self-Transfer Regex

Open `SMSParser.js` and `EmailParser.js` and search for `your name here`. Replace it with your actual name so that transfers between your own accounts are correctly detected as self-transfers rather than expenses.

---

## Step 10: Set Up Widgets (Optional)

To add home screen widgets:

1. Long-press your Home Screen, tap **+**, search for **Scriptable**, choose a widget size
2. Tap the widget to configure it and select the widget script (e.g., `ExpenserWidget`)
3. Repeat for each widget you want:
   - **ExpenserWidget** - daily/weekly/monthly spending summary
   - **ExpenserCats** - category breakdown with bar charts
   - **ExpenserBudget** - budget progress with daily spending hints
   - **ExpenserMoM** - month-over-month sparkline trend
   - **ExpenserDash** - transaction dashboard with inline editing

---

## What's Next

Now build the iOS Shortcuts that call these scripts:

| Guide | What It Builds |
|-------|----------------|
| [01-expenser-hub-shortcut.md](01-expenser-hub-shortcut.md) | Main Expenser shortcut (home screen / Siri) |
| [02-sms-automation.md](02-sms-automation.md) | Auto-log bank SMS transactions |
| [04-scan-receipt.md](04-scan-receipt.md) | OCR receipt scanner shortcut |
| [05-email-automation.md](05-email-automation.md) | Auto-log bank/CC emails |

---

## Files Summary

After setup, your iCloud Drive should look like:

```
iCloud Drive/
└── Scriptable/
    └── expenses/
        ├── config.json      ← accounts, categories, budgets
        └── expenses.json    ← transaction log (starts empty)
```

And in Scriptable:
```
Scripts (core):
├── Expenser          ← main hub
├── SMSParser         ← auto-logs bank SMS
├── EmailParser       ← auto-logs bank emails
├── BankPatterns      ← bank regex patterns
└── ExpenserHelp      ← in-app help guide

Scripts (widgets):
├── ExpenserWidget    ← spending summary widget
├── ExpenserCats      ← category breakdown widget
├── ExpenserBudget    ← budget progress widget
├── ExpenserMoM       ← month-over-month trend widget
└── ExpenserDash      ← transaction dashboard widget
```

---

## Setup Checklist

- [ ] Scriptable installed
- [ ] `expenses` folder created in iCloud Drive
- [ ] `config.json` copied and customized (account last-4 digits, balances)
- [ ] `expenses.json` created (empty `[]`)
- [ ] All 10 scripts copied to Scriptable
- [ ] File bookmark `expenser` created pointing to expenses folder
- [ ] Expenser main menu tested successfully
- [ ] Balances updated to current real values
- [ ] Self-transfer name updated in SMSParser.js and EmailParser.js (replace `your name here`)
- [ ] Widgets configured on home screen (optional)
