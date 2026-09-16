/* ═══════════════════════════════════════════════════════════════════════════
   חדר המידע — הזרקת מספרי היחידה בצד שרת
   ───────────────────────────────────────────────────────────────────────────
   הבעיה שזה פותר: מנוע AI שמקבל את הקישור מושך HTML גולמי ואינו מריץ JS.
   משבצות המספרים (stEst/stTax/stGrand/payList…) ריקות ב-HTML ונכתבות רק
   אחרי ה-fetch ל-action=unit — ולכן הקורא רואה את ההסכם והסטטוס, אבל לא
   סכום אחד. נמדד 15.09.2026: `id="stEst"></div>`.

   📐 שלושה עקרונות שנבחרו כדי שהשכבה הזו לא תוכל לשבור את הדף:

   1. **מזריקים לתוך <noscript> בלבד.** הדפדפן של הרוכש מתעלם מהתוכן הזה
      לחלוטין — הדף, הרינדור וה-fetch נשארים מילה במילה כפי שהם היום, ואין
      מסלול שבו השינוי מגיע לעין אנושית. קורא בלי JS (מנוע AI, קורא מסך)
      כן רואה. זה גם לא cloaking: אותו מידע בדיוק מוצג לאדם, רק דרך JS.
   2. **אפס חישוב כאן.** מוזרקים רק שדות שכבר יושבים במרשם כפי שהמחירון
      כתב אותם. מס רכישה, שכר טרחה ולוח ארבעת התשלומים מחושבים בדף ואינם
      משוכפלים — עותק שני שלהם היה נסחף מהמקור (ראו crm_match, design_tokens).
   3. **fail-open.** כל תקלה — טוקן לא מוכר, Make איטי, JSON פגום — מחזירה
      את הדף כמות שהוא. המצב הגרוע ביותר הוא ההתנהגות של היום.

   ⚠ בלי טוקן הדף מוגש כרגיל, בדיוק כמו היום (ה-JS מציג "הקישור אינו זמין").
     לא הוחמרה כאן מדיניות הגישה — זה לא היה בסקופ.
   ═══════════════════════════════════════════════════════════════════════════ */

const HOOK = 'https://hook.eu2.make.com/dhimk81lvcjn3a28o9g6pq4hvcbm23ee';

/* מנועים שמושכים דף לבקשת משתמש. הרשימה משמשת **רק** לתיוג הצפייה בדוח
   הפעילות, לא לחסימה ולא להגשה שונה — הגשה שונה לפי UA היא בדיוק מה שגוגל
   קורא cloaking, וממילא אין צורך: ה-noscript גלוי לכולם באותה מידה. */
const BOT_RE = /bot|crawler|spider|GPTBot|ChatGPT|Claude|Anthropic|Perplexity|Bytespider|CCBot|Google-Extended|facebookexternalhit|WhatsApp|Slackbot|Twitterbot/i;

/* 📐 שתי רמות בריחה, במכוון.
   ⚠ esc ל-**תוכן טקסט** ואינו נוגע בגרשיים: הקורא היחיד של הבלוק הזה הוא מי
     שמנתח HTML גולמי, ו-`&quot;` הפך אצלו "110 מ"ר" ל-"110 מ&quot;ר" (נתפס
     16.09.2026 באימות מול יחידה אמיתית). הדפדפן היה מפענח — קורא גולמי לא
     בהכרח, וזו כל מטרת הבלוק.
   🔒 escAttr לערך שנכנס לתוך מרכאות של תגית. כרגע אין כזה, והוא קיים כדי
     שהוספה עתידית לא תשתמש ב-esc במקום הלא נכון. */
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = s => esc(s).replace(/"/g, '&quot;');

/* ₪ בפורמט עברי. מחרוזת ריקה לערך שאינו מספר חיובי — שדה חסר במרשם לא
   יודפס כ-"0 ₪", שהיה נקרא כמחיר אמיתי. */
const ils = v => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n.toLocaleString('en-US').replace(/,/g, ',') + ' ₪' : '';
};

const TRACKS = { A: 'ריבית שוטפת', B: 'גרייס מלא' };

