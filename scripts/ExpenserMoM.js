// ExpenserMoM.js - Spending Trend Sparkline Widget
// Auto-switches: weekly sparkline (<2 months data) or monthly sparkline (2+ months).

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

const fm = FileManager.iCloud();
let BASE;
try {
  BASE = fm.bookmarkedPath("expenser");
} catch (e) {
  let w = new ListWidget();
  w.addText("Setup needed").font = Font.semiboldSystemFont(15);
  w.addText("Add 'expenser' bookmark").font = Font.systemFont(12);
  Script.setWidget(w);
  Script.complete();
  return;
}

async function loadJSON(path) {
  try {
    if (fm.fileExists(path)) {
      await fm.downloadFileFromiCloud(path);
      return JSON.parse(fm.readString(path));
    }
  } catch (e) {}
  return null;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function shortCurrency(num) {
  if (num == null || num === 0) return "₹0";
  let n = Math.abs(num);
  if (n >= 100000) {
    let v = (n / 100000).toFixed(1);
    return "₹" + v.replace(/\.0$/, "") + "L";
  }
  if (n >= 10000) {
    let v = (n / 1000).toFixed(1);
    return "₹" + v.replace(/\.0$/, "") + "k";
  }
  return "₹" + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/, ",");
}

function formatIndian(num) {
  if (num == null) return "₹0";
  let n = Math.round(Math.abs(num));
  let s = String(n);
  if (s.length <= 3) return "₹" + s;
  let last3 = s.slice(-3);
  let rest = s.slice(0, -3);
  let formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
  return "₹" + formatted;
}

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function dateStr(d) {
  let y = d.getFullYear();
  let m = String(d.getMonth() + 1).padStart(2, "0");
  let day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
// Aggregate monthly data (last 6 months)
// ---------------------------------------------------------------------------

function aggregateMonths(expenses) {
  let now = new Date();
  let currentDay = now.getDate();
  let months = [];
  for (let i = 5; i >= 0; i--) {
    let d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    let key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    let label = MONTHS_SHORT[d.getMonth()];
    months.push({ key, label, total: 0, mtdTotal: 0, hasData: false });
  }
  let monthKeys = new Set(months.map(m => m.key));
  for (let tx of expenses) {
    if (tx.type !== "debit" || !tx.date) continue;
    let txKey = tx.date.substring(0, 7);
    if (!monthKeys.has(txKey)) continue;
    let txDay = parseInt(tx.date.substring(8, 10), 10);
    let m = months.find(mo => mo.key === txKey);
    if (m) {
      m.total += tx.amount;
      m.hasData = true;
      if (txDay <= currentDay) m.mtdTotal += tx.amount;
    }
  }
  let currentKey = months[5].key;
  for (let m of months) {
    if (!m.hasData && m.key !== currentKey) {
      m.total = null;
      m.mtdTotal = null;
    }
  }
  return months;
}

// ---------------------------------------------------------------------------
// Aggregate weekly data (last 6 weeks, Mon–Sun)
// ---------------------------------------------------------------------------

function aggregateWeeks(expenses) {
  let now = new Date();
  let today = dateStr(now);

  // Find Monday of current week
  let dayOfWeek = now.getDay(); // 0=Sun
  let mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  let currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);

  let weeks = [];
  for (let i = 5; i >= 0; i--) {
    let wStart = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - i * 7);
    let wEnd = new Date(wStart.getFullYear(), wStart.getMonth(), wStart.getDate() + 6);
    let startStr = dateStr(wStart);
    let endStr = dateStr(wEnd);
    // Label: "7-13 Apr" or "31 Mar-6 Apr"
    let sDay = wStart.getDate();
    let eDay = wEnd.getDate();
    let label;
    if (i === 0) {
      label = "This Wk";
    } else if (i === 1) {
      label = "Last Wk";
    } else {
      let sMon = MONTHS_SHORT[wStart.getMonth()];
      label = sDay + " " + sMon;
    }
    weeks.push({ startStr, endStr, label, total: 0, hasData: false, isCurrent: i === 0 });
  }

  for (let tx of expenses) {
    if (tx.type !== "debit" || !tx.date) continue;
    let d = tx.date;
    for (let w of weeks) {
      if (d >= w.startStr && d <= w.endStr) {
        w.total += tx.amount;
        w.hasData = true;
        break;
      }
    }
  }

  // Mark weeks with no transactions as null (except current week)
  for (let w of weeks) {
    if (!w.hasData && !w.isCurrent) w.total = null;
  }

  return weeks;
}

