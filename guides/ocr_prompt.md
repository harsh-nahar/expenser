# Expenser - AI OCR Scan Prompt

Use this prompt in the **Ask ChatGPT / Apple Intelligence** action in iOS Shortcuts when scanning receipt or payment screenshots.

---

## Prompt

```
You are reading a screenshot of an Indian payment or transaction. It may be from Google Pay (GPay), PhonePe, Paytm, BHIM, a bank SMS, a UPI receipt, a shop bill, or a credit/debit card statement.

Key things to know:
- Indian currency uses ₹ or Rs symbol. Amounts may show as ₹426, Rs.426, or just a large number
- UPI apps show "Paid to [Name]" or "Sent to [Name]" with amount prominently displayed
- Ignore UPI IDs (like name@okaxis, name@ybl) - extract the person/merchant NAME instead
- "UPI Lite" means a small prepaid UPI wallet - note it if visible
- Look for card last 4 digits (shown as XX9876, ****9876, ending 9876, Card x9876)
- Dates may be in DD/MM/YYYY (Indian format), DD Mon YYYY, or other formats

IMPORTANT - Merchant vs Note:
- In GPay/PhonePe/Paytm, the MERCHANT is the person or business name shown after "To" or "Paid to" - usually at the TOP of the screen
- Below it there may be a NOTE or description like "groceries", "for dinner", "rent" - this is NOT the merchant
- The merchant is WHO you paid (e.g. "Ravi Kumar", "Swiggy", "Apollo Pharmacy")
- The note is WHY you paid (e.g. "groceries", "dinner", "monthly rent")
- ALWAYS use the WHO (person/business name), never the WHY (note/description)
- If you see "To Ravi Kumar" and below it "Paid for groceries" - the merchant is "Ravi Kumar", NOT "groceries"
- In BHIM, the merchant name appears below "Banking Name" or in "Payment Received by [Name]" - use THAT name

IMPORTANT - Physical bills and receipts:
- The merchant name is usually the SHOP/RESTAURANT/BUSINESS name printed at the TOP of the bill (large or bold text)
- Do NOT use the cashier name, GST number, address, or phone number as the merchant
- For amount, use "Grand Total" or "Total Amount" or "Amount Payable" or "Net Payable" - the FINAL amount the customer pays
- Do NOT use subtotal, individual item prices, or tax amounts
- If the bill shows a payment method (Card ending 9876, UPI, Cash), extract the last 4 digits if available
- Common Indian bill labels: "Tax Invoice", "Cash Memo", "Bill of Supply" - these are NOT merchant names
- GSTIN, FSSAI, CIN numbers are NOT relevant - skip them

IMPORTANT - Amount accuracy:
- The ₹ symbol in Indian apps often looks like 7 or ¥ in screenshots
- Do NOT confuse the ₹ symbol with the digit 7. For example ₹71 is seventy-one rupees, NOT 771
- On GPay, the large displayed number IS the amount - do not prepend extra digits from the ₹ symbol
- If you see something like "₹71" or "¥71", the amount is 71, not 771 or 471
- Watch for 1 vs 7 confusion - verify by context (total, subtotal, item prices if visible)
- When in doubt, prefer the amount shown next to "Total", "Amount", or "Paid" labels

Output ONLY one line in this format:
Rs [amount] paid to [merchant name] on [DD Mon YYYY] ending [last4]

- Amount: always prefix with Rs, no commas (e.g. Rs 426.56)
- Merchant: business or person name, NOT their UPI ID
- Date: convert to DD Mon YYYY (e.g. 15 Apr 2026)
- Last4: last 4 digits of card/account if visible
- If date not visible, omit "on ..."
- If account/card not visible, omit "ending ..."
- If UPI Lite is mentioned, add "UPI Lite" at the end instead of "ending XXXX"

Examples:
Rs 426.56 paid to Apollo Pharmacy on 11 Apr 2026 ending 9876
Rs 350 paid to Swiggy on 10 Apr 2026
Rs 71 paid to Ravi Kumar on 05 Apr 2026 UPI Lite
Rs 2600 paid to Amazon on 05 Apr 2026 ending 8765

Output ONLY the single line. Nothing else.
```

---

## Notes

- The `₹ → 7` confusion is mainly a GPay issue where the rupee symbol is large and stylized
- Cloud AI reading the image directly should handle this better than on-device OCR
- The parser in Expenser.js picks up: `Rs` (amount), `paid to` (merchant), `DD Mon YYYY` (date), `ending XXXX` (account)
- `UPI Lite` maps to the `gpay_upi_lite` account automatically
