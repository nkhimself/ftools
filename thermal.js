(function () {
'use strict'; var $ = U.$, E = FE, last = {};
U.tabs($('#tb').parentNode);
$('#preset').addEventListener('change', function () { var v = this.value; if (v === 'custom') return; var p = v.split(','); $('#tref').value = p[0]; $('#z').value = p[1]; });
['tref', 'z'].forEach(function (id) { $('#' + id).addEventListener('input', function () { $('#preset').value = 'custom'; }); });
U.bindFile('logf', 'log');
function params() { return { Tref: U.read('tref'), z: U.read('z'), F: U.read('ftarget') }; }

function example() {
  var p = { Ti: 40, Tr: 121.1, Tw: 25, fh: 22, jh: 1.6, fc: 22, jc: 1.4 }, lines = [], th = 45, t, Tg = E.ballHeat(th, p);
  for (t = 0; t <= 75; t += 1.5) { var T = t <= th ? (t === 0 ? p.Ti : E.ballHeat(t, p)) : E.ballCool(t - th, p, Tg); T += 0.35 * Math.sin(t * 2.1); lines.push(t.toFixed(1) + ' ' + T.toFixed(1)); }
  return lines.join('\n');
}
$('#log').value = example(); $('#logex').addEventListener('click', function () { $('#log').value = example(); });

// ---- step 1
$('#runA').addEventListener('click', function () {
  var P = params(), d = E.parseTable($('#log').value).filter(function (r) { return r.length >= 2; });
  if (d.length < 5) return U.msg('msgA', 'حداقل ۵ ردیف «زمان دما» لازم است.', 'bad');
  d.sort(function (a, b) { return a[0] - b[0]; });
  var t = d.map(function (r) { return r[0]; }), T = d.map(function (r) { return r[1]; });
  if (!(P.z > 0)) return U.msg('msgA', 'z باید مثبت باشد.', 'bad');
  var r = E.fValue(t, T, P.Tref, P.z, 20), hend = U.read('hend'), Tr = U.read('tr'), ts = U.read('tstart'), msgs = [];
  var tHit = E.timeAtF(t, r.cum, P.F), iH = 0; for (var i = 0; i < t.length; i++) if (t[i] <= hend + 1e-9) iH = i;
  var Fh = r.cum[iH], Fc = r.F - Fh, Tmax = Math.max.apply(null, T);
  var hx = [], hy = []; for (i = 0; i <= iH; i++) { hx.push(t[i]); hy.push(T[i]); }
  var ft = E.fitHeating(hx, hy, Tr, ts);
  if (!ft) msgs.push('برازش f<sub>h</sub> ممکن نشد (داده یا زمان شروع را بررسی کنید).');
  else if (ft.r2 < 0.98) msgs.push('R² برازش گرمایش پایین است (' + U.num(ft.r2, 4) + ')؛ زمان شروع برازش را تنظیم کنید یا مطمئن شوید دمای retort درست است.');
  if (Tmax < P.Tref - 3 * P.z) msgs.push('دما همیشه خیلی پایین‌تر از T<sub>ref</sub> است؛ F بسیار کوچک خواهد بود.');
  if (r.F < P.F) msgs.push('F به‌دست‌آمده کمتر از F هدف است: <b>فرآیند کافی نیست</b>.');
  var good = r.F >= P.F;
  var h = '<div class="stats">' + U.stat('F کل لاگ', U.num(r.F, 2), 'min', good ? 'good' : 'bad') + U.stat('F تا پایان گرمادهی', U.num(Fh, 2), 'min') + U.stat('F مرحلهٔ خنک‌سازی', U.num(Fc, 2), 'min') +
    U.stat('زمان رسیدن به F هدف', tHit == null ? 'نرسید' : U.num(tHit, 1), tHit == null ? '' : 'min') + U.stat('بیشینهٔ دما', U.num(Tmax, 1), '°C') +
    (ft ? U.stat('f<sub>h</sub>', U.num(ft.fh, 2), 'min') + U.stat('j<sub>h</sub>', U.num(ft.jh, 3), '') + U.stat('R² برازش', U.num(ft.r2, 4), '') : '') + '</div>';
  h += '<div class="two"><div id="chA1"></div><div id="chA2"></div></div>';
  $('#outA').innerHTML = h; U.msg('msgA', msgs.join('<br>'), good ? 'warn' : 'bad'); if (!msgs.length) U.msg('msgA', 'F هدف تأمین شده است.', 'ok');
  U.chart($('#chA1'), { xl: 'زمان (min)', yl: 'دما (°C)', series: [{ name: 'دمای نقطهٔ سرد', x: t, y: T, kind: 'line' }], hlines: [{ y: Tr, label: 'retort' }], vlines: [{ x: hend, label: 'پایان گرمادهی' }] });
  U.chart($('#chA2'), { xl: 'زمان (min)', yl: 'F تجمعی (min)', series: [{ name: 'F تجمعی', x: t, y: r.cum, kind: 'line', color: U.PAL[2] }], hlines: [{ y: P.F, label: 'F هدف' }] });
  last.A = [['t_min', 'T_C', 'F_cum_min']].concat(t.map(function (v, i) { return [v, T[i], r.cum[i].toFixed(4)]; }));
  last.fit = ft; if (ft) { $('#fh').value = +ft.fh.toFixed(2); $('#jh').value = +ft.jh.toFixed(3); $('#ti').value = +ft.Ti.toFixed(1); $('#tr2').value = Tr; }
});
$('#csvA').addEventListener('click', function () { if (last.A) U.download('thermal-log-analysis.csv', U.csv(last.A)); });

// ---- step 2
$('#fromA').addEventListener('click', function () {
  if (!last.fit) return U.msg('msgB', 'ابتدا مرحلهٔ ۱ را اجرا کنید.', 'warn');
  $('#fh').value = +last.fit.fh.toFixed(2); $('#jh').value = +last.fit.jh.toFixed(3); $('#ti').value = +last.fit.Ti.toFixed(1); $('#tr2').value = U.read('tr'); U.msg('msgB', 'مقادیر از لاگ منتقل شد. f<sub>c</sub> و j<sub>c</sub> را از لاگ خنک‌سازی خودتان وارد کنید.', 'ok');
});
$('#runB').addEventListener('click', function () {
  var P = params(), p = { fh: U.read('fh'), jh: U.read('jh'), Ti: U.read('ti'), Tr: U.read('tr2'), fc: U.read('fc'), jc: U.read('jc'), Tw: U.read('tw') };
  for (var k in p) if (!isFinite(p[k])) return U.msg('msgB', 'همهٔ فیلدها باید عدد باشند.', 'bad');
  if (p.fh <= 0 || p.fc <= 0 || p.jh <= 0 || p.jc <= 0) return U.msg('msgB', 'f و j باید مثبت باشند.', 'bad');
  if (p.Tr <= p.Ti) return U.msg('msgB', 'T retort باید بالاتر از دمای اولیه باشد.', 'bad');
  var th = E.solveHeatTime(P.F, p, P.Tref, P.z);
  if (th == null) return U.msg('msgB', 'با این پارامترها F هدف قابل‌دستیابی نیست (دمای retort پایین است).', 'bad');
  var b = E.ballF(th, p, P.Tref, P.z), pr = b.profile, ths = [], Fs = [];
  for (var x = Math.max(0, th * 0.4); x <= th * 1.6; x += th * 0.02) { ths.push(x); Fs.push(E.ballF(x, p, P.Tref, P.z).F); }
  var margin = [0.9, 1, 1.1, 1.2].map(function (m) { var F = E.ballF(th * m, p, P.Tref, P.z).F; return { cells: ['<span dir="rtl">' + (m === 1 ? 'زمان محاسبه‌شده' : (m < 1 ? '' : '+') + Math.round((m - 1) * 100) + '٪ زمان').replace(/[0-9]/g, function (d) { return d; }) + '</span>', U.num(th * m, 1), U.num(F, 2), (F / P.F).toFixed(2) + '×'] }; });
  var h = '<div class="stats">' + U.stat('زمان گرمادهی لازم', U.num(th, 1), 'min', 'good') + U.stat('F مرحلهٔ گرمایش', U.num(b.Fh, 2), 'min') + U.stat('F مرحلهٔ خنک‌سازی', U.num(b.Fc, 2), 'min') + U.stat('دمای نقطهٔ سرد در پایان گرمایش', U.num(b.Tg, 1), '°C') + '</div>';
  h += '<div class="two"><div id="chB1"></div><div id="chB2"></div></div><h3>حاشیهٔ ایمنی زمانی</h3>' + U.table(['سناریو', 'زمان گرمایش (min)', 'F کل (min)', 'نسبت به هدف'], margin);
  $('#outB').innerHTML = h; U.msg('msgB', b.Fc > 0.3 * b.F ? 'سهم F در خنک‌سازی بزرگ است؛ این به j<sub>c</sub>، f<sub>c</sub> و دمای آب بستگی دارد و باید با لاگ واقعی خنک‌سازی تأیید شود.' : '', 'warn');
  U.chart($('#chB1'), { xl: 'زمان (min)', yl: 'دمای نقطهٔ سرد (°C)', series: [{ name: 'پروفایل پیش‌بینی‌شده', x: pr.t, y: pr.T, kind: 'line' }], hlines: [{ y: p.Tr, label: 'retort' }], vlines: [{ x: th, label: 'پایان گرمادهی' }] });
  U.chart($('#chB2'), { xl: 'زمان گرمایش (min)', yl: 'F کل (min)', series: [{ name: 'F کل بر حسب زمان گرمایش', x: ths, y: Fs, kind: 'line', color: U.PAL[2] }], hlines: [{ y: P.F, label: 'F هدف' }], vlines: [{ x: th, label: U.num(th, 1) + ' min' }] });
  last.B = [['scenario', 'heat_time_min', 'F_total_min']].concat([0.9, 1, 1.1, 1.2].map(function (m) { return [m, (th * m).toFixed(2), E.ballF(th * m, p, P.Tref, P.z).F.toFixed(3)]; }));
});
$('#csvB').addEventListener('click', function () { if (last.B) U.download('thermal-process-design.csv', U.csv(last.B)); });

// ---- step 3
function mex() { var l = [], i; for (i = 0; i < 168; i += 4) { var T = 20 + 5 * Math.sin(i / 24 * 2 * Math.PI) + (i > 90 && i < 110 ? 12 : 0); l.push(i + ' ' + T.toFixed(1)); } return l.join('\n'); }
$('#mlog').value = mex(); $('#mex').addEventListener('click', function () { $('#mlog').value = mex(); });
$('#runC').addEventListener('click', function () {
  var d = E.parseTable($('#mlog').value); if (d.length < 3) return U.msg('msgC', 'حداقل ۳ ردیف لازم است.', 'bad');
  var two = d.every(function (r) { return r.length >= 2; }), t = two ? d.map(function (r) { return r[0]; }) : null, T = d.map(function (r) { return r[r.length - 1]; }), dH = U.read('dh'), lim = U.read('tlim');
  var mkt = E.mkt(T, dH, t), mean = 0, i; T.forEach(function (v) { mean += v; }); mean /= T.length;
  var over = 0, tot = 0; if (t) { for (i = 1; i < t.length; i++) { tot += t[i] - t[i - 1]; if ((T[i] + T[i - 1]) / 2 > lim) over += t[i] - t[i - 1]; } }
  var h = '<div class="stats">' + U.stat('MKT', U.num(mkt, 2), '°C', mkt > lim ? 'bad' : 'good') + U.stat('میانگین ساده', U.num(mean, 2), '°C') + U.stat('بیشینه', U.num(Math.max.apply(null, T), 1), '°C') + U.stat('کمینه', U.num(Math.min.apply(null, T), 1), '°C') + (t ? U.stat('زمان بالای حد', U.num(over, 1) + ' / ' + U.num(tot, 1), 'h') : '') + '</div><div id="chC"></div>';
  $('#outC').innerHTML = h; U.msg('msgC', mkt > lim ? 'MKT از حد مجاز بیشتر است.' : 'MKT در حد مجاز است.', mkt > lim ? 'bad' : 'ok');
  U.chart($('#chC'), { xl: t ? 'زمان' : 'شمارهٔ نقطه', yl: 'دما (°C)', series: [{ name: 'دما', x: t || T.map(function (_, i) { return i + 1; }), y: T, kind: 'line' }], hlines: [{ y: mkt, label: 'MKT' }, { y: lim, label: 'حد' }] });
});
})();