// ---------------------------------------------------------------------------
// Aggregate daily data (last 7 days)
// ---------------------------------------------------------------------------

function aggregateDays(expenses) {
  let now = new Date();
  let days = [];
  const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  for (let i = 6; i >= 0; i--) {
    let d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    let key = dateStr(d);
    let label = i === 0 ? "Today" : i === 1 ? "Yest" : DAYS_SHORT[d.getDay()];
    days.push({ key, label, total: 0, hasData: false, isCurrent: i === 0 });
  }

  for (let tx of expenses) {
    if (tx.type !== "debit" || !tx.date) continue;
    let day = days.find(d => d.key === tx.date);
    if (day) {
      day.total += tx.amount;
      day.hasData = true;
    }
  }

  // Mark days with no transactions as null (except today)
  for (let d of days) {
    if (!d.hasData && !d.isCurrent) d.total = null;
  }

  return days;
}

// ---------------------------------------------------------------------------
// Decide mode: daily → weekly → monthly (auto-escalate)
// ---------------------------------------------------------------------------

function chooseMode(months, weeks) {
  let monthsWithData = months.filter(m => m.total !== null && m.total > 0).length;
  if (monthsWithData >= 2) return "monthly";
  let weeksWithData = weeks.filter(w => w.total !== null && w.total > 0).length;
  if (weeksWithData >= 2) return "weekly";
  return "daily";
}

// ---------------------------------------------------------------------------
// DrawContext sparkline
// ---------------------------------------------------------------------------

