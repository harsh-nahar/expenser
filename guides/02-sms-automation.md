# 02 - SMS Automation

Auto-logs bank transactions from incoming SMS. When a bank sends you a debit/credit SMS, this automation parses it and logs it instantly - zero manual work.

---

## How It Works

```
Bank SMS arrives
  → iOS Automation triggers (filtered by sender)
  → Shortcut extracts SMS body
  → Passes to SMSParser.js in Scriptable
  → Script parses amount, merchant, account
  → Logs to expenses.json + updates balance
  → Shows notification: "✅ ₹450 debited - Axis Savings (Food)"
```

---

## Supported Bank Senders

| Sender ID | Bank/CC |
|-----------|---------|
| `AXISBK` | Axis Bank Savings |
| `HSBCIN` | HSBC Bank + HSBC Rupay CC |
| `HDFCBN` | HDFC Bank + HDFC Regalia CC |
| `ICICIT` | ICICI Amazon CC |
| `JX-ICICIT` | ICICI CC (standing instruction processed) |

> **Note:** `HSBCIM` is HSBC maintenance notices - automation is not needed for it.

---

## Create the Automation

You'll create **one automation per bank sender**. Each is identical except for the sender filter.

### Automation 1: Axis Bank

1. Open **Shortcuts** app → go to **Automation** tab
2. Tap **+** → **Create Personal Automation**
3. Select **Message**
4. Configure the trigger:
   - **Message Contains:** (leave blank)
   - **Sender:** Tap and type `AXISBK`
   - Make sure **"When I Receive"** is selected (not "When I Send")
5. Tap **Next**

### Build the Automation Actions (5 actions)

#### Action 1: Set Variable - Get SMS Body

1. Tap **Add Action** → search **Set Variable**
2. Set:
   - **Variable Name:** `smsText`
   - **Value:** Tap → select **Shortcut Input** → it should show **Message** with **Body** property
   - If you see "Messages" but not body: tap on it → select **Body** from the property picker

> **iOS 26 note:** If "Shortcut Input" shows "Message" directly, that's the full message object. You need to get the `.body` property. Tap on the blue "Message" token → look for "Body" or "Content" in the property list.

#### Action 2: Build JSON Input

1. Add Action → search **Text**
2. In the text field, type:
```
{"text":"[smsText]","sender":"AXISBK"}
```
Where `[smsText]` = tap and insert the **smsText** variable

So the final text looks like: `{"text":"` then the blue smsText variable then `","sender":"AXISBK"}`

#### Action 3: Run SMSParser Script

1. Add Action → search **Scriptable** → select **Run Script**
2. Configure:
   - **Script:** SMSParser
3. Tap **Show More**
   - **Parameter:** select the **Text** result from Action 2

#### Action 4: Show Notification

1. Add Action → search **Show Notification**
2. Configure:
   - **Title:** Expenser
   - **Body:** select **Shortcut Result** (output from Scriptable)

#### Action 5: Done

That's it! 4 real actions.

### Final Settings

1. Tap **Next**
2. **IMPORTANT:** Turn OFF **"Ask Before Running"**
   - This makes it fully automatic - no confirmation tap needed
   - iOS will show a banner saying "Running your automation" but it won't block
3. Tap **Done**

---

### Automation 2: HSBC

Repeat the exact same steps as above, but:
- **Sender:** `HSBCIN`
- In the JSON text (Action 2): `"sender":"HSBCIN"`

### Automation 3: HDFC

- **Sender:** `HDFCBN`
- In JSON: `"sender":"HDFCBN"`

### Automation 4: ICICI

- **Sender:** `ICICIT`
- In JSON: `"sender":"ICICIT"`

### Automation 5: ICICI Standing Instructions

- **Sender:** `JX-ICICIT`
- In JSON: `"sender":"JX-ICICIT"`

> **Optional:** If you get SMS from other banks in the future, create the same automation with their sender ID. The parser handles unknown senders by looking at the SMS content for account numbers.

---

## What Gets Logged vs Skipped

✅ **Auto-logged:**
- "INR 2100.00 debited..." → debit transaction
- "Rs 426.56 spent on your HSBC Credit Card..." → CC spend
- "A/c is credited with INR 115,753.00..." → salary/credit
- "Payment of Rs 640.00 has been received..." → CC bill payment
- "Successfully processed payment of INR 299.00..." → standing instruction charge

❌ **Auto-skipped:**
- No amount in SMS → not a transaction
- "is due by" → future notice, not actual charge
- "Usage Settings", "Service Update" → admin notices
- "eligible for" → promotional
- Duplicate of existing transaction → skipped with notification

---

## What Happens When a Transaction SMS Arrives

1. Your phone receives the SMS
2. iOS automation fires (silently, since Ask Before Running is off)
3. SMSParser.js runs in ~1-2 seconds:
   - Parses the SMS text
   - Identifies amount, type (debit/credit), account, merchant
   - Auto-categorizes (e.g., "Swiggy" → Food & Dining)
   - Checks for duplicates
   - Logs to expenses.json
   - Updates account balance in config.json
4. You see a notification: **"✅ ₹450 debited - Axis Savings (Food & Dining)"**

If something can't be parsed, you'll see: **"⚠️ Could not parse SMS"** - no transaction logged, nothing breaks.

---

## Editing Auto-Logged Transactions

If the parser got something wrong (wrong category, wrong merchant):

1. Run **Expenser** → **✏️ Edit / Review** → **Review Today**
2. Tap the transaction
3. Change category, merchant, amount, or note
4. The script will ask: "Remember? Always categorize 'MERCHANT' as CATEGORY?" - tap Yes to teach it

Over time, your `merchant_map` in config.json learns your merchants.

---

## Testing

1. Ask a friend to send you a text that looks like a bank SMS:
   ```
   INR 100.00 debited A/c no. XX5678 14-04-26, 15:30:00 UPI/P2M/153000123/Test Merchant
   ```
2. Or just run SMSParser manually:
   - Open Scriptable → tap SMSParser
   - It will ask you to paste SMS text
   - Verify it logs correctly

---

**Next:** [04-scan-receipt.md](04-scan-receipt.md) - receipt scanner using Apple Intelligence
