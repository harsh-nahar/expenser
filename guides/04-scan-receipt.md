# 04 - Scan Receipt Shortcut

Take a photo of a receipt, bill, or payment screen → OCR extracts text → Expenser parses amount and merchant → logs the transaction. Perfect for cash payments, UPI Lite, or any transaction that doesn't generate an SMS.

---

## How It Works

```
You tap "Scan Receipt" shortcut
  → Camera opens (or you pick a photo)
  → iOS extracts text from image (built-in OCR)
  → Text is passed to Expenser.js with "scan" command
  → Script pre-fills amount + merchant from OCR
  → You confirm/edit and pick account + category
  → Transaction logged
```

---

## Create the Shortcut

1. Open **Shortcuts** app
2. Tap **+** → create new shortcut
3. Name it: **Scan Receipt**

---

## Build It (6 Actions)

### Action 1: Take Photo / Select Photo

1. Tap **Add Action** → search **Take Photo**
2. This opens the camera when the shortcut runs
3. **Alternative:** If you want to pick an existing photo instead, use **Select Photos** action. Or use **Choose from Menu** with both options:

**Option A (Camera only - simpler):**
Just add **Take Photo**.

**Option B (Camera + Library - more flexible):**
1. Add Action → **Choose from Menu**
2. Two options: `📷 Take Photo` and `🖼 Pick from Library`
3. Under **📷 Take Photo:** add **Take Photo** action
4. Under **🖼 Pick from Library:** add **Select Photos** action (set "Select Multiple" to OFF)
5. After the menu block, continue with the next actions (both paths feed into them)

### Action 2: Extract Text from Image

1. Add Action → search **Extract Text from Image**
   - (This is iOS's built-in OCR - also called "Visual Look Up" or "Live Text")
2. **Input:** select **Photo** (the output from Action 1)

### Action 3: Build JSON Input

1. Add Action → search **Text**
2. Type:
```
{"cmd":"scan","text":"[Extracted Text]"}
```
Where `[Extracted Text]` = tap and insert the **Text from Image** result from Action 2.

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

### Action 6: (Optional) Show Result

1. Add Action → **Show Result**
   - Select **Shortcut Result**
   - This shows a dialog with the confirmation - useful for quick review

---

## What Happens When You Scan

1. Camera opens → you photograph a receipt
2. iOS extracts text (1-2 seconds)
3. Expenser.js receives the text and:
   - Finds the amount (looks for Rs/₹/INR patterns)
   - Takes the first line as merchant name
   - Shows a pre-filled form: **Amount** and **Merchant** (editable!)
4. You confirm or edit the amount/merchant
5. Pick the **account** (which account was charged?)
6. Pick or confirm **category** (auto-detected from merchant if possible)
7. Add optional **note**
8. Transaction saved + notification shown

---

## Tips for Best OCR Results

- **Receipts:** Photograph flat, well-lit, text facing camera
- **UPI screens:** Screenshot the GPay/BHIM payment confirmation screen, then use "Pick from Library"
- **CC machines:** The slip usually has amount clearly printed
- **Handwritten bills:** OCR may struggle - you can edit the pre-filled values

---

## When to Use This

| Scenario | Use Scan Receipt? |
|----------|-------------------|
| Cash payment with paper receipt | ✅ Yes |
| UPI Lite (no SMS) | ✅ Yes - screenshot GPay confirmation |
| GPay payment with SMS | ❌ No - SMS automation handles it |
| Online order with email | ❌ No - Email parser handles it |
| Quick manual entry (no receipt) | ❌ No - use Quick Entry instead |

---

## Sharing Extension (Bonus)

You can also add the Scan Receipt shortcut to the iOS Share Sheet, so you can scan receipts from the Photos app:

1. Open the shortcut editor
2. Tap **ⅰ** at the top → **Show in Share Sheet** → turn ON
3. Set **Share Sheet Types** to **Images**

Now when viewing a receipt photo anywhere, tap Share → Scan Receipt.

---

**Next:** [05-email-automation.md](05-email-automation.md) - auto-log bank/CC transaction emails

Here's what you've built so far:

| Shortcut/Automation | Actions | Trigger |
|---------------------|---------|---------|
| Expenser Hub | 1-2 | Home screen / Siri / Widget |
| SMS Automation (×5) | 4 each | Incoming bank SMS |
| Scan Receipt | 5-6 | Manual tap |