function drawSparkline(points, width, height, showLabels) {
  // points = [{label, total (number|null)}]
  let ctx = new DrawContext();
  ctx.size = new Size(width, height);
  ctx.opaque = false;
  ctx.respectScreenScale = true;

  let dataPoints = points.map((p, i) => ({
    index: i, value: p.total, label: p.label, hasData: p.total !== null
  }));
  let validPoints = dataPoints.filter(p => p.hasData);

  if (validPoints.length === 0) {
    ctx.setFillColor(Color.clear());
    ctx.fillRect(new Rect(0, 0, width, height));
    return ctx.getImage();
  }
  if (validPoints.length === 1) {
    let dotColor = Color.dynamic(new Color("#007AFF"), new Color("#0A84FF"));
    let cx = width / 2, cy = height / 2;
    ctx.setFillColor(dotColor);
    ctx.fillEllipse(new Rect(cx - 4, cy - 4, 8, 8));
    return ctx.getImage();
  }

  let maxVal = Math.max(...validPoints.map(p => p.value), 1);
  let pad = { top: 10, bottom: showLabels ? 22 : 10, left: 14, right: 14 };
  let chartW = width - pad.left - pad.right;
  let chartH = height - pad.top - pad.bottom;

  function xPos(idx) { return pad.left + (idx / (points.length - 1)) * chartW; }
  function yPos(val) { return pad.top + chartH - (val / maxVal) * chartH; }

  // Grid lines
  let gridColor = Color.dynamic(new Color("#E0E0E0", 0.5), new Color("#444444", 0.5));
  for (let g = 0; g <= 2; g++) {
    let gy = pad.top + (chartH / 2) * g;
    let path = new Path();
    path.move(new Point(pad.left, gy));
    path.addLine(new Point(width - pad.right, gy));
    ctx.addPath(path);
    ctx.setStrokeColor(gridColor);
    ctx.setLineWidth(0.5);
    ctx.strokePath();
  }

  // Line points
  let linePoints = [];
  for (let p of dataPoints) {
    if (!p.hasData) continue;
    linePoints.push({ x: xPos(p.index), y: yPos(p.value) });
  }

  // Fill area
  let fillPath = new Path();
  fillPath.move(new Point(linePoints[0].x, yPos(0)));
  for (let pt of linePoints) fillPath.addLine(new Point(pt.x, pt.y));
  fillPath.addLine(new Point(linePoints[linePoints.length - 1].x, yPos(0)));
  fillPath.closeSubpath();
  ctx.addPath(fillPath);
  ctx.setFillColor(Color.dynamic(new Color("#007AFF", 0.12), new Color("#0A84FF", 0.15)));
  ctx.fillPath();

  // Line
  let linePath = new Path();
  linePath.move(new Point(linePoints[0].x, linePoints[0].y));
  for (let i = 1; i < linePoints.length; i++) linePath.addLine(new Point(linePoints[i].x, linePoints[i].y));
  ctx.addPath(linePath);
  ctx.setStrokeColor(Color.dynamic(new Color("#007AFF"), new Color("#0A84FF")));
  ctx.setLineWidth(2);
  ctx.strokePath();

  // Dots
  let dotColor = Color.dynamic(new Color("#007AFF"), new Color("#0A84FF"));
  let lastIdx = validPoints[validPoints.length - 1].index;
  for (let p of dataPoints) {
    if (!p.hasData) continue;
    let x = xPos(p.index), y = yPos(p.value);
    let isLast = p.index === lastIdx;
    let r = isLast ? 4.5 : 3;
    if (isLast) {
      ctx.setFillColor(dotColor);
      ctx.fillEllipse(new Rect(x - r, y - r, r * 2, r * 2));
      let ir = r - 1.5;
      ctx.setFillColor(Color.dynamic(Color.white(), new Color("#1C1C1E")));
      ctx.fillEllipse(new Rect(x - ir, y - ir, ir * 2, ir * 2));
      let cr = ir - 1;
      ctx.setFillColor(dotColor);
      ctx.fillEllipse(new Rect(x - cr, y - cr, cr * 2, cr * 2));
    } else {
      ctx.setFillColor(dotColor);
      ctx.fillEllipse(new Rect(x - r, y - r, r * 2, r * 2));
    }
  }

  // Labels
  if (showLabels) {
    ctx.setFont(Font.systemFont(9));
    ctx.setTextColor(Color.dynamic(new Color("#8E8E93"), new Color("#98989D")));
    for (let p of dataPoints) {
      let x = xPos(p.index);
      let lw = 42;
      ctx.drawTextInRect(p.label, new Rect(x - lw / 2, height - 18, lw, 14));
    }
  }

  return ctx.getImage();
}

// ---------------------------------------------------------------------------
// Change % helper
// ---------------------------------------------------------------------------

function changeText(current, previous) {
  if (previous === null || previous === 0) return { text: "-", color: Color.gray() };
  let pct = ((current - previous) / previous) * 100;
  let sign = pct >= 0 ? "+" : "";
  let text = sign + Math.round(pct) + "%";
  let color = pct <= 0
    ? Color.dynamic(new Color("#34C759"), new Color("#30D158"))
    : pct <= 15
      ? Color.dynamic(new Color("#FF9500"), new Color("#FFD60A"))
      : Color.dynamic(new Color("#FF3B30"), new Color("#FF453A"));
  return { text, color };
}

// ---------------------------------------------------------------------------
// Widget layouts - generic (works for weeks or months)
// ---------------------------------------------------------------------------

