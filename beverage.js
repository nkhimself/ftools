(function () {
'use strict'; var $ = U.$, $$ = U.$$, E = FE, last = {};
U.tabs($('#tb').parentNode); U.bindFile('uF', 'uD');
function pf(v, d) { var x = E.parseTable(String(v))[0]; return x && x.length ? x[0] : d; }
function inp(v, cls) { return '<input type="text" inputmode="decimal" class="' + (cls || '') + '" value="' + U.esc(v) + '">'; }
function money(v) { return isFinite(v) ? Math.round(v).toLocaleString('en-US') : '—'; }
function nz(id) { return String($('#' + id).value).trim() === '' ? null : U.read(id); }
function rd(id) { return U.read(id); }
function bad(a) { return a.some(function (v) { return !isFinite(v); }); }
function stats(a) { return '<div class="stats">' + a.join('') + '</div>'; }
function grid(head, rows) { return U.table(head, rows.map(function (r) { return { cells: r }; })); }
function ET(id, head, init, blank, noDel) {
  var S = init.map(function (r) { return r.slice(); });
  function render() {
    var h = '<thead><tr>' + head.map(function (x, i) { return '<th' + (i === 0 ? ' class="t"' : '') + '>' + x + '</th>'; }).join('') + (noDel ? '' : '<th></th>') + '</tr></thead><tbody>';
    S.forEach(function (r, i) { h += '<tr>' + r.map(function (v, j) { return '<td>' + (noDel && j === 0 ? '<span dir="ltr">' + U.esc(v) + '</span><input type="hidden" value="' + U.esc(v) + '">' : inp(v, j === 0 ? 'nm' : '')) + '</td>'; }).join('') + (noDel ? '' : '<td><button data-del="' + i + '">×</button></td>') + '</tr>'; });
    $('#' + id).innerHTML = h + '</tbody>';
  }
  function collect() { S = $$('#' + id + ' tbody tr').map(function (tr) { return $$('input', tr).map(function (e) { return e.value; }); }); return S; }
  $('#' + id).addEventListener('click', function (e) { var d = e.target.getAttribute('data-del'); if (d == null) return; collect(); S.splice(+d, 1); render(); });
  render();
  return { collect: collect, add: function () { collect(); S.push(blank.slice()); render(); }, reset: function () { S = init.map(function (r) { return r.slice(); }); render(); }, set: function (x) { S = x; render(); } };
}
function csvBtn(id, key, name) { $('#' + id).onclick = function () { if (last[key]) U.download(name, U.csv(last[key])); }; }

// ================= 1 syrup
var sweT = ET('sweT', ['شیرین‌کننده', 'قدرت نسبت به ساکارز (×)', 'سهم از شیرینی %', 'قیمت /kg'], [['آسپارتام', 200, 50, 2000], ['استیل‌سولفام K', 200, 50, 1500]], ['ماده جدید', 200, 0, 1000]);
$('#runS').onclick = function () {
  var V = rd('sV'), Bt = rd('sBt'), Bs = rd('sBs'), pr = rd('sPr'), M = rd('cM'), Bc = rd('cB'), eq = rd('sEq');
  if (bad([V, Bt, Bs, pr, M, Bc]) || !(Bs > Bt && Bt > 0)) return U.msg('msgS', 'بریکس شربت باید از بریکس هدف بیشتر باشد و همهٔ ورودی‌ها پر شوند.', 'bad');
  var r = E.syrup({ V: V, Bt: Bt, Bs: Bs }), cr = E.correct(M, Bc, Bt, Bs);
  var h = '<h3>بچ ' + money(V) + ' L</h3>' + stats([U.stat('شربت غلیظ', U.num(r.syrup, 0), 'kg'), U.stat('حجم شربت', U.num(r.Vsyrup, 0), 'L'), U.stat('آب', U.num(r.water, 0), 'kg'), U.stat('نسبت اختلاط آب : شربت (حجمی)', U.num(r.ratio, 2), ': 1'), U.stat('قند خالص', U.num(r.sugar, 1), 'kg'), U.stat('جرم نهایی', U.num(r.M, 0), 'kg'), U.stat('چگالی نوشیدنی', U.num(r.rhoB, 1), 'kg/m³'), U.stat('هزینهٔ شربت هر لیتر', U.num(r.syrup * pr / V, 2), '')]);
  h += '<div class="note">جمع حجم شربت و آب با حجم نهایی ' + U.num(r.contraction, 2) + '٪ اختلاف دارد (انقباض اختلاط)؛ بنابراین نسبت حجمی را با همین بالانس جرمی به‌دست آورید نه با جمع حجم‌ها. بریکس هدف باید کل مواد جامد محلول (شکر + اسید + طعم‌دهنده) باشد.</div>';
  h += '<h3>اصلاح مخزن ' + money(M) + ' kg با بریکس ' + U.num(Bc, 2) + '</h3>';
  if (cr.add === 'water') h += '<div class="note ok">بریکس بالاست: <b>' + U.num(cr.kg, 1) + ' kg آب</b> اضافه کنید تا به ' + U.num(Bt, 2) + ' برسد.</div>';
  else if (cr.add === 'syrup') h += '<div class="note ok">بریکس پایین است: <b>' + U.num(cr.kg, 1) + ' kg شربت ' + U.num(Bs, 0) + ' بریکس</b> اضافه کنید.</div>';
  else h += '<div class="note ok">بریکس روی هدف است.</div>';
  var sw = sweT.collect().map(function (x) { return { n: x[0], p: pf(x[1], 0), sh: pf(x[2], 0), c: pf(x[3], 0) }; }).filter(function (x) { return x.p > 0 && x.sh > 0; });
  if (sw.length && eq > 0) {
    var tot = sw.reduce(function (a, x) { return a + x.sh; }, 0), rows = [], cost = 0;
    sw.forEach(function (x) { var mg = eq * 1000 * (x.sh / 100) / x.p; var kg = mg * V / 1e6; cost += kg * x.c; rows.push([x.n, U.num(mg, 0), U.num(kg, 2), U.num(x.sh, 0) + '٪']); });
    h += '<h3>شیرین‌کننده‌ها برای شیرینی معادل ' + U.num(eq, 0) + ' g/L ساکارز</h3>' + grid(['ماده', 'mg/L', 'kg در بچ', 'سهم شیرینی'], rows) + (Math.abs(tot - 100) > 0.5 ? '<div class="note warn">جمع سهم‌ها ' + U.num(tot, 0) + '٪ است، نه 100٪.</div>' : '') + '<div class="note">هزینهٔ شیرین‌کننده در بچ: ' + money(cost) + ' ؛ هزینهٔ شکر معادل: ' + money(eq / 1000 * V / (Bs / 100) * pr) + ' (به قیمت شربت و شکر خالص).</div>';
  }
  $('#outS').innerHTML = h; U.msg('msgS', '', '');
  last.S = [['metric', 'value'], ['syrup_kg', r.syrup], ['syrup_L', r.Vsyrup], ['water_kg', r.water], ['water_to_syrup_vol', r.ratio], ['sugar_kg', r.sugar], ['density_kg_m3', r.rhoB], ['correction', cr.add + ' ' + cr.kg]];
};
csvBtn('csvS', 'S', 'syrup.csv');

// ================= 2 juice
$('#runJ').onclick = function () {
  var Bc = rd('jBc'), Bt = rd('jBt'), V = rd('jV'), Pc = rd('jPc'), Pr = rd('jPr'), Pn = rd('jPn');
  if (bad([Bc, Bt, V, Pc, Pr, Pn]) || !(Bc > Bt)) return U.msg('msgJ', 'بریکس کنسانتره باید بیشتر از بریکس هدف باشد.', 'bad');
  var M = V * E.rhoBev(Bt) / 1000, conc = M * Bt / Bc, w = M - conc, Vc = conc / E.rhoBev(Bc) * 1000, Vw = w / 0.998203, cost = conc * Pc + V * Pr, nfc = V * Pn;
  var h = stats([U.stat('کنسانتره', U.num(conc, 0), 'kg'), U.stat('حجم کنسانتره', U.num(Vc, 0), 'L'), U.stat('آب', U.num(w, 0), 'kg'), U.stat('نسبت آب : کنسانتره (حجمی)', U.num(Vw / Vc, 2), ': 1'), U.stat('ضریب تغلیظ', U.num(Bc / Bt, 2), '×'), U.stat('هزینه از کنسانتره', U.num(cost / V, 2), '/L'), U.stat('هزینه از NFC', U.num(Pn, 2), '/L'), U.stat('اختلاف سالانهٔ هر 1000 L', U.num((nfc - cost) / V * 1000, 0), '')]);
  h += '<div class="note ' + (cost < nfc ? 'ok' : 'warn') + '">' + (cost < nfc ? 'بازسازی از کنسانتره ' + U.num((nfc - cost) / V, 2) + ' در هر لیتر ارزان‌تر از NFC است.' : 'NFC ارزان‌تر است.') + ' قیمت قابل‌مقایسه را با کیفیت و اثر عطر در نظر بگیرید؛ بریکس هدف تک‌قوت را از استاندارد ملی/Codex محصول همان میوه بگیرید (برای هر میوه متفاوت است).</div>';
  $('#outJ').innerHTML = h; U.msg('msgJ', '', '');
};
var jT = ET('jT', ['جزء', 'kg', 'بریکس', 'اسیدیته g/L (معادل سیتریک)'], [['آب پرتقال از کنسانتره', 600, 11.2, 8.5], ['آب هویج از کنسانتره', 250, 9.5, 0.6], ['NFC آناناس', 150, 12.8, 7]], ['جزء جدید', 100, 11, 5]);
$('#addJ').onclick = jT.add; $('#exJ').onclick = jT.reset;
$('#runJB').onclick = function () {
  var R = jT.collect().map(function (r) { return { n: r[0], m: pf(r[1], NaN), b: pf(r[2], NaN), a: pf(r[3], NaN) }; });
  if (R.length < 2 || R.some(function (r) { return bad([r.m, r.b, r.a]) || !(r.m > 0); })) return U.msg('msgJB', 'حداقل دو جزء کامل لازم است.', 'bad');
  var M = 0, S = 0, V = 0, A = 0; R.forEach(function (r) { r.v = r.m / E.rhoBev(r.b) * 1000; M += r.m; S += r.m * r.b / 100; V += r.v; A += r.v * r.a; });
  var B = 100 * S / M, acidL = A / V;
  var h = stats([U.stat('بریکس ترکیب', U.num(B, 2), ''), U.stat('اسیدیته', U.num(acidL, 2), 'g/L'), U.stat('نسبت بریکس/اسید', U.num(B / ((A / (M * 1000)) * 100), 1), ''), U.stat('حجم', U.num(V, 0), 'L'), U.stat('جرم', U.num(M, 0), 'kg')]);
  h += grid(['جزء', 'kg', 'سهم جرمی %', 'حجم L'], R.map(function (r) { return [r.n, U.num(r.m, 1), U.num(100 * r.m / M, 1), U.num(r.v, 1)]; }));
  h += '<div class="note">بریکس ترکیب میانگین جرمی است (دقیق)؛ اسیدیته میانگین حجمی. نسبت بریکس/اسید = بریکس ÷ (g اسید در 100 g آبمیوه). حدود مجاز نسبت و بریکس را از استاندارد محصول بگیرید.</div>';
  $('#outJB').innerHTML = h; U.msg('msgJB', '', '');
};
$('#runE').onclick = function () {
  var F = rd('eF'), Bf = rd('eBf'), Bc = rd('eBc'), N = rd('eN'), eco = rd('eEc'), st = rd('eSt');
  if (bad([F, Bf, Bc, N, eco, st]) || !(Bc > Bf)) return U.msg('msgE', 'بریکس کنسانتره باید بیشتر از خوراک باشد.', 'bad');
  var Ev = F * (1 - Bf / Bc), P = F - Ev, steam = Ev / (N * eco), costH = steam / 1000 * st;
  var h = stats([U.stat('آب تبخیری', U.num(Ev, 0), 'kg/h'), U.stat('کنسانتره', U.num(P, 0), 'kg/h'), U.stat('بخار مصرفی', U.num(steam, 0), 'kg/h'), U.stat('اقتصاد بخار کل', U.num(N * eco, 2), 'kg آب/kg بخار'), U.stat('توان گرمایی', U.num(steam * 2100 / 3600, 0), 'kW'), U.stat('هزینهٔ بخار هر تن کنسانتره', U.num(costH / (P / 1000), 0), '')]);
  h += '<div class="note">E = F·(1 − B<sub>f</sub>/B<sub>c</sub>) ؛ بخار = E ÷ (تعداد اثر × اقتصاد هر اثر). اقتصاد هر اثر حدود 0.8 تا 0.9 فرض شده (تقریبی)؛ با دستگاه خود اندازه بگیرید. بازیابی عطر و تراکم‌دهی مجدد جدا حساب نشده‌اند.</div>';
  $('#outE').innerHTML = h; U.msg('msgE', '', '');
};

// ================= 3 carbonation
$('#runC').onclick = function () {
  var T = rd('cT'), V = rd('cV'), Pg = nz('cP'), L = rd('cL'), loss = rd('cLoss'), pr = rd('cPr');
  if (bad([T, V, L, loss, pr])) return U.msg('msgC', 'ورودی‌ها را کامل کنید.', 'bad');
  var psi = E.co2P(T, V), bar = psi / 14.5038, h = stats([U.stat('فشار لازم (گیج)', U.num(bar, 2), 'bar'), U.stat('فشار لازم', U.num(psi, 1), 'psi')]);
  if (Pg != null) { var vv = E.co2V(T, Pg * 14.5038); h += stats([U.stat('حجم CO₂ در فشار فعلی', U.num(vv, 2), 'volumes', Math.abs(vv - V) > 0.15 ? 'bad' : 'good')]); }
  var g = V * 1.977, day = g * L * (1 + loss / 100) / 1000;
  h += stats([U.stat('CO₂ در هر لیتر', U.num(g, 2), 'g'), U.stat('مصرف روزانه', U.num(day, 0), 'kg'), U.stat('هزینهٔ روزانه', money(day * pr), '')]);
  var temps = [10, 15, 20, 25, 30, 38], rows = temps.map(function (t) { return [t + '°C', U.num(E.co2P(t, V) / 14.5038, 2), U.num(E.co2P(t, V), 1)]; });
  h += '<h3>فشار بطری پر شده در دمای انبار (حجم ' + U.num(V, 1) + ')</h3>' + grid(['دما', 'bar (گیج)', 'psi'], rows) + '<div id="chC"></div>';
  h += '<div class="note">1 حجم CO₂ = 1.977 g/L (در 0°C و 1 atm). فشار بطری 38°C را با حد طراحی بطری/درب مقایسه کنید (از سازنده بگیرید). همبستگی تجربی برای آب و آبجو است و نه دقیقاً نوشابهٔ شیرین.</div>';
  $('#outC').innerHTML = h; U.msg('msgC', '', '');
  var xs = [], ys = []; for (var t = 0; t <= 40; t += 1) { xs.push(t); ys.push(E.co2P(t, V) / 14.5038); }
  U.chart($('#chC'), { series: [{ name: 'فشار گیج برای ' + U.num(V, 1) + ' حجم', x: xs, y: ys }], xl: 'دما °C', yl: 'فشار گیج bar', title: 'فشار بر حسب دما' });
  last.C = [['T_C', 'gauge_bar']].concat(xs.map(function (x, i) { return [x, ys[i]]; }));
};
csvBtn('csvC', 'C', 'carbonation.csv');

// ================= 4 water
var MR = ET('mrT', ['یون', 'پایه در آب RO (mg/L)', 'حداقل هدف', 'حداکثر هدف'], [['Ca', 0.5, 20, 30], ['Mg', 0.2, 5, 10], ['Na', 3, 5, 20], ['K', 0.3, 0, 5], ['HCO3', 5, 25, 60], ['SO4', 0.5, 5, 50], ['Cl', 4, 5, 40]], [], true);
var AT = { Ca: 40.078, Mg: 24.305, Na: 22.99, K: 39.098, Cl: 35.453 }, HCO3 = 61.017, SO4 = 96.058, W = 18.015;
var SALTS = [['CaCl2·2H2O', { Ca: AT.Ca, Cl: 2 * AT.Cl }, AT.Ca + 2 * AT.Cl + 2 * W, 60], ['CaSO4·2H2O', { Ca: AT.Ca, SO4: SO4 }, AT.Ca + SO4 + 2 * W, 30], ['MgSO4·7H2O', { Mg: AT.Mg, SO4: SO4 }, AT.Mg + SO4 + 7 * W, 40], ['MgCl2·6H2O', { Mg: AT.Mg, Cl: 2 * AT.Cl }, AT.Mg + 2 * AT.Cl + 6 * W, 50], ['NaHCO3', { Na: AT.Na, HCO3: HCO3 }, AT.Na + HCO3, 35], ['KHCO3', { K: AT.K, HCO3: HCO3 }, AT.K + HCO3, 90], ['NaCl', { Na: AT.Na, Cl: AT.Cl }, AT.Na + AT.Cl, 10], ['KCl', { K: AT.K, Cl: AT.Cl }, AT.K + AT.Cl, 40]];
var SA = ET('saT', ['نمک', 'قیمت /kg'], SALTS.map(function (s) { return [s[0], s[3]]; }), [], true);
var ION = ['Ca', 'Mg', 'Na', 'K', 'HCO3', 'SO4', 'Cl'];
function wq(ions, pH, T) {
  var Ca = ions.Ca, Mg = ions.Mg, Na = ions.Na, K = ions.K, hc = ions.HCO3, so = ions.SO4, cl = ions.Cl, no = ions.NO3 || 0;
  var cat = Ca / 20.04 + Mg / 12.153 + Na / 22.99 + K / 39.098, an = hc / 61.017 + so / 48.03 + cl / 35.453 + no / 62.0;
  var tds = Ca + Mg + Na + K + hc + so + cl + no, hard = 2.497 * Ca + 4.118 * Mg, alk = 0.8202 * hc;
  var l = (Ca > 0 && alk > 0 && tds > 0) ? E.lsi({ tds: tds, T: T, ca: 2.497 * Ca, alk: alk, pH: pH }) : null;
  return { cat: cat, an: an, err: (cat + an) > 0 ? 100 * (cat - an) / (cat + an) : 0, tds: tds, hard: hard, alk: alk, lsi: l };
}
function lsiTxt(l) { if (!l) return '—'; return U.num(l.lsi, 2) + (l.lsi > 0.3 ? ' (رسوب‌ساز)' : (l.lsi < -0.3 ? ' (خورنده)' : ' (نزدیک تعادل)')); }
$('#runW').onclick = function () {
  var ions = { Ca: rd('wCa'), Mg: rd('wMg'), Na: rd('wNa'), K: rd('wK'), HCO3: rd('wHC'), SO4: rd('wSO'), Cl: rd('wCl'), NO3: rd('wNO') }, pH = rd('wPH'), T = rd('wT'), Q = rd('rQ'), Y = rd('rY') / 100, R = rd('rR') / 100;
  if (bad(Object.keys(ions).map(function (k) { return ions[k]; }).concat([pH, T, Q, Y, R])) || !(Y > 0 && Y < 1)) return U.msg('msgW', 'ورودی‌ها را کامل کنید (بازیابی بین 0 و 100).', 'bad');
  var a = wq(ions, pH, T), h = stats([U.stat('خطای تعادل یونی', U.num(a.err, 1), '%', Math.abs(a.err) > 5 ? 'bad' : 'good'), U.stat('TDS (جمع یون‌ها)', U.num(a.tds, 0), 'mg/L'), U.stat('سختی کل', U.num(a.hard, 0), 'mg/L CaCO₃'), U.stat('قلیائیت', U.num(a.alk, 0), 'mg/L CaCO₃'), U.stat('شاخص لانژیه (LSI)', lsiTxt(a.lsi), ''), U.stat('pHs', a.lsi ? U.num(a.lsi.pHs, 2) : '—', '')]);
  if (Math.abs(a.err) > 5) h += '<div class="note warn">اختلاف مجموع کاتیون و آنیون بیش از 5٪ است؛ آنالیز یا واحدها را بازبینی کنید (مثلاً یونی فراموش شده یا HCO₃ و CO₃).</div>';
  var ro = E.ro(Q, Y, R, { tds: a.tds, ca: 2.497 * ions.Ca, alk: a.alk }), pc = nz('rPH') == null ? pH : rd('rPH'), lc = (ro.conc.ca > 0 && ro.conc.alk > 0) ? E.lsi({ tds: ro.conc.tds, T: T, ca: ro.conc.ca, alk: ro.conc.alk, pH: pc }) : null;
  h += '<h3>RO</h3>' + stats([U.stat('پرمیت', U.num(ro.Qp, 1), 'm³/h'), U.stat('پساب', U.num(ro.Qc, 1), 'm³/h'), U.stat('TDS پرمیت', U.num(ro.perm.tds, 0), 'mg/L'), U.stat('TDS پساب', U.num(ro.conc.tds, 0), 'mg/L'), U.stat('LSI پساب', lsiTxt(lc), '', lc && lc.lsi > 0 ? 'bad' : ''), U.stat('فشار اسمزی پساب (تقریبی)', U.num(ro.conc.tds * 0.00075, 1), 'bar')]);
  if (lc && lc.lsi > 0) h += '<div class="note warn">LSI پساب مثبت است: خطر رسوب کربنات کلسیم روی غشا. بازیابی را کم کنید، pH را با اسید پایین بیاورید یا ضدرسوب (antiscalant) بگذارید. این شاخص فقط کربنات را بررسی می‌کند؛ سیلیس و سولفات باریم/استرانسیم جدا هستند.</div>';
  h += '<div class="note">ضریب تغلیظ متوسط در غشا CF = ln(1/(1−Y))/Y؛ C<sub>p</sub> = (1−R)·C<sub>f</sub>·CF ؛ C<sub>c</sub> = (C<sub>f</sub> − Y·C<sub>p</sub>)/(1−Y). pH پساب را در صورت اندازه‌گیری بگذارید؛ در غیر این صورت pH خوراک استفاده می‌شود. فشار اسمزی با قاعدهٔ تقریبی 0.75 bar به ازای 1000 mg/L محاسبه شده است.</div>';
  $('#outW').innerHTML = h; U.msg('msgW', '', '');
  last.perm = { Ca: ro.perm.ca / 2.497, HCO3: ro.perm.alk / 0.8202, Na: ions.Na * (1 - R) * ro.cfAvg, K: ions.K * (1 - R) * ro.cfAvg, Mg: ions.Mg * (1 - R) * ro.cfAvg, SO4: ions.SO4 * (1 - R) * ro.cfAvg, Cl: ions.Cl * (1 - R) * ro.cfAvg };
  last.W = [['metric', 'value'], ['ion_balance_error_pct', a.err], ['TDS', a.tds], ['hardness_CaCO3', a.hard], ['alkalinity_CaCO3', a.alk], ['LSI', a.lsi ? a.lsi.lsi : ''], ['permeate_m3h', ro.Qp], ['concentrate_m3h', ro.Qc], ['permeate_TDS', ro.perm.tds], ['concentrate_TDS', ro.conc.tds], ['concentrate_LSI', lc ? lc.lsi : '']];
};
csvBtn('csvW', 'W', 'water.csv');
$('#usePerm').onclick = function () { if (!last.perm) return U.msg('msgMR', 'اول «تحلیل آب و RO» را اجرا کنید.', 'bad'); var rows = MR.collect(); MR.set(rows.map(function (r) { return [r[0], U.num(last.perm[r[0]], 2), r[2], r[3]]; })); U.msg('msgMR', 'یون‌های پرمیت به‌عنوان پایه گذاشته شد.', 'ok'); };
$('#runMR').onclick = function () {
  var rows = MR.collect(), base = {}, lo = {}, hi = {}, i, j;
  rows.forEach(function (r) { base[r[0]] = pf(r[1], 0); lo[r[0]] = pf(r[2], 0); hi[r[0]] = String(r[3]).trim() === '' ? null : pf(r[3], null); });
  var cost = SA.collect().map(function (r) { return pf(r[1], 0); });
  var A = [], rel = [], b = [];
  ION.forEach(function (ion) {
    var row = SALTS.map(function (s) { return s[1][ion] ? s[1][ion] / s[2] : 0; });
    var need = lo[ion] - base[ion]; if (need > 1e-9) { A.push(row); rel.push('>='); b.push(need); }
    if (hi[ion] != null) { A.push(row); rel.push('<='); b.push(hi[ion] - base[ion]); }
  });
  var sol = A.length ? E.lp(cost, A, rel, b) : { status: 'optimal', x: SALTS.map(function () { return 0; }), obj: 0 };
  if (sol.status !== 'optimal') return U.msg('msgMR', 'با این نمک‌ها نمی‌توان همهٔ بازه‌ها را هم‌زمان رعایت کرد (' + U.esc(sol.status) + '). در این فهرست بی‌کربنات فقط همراه Na و K می‌آید (نمک جامد Ca(HCO₃)₂ وجود ندارد) و Ca و Mg فقط همراه Cl یا SO₄ هستند؛ پس HCO₃ زیاد با Na/K کم، یا Ca زیاد با Cl/SO₄ کم شدنی نیست. بازه‌ها را باز کنید.', 'bad');
  var fin = {}; ION.forEach(function (ion) { fin[ion] = base[ion] + SALTS.reduce(function (s, x, j) { return s + (x[1][ion] ? x[1][ion] / x[2] * sol.x[j] : 0); }, 0); });
  var f = wq({ Ca: fin.Ca, Mg: fin.Mg, Na: fin.Na, K: fin.K, HCO3: fin.HCO3, SO4: fin.SO4, Cl: fin.Cl }, rd('mpH'), 20), cm3 = 0; sol.x.forEach(function (x, j) { cm3 += x / 1000 * cost[j]; });
  var drows = []; sol.x.forEach(function (x, j) { if (x > 1e-6) drows.push([SALTS[j][0], U.num(x, 1), U.num(x / 1000 * cost[j], 3)]); });
  var irows = ION.map(function (ion) { var okk = fin[ion] >= lo[ion] - 1e-6 && (hi[ion] == null || fin[ion] <= hi[ion] + 1e-6); return [ion, U.num(base[ion], 1), U.num(fin[ion], 1), lo[ion] + ' – ' + (hi[ion] == null ? '∞' : hi[ion]), okk ? '✓' : '✗']; });
  var h = stats([U.stat('هزینهٔ نمک', U.num(cm3, 3), 'در هر m³'), U.stat('TDS نهایی', U.num(f.tds, 0), 'mg/L'), U.stat('سختی کل', U.num(f.hard, 0), 'mg/L CaCO₃'), U.stat('خطای تعادل یونی', U.num(f.err, 1), '%'), U.stat('LSI', lsiTxt(f.lsi), '')]);
  h += '<h3>دستور نمک (به ازای هر m³ آب)</h3>' + grid(['نمک', 'g / m³ (= kg / 1000 m³)', 'هزینه / m³'], drows);
  h += '<h3>یون‌های نهایی (mg/L)</h3>' + grid(['یون', 'پایه', 'نهایی', 'بازهٔ هدف', ''], irows);
  h += '<div class="note">هر نمک (به‌صورت هیدراته) در آب حل می‌شود؛ بازه‌ها فقط نمونه‌اند. بازه‌های مجاز و ادعای برچسب را از استاندارد آب آشامیدنی/آب معدنی کشور خود بگیرید. گرید غذایی نمک‌ها و حل‌شدن کامل (مثلاً CaSO₄ کم‌محلول) را در عمل کنترل کنید.</div>';
  $('#outMR').innerHTML = h; U.msg('msgMR', '', '');
};

// ================= 5 pH
var SP = { cit: { pk: [3.13, 4.76, 6.4], mw: 192.12 }, mal: { pk: [3.4, 5.2], mw: 134.09 }, tar: { pk: [3.04, 4.37], mw: 150.09 }, pho: { pk: [2.15, 7.2, 12.35], mw: 98 }, asc: { pk: [4.17, 11.57], mw: 176.12 }, ace: { pk: [4.76], mw: 60.05 }, lac: { pk: [3.86], mw: 90.08 }, ben: { pk: [4.2], mw: 122.12 }, sor: { pk: [4.76], mw: 112.13 } };
var ING = [['اسید سیتریک (بدون آب)', 'cit', 1 / 192.12, 0], ['اسید سیتریک مونوهیدرات', 'cit', 1 / 210.14, 0], ['سیترات سدیم دوآبه', 'cit', 1 / 294.1, 3 / 294.1], ['اسید مالیک', 'mal', 1 / 134.09, 0], ['اسید تارتاریک', 'tar', 1 / 150.09, 0], ['اسید فسفریک 85٪', 'pho', 0.85 / 98, 0], ['اسید اسکوربیک', 'asc', 1 / 176.12, 0], ['اسید استیک 100٪', 'ace', 1 / 60.05, 0], ['اسید لاکتیک 80٪', 'lac', 0.8 / 90.08, 0], ['بنزوات سدیم', 'ben', 1 / 144.1, 1 / 144.1], ['اسید بنزوییک', 'ben', 1 / 122.12, 0], ['سوربات پتاسیم', 'sor', 1 / 150.22, 1 / 150.22], ['اسید سوربیک', 'sor', 1 / 112.13, 0], ['سود (NaOH)', null, 0, 1 / 40], ['پتاس (KOH)', null, 0, 1 / 56.11]];
var pRows = [[0, 1.8], [2, 0.6], [9, 0.2]];
function renderP() {
  var h = '<thead><tr><th class="t">ماده</th><th>g/L</th><th></th></tr></thead><tbody>';
  pRows.forEach(function (r, i) { h += '<tr><td><select data-i="' + i + '" class="psel">' + ING.map(function (g, k) { return '<option value="' + k + '"' + (k === r[0] ? ' selected' : '') + '>' + g[0] + '</option>'; }).join('') + '</select></td><td>' + inp(r[1]) + '</td><td><button data-pdel="' + i + '">×</button></td></tr>'; });
  $('#pT').innerHTML = h + '</tbody>';
}
function collectP() { pRows = $$('#pT tbody tr').map(function (tr) { return [+$('select', tr).value, pf($('input', tr).value, 0)]; }); }
$('#pT').addEventListener('click', function (e) { var d = e.target.getAttribute('data-pdel'); if (d == null) return; collectP(); pRows.splice(+d, 1); renderP(); });
$('#addP').onclick = function () { collectP(); pRows.push([0, 0]); renderP(); };
$('#exP').onclick = function () { pRows = [[0, 1.8], [2, 0.6], [9, 0.2]]; renderP(); };
renderP();
function buildSp(extraCit) {
  var acids = {}, cat = 0, tot = { ben: 0, sor: 0 };
  pRows.forEach(function (r) { var g = ING[r[0]]; if (g[1]) { acids[g[1]] = (acids[g[1]] || 0) + r[1] * g[2]; if (tot[g[1]] != null) tot[g[1]] += r[1] * g[2]; } cat += r[1] * g[3]; });
  if (extraCit) acids.cit = (acids.cit || 0) + extraCit / 192.12;
  return { sp: { acids: Object.keys(acids).map(function (k) { return { c: acids[k], pk: SP[k].pk }; }), cat: cat, an: 0 }, tot: tot };
}
$('#runP').onclick = function () {
  collectP(); if (!pRows.length) return U.msg('msgP', 'حداقل یک ماده لازم است.', 'bad');
  var b = buildSp(0), pH = E.phSolve(b.sp), ta = E.baseTo(b.sp, 8.2) * 64.04, mgB = b.tot.ben * 122.12 * 1000, mgS = b.tot.sor * 112.13 * 1000, uB = mgB * E.undis(pH, 4.2), uS = mgS * E.undis(pH, 4.76), tg = nz('pU'), ptg = nz('pTg');
  var h = stats([U.stat('pH محاسبه‌شده', U.num(pH, 2), ''), U.stat('اسیدیتهٔ قابل تیتراسیون', U.num(ta, 2), 'g/L (معادل سیتریک تا pH 8.2)'), U.stat('بنزوات کل', U.num(mgB, 0), 'mg/L (به‌صورت اسید)'), U.stat('بنزوییک غیریونیزه', U.num(uB, 1), 'mg/L'), U.stat('سوربات کل', U.num(mgS, 0), 'mg/L (به‌صورت اسید)'), U.stat('سوربیک غیریونیزه', U.num(uS, 1), 'mg/L')]);
  if (tg != null && tg > 0) {
    var ms = [];
    if (mgB > 0) { var f = tg / mgB; ms.push(f >= 1 ? 'بنزوات: حتی کاملاً غیریونیزه هم به ' + U.num(tg, 0) + ' mg/L نمی‌رسد' : 'بنزوات: pH ≤ ' + U.num(4.2 + Math.log(1 / f - 1) / Math.LN10, 2)); }
    if (mgS > 0) { var f2 = tg / mgS; ms.push(f2 >= 1 ? 'سوربات: حتی کاملاً غیریونیزه هم به ' + U.num(tg, 0) + ' mg/L نمی‌رسد' : 'سوربات: pH ≤ ' + U.num(4.76 + Math.log(1 / f2 - 1) / Math.LN10, 2)); }
    h += '<div class="note ' + ((mgB > 0 && uB < tg) || (mgS > 0 && uS < tg) ? 'warn' : 'ok') + '">برای غیریونیزهٔ هدف ' + U.num(tg, 1) + ' mg/L باید ' + (ms.join(' ؛ ') || 'نگهدارنده اضافه شود') + '.</div>';
  }
  if (ptg != null) {
    if (ptg > pH) h += '<div class="note">برای رساندن به pH ' + U.num(ptg, 2) + ' حدود <b>' + U.num(E.baseTo(b.sp, ptg) * 40, 2) + ' g/L سود (NaOH)</b> لازم است.</div>';
    else if (ptg < pH) { var lo = 0, hi = 100, k; for (k = 0; k < 60; k++) { var m = (lo + hi) / 2; if (E.phSolve(buildSp(m).sp) > ptg) lo = m; else hi = m; } h += '<div class="note">برای رساندن به pH ' + U.num(ptg, 2) + ' حدود <b>' + U.num(lo, 2) + ' g/L اسید سیتریک (بدون آب)</b> دیگر لازم است.</div>'; }
  }
  h += '<div id="chP"></div>';
  $('#outP').innerHTML = h; U.msg('msgP', '', '');
  var xs = [], yb = [], ys = []; for (var x = 2.5; x <= 7; x += 0.1) { xs.push(x); yb.push(E.undis(x, 4.2) * 100); ys.push(E.undis(x, 4.76) * 100); }
  U.chart($('#chP'), { series: [{ name: 'بنزوییک (pKa 4.20)', x: xs, y: yb, color: U.PAL[0] }, { name: 'سوربیک (pKa 4.76)', x: xs, y: ys, color: U.PAL[1] }], xl: 'pH', yl: '% غیریونیزه', vlines: [{ x: pH, label: 'pH محصول' }], title: 'بخش فعال نگهدارنده' });
  last.P = [['metric', 'value'], ['pH', pH], ['TA_g_per_L_citric', ta], ['benzoate_total_mgL', mgB], ['benzoic_undissociated_mgL', uB], ['sorbate_total_mgL', mgS], ['sorbic_undissociated_mgL', uS]];
};
csvBtn('csvP', 'P', 'ph.csv');

// ================= 6 pasteurization
function setU(l) { $('#uD').value = l.map(function (r) { return r.join(', '); }).join('\n'); }
$('#exU').onclick = function () { setU([[0, 20], [2, 30], [4, 45], [6, 58], [8, 62], [16, 62], [18, 60], [20, 48], [22, 35], [24, 25]]); $('#uP').value = 15; };
$('#exU2').onclick = function () { setU([[0, 85], [2, 84.5], [4, 84], [6, 83], [8, 80], [10, 70], [12, 55], [14, 40], [16, 30], [18, 25]]); $('#uP').value = 1000; };
$('#runU').onclick = function () {
  var d = E.parseTable($('#uD').value).filter(function (r) { return r.length >= 2; }), Tr = rd('uT'), z = rd('uZ'), tg = rd('uP'), Dr = nz('uDr');
  if (d.length < 3 || bad([Tr, z, tg]) || !(z > 0)) return U.msg('msgU', 'حداقل 3 نقطهٔ زمان-دما (min, °C) و Tref و z لازم است.', 'bad');
  d.sort(function (a, b) { return a[0] - b[0]; }); var t = d.map(function (r) { return r[0]; }), T = d.map(function (r) { return r[1]; }), r = E.fValue(t, T, Tr, z), F = r.F;
  var h = stats([U.stat('PU / F-value', U.num(F, 1), 'min در ' + U.num(Tr, 0) + '°C', F >= tg ? 'good' : 'bad'), U.stat('هدف', U.num(tg, 1), ''), U.stat('نسبت به هدف', U.num(100 * F / tg, 0), '%'), U.stat('بیشینهٔ دما', U.num(Math.max.apply(null, T), 1), '°C'), U.stat('مدت لاگ', U.num(t[t.length - 1] - t[0], 1), 'min')]);
  if (Dr != null && Dr > 0) h += stats([U.stat('کاهش لگاریتمی میکروب هدف', U.num(F / Dr, 1), 'log₁₀')]);
  h += '<div id="chU"></div><div id="chU2"></div><div class="note">PU = Σ 10<sup>(T−T<sub>ref</sub>)/z</sup>·Δt؛ برای PU معمول T<sub>ref</sub> = 60 و z = 6.94 (معادل 1.393<sup>T−60</sup>). کاهش لگاریتمی = F ÷ D<sub>ref</sub> فقط با D و z مربوط به همان میکروب در همان محصول معتبر است. دمای نقطهٔ سرد بطری (نه دمای آب تونل) را با دیتالاگر ثبت کنید.</div>';
  $('#outU').innerHTML = h; U.msg('msgU', F >= tg ? 'PU از هدف بیشتر است.' : 'PU کمتر از هدف است: زمان یا دما را بیشتر کنید.', F >= tg ? 'ok' : 'bad');
  U.chart($('#chU'), { series: [{ name: 'دما', x: t, y: T, color: U.PAL[0] }], xl: 'زمان (min)', yl: 'دما °C', title: 'لاگ دما' });
  U.chart($('#chU2'), { series: [{ name: 'PU تجمعی', x: t, y: r.cum, color: U.PAL[2] }], hlines: [{ y: tg, label: 'هدف' }], xl: 'زمان (min)', yl: 'PU', title: 'PU تجمعی' });
  last.U = [['t_min', 'T_C', 'cum_PU']].concat(t.map(function (x, i) { return [x, T[i], r.cum[i]]; }));
};
csvBtn('csvU', 'U', 'pasteurization.csv');

// ================= 7 fill
$('#runF').onclick = function () {
  var o = { Vdec: rd('fV'), B: rd('fB'), Tfill: rd('fT'), T2: rd('fT2'), Vb: rd('fVb'), SD: rd('fSD'), alpha: rd('fAl') }, yr = rd('fYr'), pr = rd('fPr');
  if (bad([o.Vdec, o.B, o.Tfill, o.T2, o.Vb, o.SD, o.alpha, yr, pr])) return U.msg('msgF', 'ورودی‌ها را کامل کنید.', 'bad');
  var r = E.fill(o), margin = r.z * o.SD, cost = margin / 1000 * yr * pr;
  var h = stats([U.stat('انبساط حجم در دمای پر کردن', U.num(r.expansion, 2), '%'), U.stat('حجم پر کردن', U.num(r.VT, 1), 'mL در ' + U.num(o.Tfill, 0) + '°C'), U.stat('جرم خالص محتوا', U.num(r.m, 1), 'g'), U.stat('هدف حجم در 20°C', U.num(r.targetV, 1), 'mL'), U.stat('هدف جرم چک‌ویر', U.num(r.targetM, 1), 'g'), U.stat('هدف حجم در دمای پر کردن', U.num(r.targetVT, 1), 'mL'), U.stat('فضای خالی هنگام پر کردن', U.num(r.hs1, 1), '%', r.hs1 < 0 ? 'bad' : ''), U.stat('فضای خالی بعد از خنک‌شدن', U.num(r.hs2, 1), '%'), U.stat('خلأ بعد از خنک‌شدن', U.num(r.vac, 1), 'kPa', r.vac > 40 ? 'bad' : '')]);
  if (r.hs1 < 0) h += '<div class="note bad">حجم پر کردن از حجم بطری بیشتر است؛ سرریز می‌شود.</div>';
  h += '<div class="note">حاشیهٔ ایمنی بالاتر از حجم اعلامی z·SD = ' + U.num(margin, 2) + ' mL در هر بطری است؛ هزینهٔ سالانه ≈ <b>' + money(cost) + '</b>. با نصف‌شدن SD حدود ' + money(cost / 2) + ' صرفه‌جویی می‌شود. خلأ از بالانس گاز ایده‌آل و فشار بخار آب (Antoine) محاسبه شده؛ بطری صلب فرض شده است.</div>';
  $('#outF').innerHTML = h; U.msg('msgF', '', '');
  last.F = [['metric', 'value'], ['expansion_pct', r.expansion], ['fill_volume_mL', r.VT], ['mass_g', r.m], ['target_mass_g', r.targetM], ['target_volume_20C_mL', r.targetV], ['headspace_fill_pct', r.hs1], ['headspace_final_pct', r.hs2], ['vacuum_kPa', r.vac]];
};
csvBtn('csvF', 'F', 'fill.csv');

// ================= 8 osmolality
var oT = ET('oT', ['ماده', 'g/L', 'جرم مولی', 'i (ذره به ازای مولکول)'], [['ساکارز', 40, 342.3, 1], ['گلوکز', 10, 180.16, 1], ['کلرید سدیم', 1, 58.44, 2], ['کلرید پتاسیم', 0.2, 74.55, 2], ['اسید سیتریک', 1.5, 192.12, 1], ['سیترات سدیم', 0.5, 258.07, 3]], ['ماده جدید', 1, 100, 1]);
$('#addO').onclick = oT.add; $('#exO').onclick = oT.reset;
$('#runO').onclick = function () {
  var R = oT.collect().map(function (r) { return { n: r[0], g: pf(r[1], NaN), mw: pf(r[2], NaN), i: pf(r[3], NaN) }; });
  if (!R.length || R.some(function (r) { return bad([r.g, r.mw, r.i]) || !(r.mw > 0); })) return U.msg('msgO', 'همهٔ ردیف‌ها را کامل کنید.', 'bad');
  var sol = 0, mos = 0; R.forEach(function (r) { sol += r.g; r.mo = r.i * r.g / r.mw * 1000; mos += r.mo; });
  var rho = 998 + 0.38 * sol, water = rho - sol, osmKg = mos * 1000 / water, cls = osmKg < 270 ? 'هیپوتونیک' : (osmKg <= 330 ? 'ایزوتونیک' : 'هایپرتونیک');
  var h = stats([U.stat('اسمولالیته', U.num(osmKg, 0), 'mOsm/kg آب', osmKg > 330 ? 'bad' : 'good'), U.stat('اسمولاریته', U.num(mos, 0), 'mOsm/L'), U.stat('گروه', cls, ''), U.stat('مواد جامد', U.num(sol / 10, 2), 'g/100mL')]);
  h += grid(['ماده', 'g/L', 'mOsm/L', 'سهم %'], R.map(function (r) { return [r.n, U.num(r.g, 2), U.num(r.mo, 1), U.num(100 * r.mo / mos, 0)]; }));
  h += '<div class="note">گروه‌بندی تقریبی: زیر 270 هیپوتونیک، 270 تا 330 ایزوتونیک (نزدیک پلاسمای خون، حدود 285 تا 295)، بالای 330 هایپرتونیک؛ مرزها قاعدهٔ سرانگشتی‌اند. چگالی از 998 + 0.38·(g/L جامد) برآورد شده است. اسمولالیتهٔ واقعی را با اسمومتر تأیید کنید.</div>';
  $('#outO').innerHTML = h; U.msg('msgO', '', '');
};
})();