function summaryHtml(u) {
  const row = (label, value, note) => value
    ? `<li><b>${esc(label)}:</b> ${esc(value)}${note ? ' — ' + esc(note) : ''}</li>` : '';

  const ident = [u.building, u.floor ? 'קומה ' + u.floor : '', u.unitNo ? 'יחידה ' + u.unitNo : '',
                 u.rooms ? u.rooms + ' חדרים' : '', u.sqm ? u.sqm + ' מ"ר' : '']
                .filter(Boolean).join(' · ');

  const rows = [
    row('אמדן היחידה', ils(u.estimate)),
    row('רכיב הקרקע', ils(u.landComponent), 'קבוע וסופי, נקוב בנספח א׳1'),
    row('רכיב ההקמה', ils(u.buildComponent), 'הרכיב שנותר פתוח, ייסגר בחוזה פאושלי עם הקבלן'),
    row('הון עצמי', ils(u.equity)),
    row('מסלול המימון', TRACKS[u.track] || ''),
    row('אמדן כולל הערכת ריבית', ils(u.graceTotal)),
  ].filter(Boolean).join('\n      ');

  if (!rows) return '';

  return `
<noscript>
  <div class="wrap"><div class="read">
    <h2>המספרים של היחידה</h2>
    <p>הנתונים הבאים הם של היחידה שאליה מתייחס הקישור האישי הזה, כפי שהם רשומים במרשם חדר המידע.${ident ? ' ' + esc(ident) + '.' : ''}</p>
    <ul>
      ${rows}
    </ul>
    ${u.financeNote ? '<p>' + esc(u.financeNote) + '</p>' : ''}
    <p><b>מה אינו כלול באמדן</b> — ההסכם מפרט זאת במפורש: מס רכישה, שכר טרחת היועצים המשפטיים (1.1% בתוספת מע"מ), הוצאות מימון, והפרשי הצמדה למדד תשומות הבנייה. הסכומים הנגזרים האלה מחושבים ומוצגים לרוכש בדף עצמו ואינם חלק מהמרשם, ולכן אינם מופיעים כאן.</p>
    <p>האמדן אינו מחיר סופי, וההסכם אינו יוצר התחייבות למחיר סופי — ההסבר המלא במקטע "למה אומדן ולא מחיר סופי". הנוסח המחייב הוא הסכם השיתוף על נספחיו.</p>
  </div></div>
</noscript>
`;
}

/* רישום הצפייה. ⚠ יושב ב-waitUntil ולכן אינו מעכב את ההגשה, ובכוונה אינו
   מפיל אותה: beacon שנכשל לא יגרום לרוכש לראות דף שבור. */
function logView(waitUntil, token, isBot, ua) {
  const b = new URLSearchParams();
  b.append('type', 'event');
  b.append('t', token);
  b.append('evtype', isBot ? 'view_bot' : 'view_ssr');
  b.append('meta', String(ua || '').slice(0, 200));
  waitUntil(fetch(HOOK, {
    method: 'POST', body: b,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }).catch(() => {}));
}

export async function onRequest(context) {
  const { request, next, waitUntil } = context;
  const res = await next();

  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('text/html')) return res;

  const token = new URL(request.url).searchParams.get('t');
  if (!token) return res;

  const ua = request.headers.get('user-agent') || '';
  const isBot = BOT_RE.test(ua);

  let unit;
  try {
    /* 8 שניות: מעבר לזה עדיף להגיש את הדף בלי המספרים מאשר להשהות את הרוכש.
       ⚠ טוקן שאינו במרשם מחזיר את המחרוזת "Accepted" ולא JSON — ולכן r.json()
         זורק, וזו הבדיקה שהדף עצמו כבר נשען עליה. */
    const r = await fetch(HOOK + '?action=unit&t=' + encodeURIComponent(token), {
      signal: AbortSignal.timeout(8000),
    });
    unit = await r.json();
  } catch { return res; }

  if (!unit || !unit.unitNo) return res;

  const block = summaryHtml(unit);
  if (!block) return res;

  logView(waitUntil, token, isBot, ua);

  const out = new HTMLRewriter()
    .on('main', {
      element(el) { el.append(block, { html: true }); },
    })
    .transform(res);

  /* 🔒 תגובה אישית לטוקן — אסור שתישמר בקצה או בדפדפן. בלי זה, ביטול קישור
     (revoke) לא נאכף מיד, וצפיות של רוכשים שונים נבלעות בעותק שמור אחד. */
  const headers = new Headers(out.headers);
  headers.set('Cache-Control', 'no-store, private, max-age=0');
  headers.set('X-Robots-Tag', 'noindex');
  return new Response(out.body, { status: out.status, headers });
}