function buildSmall(widget, points, mode) {
  widget.setPadding(14, 14, 14, 14);
  let current = points[points.length - 1];
  let previous = points[points.length - 2];
  let titleText = mode === "daily" ? "Daily Trend" : mode === "weekly" ? "Weekly Trend" : "Monthly Trend";

  let title = widget.addText(titleText);
  title.font = Font.semiboldSystemFont(11);
  title.textColor = Color.dynamic(new Color("#8E8E93"), new Color("#98989D"));

  widget.addSpacer();

  let img = drawSparkline(points, 300, 100, false);
  let imgEl = widget.addImage(img);
  imgEl.imageSize = new Size(130, 43);

  widget.addSpacer();

  let amtRow = widget.addStack();
  amtRow.centerAlignContent();
  let amt = amtRow.addText(shortCurrency(current.total));
  amt.font = Font.boldSystemFont(16);
  amt.minimumScaleFactor = 0.5;
  amt.lineLimit = 1;

  let prevTotal = mode === "monthly" ? (previous ? previous.mtdTotal : null) : (previous ? previous.total : null);
  let curTotal = mode === "monthly" ? current.mtdTotal : current.total;
  if (prevTotal !== null && prevTotal > 0) {
    amtRow.addSpacer(4);
    let chg = changeText(curTotal, prevTotal);
    let chgEl = amtRow.addText(chg.text);
    chgEl.font = Font.semiboldSystemFont(10);
    chgEl.textColor = chg.color;
    chgEl.lineLimit = 1;
    chgEl.minimumScaleFactor = 0.7;
  }
}

function buildMedium(widget, points, mode) {
  widget.setPadding(12, 14, 12, 14);
  let current = points[points.length - 1];
  let previous = points[points.length - 2];
  let titleText = mode === "daily" ? "Daily Trend" : mode === "weekly" ? "Weekly Trend" : "Monthly Trend";

  let title = widget.addText(titleText);
  title.font = Font.semiboldSystemFont(11);
  title.textColor = Color.dynamic(new Color("#8E8E93"), new Color("#98989D"));

  widget.addSpacer(2);

  let mainStack = widget.addStack();
  mainStack.layoutHorizontally();
  mainStack.centerAlignContent();

  // Left: sparkline - takes available space
  let img = drawSparkline(points, 440, 130, true);
  let imgEl = mainStack.addImage(img);
  imgEl.imageSize = new Size(210, 65);

  mainStack.addSpacer();

  // Right: amounts - right aligned
  let rightCol = mainStack.addStack();
  rightCol.layoutVertically();

  let curLabel = rightCol.addText(current.label);
  curLabel.font = Font.semiboldSystemFont(11);
  curLabel.textColor = Color.dynamic(new Color("#8E8E93"), new Color("#98989D"));
  let curAmt = rightCol.addText(shortCurrency(current.total));
  curAmt.font = Font.boldSystemFont(22);
  curAmt.minimumScaleFactor = 0.5;
  curAmt.lineLimit = 1;

  rightCol.addSpacer(4);

  let prevTotal = mode === "monthly" ? (previous ? previous.mtdTotal : null) : (previous ? previous.total : null);
  let curTotal = mode === "monthly" ? current.mtdTotal : current.total;
  if (prevTotal !== null && prevTotal > 0) {
    let chg = changeText(curTotal, prevTotal);
    let vsLabel = mode === "monthly" ? "vs " + previous.label + " MTD" : "vs " + previous.label;
    let vsText = rightCol.addText(vsLabel);
    vsText.font = Font.systemFont(9);
    vsText.textColor = Color.dynamic(new Color("#8E8E93"), new Color("#98989D"));
    let chgEl = rightCol.addText(chg.text);
    chgEl.font = Font.semiboldSystemFont(16);
    chgEl.textColor = chg.color;
  }

  rightCol.addSpacer(4);

  // Previous 2 periods
  for (let i = points.length - 2; i >= Math.max(0, points.length - 3); i--) {
    if (points[i].total === null) continue;
    let row = rightCol.addStack();
    row.centerAlignContent();
    let lbl = row.addText(points[i].label + " ");
    lbl.font = Font.systemFont(10);
    lbl.textColor = Color.dynamic(new Color("#8E8E93"), new Color("#98989D"));
    let val = row.addText(shortCurrency(points[i].total));
    val.font = Font.mediumSystemFont(10);
  }
}

