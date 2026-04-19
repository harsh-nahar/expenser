# Statement Sense - Project Prompt

Use this as the opening prompt in a new AI chat to kick off the project.

---

## Prompt

```
I want to build "Statement Sense" - a local, privacy-first tool that parses Indian bank and credit card PDF statements, extracts transaction data, strips all personally identifiable information, and presents everything in an interactive HTML dashboard. It should also support an AI analysis layer for natural language queries on spending patterns.

## Core Requirements

### 1. PDF Parser (Python)
- Accept one or more bank/CC statement PDFs as input
- Auto-detect which bank/format the PDF is from (HDFC, ICICI, Axis, SBI, Kotak, HSBC, etc.)
- Extract every transaction row: date, description/merchant, amount, debit/credit type
- Handle different table layouts per bank - each bank has its own format parser
- Use pdfplumber or tabula-py for extraction
- CLI entry point: `python run.py statement1.pdf statement2.pdf`

### 2. PII Sanitizer
- Strip all sensitive info: cardholder name, account numbers, addresses, phone numbers, email, reward points, balances
- Keep only: date, amount, merchant name, transaction type (debit/credit)
- Clean merchant names: strip POS terminal codes, store IDs, city suffixes (e.g. "POS 442312 SWIGGY BANGALORE IN" → "SWIGGY")
- Auto-categorize transactions by merchant keywords:
  - Food: Swiggy, Zomato, restaurant names
  - Shopping: Amazon, Flipkart, Myntra
  - Health: Apollo, pharmacy, hospital
  - Transport: Uber, Ola, Metro
  - Bills: electricity, gas, broadband, recharge
  - (and so on - with an "Uncategorized" fallback)
- Output: transactions.json and transactions.csv in a clean schema

### 3. Transaction Schema
```json
{
  "date": "2026-04-15",
  "amount": 2844.00,
  "type": "debit",
  "merchant": "YASHODA OP PHARMACY",
  "category": "Health",
  "source": "hdfc_cc",
  "description": "POS purchase"
}
```

### 4. Interactive HTML Dashboard (single file)
- ONE index.html file - no server, no build step, opens in any browser
- Loads transactions.json via drag-and-drop or file picker
- Uses Chart.js (CDN) for visualizations

**Header/Summary Cards:**
- Total spent, average per day, transaction count, date range

**Charts:**
- Donut chart: category breakdown (% of total)
- Bar chart: monthly spending trend
- Line chart: daily cumulative spend
- Horizontal bar: top 10 merchants by amount

**Filters (sidebar or top bar):**
- Date range picker
- Category multi-select checkboxes
- Amount range slider (min-max)
- Merchant search (text input with live filter)
- Debit/credit toggle

**Transaction Table:**
- Sortable by any column (date, amount, merchant, category)
- Search/filter bar
- Paginated (50 per page)
- Responsive - works on mobile browsers too

**Dark/light mode toggle**

All charts and table should update reactively when filters change.

### 5. AI Analysis Layer (Optional but desired)
- Python script that loads transactions.json
- Sends to Azure OpenAI (or works with local LLM via ollama)
- System prompt: "You are a personal finance analyst. Analyze these transactions. Never reference personal information."
- Supports questions like:
  - "What are my top spending categories?"
  - "Any unusual or duplicate transactions?"
  - "Compare this month vs last month"
  - "Where can I cut spending?"
- Could be CLI-based or embedded as a chat panel in the dashboard

### 6. Project Structure
```
statement-sense/
├── parser/
│   ├── parse.py              # Main pipeline
│   ├── formats/
│   │   ├── hdfc_cc.py
│   │   ├── icici_cc.py
│   │   ├── axis_savings.py
│   │   ├── sbi_savings.py
│   │   └── auto_detect.py
│   └── sanitizer.py
├── data/
│   ├── raw/                  # PDFs go here (gitignored)
│   └── output/
│       ├── transactions.json
│       └── transactions.csv
├── ai/
│   └── analyze.py
├── dashboard/
│   └── index.html
├── run.py                    # CLI entry point
├── requirements.txt
└── README.md
```

### 7. Key Principles
- **Privacy-first**: All processing is local. No data leaves the machine. Raw PDFs are never stored in output.
- **No server needed**: Dashboard is a static HTML file. Parser is a CLI script.
- **Extensible**: Adding a new bank = adding one format file + registering it in auto_detect
- **Indian bank focus**: Designed for Indian statement formats (HDFC, ICICI, Axis, SBI, Kotak, HSBC India), but the structure supports any bank

### 8. Sample Statement Formats (for reference)

**HDFC CC Statement** typically has:
- Header with cardholder name, card number, statement period
- Transaction table: Date | Transaction Description | Amount (Dr/Cr)
- Domestic and international sections separated

**ICICI CC Statement** typically has:
- Transaction table: Date | Description | Amount
- Debits and credits in same column, marked differently

**Axis Bank Savings Statement** typically has:
- Date | Particulars | Chq/Ref No | Withdrawal | Deposit | Balance

I'll provide actual sample PDFs as we go. Start by setting up the project structure and building the HDFC CC parser first, then we'll expand.
```

---

## Notes
- Share this prompt as-is in a new chat
- Follow up by dropping an actual HDFC CC statement PDF for the AI to analyze the format
- The dashboard is the visual showpiece for hackathon demo - prioritize that
- AI layer can be added last - it's the cherry on top
