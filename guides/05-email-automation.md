# 05 - Email Automation

Auto-logs bank transactions from incoming emails - fires instantly when a bank email arrives, just like the SMS automation.

---

## How It Works

```
Bank email arrives
  → iOS "When I get an email" automation triggers (filtered by sender)
  → Shortcut extracts email body, subject, sender
  → Passes to EmailParser.js in Scriptable
  → Script parses amount, merchant, account
  → Logs to expenses.json + updates balance
  → Shows notification
```

---

## Create One Automation Per Bank Sender

Just like SMS, create a separate automation for each bank email address.

### Automation 1: Axis Bank

1. Open **Shortcuts** app → **Automation** tab
2. Tap **+** → **Create Personal Automation**
3. Select **Email** (or **"When I get an email"**)
4. Configure the trigger:
   - **Sender:** `alerts@axisbank.com`
   - **Run Immediately** (not "After Confirming")
5. Tap **Next**

### Build the Actions

#### Action 1: Text - Get Email Content

1. Tap **Add Action** → search **Text**
2. Tap in the text field → tap **Shortcut Input** (the email from the trigger)
3. Once the blue token appears, **tap on it again** → pick **Content** from the property list

#### Action 2: Text - Get Subject

1. Add Action → **Text**
2. Tap in field → insert **Shortcut Input** → tap token → pick **Subject**

#### Action 3: Text - Get Sender

1. Add Action → **Text**
2. Tap in field → insert **Shortcut Input** → tap token → pick **Sender**

#### Action 4: Text - Build JSON

1. Add Action → **Text**
2. Type:
```
{"text":"[Content]","subject":"[Subject]","from":"[Sender]"}
```
Tap each placeholder and insert the variable from Actions 1-3.

#### Action 5: Run EmailParser

1. Add Action → **Scriptable** → **Run Script**
2. Script: **EmailParser**

> Leave Parameter/Texts empty - the Text from Action 4 flows in automatically.

### Final Settings

1. Tap **Next**
2. Confirm **Run Immediately** is selected
3. Tap **Done**

---

## Create Automations for Other Banks

Repeat the same steps for each bank sender:

| Automation | Sender |
|-----------|--------|
| Axis Bank | `alerts@axisbank.com` |
| HDFC Bank | `alerts@hdfcbank.net` |
| ICICI Bank | `credit_cards@icicibank.com` |
| ICICI Bank (alt) | `alerts@icicibank.com` |
| HSBC | `noreply@hsbcnet.com` |

> **Not sure of exact sender addresses?** Check your inbox - find a real transaction email from each bank and look at the "From" address. Use that exact address in the automation.

---

## What Gets Logged vs Skipped

✅ **Auto-logged:**
- Transaction alerts with amounts (debited/credited/spent/charged)
- CC bill payment confirmations
- Salary credits

❌ **Auto-skipped:**
- Monthly statements
- Promotional offers / reward points
- OTP emails
- Emails with no amount
- Duplicates (already logged via SMS or previous email)

---

## Testing

You can test EmailParser manually first - run it from Scriptable and paste a bank email body. When the next real bank email arrives, the automation will fire automatically and you'll see a notification.

---

## Duplicate Protection

If the same transaction arrives via both SMS and email, the duplicate checker catches it - same amount + same account + same date = skipped.

---

**Next:** [06-add-bank-patterns.md](06-add-bank-patterns.md) - AI-assisted guide to add new bank patterns
