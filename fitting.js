(function () {
'use strict'; var $ = U.$, E = FE, last = {};
U.tabs($('#tb').parentNode);
['dd', 'sd', 'ld'].forEach(function (a) { U.bindFile(a + 'f', a); });
function rnd(seed) { var a = seed; return function () { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296 - 0.5; }; }

// ---- drying
function exD() { var r = rnd(7), l = [], t = [0, 10, 20, 30, 45, 60, 90, 120, 150, 180, 240]; t.forEach(function (x) { l.push(x + ' ' + Math.max(0.005, Math.exp(-0.0205 * Math.pow(x, 1.12)) + 0.012 * r()).toFixed(4)); }); return l.join('\n'); }
$('#dd').value = exD(); $('#ddex').addEventListener('click', function () { $('#dd').value = exD(); });
function fitAll(models, x, y) {
  return models.map(function (m) { var r = E.fitModel(m, x, y); return { m: m, p: r.p, yhat: r.yhat, s: r.stats }; });
}
function rank(res) { // best: lowest chi2 when df>0 else lowest rmse
  var ok = res.filter(function (r) { return isFinite(r.s.rmse); }), useChi = ok.every(function (r) { return r.s.df > 0; });
  ok.sort(function (a, b) { return useChi ? a.s.chi2 - b.s.chi2 : a.s.rmse - b.s.rmse; }); return ok;
}
function paramStr(r) { return r.m.params.map(function (q, i) { return q.n + '=' + U.sig(r.p[i], 4); }).join('  '); }
function fitTable(res, id) {
  return U.table(['مدل', 'R²', 'R² تعدیل‌شده', 'RMSE', 'χ²', 'MRD %', 'پارامترها'], res.map(function (r, i) { return { cls: i === 0 ? 'best' : '', cells: ['<span dir="rtl">' + r.m.name + (i === 0 ? ' ★' : '') + '</span>', U.num(r.s.r2, 5), U.num(r.s.adjR2, 5), U.sig(r.s.rmse, 3), U.sig(r.s.chi2, 3), U.num(r.s.mrd, 2), paramStr(r)] }; }));
}
$('#runD').addEventListener('click', function () {
  var d = E.parseTable($('#dd').value).filter(function (r) { return r.length >= 2; });
  if (d.length < 5) return U.msg('msgD', 'حداقل ۵ نقطه لازم است.', 'bad');
  d.sort(function (a, b) { return a[0] - b[0]; });
  var t = d.map(function (r) { return r[0]; }), y = d.map(function (r) { return r[1]; });
  if (t[0] < 0) return U.msg('msgD', 'زمان نباید منفی باشد.', 'bad');
  if ($('#dtype').value === 'x') { var x0 = U.read('dx0'), xe = U.read('dxe'); if (!(x0 > xe)) return U.msg('msgD', 'X اولیه باید بزرگ‌تر از X تعادلی باشد.', 'bad'); y = y.map(function (v) { return (v - xe) / (x0 - xe); }); }
  var warns = [];
  if (y.some(function (v) { return v <= 0; })) warns.push('مقادیر MR ≤ 0 وجود دارد (ممکن است ناشی از X تعادلی نادرست باشد)؛ مدل‌های لگاریتمی ممکن است ضعیف برازش شوند.');
  if (d.length < 8) warns.push('تعداد نقاط کم است؛ مدل‌های چندپارامتری (دو‌جمله‌ای، Midilli) برازش بیش از حد می‌دهند. به R² تعدیل‌شده و χ² نگاه کنید، نه R² ساده.');
  var res = rank(fitAll(E.dryingModels, t, y)), best = res[0];
  // effective diffusivity: ln MR vs t, first-term slab solution, early linear part (MR>0.05)
  var tl = [], yl = []; t.forEach(function (v, i) { if (y[i] > 0.05 && y[i] <= 1.05) { tl.push(v); yl.push(Math.log(y[i])); } });
  var dd = '', L = U.read('dL') / 1000;
  if (tl.length >= 4 && L > 0) { var lr = E.linreg(tl, yl), tc = E.tcrit(lr.df); var Deff = -lr.slope / 60 * 4 * L * L / (Math.PI * Math.PI); /* t in min → s */ var De = Deff, lo = De * (1 - tc * lr.seSlope / Math.abs(lr.slope)), hi = De * (1 + tc * lr.seSlope / Math.abs(lr.slope)); dd = U.stat('D<sub>eff</sub> (تخت، جملهٔ اول)', U.sig(De, 3), 'm²/s') + U.stat('بازهٔ ۹۵٪', U.sig(lo, 2) + ' – ' + U.sig(hi, 2), 'm²/s') + U.stat('R² ln MR', U.num(lr.r2, 4), ''); }
  var tx = [], k, tmax = t[t.length - 1]; for (k = 0; k <= 100; k++) tx.push(tmax * k / 100);
  var series = [{ name: 'داده', x: t, y: y, kind: 'pts', color: '#222' }].concat(res.slice(0, 4).map(function (r, i) { return { name: r.m.name, x: tx, y: tx.map(function (v) { return r.m.f(v, r.p); }), kind: 'line', color: U.PAL[i], w: i ? 1.5 : 2.6 }; }));
  var h = '<div class="stats">' + U.stat('بهترین مدل', best.m.name, '', 'good') + U.stat('R²', U.num(best.s.r2, 5), '') + U.stat('RMSE', U.sig(best.s.rmse, 3), '') + dd + '</div><div class="eq">' + best.m.eq + '</div><div id="chD"></div>' + fitTable(res);
  h += '<div class="note">★ = کمترین χ² (خطای باقی‌مانده با لحاظ تعداد پارامتر). چند مدل نزدیک به هم برازش می‌شوند؛ اگر تفاوتشان کوچک است مدل ساده‌تر را انتخاب کنید. D<sub>eff</sub> فرض تخت نامحدود و انقباض‌نداشتن دارد.</div>';
  $('#outD').innerHTML = h; U.msg('msgD', warns.join('<br>'), 'warn'); U.chart($('#chD'), { xl: 'زمان', yl: 'MR', series: series, ymin: 0 });
  last.D = [['model', 'R2', 'adjR2', 'RMSE', 'chi2', 'MRD_pct', 'params']].concat(res.map(function (r) { return [r.m.name, r.s.r2, r.s.adjR2, r.s.rmse, r.s.chi2, r.s.mrd, paramStr(r)]; }));
});
$('#csvD').addEventListener('click', function () { if (last.D) U.download('drying-fit.csv', U.csv(last.D)); });

// ---- sorption
function exS() { var r = rnd(3), aw = [.11, .23, .33, .43, .52, .64, .75, .85, .90], Xm = .062, C = 11, K = .86, l = []; aw.forEach(function (a) { var X = Xm * C * K * a / ((1 - K * a) * (1 - K * a + C * K * a)); l.push(a + ' ' + (X * (1 + 0.025 * r())).toFixed(4)); }); return l.join('\n'); }
$('#sd').value = exS(); $('#sdex').addEventListener('click', function () { $('#sd').value = exS(); });
function inverse(f, target, lo, hi) { var a = lo, b = hi, fa = f(a) - target, fb = f(b) - target; if (!isFinite(fa) || !isFinite(fb) || fa * fb > 0) return null; for (var i = 0; i < 80; i++) { var m = (a + b) / 2, fm = f(m) - target; if (fa * fm <= 0) { b = m; } else { a = m; fa = fm; } } return (a + b) / 2; }
$('#runS').addEventListener('click', function () {
  var d = E.parseTable($('#sd').value).filter(function (r) { return r.length >= 2; });
  if (d.length < 5) return U.msg('msgS', 'حداقل ۵ نقطه لازم است.', 'bad');
  d.sort(function (a, b) { return a[0] - b[0]; });
  var aw = d.map(function (r) { return r[0]; }), X = d.map(function (r) { return r[1]; });
  if (aw.some(function (a) { return !(a > 0 && a < 1); })) return U.msg('msgS', 'a<sub>w</sub> باید بین ۰ و ۱ (بدون خود ۰ و ۱) باشد.', 'bad');
  if (X.some(function (v) { return !(v > 0); })) return U.msg('msgS', 'رطوبت باید مثبت باشد.', 'bad');
  var warns = [], res = rank(fitAll(E.sorptionModels, aw, X)), best = res[0];
  var bet = E.betLinear(aw, X, U.read('blo'), U.read('bhi'));
  if (!bet) warns.push('BET: در بازهٔ انتخابی حداقل ۳ نقطه یا برازش معتبر وجود ندارد.');
  else if (bet.C < 2 || bet.C > 200) warns.push('C در BET خارج از بازهٔ معمول است؛ بازهٔ a<sub>w</sub> را بررسی کنید.');
  var gab = res.filter(function (r) { return r.m.id === 'gab'; })[0], xt = U.read('sxt'), awT = inverse(function (a) { return best.m.f(a, best.p); }, xt, 0.01, 0.97);
  var ax = [], k; for (k = 0; k <= 100; k++) ax.push(0.01 + 0.96 * k / 100);
  var series = [{ name: 'داده', x: aw, y: X, kind: 'pts', color: '#222' }].concat(res.slice(0, 3).map(function (r, i) { return { name: r.m.name, x: ax, y: ax.map(function (v) { return r.m.f(v, r.p); }), kind: 'line', color: U.PAL[i], w: i ? 1.5 : 2.6 }; }));
  if (bet) series.push({ name: 'BET', x: ax.filter(function (v) { return v < 0.5; }), y: ax.filter(function (v) { return v < 0.5; }).map(bet.f), kind: 'line', color: U.PAL[4], dash: '4 3', w: 1.5 });
  var h = '<div class="stats">' + U.stat('بهترین مدل', best.m.name, '', 'good') + (gab ? U.stat('X<sub>m</sub> (GAB)', U.sig(gab.p[0], 3), '') + U.stat('C (GAB)', U.sig(gab.p[1], 3), '') + U.stat('K (GAB)', U.num(gab.p[2], 3), '') : '') + (bet ? U.stat('X<sub>m</sub> (BET)', U.sig(bet.Xm, 3), '') + U.stat('C (BET)', U.sig(bet.C, 3), '') : '') + U.stat('a<sub>w</sub> برای رطوبت هدف', awT == null ? 'در بازه نیست' : U.num(awT, 3), '', awT != null && awT < 0.6 ? 'good' : '') + '</div><div class="eq">' + best.m.eq + '</div><div id="chS"></div>' + fitTable(res);
  h += '<div class="note">X<sub>m</sub> رطوبت تک‌لایه است؛ ایمن‌ترین رطوبت برای نگهداری تقریباً همان‌جاست. رطوبت هدف را در مدل برتر وارونه کرده‌ایم تا ببینید به چه a<sub>w</sub> می‌رسد؛ برای ایمنی میکروبی معمولاً a<sub>w</sub> زیر حدود ۰٫۶ مطلوب است (آستانه را مرجع محصول خود تأیید کنید).</div>';
  $('#outS').innerHTML = h; U.msg('msgS', warns.join('<br>'), 'warn'); U.chart($('#chS'), { xl: 'a_w', yl: 'رطوبت تعادلی', series: series, xmin: 0, ymin: 0 });
  last.S = [['model', 'R2', 'adjR2', 'RMSE', 'chi2', 'MRD_pct', 'params']].concat(res.map(function (r) { return [r.m.name, r.s.r2, r.s.adjR2, r.s.rmse, r.s.chi2, r.s.mrd, paramStr(r)]; }));
});
$('#csvS').addEventListener('click', function () { if (last.S) U.download('sorption-fit.csv', U.csv(last.S)); });

// ---- shelf life
function exL() { var r = rnd(11), l = [], Ea = 70, R = 8.314462e-3; [35, 45, 55].forEach(function (T) { var k = 0.035 * Math.exp(Ea / R * (1 / 298.15 - 1 / (T + 273.15))); [0, 5, 10, 15, 20, 30].forEach(function (t) { if (T === 55 && t > 20) return; l.push(T + ' ' + t + ' ' + (1 + k * t + 0.15 * r()).toFixed(2)); }); }); return l.join('\n'); }
$('#ld').value = exL(); $('#ldex').addEventListener('click', function () { $('#ld').value = exL(); });
$('#runL').addEventListener('click', function () {
  var d = E.parseTable($('#ld').value).filter(function (r) { return r.length >= 3; }), g = {}, order = +$('#lord').value, lim = U.read('llim'), Ts = U.read('lts');
  d.forEach(function (r) { (g[r[0]] = g[r[0]] || { T: r[0], t: [], q: [] }); g[r[0]].t.push(r[1]); g[r[0]].q.push(r[2]); });
  var series = Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return a.T - b.T; });
  if (series.length < 2) return U.msg('msgL', 'حداقل دو دمای مختلف لازم است (۳ یا بیشتر توصیه می‌شود).', 'bad');
  if (series.some(function (s) { return s.t.length < 3; })) return U.msg('msgL', 'هر دما حداقل ۳ نقطهٔ زمانی لازم دارد.', 'bad');
  if (order === 1 && d.some(function (r) { return !(r[2] > 0); })) return U.msg('msgL', 'برای مرتبهٔ یک همهٔ مقادیر باید مثبت باشند.', 'bad');
  var rc = E.rateConstants(series, order), sgn = rc[0].kSigned >= 0 ? 1 : -1, warns = [];
  if (rc.some(function (r) { return r.kSigned * sgn <= 0; })) return U.msg('msgL', 'روند شاخص در همهٔ دماها یکسان نیست (بعضی بالا، بعضی پایین). داده را بررسی کنید.', 'bad');
  var pts = rc.map(function (r) { return { T: r.T, k: Math.abs(r.kSigned) }; });
  var ar = E.arrhenius(pts, Ts), q0 = rc.reduce(function (s, r) { return s + r.q0; }, 0) / rc.length;
  if (rc.some(function (r) { return r.r2 < 0.9; })) warns.push('R² خطی در برخی دماها پایین است؛ مرتبهٔ واکنش دیگری را امتحان کنید.');
  if (series.length === 2) warns.push('فقط دو دما: بازهٔ اطمینان قابل‌محاسبه نیست و برآورد بسیار شکننده است.');
  else if (series.length === 3) warns.push('با ۳ دما فقط ۱ درجهٔ آزادی دارید؛ بازهٔ اطمینان ۹۵٪ بسیار پهن است (این صادقانه‌ترین نمایش عدم‌قطعیت است). برای نتیجهٔ قابل‌اتکا ۴ دما یا بیشتر استفاده کنید.');
  if (Ts < Math.min.apply(null, series.map(function (s) { return s.T; })) - 25) warns.push('برون‌یابی از دماهای آزمون به دمای انبار بسیار دور است.');
  function life(k) { if (order === 0) return (lim - q0) / (sgn * k); return Math.log(lim / q0) / (sgn * k); }
  var okDir = life(ar.kStore) > 0; if (!okDir) return U.msg('msgL', 'حد رد کیفیت در جهت روند شاخص نیست (مثلاً شاخص بالا می‌رود ولی حد کمتر از مقدار اولیه است).', 'bad');
  var Lm = life(ar.kStore), Llo = isFinite(ar.kHi) ? life(ar.kHi) : null, Lhi = isFinite(ar.kLo) ? life(ar.kLo) : null;
  var h = '<div class="stats">' + U.stat('ماندگاری در ' + Ts + '°C', U.num(Lm, 1), 'واحد زمان', 'good') + U.stat('بازهٔ ۹۵٪ برای k', Llo == null ? '—' : U.num(Llo, 1) + ' – ' + U.num(Lhi, 1), '') + U.stat('E<sub>a</sub>', U.num(ar.Ea, 1), 'kJ/mol') + U.stat('Q₁₀ نزدیک ' + Ts + '°C', U.num(ar.Q10, 2), '') + U.stat('R² آرنیوس', U.num(ar.r2, 4), '') + '</div><div class="two"><div id="chL1"></div><div id="chL2"></div></div>';
  h += '<h3>ثابت سرعت در هر دما</h3>' + U.table(['دما °C', 'k', 'R²', 'تعداد نقطه'], rc.map(function (r) { return [r.T, U.sig(Math.abs(r.kSigned), 4), U.num(r.r2, 4), r.n]; }));
  h += '<div class="note">بازهٔ ماندگاری فقط عدم‌قطعیت شیب آرنیوس را نشان می‌دهد. نوسان دمای واقعی انبار/حمل، تغییر مکانیسم در دماهای بالا و اثر بسته‌بندی را در نظر نمی‌گیرد؛ از MKT (صفحهٔ فرآیند حرارتی) برای دمای مؤثر انبار استفاده کنید.</div>';
  $('#outL').innerHTML = h; U.msg('msgL', warns.join('<br>'), 'warn');
  var s1 = [], mx = 0; series.forEach(function (s, i) { var xs = s.t, r = rc[i], tm = Math.max.apply(null, xs); mx = Math.max(mx, tm); s1.push({ name: s.T + '°C', x: xs, y: s.q, kind: 'pts', color: U.PAL[i % 8] }); s1.push({ x: [0, tm], y: [0, tm].map(function (t) { return order === 1 ? r.q0 * Math.exp(r.kSigned * t) : r.q0 + r.kSigned * t; }), kind: 'line', color: U.PAL[i % 8], w: 1.4 }); });
  U.chart($('#chL1'), { xl: 'زمان', yl: 'شاخص کیفی', series: s1, hlines: [{ y: lim, label: 'حد رد' }], xmin: 0 });
  var xi = pts.map(function (p) { return 1000 / (p.T + 273.15); }), yi = pts.map(function (p) { return Math.log(p.k); }), xa = [Math.min.apply(null, xi.concat(1000 / (Ts + 273.15))), Math.max.apply(null, xi.concat(1000 / (Ts + 273.15)))];
  U.chart($('#chL2'), { xl: '1000/T (K⁻¹)', yl: 'ln k', series: [{ name: 'k در هر دما', x: xi, y: yi, kind: 'pts' }, { name: 'برازش', x: xa, y: xa.map(function (v) { return ar.reg.intercept + ar.reg.slope * v / 1000; }), kind: 'line', color: U.PAL[1] }, { name: 'پیش‌بینی انبار', x: [1000 / (Ts + 273.15)], y: [Math.log(ar.kStore)], kind: 'pts', color: U.PAL[2] }] });
  last.L = [['T_C', 'k', 'R2', 'n']].concat(rc.map(function (r) { return [r.T, Math.abs(r.kSigned), r.r2, r.n]; })).concat([[], ['Ea_kJ_mol', ar.Ea], ['Q10', ar.Q10], ['shelf_life', Lm], ['shelf_life_lo', Llo], ['shelf_life_hi', Lhi]]);
});
$('#csvL').addEventListener('click', function () { if (last.L) U.download('shelf-life.csv', U.csv(last.L)); });
})();
