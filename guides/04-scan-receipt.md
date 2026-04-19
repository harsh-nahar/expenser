# 04 - Scan Receipt Shortcut

Take a photo of a receipt, bill, or payment screen → Apple Intelligence reads the image via Private Cloud Compute → Expenser parses the structured output → logs the transaction. Perfect for cash payments, UPI Lite, or any transaction that doesn't generate an SMS.

> **Note:** This is the only part of Expenser where data leaves your device. The photo is sent to Apple's Private Cloud Compute for AI processing. Apple states this data is not retained or used for training. All other Expenser processing happens entirely on-device.

---

## How It Works

```
You tap "Scan Receipt" shortcut
  → Menu: Take Photo or Pick from Library
  → Photo is sent to Apple Intelligence (Private Cloud Compute)
    along with a prompt to extract transaction details
  → AI returns structured text (amount, merchant, etc.)
  → Text is placed in a Text action
  → Text is passed to Expenser.js with "scan" command
  → Script pre-fills amount + merchant from AI output
  → You confirm/edit and pick account + category
  → Transaction logged
```

---

## Create the Shortcut

1. Open **Shortcuts** app
2. Tap **+** → create new shortcut
3. Name it: **Scan Receipt**

---

## Build It (5 Actions)

### Action 1: Choose Photo Source

1. Tap **Add Action** → search **Choose from Menu**
2. Two options: `Take Photo` and `Pick from Library`
3. Under **Take Photo:** add **Take Photo** action
4. Under **Pick from Library:** add **Select Photos** action (set "Select Multiple" to OFF)
5. Both paths feed into the next actions

### Action 2: Apple Intelligence - Extract Text

This is where AI reads the photo. It uses the Apple Intelligence "Ask About" model action (available on iPhone 15 Pro and later, or any device with Apple Intelligence).

1. Add Action → search for the Apple Intelligence model action (may appear as **Ask ChatGPT**, **Ask About Photo**, or similar depending on your iOS version and configured AI provider)
2. **Input:** select the **Photo** from Action 1
3. **Prompt:** paste the OCR prompt from `guides/ocr_prompt.md`
   - This prompt instructs the AI to return structured transaction details (amount, merchant, date, account info) from the image

The AI processes the photo via Apple's Private Cloud Compute and returns a text response.

### Action 3: Build JSON Input

1. Add Action → search **Text**
2. Type:
```
{"cmd":"scan","text":"[AI Response]"}
```
Where `[AI Response]` = tap and insert the result from Action 2 (the text returned by Apple Intelligence).

### Action 4: Run Expenser Script

1. Add Action → **Scriptable** → **Run Script**
2. Configure:
   - **Script:** Expenser
3. Tap **Show More**
   - **Parameter:** select the **Text** from Action 3

### Action 5: Show Notification

1. Add Action → **Show Notification**
   - **Title:** Expenser
   - **Body:** select **Shortcut Result**

---

## What Happens When You Scan

1. You choose to take a photo or pick from library
2. Apple Intelligence reads the image (a few seconds, requires internet)
3. AI returns structured text with transaction details
4. Expenser.js receives the text and:
   - Finds the amount (looks for Rs/INR patterns in AI output)
   - Extracts merchant name
   - Tries to match account from last-4 digits or keywords
   - Shows a pre-filled form: **Amount** and **Merchant** (editable)
5. You confirm or edit the amount/merchant
6. Pick the **account** (which account was charged)
7. Pick or confirm **category** (auto-detected from merchant if possible)
8. Add optional **note**
9. Transaction saved + notification shown

---

## Tips for Best Results

- **Receipts:** Photograph flat, well-lit, text facing camera
- **UPI screens:** Screenshot the GPay/BHIM payment confirmation screen, then use "Pick from Library"
- **CC machines:** The printed slip usually has amount and card last-4 digits clearly visible
- **Handwritten bills:** AI may struggle - you can always edit the pre-filled values

---

## When to Use This

| Scenario | Use Scan Receipt? |
|----------|-------------------|
| Cash payment with paper receipt | Yes |
| UPI Lite (no SMS) | Yes - screenshot GPay confirmation |
| GPay payment with SMS | No - SMS automation handles it |
| Online order with email | No - Email parser handles it |
| Quick manual entry (no receipt) | No - use Quick Entry instead |

---

## Sharing Extension (Bonus)

You can also add the Scan Receipt shortcut to the iOS Share Sheet, so you can scan receipts from the Photos app:

1. Open the shortcut editor
2. Tap the info icon at the top → **Show in Share Sheet** → turn ON
3. Set **Share Sheet Types** to **Images**

Now when viewing a receipt photo anywhere, tap Share → Scan Receipt.

---

**Next:** [05-email-automation.md](05-email-automation.md) - auto-log bank/CC transaction emails

Here's what you've built so far:

| Shortcut/Automation | Actions | Trigger |
|---------------------|---------|---------|
| Expenser Hub | 1-2 | Home screen / Siri / Widget |
| SMS Automation (x5) | 4 each | Incoming bank SMS |
| Scan Receipt | 5 | Manual tap |