function buildLarge(widget, points, mode) {
  widget.setPadding(14, 16, 14, 16);
  let current = points[points.length - 1];
  let previous = points[points.length - 2];
  let titleText = mode === "daily" ? "Daily Spending Trend" : mode === "weekly" ? "Weekly Spending Trend" : "Monthly Spending Trend";

  let titleRow = widget.addStack();
  titleRow.centerAlignContent();
  let title = titleRow.addText(titleText);
  title.font = Font.semiboldSystemFont(13);
  title.textColor = Color.dynamic(new Color("#8E8E93"), new Color("#98989D"));
  title.minimumScaleFactor = 0.8;
  titleRow.addSpacer();

  let prevTotal = mode === "monthly" ? (previous ? previous.mtdTotal : null) : (previous ? previous.total : null);
  let curTotal = mode === "monthly" ? current.mtdTotal : current.total;
  if (prevTotal !== null && prevTotal > 0) {
    let chg = changeText(curTotal, prevTotal);
    let chgEl = titleRow.addText(chg.text + " vs " + previous.label);
    chgEl.font = Font.semiboldSystemFont(12);
    chgEl.textColor = chg.color;
    chgEl.lineLimit = 1;
    chgEl.minimumScaleFactor = 0.8;
  }

  widget.addSpacer(2);

  let curAmt = widget.addText(formatIndian(current.total));
  curAmt.font = Font.boldSystemFont(28);
  curAmt.minimumScaleFactor = 0.6;
  curAmt.lineLimit = 1;
  let suffix = mode === "daily" ? "today" : mode === "weekly" ? "this week" : current.label + " (so far)";
  let curSub = widget.addText(suffix);
  curSub.font = Font.systemFont(11);
  curSub.textColor = Color.dynamic(new Color("#8E8E93"), new Color("#98989D"));
  curSub.lineLimit = 1;

  widget.addSpacer();

  let img = drawSparkline(points, 620, 180, true);
  let imgEl = widget.addImage(img);
  imgEl.imageSize = new Size(310, 90);

  widget.addSpacer();

  // All periods breakdown
  let grid = widget.addStack();
  grid.layoutHorizontally();
  grid.spacing = 2;
  for (let i = 0; i < points.length; i++) {
    let col = grid.addStack();
    col.layoutVertically();

    let lbl = col.addText(points[i].label);
    lbl.font = Font.semiboldSystemFont(9);
    lbl.textColor = Color.dynamic(new Color("#8E8E93"), new Color("#98989D"));
    lbl.lineLimit = 1;
    lbl.minimumScaleFactor = 0.7;

    let val = col.addText(points[i].total !== null ? shortCurrency(points[i].total) : "-");
    val.font = i === points.length - 1 ? Font.boldSystemFont(10) : Font.mediumSystemFont(10);
    val.minimumScaleFactor = 0.6;
    val.lineLimit = 1;

    if (i < points.length - 1) grid.addSpacer();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

let expenses = await loadJSON(BASE + "/expenses.json") || [];
let months = aggregateMonths(expenses);
let weeks = aggregateWeeks(expenses);
let mode = chooseMode(months, weeks);
let points = mode === "monthly" ? months : mode === "weekly" ? weeks : aggregateDays(expenses);

let hasAnyData = points.some(p => p.total !== null && p.total > 0);

let widget = new ListWidget();
widget.setPadding(10, 12, 10, 12);

let family = config.widgetFamily || "small";

if (!hasAnyData) {
  let noData = widget.addText("No Spending Data");
  noData.font = Font.semiboldSystemFont(15);
  let hint = widget.addText("Transactions will appear here");
  hint.font = Font.systemFont(12);
  hint.textColor = Color.gray();
} else if (family === "small") {
  buildSmall(widget, points, mode);
} else if (family === "medium") {
  buildMedium(widget, points, mode);
} else {
  buildLarge(widget, points, mode);
}

Script.setWidget(widget);
Script.complete();
