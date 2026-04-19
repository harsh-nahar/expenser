# 01 - Expenser Hub: Launch from Home Screen

One shortcut, one action. Opens Scriptable in the foreground so all interactive features work.

> **Why a URL scheme?** Scriptable's "Run Script" Shortcuts action runs inline (Siri context) where Alerts are blocked. The URL scheme `scriptable:///run/ScriptName` opens the app in the foreground - menus, text fields, and tables all work.

---

## Create the Shortcut

1. Open **Shortcuts** app
2. Tap **+** (top right) to create new shortcut
3. Tap the name at top → rename to **Expenser**
4. Add Action → search **Open URLs** (or **URL** → **Open URL**)
5. Set the URL to: `scriptable:///run/Expenser`
6. **That's it - 1 action.**

### Test It

1. Tap ▶️ to run
2. Scriptable opens and shows the main menu
3. Try **🏦 Manage Accounts** - should show your accounts
4. Try **➕ Quick Entry** - should show transaction type picker

### Add to Home Screen

1. In the shortcut editor, tap **ⅰ** at the top
2. Tap **Add to Home Screen**
3. Name: **Expenser**, pick an icon (suggested: 💰 green)
4. Tap **Add**

Now you have a one-tap home screen launcher.

---

## What You See When You Launch

```
Expenser
What would you like to do?

➕ Quick Entry
📷 Scan Receipt
✏️ Edit / Review
↩️ Undo Last
📤 Export CSV
📋 Set Budget
🏦 Manage Accounts
❓ Help
```

---

## Available Commands (for other shortcuts/automations)

Use the URL scheme with a command parameter for direct access:

| URL | Feature |
|-----|---------|
| `scriptable:///run/Expenser` | Full menu |
| `scriptable:///run/Expenser?input=quick_entry` | Quick Entry |
| `scriptable:///run/Expenser?input=balances` | Balances |
| `scriptable:///run/Expenser?input=summary` | Summary |

> **Note:** When using `?input=`, the script receives it via `args.queryParameters.input`. This is different from `args.shortcutParameter` (which comes from the "Run Script" action). The script currently checks `args.shortcutParameter` - URL query parameters would need a small code update to work. For now, just use the plain URL without parameters.

---

## Shortcuts Are Only Needed For

| Guide | What | Why Shortcuts? |
|-------|------|----------------|
| [02-sms-automation.md](02-sms-automation.md) | Auto-log bank SMS | SMS trigger only exists in Shortcuts |
| [04-scan-receipt.md](04-scan-receipt.md) | OCR receipt scan | Camera + OCR only in Shortcuts |
| [05-email-automation.md](05-email-automation.md) | Auto-log bank/CC emails | Email trigger only exists in Shortcuts |

These automations run silently (no Alerts needed) - they just process data and send notifications.

**Next:** [02-sms-automation.md](02-sms-automation.md) - auto-log bank SMS transactions
