(function () {
'use strict'; var $ = U.$, last = {};
U.tabs($('#tb').parentNode);
function rd(i) { return U.read(i); }
function money(v) { return isFinite(v) ? Math.round(v).toLocaleString('en-US') : '—'; }
function setv(o) { for (var k in o) $('#' + k).value = o[k]; }
// saturation vapour pressure, kPa (Buck 1981): over water for T>=0, over ice for T<0
function psat(T) { return T >= 0 ? 0.61121 * Math.exp((18.678 - T / 234.5) * T / (257.14 + T)) : 0.61115 * Math.exp((23.036 - T / 333.7) * T / (279.82 + T)); }
function hAir(T, RH) { var pv = RH / 100 * psat(T), Wr = 0.622 * pv / (101.325 - pv); return 1.006 * T + Wr * (2501 + 1.86 * T); }   // kJ/kg dry air
function rhoAir(T, RH) { var pv = RH / 100 * psat(T), TK = T + 273.15; return (101.325 - pv) / (0.287 * TK) + pv / (0.4615 * TK); }
window.CS = { psat: psat, hAir: hAir, rhoAir: rhoAir };

// ================= product presets
var PRE = { fv: { w: 0.88, tfp: -1, resp: 15 }, meat: { w: 0.70, tfp: -1.7, resp: 0 }, poultry: { w: 0.70, tfp: -2.8, resp: 0 }, fish: { w: 0.75, tfp: -2.2, resp: 0 }, milk: { w: 0.87, tfp: -0.5, resp: 0 }, eggs: { w: 0.75, tfp: -0.5, resp: 0 } };
function fillProd() { var p = PRE[$('#prod').value]; if (p) setv(p); }
$('#prod').addEventListener('change', fillProd);
$('#exCool').addEventListener('click', function () { $('#prod').value = 'fv'; fillProd(); setv({ len: 12, wid: 8, hgt: 5, twall: 100, tfloor: 100, kk: 0.024, Ti: 2, RHi: 85, To: 38, RHo: 40, Tg: 20, dsun: 5, kgd: 5000, Tp: 15, Tfin: 2, stock: 40000, ach: 4, lightW: 5, lightH: 10, ppl: 2, pplW: 270, pplH: 6, eqkW: 2, eqH: 4, fanKW: 1.5, fanH: 18, dfKW: 0, dfH: 0, sf: 10, runH: 18 }); });
$('#exFrz').addEventListener('click', function () { $('#prod').value = 'meat'; fillProd(); setv({ len: 12, wid: 8, hgt: 5, twall: 150, tfloor: 150, kk: 0.024, Ti: -25, RHi: 90, To: 38, RHo: 40, Tg: 10, dsun: 5, kgd: 3000, Tp: -10, Tfin: -25, stock: 80000, ach: 2, lightW: 5, lightH: 10, ppl: 2, pplW: 270, pplH: 6, eqkW: 2, eqH: 4, fanKW: 3, fanH: 18, dfKW: 6, dfH: 1.5, sf: 10, runH: 20 }); });

// ================= cooling load
var KEYS = ['len', 'wid', 'hgt', 'twall', 'tfloor', 'kk', 'Ti', 'RHi', 'To', 'RHo', 'Tg', 'dsun', 'kgd', 'Tp', 'Tfin', 'w', 'tfp', 'resp', 'stock', 'ach', 'lightW', 'lightH', 'ppl', 'pplW', 'pplH', 'eqkW', 'eqH', 'fanKW', 'fanH', 'dfKW', 'dfH', 'sf', 'runH'];
function coolLoad(v) {
  var Aw = 2 * (v.len + v.wid) * v.hgt, Af = v.len * v.wid, V = Af * v.hgt, Rf = 0.17;
  var Uw = 1 / (Rf + v.twall / 1000 / v.kk), Uf = 1 / (Rf + v.tfloor / 1000 / v.kk), g = function (x) { return Math.max(0, x); };
  var E = {};   // kWh per day
  E.wall = g(Uw * Aw * (v.To - v.Ti)) * 24 / 1000;
  E.roof = g(Uw * Af * (v.To + v.dsun - v.Ti)) * 24 / 1000;
  E.floor = g(Uf * Af * (v.Tg - v.Ti)) * 24 / 1000;
  var cpa = 0.837 + 3.349 * v.w, cpf = 0.837 + 1.256 * v.w, Lh = 335 * v.w, q, freezes = false;
  if (v.Tp > v.tfp) { q = cpa * (v.Tp - Math.max(v.Tfin, v.tfp)); if (v.Tfin < v.tfp) { q += Lh + cpf * (v.tfp - v.Tfin); freezes = true; } } else q = cpf * (v.Tp - v.Tfin);
  E.prod = v.kgd * q / 3600;
  E.resp = v.resp * (v.stock / 1000) * 24 / 1000;
  var mAir = v.ach * V * rhoAir(v.Ti, v.RHi), dh = hAir(v.To, v.RHo) - hAir(v.Ti, v.RHi);
  E.air = mAir * g(dh) / 3600;
  E.light = v.lightW * Af * v.lightH / 1000; E.ppl = v.ppl * v.pplW * v.pplH / 1000; E.eq = v.eqkW * v.eqH; E.fan = v.fanKW * v.fanH; E.def = v.dfKW * v.dfH;
  var tot = 0, k; for (k in E) tot += E[k];
  var withSF = tot * (1 + v.sf / 100), cap = withSF / v.runH;
  return { E: E, tot: tot, withSF: withSF, cap: cap, V: V, Uw: Uw, Uf: Uf, freezes: freezes, dh: dh, mAir: mAir };
}
window.CS.coolLoad = coolLoad;
var NAMES = { wall: 'دیواره‌ها', roof: 'سقف', floor: 'کف', prod: 'سرد کردن محصول', resp: 'تنفس میوه و سبزی', air: 'نفوذ هوا (باز شدن در)', light: 'روشنایی', ppl: 'افراد', eq: 'لیفتراک و تجهیزات', fan: 'فن اواپراتور', def: 'یخ‌زدایی' };
$('#runL').addEventListener('click', function () {
  var v = {}, bad = false; KEYS.forEach(function (k) { v[k] = rd(k); if (!isFinite(v[k])) bad = true; });
  if (bad) { U.msg('msgL', 'همهٔ فیلدها را با عدد پر کنید.', 'bad'); $('#outL').innerHTML = ''; return; }
  if (v.len <= 0 || v.wid <= 0 || v.hgt <= 0 || v.kk <= 0 || v.twall <= 0 || v.tfloor <= 0 || v.runH <= 0 || v.runH > 24) { U.msg('msgL', 'ابعاد، ضخامت و ضریب هدایت عایق باید مثبت و ساعت کار بین 0 و 24 باشد.', 'bad'); $('#outL').innerHTML = ''; return; }
  if (v.w < 0 || v.w > 1 || v.RHi < 0 || v.RHi > 100 || v.RHo < 0 || v.RHo > 100) { U.msg('msgL', 'کسر آب باید بین 0 و 1 و رطوبت نسبی بین 0 و 100 باشد.', 'bad'); $('#outL').innerHTML = ''; return; }
  if (v.Tp < v.Tfin) { U.msg('msgL', 'دمای ورود محصول باید از دمای نهایی بیشتر یا مساوی باشد.', 'bad'); $('#outL').innerHTML = ''; return; }
  var r = coolLoad(v), TR = r.cap / 3.5168528421, kcal = r.cap * 3600 / 4.184, btu = r.cap * 3412.142;
  last.cap = r.cap; last.kwh = r.withSF;
  var comps = Object.keys(r.E).map(function (k) { return [NAMES[k], r.E[k]]; }).filter(function (c) { return c[1] > 1e-6; }).sort(function (a, b) { return b[1] - a[1]; });
  var rows = comps.map(function (c) { var p = 100 * c[1] / r.tot; return [c[0], U.num(c[1], 1), U.num(p, 1) + ' ٪', '<div class="bar"><i style="width:' + Math.max(2, Math.round(p)) + '%"></i></div>']; });
  rows.push({ cells: ['<b>جمع</b>', '<b>' + U.num(r.tot, 1) + '</b>', '', ''], cls: 'tot' });
  var h = '<div class="stats">' + U.stat('ظرفیت لازم تبرید', U.num(r.cap, 1), 'kW', 'ok') + U.stat('تن تبرید', U.num(TR, 2), 'TR') + U.stat('kcal/h', money(kcal), 'kcal/h') + U.stat('BTU/h', money(btu), 'BTU/h') +
    U.stat('انرژی گرمایی روزانه (با ضریب اطمینان)', U.num(r.withSF, 0), 'kWh/day') + U.stat('بار نسبت به حجم', U.num(r.cap * 1000 / r.V, 1), 'W/m³') + '</div>' +
    '<h3>سهم هر منبع (kWh در روز، بدون ضریب اطمینان)</h3>' + U.table(['منبع', 'kWh/day', 'سهم', ''], rows) +
    '<p class="lead">U دیواره و سقف: <span dir="ltr">' + U.num(r.Uw, 3) + ' W/m²·K</span> ، کف: <span dir="ltr">' + U.num(r.Uf, 3) + ' W/m²·K</span> . اختلاف آنتالپی هوای بیرون و داخل: <span dir="ltr">' + U.num(r.dh, 1) + ' kJ/kg</span> ؛ هوای واردشده در روز: <span dir="ltr">' + U.num(r.mAir, 0) + ' kg</span> .</p>';
  $('#outL').innerHTML = h;
  var top = comps[0], extra = (r.freezes ? ' بار محصول شامل گرمای نهان انجماد است.' : '') + (v.To <= v.Ti ? ' دمای بیرون از داخل بیشتر نیست؛ نتیجه برای این وضع معنی ندارد.' : '');
  U.msg('msgL', '<b>بزرگ‌ترین سهم:</b> ' + top[0] + ' (' + U.num(100 * top[1] / r.tot, 0) + ' ٪).' + extra + ' ضریب تعویض هوا، گرمای تنفس و ضریب اطمینان قاعده‌های سرانگشتی‌اند؛ پل حرارتی و تابش به دیوارها در مدل نیست. طراحی نهایی را به مشاور تبرید بسپارید.', v.To <= v.Ti ? 'bad' : 'ok');
});

// ================= power and cost
function copOf(Te, Tc, eta) { return eta * (Te + 273.15) / (Tc - Te); }
function pwr(Q0, Te, Tc, eta, etam, aux) { var cop = copOf(Te, Tc, eta); return { cop: cop, comp: Q0 / cop / etam, tot: Q0 / cop / etam + aux }; }
window.CS.pwr = pwr;
$('#fromL').addEventListener('click', function () { if (last.cap) { $('#Q0').value = +last.cap.toFixed(2); U.msg('msgE', 'ظرفیت از تب «بار برودتی» گذاشته شد: ' + U.num(last.cap, 1) + ' kW.', 'ok'); } else U.msg('msgE', 'ابتدا در تب «بار برودتی» محاسبه را اجرا کنید.', 'bad'); });
$('#runE').addEventListener('click', function () {
  var ks = ['Q0', 'Te', 'Tc', 'eta', 'etam', 'aux', 'hrs', 'days', 'price'], v = {}, bad = false; ks.forEach(function (k) { v[k] = rd(k); if (!isFinite(v[k])) bad = true; });
  if (bad) { U.msg('msgE', 'همهٔ فیلدها را با عدد پر کنید.', 'bad'); $('#outE').innerHTML = ''; return; }
  if (v.Q0 <= 0 || v.eta <= 0 || v.eta > 1 || v.etam <= 0 || v.etam > 1 || v.hrs <= 0 || v.hrs > 24 || v.days <= 0 || v.days > 31 || v.aux < 0 || v.price < 0) { U.msg('msgE', 'ظرفیت، بازده‌ها (0 تا 1)، ساعت و روز کار باید معتبر باشند.', 'bad'); $('#outE').innerHTML = ''; return; }
  if (v.Tc - v.Te < 8) { U.msg('msgE', 'دمای چگالش باید دست‌کم 8 درجه از دمای تبخیر بیشتر باشد.', 'bad'); $('#outE').innerHTML = ''; return; }
  var p = pwr(v.Q0, v.Te, v.Tc, v.eta, v.etam, v.aux), kwhDay = p.tot * v.hrs, day = kwhDay * v.price, month = day * v.days, year = month * 12;
  function mc(Te, Tc) { return pwr(v.Q0, Te, Tc, v.eta, v.etam, v.aux).tot * v.hrs * v.days * v.price; }
  var save1 = 100 * (month - mc(v.Te + 1, v.Tc)) / month, save2 = 100 * (month - mc(v.Te, v.Tc - 1)) / month;
  var xs = [], y1 = [], y2 = [], te; for (te = v.Te - 6; te <= v.Te + 10; te++) { if (v.Tc - te >= 8) { xs.push(te); y1.push(mc(te, v.Tc) / 1e6); y2.push(mc(te, v.Tc - 5) / 1e6); } }
  var h = '<div class="stats">' + U.stat('COP', U.num(p.cop, 2), '', 'ok') + U.stat('توان الکتریکی کمپرسور', U.num(p.comp, 1), 'kW') + U.stat('توان کل (با فن‌ها)', U.num(p.tot, 1), 'kW') + U.stat('انرژی روزانه', U.num(kwhDay, 0), 'kWh') +
    U.stat('هزینهٔ روزانه', money(day), 'تومان') + U.stat('هزینهٔ ماهانه', money(month), 'تومان') + U.stat('هزینهٔ سالانه', money(year), 'تومان') + U.stat('برق به ازای هر kWh سرمایش', U.num(p.tot / v.Q0, 2), 'kWh') +
    U.stat('صرفه‌جویی با +1°C دمای تبخیر', U.num(save1, 1), '٪') + U.stat('صرفه‌جویی با −1°C دمای چگالش', U.num(save2, 1), '٪') + '</div><div id="chE"></div>';
  $('#outE').innerHTML = h;
  U.chart($('#chE'), { xl: 'دمای تبخیر (°C)', yl: 'هزینهٔ ماهانه (میلیون تومان)', series: [{ name: 'Tc = ' + v.Tc + '°C', x: xs, y: y1, kind: 'line' }, { name: 'Tc = ' + (v.Tc - 5) + '°C', x: xs, y: y2, kind: 'line' }, { name: 'وضع فعلی', x: [v.Te], y: [month / 1e6], kind: 'pts', color: U.PAL[1] }], ymin: 0 });
  U.msg('msgE', 'مدل ساده است: COP = η × COP کارنو. COP واقعی را از برگ مشخصات کمپرسور و مبرد بگیرید، و قیمت برق را از قبض خودتان (عدد پیش‌فرض فقط نمونه است).', 'ok');
});

// ================= storage guide
var M = '\u2212', D = '\u2013', GD = [
['میوه و سبزی', 'سیب', M + '1 ' + D + ' 4', '90 ' + D + ' 95', '3 تا 8 ماه (بسته به رقم)', 'بعضی رقم‌ها زیر حدود 3°C آسیب می‌بینند'],
['میوه و سبزی', 'گلابی', M + '1.5 ' + D + ' ' + M + '0.5', '90 ' + D + ' 95', '2 تا 7 ماه', ''],
['میوه و سبزی', 'انگور', M + '0.5 ' + D + ' 0', '90 ' + D + ' 95', '1 تا 6 ماه', 'به کپک حساس است'],
['میوه و سبزی', 'پرتقال', '3 ' + D + ' 9', '85 ' + D + ' 90', '1 تا 3 ماه', 'بسته به رقم و منطقه'],
['میوه و سبزی', 'لیمو ترش', '10 ' + D + ' 13', '85 ' + D + ' 90', '1 تا 6 ماه', 'زیر 10°C سرمازدگی'],
['میوه و سبزی', 'موز سبز', '13 ' + D + ' 14', '90 ' + D + ' 95', '1 تا 4 هفته', 'زیر 13°C سرمازدگی'],
['میوه و سبزی', 'گوجه‌فرنگی سبز (رسیده‌نشده)', '12.5 ' + D + ' 15', '90 ' + D + ' 95', '1 تا 3 هفته', 'زیر حدود 10°C سرمازدگی'],
['میوه و سبزی', 'گوجه‌فرنگی رسیده', '8 ' + D + ' 10', '90 ' + D + ' 95', '1 تا 2 هفته', ''],
['میوه و سبزی', 'خیار', '10 ' + D + ' 13', '95', '10 تا 14 روز', 'زیر 10°C سرمازدگی'],
['میوه و سبزی', 'سیب‌زمینی', '4 ' + D + ' 10', '90 ' + D + ' 95', '4 تا 8 ماه', 'زیر 4°C قند می‌شود (برای سرخ‌کردن نامناسب)'],
['میوه و سبزی', 'پیاز', '0', '65 ' + D + ' 70', '1 تا 8 ماه', 'رطوبت بالا باعث جوانه و فساد می‌شود'],
['میوه و سبزی', 'سیر', '0', '60 ' + D + ' 70', '6 تا 7 ماه', ''],
['میوه و سبزی', 'هویج', '0', '98 ' + D + ' 100', '4 تا 6 ماه', ''],
['میوه و سبزی', 'کاهو', '0', '98 ' + D + ' 100', '2 تا 3 هفته', 'گرمای تنفس بالا؛ سریع سرد شود'],
['لبنیات و تخم‌مرغ', 'شیر پاستوریزه', '0 ' + D + ' 4', '', '5 تا 14 روز (بسته به فرآیند و بسته)', ''],
['لبنیات و تخم‌مرغ', 'ماست', '2 ' + D + ' 6', '', '2 تا 4 هفته', ''],
['لبنیات و تخم‌مرغ', 'پنیر سخت (مثل چدار)', '2 ' + D + ' 7', '80 ' + D + ' 85', 'چند ماه، بسته به رسیدگی', ''],
['لبنیات و تخم‌مرغ', 'کره', '0 ' + D + ' 4', '', '1 تا 2 ماه؛ ماه‌ها در ' + M + '18', ''],
['لبنیات و تخم‌مرغ', 'تخم‌مرغ', M + '1 ' + D + ' 1', '80 ' + D + ' 85', 'تا حدود 5 ماه', ''],
['گوشت و آبزیان', 'گوشت قرمز تازه', M + '1 ' + D + ' 1', '88 ' + D + ' 92', '1 تا 3 هفته', ''],
['گوشت و آبزیان', 'مرغ تازه', M + '2 ' + D + ' 0', '85 ' + D + ' 90', 'حدود 1 هفته', ''],
['گوشت و آبزیان', 'ماهی تازه', M + '1 ' + D + ' 1', '90 ' + D + ' 95', '5 تا 20 روز (بسته به گونه)', 'روی یخ؛ ماهی چرب زودتر فاسد می‌شود'],
['منجمد', 'گوشت و مرغ منجمد', M + '18 یا پایین‌تر', '90 ' + D + ' 95', '6 تا 12 ماه یا بیشتر', 'نوسان دما کیفیت را کم می‌کند'],
['منجمد', 'ماهی منجمد', M + '23 ' + D + ' ' + M + '18', '90 ' + D + ' 95', 'چند ماه تا یک سال', 'ماهی چرب مدت کوتاه‌تری دارد'],
['منجمد', 'میوه و سبزی منجمد', M + '18 یا پایین‌تر', '', '8 تا 12 ماه', ''],
['منجمد', 'بستنی', M + '25 ' + D + ' ' + M + '30', '', 'چند ماه', 'نوسان دما باعث کریستال یخ درشت می‌شود']];
var cats = []; GD.forEach(function (r) { if (cats.indexOf(r[0]) < 0) cats.push(r[0]); });
cats.forEach(function (c) { $('#gcat').appendChild(U.el('option', { value: c }, c)); });
function nrm(s) { return String(s).toLowerCase().replace(/[\u2212\u2013]/g, '-').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c]/g, '').replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }); }
function drawG() {
  var c = $('#gcat').value, q = nrm($('#gs').value).trim().split(/\s+/).filter(Boolean);
  var rows = GD.filter(function (r) { var hay = nrm(r.join(' ')); return (!c || r[0] === c) && q.every(function (t) { return hay.indexOf(t) > -1; }); }).map(function (r) { return [r[1], '<span dir="ltr">' + r[2] + '</span>', r[3] ? '<span dir="ltr">' + r[3] + '</span>' : '—', r[4], r[5] || '—']; });
  $('#gtab').innerHTML = rows.length ? U.table(['محصول', 'دما (°C)', 'رطوبت نسبی (٪)', 'ماندگاری تقریبی', 'نکته'], rows) : '<div class="note">موردی پیدا نشد.</div>';
}
$('#gcat').addEventListener('change', drawG); $('#gs').addEventListener('input', drawG); drawG();
})();
