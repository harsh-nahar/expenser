# 03 - Daily Digest Automation

Get a summary notification every evening at 9 PM - how much you spent today, budget warnings, and uncategorized transactions that need review.

---

## How It Works

```
9:00 PM every day
  → iOS Time-of-Day Automation triggers
  → Shortcut calls Expenser.js with "digest" command
  → Script calculates today's spending, checks budgets
  → Sends notification with summary
```

---

## Create the Automation

1. Open **Shortcuts** app → **Automation** tab
2. Tap **+** → **Create Personal Automation**
3. Select **Time of Day**
4. Set:
   - **Time:** 9:00 PM (or whatever time you prefer)
   - **Repeat:** Daily
5. Tap **Next**

---

## Build the Actions (3 actions)

### Action 1: Text

1. Tap **Add Action** → search **Text**
2. Type: `digest`

### Action 2: Run Script (Scriptable)

1. Add Action → search **Scriptable** → **Run Script**
2. Configure:
   - **Script:** Expenser
3. Tap **Show More**
   - **Parameter:** select the **Text** from Action 1

### Action 3: Show Notification

1. Add Action → search **Show Notification**
2. Configure:
   - **Title:** Expenser - Daily Digest
   - **Body:** select **Shortcut Result**

---

## Final Settings

1. Tap **Next**
2. Turn OFF **"Ask Before Running"** - so it runs silently every night
3. Tap **Done**

---

## What the Notification Shows

```
📊 Daily Digest - 2026-04-14
3 transactions
Spent: ₹1,245.00
Income: ₹0.00

⚠️ Food & Dining: 85% of ₹8,000
❓ 1 uncategorized
```

- **Transaction count** for today
- **Total spent** (excludes transfers and CC payments)
- **Total income** (if any credits today)
- **Budget warnings** for categories at 80%+ of monthly budget
- **Uncategorized count** - reminder to review and fix

---

## Customizing the Time

Want the digest at a different time? 

1. Go to **Shortcuts → Automation**
2. Tap the "Time of Day" automation
3. Tap the time to change it
4. **Suggestions:** 
   - 9 PM - end of day review
   - 8 AM - review yesterday's spending
   - Both - create two automations!

---

**Next:** [04-scan-receipt.md](04-scan-receipt.md) - OCR receipt scanner shortcut
