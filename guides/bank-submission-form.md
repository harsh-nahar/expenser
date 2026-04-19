# Bank Pattern Submission Form - Setup Guide

Use this to create a Google Form for collecting bank SMS/email samples from users.

## Form Settings

- **Title:** Expenser - Bank Pattern Submission
- **Description:** Help us add support for your bank! Submit masked SMS/email samples so we can create parsing patterns. Your submissions help the entire community.
- **Do NOT collect email addresses** (Settings > Responses > uncheck "Collect email addresses")
- **Limit to 1 response** (optional, prevents spam)

## Form Fields

### Section 1: Bank Details

**1. Bank Name** (required)
- Type: Short text
- Validation: Required
- Help text: e.g., Kotak Mahindra Bank, SBI, Bank of Baroda, Yes Bank

**2. Account Type** (required)
- Type: Dropdown
- Options:
  - Savings Account
  - Current Account
  - Credit Card
  - Prepaid / Wallet
  - Other
- Help text: Select the type of account these messages are from

**3. Credit Card Name** (optional)
- Type: Short text
- Help text: If credit card, specify the card name (e.g., Kotak 811, SBI SimplyCLICK). Leave blank for savings/current accounts.

**4. SMS Sender Code** (required)
- Type: Short text
- Help text: The sender ID shown on bank SMS messages (e.g., VM-KOTAKBK, JD-SBIBNK). Check your SMS app for the exact sender name.

### Section 2: PII Masking Instructions

**Display as description (not a question):**

> IMPORTANT: Mask all personal information before submitting. Keep the same number of characters so patterns work correctly.
>
> | What to mask | How to mask | Example |
> |---|---|---|
> | Your name | Replace each letter with X | HARSH NAHAR -> XXXXX XXXXX |
> | Account number | Replace digits with bullets | XX5727 -> XX•••• |
> | Phone number | Replace digits with bullets | 9876543210 -> •••••••••• |
> | UPI ID | Replace name part with dots | name.here@okaxis -> ••••.••••@okaxis |
> | Reference numbers | Keep as-is (not identifying) | |
> | Amounts | Keep as-is (not identifying) | |
> | Dates | Keep as-is (not identifying) | |
> | Merchant names | Keep as-is (helpful for patterns) | |

### Section 3: SMS Samples

**5. Debit SMS Sample 1** (required)
- Type: Long text (paragraph)
- Help text: Paste a MASKED debit/spending SMS from this bank. Include the full message exactly as it appears.

**6. Debit SMS Sample 2** (optional)
- Type: Long text (paragraph)
- Help text: A second debit SMS, ideally a different transaction type (UPI, card swipe, NEFT, etc.)

**7. Credit SMS Sample** (optional)
- Type: Long text (paragraph)
- Help text: A MASKED credit/incoming SMS (salary, refund, transfer received, etc.)

**8. Other SMS Samples** (optional)
- Type: Long text (paragraph)
- Help text: Any other SMS types from this bank (balance check, OTP excluded, bill payment, EMI, etc.). Paste multiple samples separated by a blank line.

### Section 4: Email Samples (Optional)

**9. Does your bank send transaction alert emails?** (required)
- Type: Multiple choice
- Options:
  - Yes
  - No
  - Not sure

**10. Email Sender Address** (optional)
- Type: Short text
- Help text: The From address of transaction alert emails (e.g., alerts@kotak.com)

**11. Email Subject Line** (optional)
- Type: Short text
- Help text: A typical subject line (e.g., "Transaction Alert on your Kotak Credit Card")

**12. Email Body Sample** (optional)
- Type: Long text (paragraph)
- Help text: Paste the MASKED text content of a transaction alert email. Strip any HTML, just paste the readable text.

### Section 5: Confirmation

**13. I confirm I have masked all personal information** (required)
- Type: Checkbox
- Must check to submit

**14. Additional Notes** (optional)
- Type: Long text (paragraph)
- Help text: Anything else we should know about how your bank formats messages? Any quirks or special cases?

## After Creating the Form

1. Copy the form's public link
2. Update the Expenser README.md - replace the placeholder in the Contributing section
3. Responses will appear in a linked Google Sheet for review
