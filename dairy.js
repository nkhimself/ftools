(function () {
'use strict'; var $ = U.$, $$ = U.$$, E = FE, last = {};
U.tabs($('#tb').parentNode); U.bindFile('ydf', 'yd');
function pf(v, d) { var x = E.parseTable(String(v))[0]; return x && x.length ? x[0] : d; }
function money(v) { return isFinite(v) ? Math.round(v).toLocaleString('en-US') : '—'; }
function blank(id) { return String($('#' + id).value).trim() === ''; }
function inp(v, cls) { return '<input type="text" inputmode="decimal" class="' + (cls || '') + '" value="' + U.esc(v) + '">'; }

// ================= cheese
var EX = [['دلمهٔ پنیر (curd جوان)', 280, 56, 35, 100, 50, 22, 21], ['پنیر سفید برگشتی (rework)', 150, 25, 0, 40, 52, 21, 19], ['کره', 400, 2.5, 0, 10, 16, 82, 0.8], ['شیرخشک بدون چربی', 330, 6, 0, 8, 4, 1, 35], ['سیترات سدیم (امولسیفایر)', 180, 2.5, 1.5, 3, 0, 0, 0], ['آب', 0, 8, 0, 30, 100, 0, 0]], S = EX.map(function (r) { return r.slice(); });
function renderIng() {
  var h = '<thead><tr><th class="t">ماده</th><th>هزینه / kg</th><th>kg در دستور فعلی</th><th>حداقل %</th><th>حداکثر %</th><th>رطوبت %</th><th>چربی %</th><th>پروتئین %</th><th></th></tr></thead><tbody>';
  S.forEach(function (r, i) { h += '<tr>' + '<td>' + inp(r[0], 'nm') + '</td>' + r.slice(1).map(function (v) { return '<td>' + inp(v) + '</td>'; }).join('') + '<td><button data-del="' + i + '">×</button></td></tr>'; });
  $('#ing').innerHTML = h + '</tbody>';
}
function collect() { S = $$('#ing tbody tr').map(function (tr) { return $$('input', tr).map(function (e) { return e.value; }); }); }
$('#ing').addEventListener('click', function (e) { var d = e.target.getAttribute('data-del'); if (d == null) return; collect(); S.splice(+d, 1); renderIng(); });
$('#addIng').addEventListener('click', function () { collect(); S.push(['ماده جدید', 0, 0, 0, 100, 0, 0, 0]); renderIng(); });
$('#exC').addEventListener('click', function () { S = EX.map(function (r) { return r.slice(); }); renderIng(); });
renderIng();
function ops(mode) { return { T0: U.read('t0'), T1: U.read('t1'), loss: U.read('loss') / 100, mode: mode || $('#mode').value, P: U.read('bp'), evap: U.read('evap') / 100 }; }
function rec(scale) { return S.map(function (r) { return { x: pf(r[2], 0), w: pf(r[5], 0), f: pf(r[6], 0), p: pf(r[7], 0) }; }); }
function spec() { return { mlo: blank('mlo') ? null : U.read('mlo'), mhi: blank('mhi') ? null : U.read('mhi'), flo: blank('flo') ? null : U.read('flo'), fhi: blank('fhi') ? null : U.read('fhi'), plo: blank('plo') ? null : U.read('plo'), fdm: blank('fdm') ? null : U.read('fdm') }; }
function badge(v, lo, hi, d) { var okk = (lo == null || v >= lo - 1e-9) && (hi == null || v <= hi + 1e-9); return '<span style="color:var(--' + (okk ? 'ok' : 'bad') + ')">' + U.num(v, d == null ? 2 : d) + (okk ? ' ✓' : ' ✗') + '</span>'; }
function checkCol(b, sp) { return [badge(b.moist, sp.mlo, sp.mhi), badge(b.fat, sp.flo, sp.fhi), badge(b.prot, sp.plo, null), sp.fdm == null ? U.num(b.fdm, 1) : badge(b.fdm, sp.fdm, null, 1)]; }

$('#runC').addEventListener('click', function () {
  collect(); var R = rec(), o = ops(), sp = spec(), warn = [];
  if (!R.some(function (r) { return r.x > 0; })) return U.msg('msgC', 'مقدار (kg) دستور فعلی را وارد کنید.', 'bad');
  if (!(o.T1 > o.T0)) return U.msg('msgC', 'دمای پخت باید بالاتر از دمای اولیه باشد.', 'bad');
  var bd = E.cheeseBalance(R, ops('direct')), bi = E.cheeseBalance(R, ops('indirect')), b = o.mode === 'direct' ? bd : bi, M0 = bd.M0, cost = 0;
  S.forEach(function (r, i) { cost += pf(r[1], 0) * R[i].x; });
  if (o.T1 > st(o.P).Tsat) warn.push('دمای پخت از دمای اشباع بخار (' + U.num(st(o.P).Tsat, 0) + '°C) بیشتر است؛ فشار بخار را بالا ببرید.');
  var bad = []; if (sp.mlo != null && b.moist < sp.mlo) bad.push('رطوبت کمتر از حد است'); if (sp.mhi != null && b.moist > sp.mhi) bad.push('رطوبت بیشتر از حد است'); if (sp.flo != null && b.fat < sp.flo) bad.push('چربی کم است'); if (sp.fhi != null && b.fat > sp.fhi) bad.push('چربی زیاد است'); if (sp.plo != null && b.prot < sp.plo) bad.push('پروتئین کم است'); if (sp.fdm != null && b.fdm < sp.fdm) bad.push('FDM کم است');
  var cd = checkCol(bd, sp), ci = checkCol(bi, sp);
  var rows = [['بخار مصرفی (kg به ازای هر ' + U.num(M0, 0) + ' kg دستور)', U.num(bd.steam, 2), U.num(bi.steam, 2)], ['آب اضافه‌شده از بخار (kg)', U.num(bd.cond, 2), '0'], ['جرم نهایی (kg)', U.num(bd.Mf, 2), U.num(bi.Mf, 2)], ['رطوبت نهایی %', cd[0], ci[0]], ['چربی نهایی %', cd[1], ci[1]], ['پروتئین نهایی %', cd[2], ci[2]], ['FDM %', cd[3], ci[3]], ['بخار به ازای هر kg محصول', U.num(bd.steam / bd.Mf, 3), U.num(bi.steam / bi.Mf, 3)]];
  var h = '<div class="stats">' + U.stat('رطوبت نهایی (' + (o.mode === 'direct' ? 'مستقیم' : 'غیرمستقیم') + ')', U.num(b.moist, 1), '%', bad.length ? 'bad' : 'good') + U.stat('آب افزوده توسط بخار', U.num(b.cond / b.M0 * 100, 1), '% جرم دستور') + U.stat('هزینه هر kg محصول', U.num(cost / b.Mf, 2), '') + U.stat('cp مخلوط', U.num(b.cp, 2), 'kJ/kg·K') + '</div>';
  h += '<h3>مقایسهٔ بخار مستقیم و غیرمستقیم</h3>' + U.table(['شاخص', 'مستقیم', 'غیرمستقیم'], rows.map(function (r) { return { cells: ['<span dir="rtl">' + r[0] + '</span>', r[1], r[2]] }; }));
  h += '<div class="note">بالانس انرژی: Q = m·cp·(T₁−T₀)·(1+اتلاف). در حالت مستقیم بخار به‌صورت میعان داخل پنیر می‌ماند: m<sub>s</sub> = Q / (h<sub>g</sub> − 4.18·T₁). نتیجه بر مبنای ترکیب واردشده است؛ pH، نمک امولسیفایر و زمان پخت اینجا مدل نشده‌اند.</div>';
  $('#outC').innerHTML = h; U.msg('msgC', bad.length ? '<b>' + bad.join('، ') + '</b>. ' + warn.join(' ') : (warn.join(' ') || 'دستور فعلی با محدودیت‌ها سازگار است.'), bad.length ? 'bad' : 'ok');
  last.C = [['metric', 'direct', 'indirect']].concat(rows.map(function (r) { return [r[0], String(r[1]).replace(/<[^>]*>|[✓✗]/g, ''), String(r[2]).replace(/<[^>]*>|[✓✗]/g, '')]; }));
});
function st(P) { return E.steam(P); }
$('#optC').addEventListener('click', function () {
  collect(); var o = ops(), sp = spec(), n = S.length, R0 = rec(), x = R0.map(function (r) { return r.x; }), tot = x.reduce(function (a, b) { return a + b; }, 0);
  if (n < 2) return U.msg('msgC', 'حداقل دو ماده لازم است.', 'bad');
  if (!(tot > 0)) x = S.map(function () { return 100 / n; }); else x = x.map(function (v) { return v / tot * 100; });
  var sol = null, status = '', it, L;
  for (it = 0; it < 5; it++) {
    var rr = S.map(function (r, i) { return { x: x[i], w: pf(r[5], 0), f: pf(r[6], 0), p: pf(r[7], 0) }; }), bal = E.cheeseBalance(rr, o), c = bal.c, T = 100 + c;
    var A = [], rel = [], b = [], cc = S.map(function (r) { return pf(r[1], 0); }), one = []; for (var i = 0; i < n; i++) one.push(1); A.push(one); rel.push('='); b.push(100);
    S.forEach(function (r, i) { var e = []; for (var q = 0; q < n; q++) e.push(q === i ? 1 : 0); var mn = pf(r[3], 0), mx = pf(r[4], 100); if (mn > 0) { A.push(e); rel.push('>='); b.push(mn); } if (mx < 100) { A.push(e); rel.push('<='); b.push(mx); } });
    var wv = S.map(function (r) { return pf(r[5], 0) / 100; }), fv = S.map(function (r) { return pf(r[6], 0) / 100; }), pv = S.map(function (r) { return pf(r[7], 0) / 100; });
    if (sp.mlo != null) { A.push(wv); rel.push('>='); b.push(sp.mlo * T / 100 - c); } if (sp.mhi != null) { A.push(wv); rel.push('<='); b.push(sp.mhi * T / 100 - c); }
    if (sp.flo != null) { A.push(fv); rel.push('>='); b.push(sp.flo * T / 100); } if (sp.fhi != null) { A.push(fv); rel.push('<='); b.push(sp.fhi * T / 100); }
    if (sp.plo != null) { A.push(pv); rel.push('>='); b.push(sp.plo * T / 100); }
    if (sp.fdm != null) { A.push(S.map(function (r, i) { return fv[i] + sp.fdm / 100 * wv[i]; })); rel.push('>='); b.push(sp.fdm); }
    L = E.lp(cc, A, rel, b); status = L.status; if (status !== 'optimal') break;
    var d = 0; L.x.forEach(function (v, i) { d = Math.max(d, Math.abs(v - x[i])); }); x = L.x; sol = L; if (d < 1e-4) break;
  }
  if (status !== 'optimal') return U.msg('msgC', status === 'infeasible' ? '<b>با این مواد و حدها دستوری وجود ندارد.</b> حدهای ماده‌ها را گشادتر کنید، رطوبت/چربی/پروتئین را بازبینی کنید، یا ماده‌ای مناسب‌تر اضافه کنید. (راهنما: در حالت مستقیم آب بخار هم محاسبه می‌شود؛ حالت غیرمستقیم را هم امتحان کنید.)' : 'حل نشد (' + status + ').', 'bad');
  var fin = E.cheeseBalance(S.map(function (r, i) { return { x: x[i], w: pf(r[5], 0), f: pf(r[6], 0), p: pf(r[7], 0) }; }), o), cost = 0, curCost = 0, curB = E.cheeseBalance(R0, o);
  S.forEach(function (r, i) { cost += pf(r[1], 0) * x[i]; if (tot > 0) curCost += pf(r[1], 0) * R0[i].x; });
  var rows = S.map(function (r, i) { return { cells: ['<span dir="rtl">' + U.esc(r[0]) + '</span>', U.num(x[i], 2), U.num(pf(r[1], 0) * x[i] / fin.Mf, 2)] }; }).filter(function (r, i) { return x[i] > 1e-6; });
  var cpk = cost / fin.Mf, cur = tot > 0 ? curCost / curB.Mf : null, cs = checkCol(fin, sp);
  var h = '<div class="stats">' + U.stat('هزینهٔ هر kg محصول', U.num(cpk, 2), '', 'good') + (cur != null ? U.stat('دستور فعلی', U.num(cur, 2), '') + U.stat('صرفه‌جویی', U.num((1 - cpk / cur) * 100, 1), '%') : '') + U.stat('رطوبت نهایی', cs[0], '%') + U.stat('چربی', cs[1], '%') + U.stat('پروتئین', cs[2], '%') + U.stat('بخار', U.num(fin.steam, 2), 'kg / 100 kg دستور') + '</div>';
  h += '<h3>دستور بهینه (برای 100 kg مخلوط پیش از پخت)</h3>' + U.table(['ماده', 'kg', 'هزینه به ازای kg محصول'], rows);
  $('#outC').innerHTML = h; U.msg('msgC', 'دستور بر اساس روش گرمایش «' + (o.mode === 'direct' ? 'مستقیم' : 'غیرمستقیم') + '» حل شد. قبل از استفاده، pH، بافت و ذوب‌شوندگی را با آزمایش پخت کوچک تأیید کنید؛ مدل فقط ترکیب و انرژی را کنترل می‌کند.', 'ok');
  last.C = [['ingredient', 'kg_per_100kg_batch']].concat(S.map(function (r, i) { return [r[0], x[i].toFixed(3)]; })).concat([['cost_per_kg_product', cpk.toFixed(3)]]);
});
$('#csvC').addEventListener('click', function () { if (last.C) U.download('cheese-cooker.csv', U.csv(last.C)); });

// ================= fat standardisation
$('#runF').addEventListener('click', function () {
  var raw = U.read('raw'), Fr = U.read('fr'), Fs = U.read('fs'), Fc = U.read('fc'), leg = U.read('legal'), now = U.read('fnow'), sd = U.read('sd'), al = +$('#alpha').value, fv = U.read('fv'), days = U.read('days');
  if (!(sd > 0) || !(raw > 0)) return U.msg('msgF', 'SD و مقدار شیر باید مثبت باشند.', 'bad');
  var z = -E.normInv(al), tgt = leg + z * sd, pNow = E.normCdf((leg - now) / sd), kgFat = function (m) { return (m - leg) * raw / 100; };
  var excessNow = kgFat(now) * days * fv, marginCost = kgFat(tgt) * days * fv, avoid = excessNow - marginCost, warn = [];
  if (now < tgt) warn.push('میانگین فعلی کمتر از هدف ایمن است؛ با SD فعلی حدود <b>' + U.num(pNow * 100, 2) + '٪</b> محصول زیر حد قانونی می‌رود.');
  var sc = [1, 0.75, 0.5, 0.25].map(function (m) { var t = leg + z * sd * m, c = kgFat(t) * days * fv; return { cells: [(m === 1 ? 'SD فعلی' : 'SD ' + Math.round(m * 100) + '٪ فعلی') + ' = ' + U.num(sd * m, 3), U.num(t, 3), money(c), money(excessNow - c)] }; });
  var sx = [], sy = []; for (var v = 0.01; v <= sd * 1.6 + 1e-9; v += sd * 0.04) { sx.push(v); sy.push(kgFat(leg + z * v) * days * fv); }
  var bal = E.standardize(raw, Fr, Fs, Fc, tgt);
  var h = '<div class="stats">' + U.stat('هدف ایمن میانگین چربی', U.num(tgt, 3), '%', 'good') + U.stat('احتمال زیر حد با میانگین فعلی', U.num(pNow * 100, 2), '%', pNow > 0.01 ? 'bad' : 'good') + U.stat('هزینهٔ سالانهٔ مازاد فعلی', money(excessNow), '') + U.stat('قابل صرفه‌جویی با میانگین هدف', avoid > 0 ? money(avoid) : '0', 'در سال', avoid > 0 ? 'good' : '') + '</div>';
  h += '<div id="chF"></div><h3>اثر کم‌کردن نوسان فرآیند</h3>' + U.table(['سناریو', 'هدف چربی %', 'هزینهٔ حاشیهٔ ایمنی در سال', 'صرفه‌جویی نسبت به وضع فعلی'], sc);
  if (bal.error) h += '<div class="note bad">' + bal.error + '</div>'; else h += '<h3>بالانس روزانه در میانگین هدف (' + U.num(tgt, 3) + '٪)</h3>' + U.table(['مقدار', 'kg در روز'], (bal.needExternal ? [['شیر خام', U.num(raw, 0)], ['خامهٔ خارجی لازم', U.num(bal.add, 0)], ['شیر استاندارد', U.num(bal.milk, 0)]] : [['شیر بی‌چربی', U.num(bal.skim, 0)], ['خامه از سپراتور', U.num(bal.cream, 0)], ['خامه برگشتی به شیر', U.num(bal.creamBack, 0)], ['شیر استاندارد', U.num(bal.milk, 0)], ['خامهٔ مازاد برای فروش', U.num(bal.surplusCream, 0)]]).map(function (r) { return ['<span dir="rtl">' + r[0] + '</span>', r[1]]; }));
  $('#outF').innerHTML = h; U.msg('msgF', warn.join('<br>'), 'warn');
  U.chart($('#chF'), { xl: 'SD فرآیند (٪ چربی)', yl: 'هزینهٔ سالانهٔ حاشیهٔ ایمنی (واحد پولی)', series: [{ name: 'هزینهٔ هدف ایمن', x: sx, y: sy, kind: 'line' }, { name: 'وضع فعلی', x: [sd], y: [excessNow], kind: 'pts', color: U.PAL[1] }], ymin: 0 });
  last.F = [['scenario_sd', 'target_fat_pct', 'margin_cost_per_year']].concat([1, 0.75, 0.5, 0.25].map(function (m) { return [(sd * m).toFixed(4), (leg + z * sd * m).toFixed(4), (kgFat(leg + z * sd * m) * days * fv).toFixed(0)]; }));
});
$('#csvF').addEventListener('click', function () { if (last.F) U.download('fat-giveaway.csv', U.csv(last.F)); });

// ================= yogurt
function exY() { var m = E.phModel(4.2), l = [], t, s = 0; for (t = 0; t <= 150; t += 15) { s++; l.push(t + ' ' + (m.f(t, [6.6, 0.022, 165]) + 0.012 * Math.sin(s * 2.3)).toFixed(2)); } return l.join('\n'); }
$('#yd').value = exY(); $('#yex').addEventListener('click', function () { $('#yd').value = exY(); });
$('#runY').addEventListener('click', function () {
  var d = E.parseTable($('#yd').value).filter(function (r) { return r.length >= 2; }), tg = U.read('yt'), pf0 = U.read('yf'), iv = U.read('yi');
  if (d.length < 5) return U.msg('msgY', 'حداقل 5 نقطه (زمان، pH) لازم است.', 'bad');
  d.sort(function (a, b) { return a[0] - b[0]; }); var t = d.map(function (r) { return r[0]; }), y = d.map(function (r) { return r[1]; });
  if (!(tg > pf0)) return U.msg('msgY', 'pH هدف باید بالاتر از pH کف باشد.', 'bad');
  if (y[y.length - 1] <= tg) return U.msg('msgY', 'آخرین pH به هدف رسیده است؛ پایان تخمیر را همان‌جا بگیرید.', 'warn');
  var f = E.fitPH(t, y, pf0, tg), warns = [], last_t = t[t.length - 1];
  if (f.tEnd == null || !isFinite(f.tEnd)) return U.msg('msgY', 'پیش‌بینی ممکن نشد؛ داده‌ها را بررسی کنید یا pH کف را کاهش دهید.', 'bad');
  if (y[0] - y[y.length - 1] < 0.4) warns.push('افت pH هنوز کم است (کمتر از 0.4)؛ پیش‌بینی خیلی نامطمئن است. چند نمونهٔ دیگر بگیرید.');
  if (f.tEnd > last_t * 3) warns.push('پایان تخمیر بسیار دورتر از آخرین نمونه است؛ این برون‌یابی دور است.');
  var mdl = f.model, p = f.fit.p, tm = [], k;
  var tmax = Math.max(f.tEnd * 1.15, last_t); for (k = 0; k <= 150; k++) tm.push(tmax * k / 150);
  var slope = (mdl.f(f.tEnd + 1, p) - mdl.f(f.tEnd - 1, p)) / 2, over = Math.abs(slope) * iv / 2, worst = Math.abs(slope) * iv;
  var cyc = U.read('tfill') + f.tEnd + U.read('tcool') + U.read('tcip'), hrs = U.read('hrs'), tanks = U.read('tk'), cap = U.read('tcap');
  function perDay(c) { return tanks * (hrs * 60 / c) * cap; }
  var base = perDay(cyc), gain = [10, 20, 30].map(function (m) { return { cells: ['−' + m + ' دقیقه از چرخه', U.num(perDay(cyc - m), 0), '+' + U.num(perDay(cyc - m) - base, 0)] }; });
  var h = '<div class="stats">' + U.stat('پایان تخمیر (pH ' + tg + ')', U.num(f.tEnd, 0), 'min پس از تلقیح', 'good') + U.stat('معادل', Math.floor(f.tEnd / 60) + ':' + ('0' + Math.round(f.tEnd % 60)).slice(-2), 'ساعت') + (f.lo != null ? U.stat('بازهٔ پیش‌بینی', U.num(f.lo, 0) + ' – ' + U.num(f.hi, 0), 'min') : '') + U.stat('R² برازش', U.num(f.fit.stats.r2, 4), '') + '</div><div id="chY"></div>';
  h += '<h3>اثر فاصلهٔ نمونه‌گیری</h3><div class="stats">' + U.stat('افت pH در لحظهٔ هدف', U.num(Math.abs(slope) * 60, 2), 'pH/h') + U.stat('اضافه‌اسیدی متوسط (هر ' + iv + ' min)', '≈ ' + U.num(over, 2), 'pH') + U.stat('بدترین حالت', '≈ ' + U.num(worst, 2), 'pH') + '</div>';
  h += '<p class="lead">اگر اپراتور هر ' + iv + ' دقیقه نمونه می‌گیرد، به‌طور متوسط ' + U.num(iv / 2, 0) + ' دقیقه دیرتر از لحظهٔ هدف خنک‌کردن را شروع می‌کند. pH کمتر از هدف با آب‌اندازی و ترشی بیش از حد همراه است.</p>';
  h += '<h3>ظرفیت مخازن</h3><div class="stats">' + U.stat('چرخهٔ هر مخزن', U.num(cyc, 0), 'min') + U.stat('تولید روزانهٔ تقریبی', U.num(base, 0), 'kg') + '</div>' + U.table(['سناریو', 'تولید روزانه (kg)', 'افزایش'], gain);
  h += '<div class="note">مدل: pH(t) = pH<sub>f</sub> + (pH₀ − pH<sub>f</sub>) / (1 + e<sup>k(t−t₅₀)</sup>). بازهٔ پیش‌بینی از برازش مجدد با حذف یک نقطه (jackknife) است و فقط نشانهٔ عدم‌قطعیت است. ظرفیت، میانگین پیوسته است (بدون گردکردن به تعداد صحیح بچ).</div>';
  $('#outY').innerHTML = h; U.msg('msgY', warns.join('<br>'), 'warn');
  U.chart($('#chY'), { xl: 'زمان از تلقیح (min)', yl: 'pH', series: [{ name: 'اندازه‌گیری', x: t, y: y, kind: 'pts', color: '#222' }, { name: 'برازش', x: tm, y: tm.map(function (v) { return mdl.f(v, p); }), kind: 'line' }], hlines: [{ y: tg, label: 'pH هدف' }], vlines: [{ x: f.tEnd, label: U.num(f.tEnd, 0) + ' min' }] });
  last.Y = [['t_end_min', 'range_lo', 'range_hi', 'pH0', 'k', 't50'], [f.tEnd, f.lo, f.hi, p[0], p[1], p[2]]];
});
$('#csvY').addEventListener('click', function () { if (last.Y) U.download('yogurt-endpoint.csv', U.csv(last.Y)); });

// ================= holding tube
$('#runH').addEventListener('click', function () {
  var o = { Q: U.read('hq'), D: U.read('hd'), L: U.read('hl'), treq: U.read('ht'), rho: U.read('hrho'), mu: U.read('hmu') / 1000 };
  for (var k in o) if (!(o[k] > 0)) return U.msg('msgH', 'همهٔ مقادیر باید مثبت باشند.', 'bad');
  var r = E.holdingTube(o), regime = { laminar: 'آرام', transition: 'گذار', turbulent: 'آشفته' }[r.regime];
  var h = '<div class="stats">' + U.stat('زمان ماند سریع‌ترین ذره', U.num(r.tmin, 1), 's', r.ok ? 'good' : 'bad') + U.stat('زمان ماند میانگین', U.num(r.tmean, 1), 's') + U.stat('سرعت میانگین', U.num(r.u, 2), 'm/s') + U.stat('Re', U.num(r.Re, 0), regime) + U.stat('حداکثر دبی مجاز', U.num(r.Qmax, 0), 'L/h') + U.stat('طول لازم در این دبی', U.num(r.Lneeded, 1), 'm') + '</div>';
  $('#outH').innerHTML = h; U.msg('msgH', (r.ok ? 'زمان ماند کافی است.' : '<b>زمان ماند ناکافی است</b>: دبی را کم کنید یا لوله را بلندتر کنید.') + ' توجه: ضریب سریع‌ترین ذره (2 برای آرام، حدود 1.2 برای آشفته) تقریبی است؛ برای تأیید قانونی از آزمون ردیابی (نمک یا رسانایی) روی خط واقعی استفاده کنید، و ضریب و حداقل زمان را از استاندارد خود بگیرید.', r.ok ? 'ok' : 'bad');
});
})();
