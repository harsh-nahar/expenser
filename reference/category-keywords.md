# Category Keywords Reference

Auto-categorization keyword → category mapping. Used in the SMS Parser (Layer 1) for instant, zero-intervention categorization.

**Matching rules:**
- Case-insensitive
- Partial match (keyword found anywhere in merchant name / SMS body)
- First match wins (check in order listed below)

---

## Keyword → Category Mapping

### 🍕 Food
```
swiggy, zomato, restaurant, cafe, dominos, mcdonalds, kfc, pizza,
burger king, subway, starbucks, chaayos, haldirams, barbeque nation,
eatsure, box8, faasos, behrouz, oven story, dunkin, baskin robbins,
food, dine, kitchen, biryani, thali, dhaba
```

### 🛒 Groceries
```
bigbasket, blinkit, zepto, grocery, dmart, more, jiomart,
nature's basket, spencers, reliance fresh, star bazaar, spar,
instamart, swiggy instamart, dunzo, milkbasket, country delight,
supermarket, kirana, provision
```

### 🚗 Transport
```
uber, ola, rapido, metro, namma yatri, meru, bluesmart,
auto, cab, taxi, ride, commute
```

### ⛽ Fuel
```
fuel, petrol, diesel, indian oil, hp, bharat petroleum,
iocl, bpcl, hpcl, shell, reliance petroleum, petrol pump, filling station
```

### 🛍️ Shopping
```
amazon, flipkart, myntra, ajio, meesho, nykaa, tata cliq,
snapdeal, shoppers stop, lifestyle, westside, pantaloons,
croma, reliance digital, vijay sales, decathlon,
h&m, zara, uniqlo, miniso
```

### 📺 Entertainment
```
pvr, inox, cinepolis, bookmyshow, movie, cinema, theatre,
gaming, playstation, xbox, steam, concert, event
```

### 📱 Subscription
```
netflix, spotify, hotstar, prime, youtube, apple, disney,
zee5, sonyliv, jiocinema, audible, kindle, gpay subscription,
chatgpt, notion, icloud, google one, github, linkedin premium
```

### 📞 Bills & Utilities
```
airtel, jio, vodafone, vi, bsnl, electricity, gas, water,
broadband, tata play, dish tv, d2h, act fibernet, excitel,
wifi, internet, mobile recharge, dth, postpaid, prepaid,
piped gas, mahanagar gas, indane
```

### 🏥 Health
```
hospital, pharmacy, apollo, medplus, practo, 1mg, pharmeasy,
netmeds, tata 1mg, doctor, clinic, dental, lab, diagnostic,
healthians, thyrocare, lenskart, eye, optical, gym, cult, cultfit
```

### 🏠 Rent
```
rent, maintenance, society, housing, apartment, flat,
landlord, pg, hostel, paying guest
```

### 💰 EMI
```
emi, loan, bajaj finserv, home credit, zest money,
simpl, lazypay, postpe, pay later, installment
```

### ✈️ Travel
```
irctc, makemytrip, goibibo, cleartrip, yatra, easemytrip,
hotel, flight, train, bus, redbus, abhibus, ixigo,
oyo, airbnb, booking.com, agoda, trivago, airport,
indigo, air india, vistara, spicejet, akasa
```

### 🎓 Education
```
udemy, coursera, unacademy, byjus, vedantu, skillshare,
upgrad, scaler, coding ninjas, book, course, tuition,
school, college, exam, registration
```

### 💇 Personal Care
```
salon, spa, haircut, grooming, parlour, beauty,
urban company, urban clap, massage, facial, manicure
```

### 🎁 Gifts
```
gift, donation, charity, present, contribution, wedding
```

### 💵 Income
```
salary, sal, payroll, income, freelance, consulting,
interest, dividend, refund, cashback, reward
```

### 💳 CC Bill Payment
```
credit card payment, cc payment, card payment, bill payment
```

---

## How to Add New Keywords

When you categorize an unknown merchant via Layer 3 (manual picker), the system asks "Remember this merchant?" If yes, it's added to `config.json → merchant_map`. That's Layer 2.

To add new keywords to Layer 1 (built-in), you'd need to edit the SMS Parser shortcut's `Match Text` / `If` conditions directly.

**Recommendation:** Let Layer 2 (merchant_map) handle most new merchants. Only update Layer 1 if you find a common pattern (e.g., all "POS" terminals for a chain).
