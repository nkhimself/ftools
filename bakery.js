(function () {
'use strict'; var $ = U.$, $$ = U.$$, E = FE, last = {};
U.tabs($('#tb').parentNode); U.bindFile('tdf', 'td');
function pf(v, d) { var x = E.parseTable(String(v))[0]; return x && x.length ? x[0] : d; }
function inp(v, cls) { return '<input type="text" inputmode="decimal" class="' + (cls || '') + '" value="' + U.esc(v) + '">'; }
function money(v) { return isFinite(v) ? Math.round(v).toLocaleString('en-US') : '—'; }
function nz(id) { return String($('#' + id).value).trim() === '' ? null : U.read(id); }
function rd(id) { return U.read(id); }
function bad(a) { return a.some(function (v) { return !isFinite(v); }); }
function clean(s) { return String(s).replace(/<[^>]*>|[✓✗]/g, ''); }
// editable table helper
function ET(id, head, init, blank) {
  var S = init.map(function (r) { return r.slice(); });
  function render() {
    var h = '<thead><tr>' + head.map(function (x, i) { return '<th' + (i === 0 ? ' class="t"' : '') + '>' + x + '</th>'; }).join('') + '<th></th></tr></thead><tbody>';
    S.forEach(function (r, i) { h += '<tr>' + r.map(function (v, j) { return '<td>' + inp(v, j === 0 ? 'nm' : '') + '</td>'; }).join('') + '<td><button data-del="' + i + '">×</button></td></tr>'; });
    $('#' + id).innerHTML = h + '</tbody>';
  }
  function collect() { S = $$('#' + id + ' tbody tr').map(function (tr) { return $$('input', tr).map(function (e) { return e.value; }); }); return S; }
  $('#' + id).addEventListener('click', function (e) { var d = e.target.getAttribute('data-del'); if (d == null) return; collect(); S.splice(+d, 1); render(); });
  render();
  return { collect: collect, add: function () { collect(); S.push(blank.slice()); render(); }, reset: function () { S = init.map(function (r) { return r.slice(); }); render(); } };
}
function grid(head, rows) { return U.table(head, rows.map(function (r) { return { cells: r }; })); }
function stats(a) { return '<div class="stats">' + a.join('') + '</div>'; }

// ================= 1 dough
var dT = ET('dT', ['ماده (ردیف اول = آرد)', 'kg', 'آب %', 'ساکارز %', 'گلوکز/قند احیاکننده %', 'چربی %', 'cp kJ/kg·K', 'دما °C'],
  [['آرد', 100, 13, 0, 0, 1.2, 1.8, 20], ['شکر', 22, 0.1, 99.8, 0, 0, 1.25, 20], ['شورتنینگ', 14, 0.2, 0, 0, 100, 2, 20], ['شربت گلوکز', 4, 20, 0, 80, 0, 2.4, 20], ['شیرخشک', 2, 4, 0, 0, 1, 1.7, 20], ['بی‌کربنات، نمک و ...', 1.2, 0, 0, 0, 0, 1, 20]], ['ماده جدید', 0, 0, 0, 0, 0, 1.8, 20]);
$('#addD').onclick = dT.add; $('#exD').onclick = dT.reset;
$('#runD').onclick = function () {
  var R = dT.collect().map(function (r) { return { n: r[0], m: pf(r[1], 0), w: pf(r[2], 0), suc: pf(r[3], 0), glu: pf(r[4], 0), fat: pf(r[5], 0), cp: pf(r[6], 1.8), T: pf(r[7], 20) }; });
  if (!R.length || !(R[0].m > 0)) return U.msg('msgD', 'ردیف اول باید آرد با مقدار بزرگ‌تر از صفر باشد.', 'bad');
  var inv = [rd('dwat'), rd('dddt'), rd('dpow'), rd('dmin'), rd('dfr'), rd('dtmin')]; if (bad(inv)) return U.msg('msgD', 'همهٔ ورودی‌های عددی را پر کنید.', 'bad');
  var fric = rd('dpow') * rd('dmin') * 60 * rd('dfr') / 100;
  var d = E.dough(R, { water: rd('dwat'), ddt: rd('dddt'), fric: fric, tmin: rd('dtmin') }), msgs = [], kind = 'ok';
  if (d.ice > 0) { msgs.push('آب از دمای حداقل سردتر لازم است؛ <b>' + U.num(d.ice, 2) + ' kg از آب را به‌صورت یخ</b> بریزید و بقیه را در ' + U.num(d.Tliq, 1) + '°C.'); kind = 'warn'; }
  else if (d.Tw > 50) { msgs.push('دمای آب لازم ' + U.num(d.Tw, 1) + '°C است؛ بالای 50°C عملی نیست و می‌تواند نشاسته را ژلاتینه کند. ماده‌های اولیه سردند یا دمای هدف زیاد است.'); kind = 'warn'; }
  var mt = nz('dmt'), sug = '';
  if (mt != null) { var d0 = E.dough(R, { water: 0, ddt: rd('dddt'), fric: fric }), x = (mt / 100 * d0.M - d0.W) / (1 - mt / 100); sug = '<div class="note">برای رطوبت هدف ' + U.num(mt, 1) + '٪ آب افزودهٔ لازم <b>' + U.num(x, 2) + ' kg</b> (' + U.num(100 * x / R[0].m, 1) + '٪ وزن آرد) است؛ فعلی ' + U.num(rd('dwat'), 2) + ' kg.</div>'; if (x < 0) sug = '<div class="note warn">حتی بدون آب افزوده، رطوبت از هدف بیشتر است؛ مواد پررطوبت را کم کنید.</div>'; }
  var rows = R.map(function (r) { return [r.n, U.num(r.m, 2), U.num(100 * r.m / R[0].m, 1)]; }); rows.push(['آب افزوده', U.num(rd('dwat'), 2), U.num(d.addFlour, 1)]);
  var h = stats([U.stat('رطوبت خمیر', U.num(d.moist, 1), '%'), U.stat('aw تقریبی خمیر', U.num(d.aw, 3), ''), U.stat('دمای آب لازم', U.num(d.Tliq, 1), '°C'), U.stat('یخ لازم', U.num(d.ice, 2), 'kg'), U.stat('شکر ÷ آرد', U.num(d.sugarFlour, 1), '%'), U.stat('چربی ÷ آرد', U.num(d.fatFlour, 1), '%'), U.stat('غلظت شربت فاز آبی', U.num(d.syrup, 1), '%'), U.stat('جرم بچ', U.num(d.M, 1), 'kg')]);
  h += sug + '<h3>درصد نانوایی (آرد = 100)</h3>' + grid(['ماده', 'kg', '% آرد'], rows);
  h += '<div class="note">aw با معادلهٔ Norrish (ساکارز K=6.47، گلوکز K=2.25) روی کل آب خمیر محاسبه می‌شود؛ پروتئین و نشاسته آب را می‌بندند و aw واقعی کمی کمتر است، پس عدد محافظه‌کارانه است. دمای آب: Σ m·cp·T + m<sub>w</sub>·cp<sub>w</sub>·T<sub>w</sub> + Q<sub>friction</sub> = DDT·Σ m·cp.</div>';
  $('#outD').innerHTML = h; U.msg('msgD', msgs.join(' ') || 'دمای آب لازم برای رسیدن خمیر به ' + U.num(rd('dddt'), 1) + '°C: ' + U.num(d.Tw, 1) + '°C.', kind);
  last.D = [['item', 'kg', 'pct_flour']].concat(rows.map(function (r) { return r.map(clean); })).concat([['moisture_pct', d.moist, ''], ['aw_norrish', d.aw, ''], ['water_temp_C', d.Tliq, ''], ['ice_kg', d.ice, '']]);
};
$('#csvD').onclick = function () { if (last.D) U.download('dough.csv', U.csv(last.D)); };

// ================= 2 bake
$('#runO').onclick = function () {
  var o = { dough: rd('bdo'), m0: rd('bm0'), mf: rd('bmf'), sl: rd('bsl'), T0: rd('bT0'), Tf: rd('bTf'), cp: rd('bcp'), speed: rd('bsp'), length: rd('bln'), pitch: rd('bpi'), across: rd('bac'), inputKW: nz('bkw') || 0, target: nz('btg') || 0, post: rd('bpost') };
  if (bad([o.dough, o.m0, o.mf, o.sl, o.T0, o.Tf, o.cp, o.speed, o.length, o.pitch, o.across, o.post])) return U.msg('msgO', 'همهٔ ورودی‌های اجباری را پر کنید.', 'bad');
  if (!(o.mf < o.m0)) return U.msg('msgO', 'رطوبت نهایی باید کمتر از رطوبت خمیر باشد.', 'bad');
  var r = E.bake(o);
  var h = stats([U.stat('وزن محصول', U.num(r.fin, 2), 'g'), U.stat('افت پخت', U.num(r.loss, 1), '%'), U.stat('آب تبخیرشده/قطعه', U.num(r.ev, 2), 'g'), U.stat('انرژی/قطعه', U.num(r.kJ, 2), 'kJ'), U.stat('انرژی نظری', U.num(r.kWhPerTon, 0), 'kWh/ton محصول'), U.stat('زمان پخت', U.num(r.bakeMin, 2), 'min'), U.stat('ظرفیت', U.num(r.pcsMin, 0), 'قطعه/min'), U.stat('تولید محصول', U.num(r.kgH, 0), 'kg/h'), U.stat('تبخیر', U.num(r.evapKgH, 0), 'kg آب/h'), U.stat('توان نظری لازم', U.num(r.kW, 0), 'kW')]);
  if (r.eff != null) h += '<div class="note ' + (r.eff < 25 ? 'warn' : '') + '">بازده حرارتی فر = توان نظری ÷ توان ورودی اندازه‌گیری‌شده = <b>' + U.num(r.eff, 0) + '٪</b>. بازده فرهای نواری معمولاً 30 تا 50٪ است (عدد تقریبی؛ با فر خودتان مقایسه کنید). بازده پایین یعنی اتلاف دودکش، دیواره و رطوبت اگزوز زیاد است.</div>';
  h += '<div class="note"><b>ارزش رطوبت:</b> هر 1 واحد رطوبت نهایی بالاتر در خروج فر، حدود <b>' + U.num(r.perPct, 1) + ' kg</b> محصول بیشتر در هر تُن خمیر می‌دهد (آب فروخته‌شده)، ولی aw و ماندگاری و تردی را بدتر می‌کند. هر 1 واحد کمتر، همان‌قدر انرژی و وزن را از دست می‌دهید.</div>';
  if (r.doughNeeded) h += '<div class="note ok">برای وزن هدف ' + U.num(o.target, 2) + ' g در بسته (با ' + U.num(o.post, 1) + '٪ افت بعد از فر، یعنی ' + U.num(r.tgtExit, 2) + ' g خروج فر) وزن خمیر لازم <b>' + U.num(r.doughNeeded, 2) + ' g</b> است (فعلی ' + U.num(o.dough, 2) + ' g).</div>';
  h += '<h3>اثر رطوبت خروج فر</h3><div id="chO"></div>';
  $('#outO').innerHTML = h; U.msg('msgO', '', '');
  var xs = [], fw = [], en = []; for (var m = 1; m <= 6.01; m += 0.25) { var q = E.bake({ dough: o.dough, m0: o.m0, mf: m, sl: o.sl, T0: o.T0, Tf: o.Tf, cp: o.cp }); xs.push(m); fw.push(q.fin); en.push(q.kWhPerTon); }
  U.chart($('#chO'), { series: [{ name: 'وزن محصول (g)', x: xs, y: fw, color: U.PAL[0] }], xl: 'رطوبت نهایی %', yl: 'وزن محصول g', vlines: [{ x: o.mf, label: 'فعلی' }], title: 'وزن بر حسب رطوبت' });
  last.O = [['metric', 'value'], ['final_piece_g', r.fin], ['bake_loss_pct', r.loss], ['evaporated_g', r.ev], ['energy_kJ_per_piece', r.kJ], ['kWh_per_ton', r.kWhPerTon], ['bake_min', r.bakeMin], ['pcs_per_min', r.pcsMin], ['kg_per_h', r.kgH], ['evap_kg_per_h', r.evapKgH], ['theoretical_kW', r.kW], ['kg_per_pct_moisture_per_ton_dough', r.perPct], ['dough_needed_g', r.doughNeeded || '']];
};
$('#csvO').onclick = function () { if (last.O) U.download('bake.csv', U.csv(last.O)); };

// ================= 3 cake
$('#runC').onclick = function () {
  var o = { flour: rd('kfl'), sugar: rd('ksu'), fat: rd('kfa'), fatW: rd('kfw'), egg: rd('keg'), liquid: rd('kli'), liqW: rd('klw'), other: rd('kot'), soda: rd('kso'), acid: rd('kac'), nv: rd('knv'), mf: rd('kmf'), pan: rd('kpan'), sg: rd('ksg'), sv: rd('ksv'), fillTarget: rd('kft') };
  if (bad(Object.keys(o).map(function (k) { return o[k]; }))) return U.msg('msgC', 'همهٔ ورودی‌ها را پر کنید.', 'bad');
  if (!(o.flour > 0 && o.sugar > 0)) return U.msg('msgC', 'آرد و شکر باید مثبت باشند.', 'bad');
  var r = E.cake(o), flags = [];
  function chk(v, lo, hi) { var okk = (lo == null || v >= lo) && (hi == null || v <= hi); return '<span style="color:var(--' + (okk ? 'ok' : 'warn') + ')">' + U.num(v, 0) + '٪' + (okk ? ' ✓' : ' ⚠') + '</span>'; }
  var h = stats([U.stat('جرم خمیر', U.num(r.M, 0), 'g'), U.stat('رطوبت خمیر', U.num(r.moist, 1), '%'), U.stat('افت پخت', U.num(r.loss, 1), '%'), U.stat('وزن کیک پخته', U.num(r.fin, 0), 'g'), U.stat('aw تقریبی خمیر', U.num(r.awBatter, 3), ''), U.stat('aw تقریبی کیک', U.num(r.awCake, 3), '', r.awCake > 0.9 ? 'bad' : '')]);
  h += '<h3>نسبت‌ها (قواعد سرانگشتی؛ با دستور مرجع خودتان تأیید کنید)</h3>' + grid(['نسبت', 'مقدار', 'محدودهٔ معمول'], [['شکر ÷ آرد', chk(r.sugarFlour, 100, 140), 'کیک پرنسبت (high-ratio): 100 تا 140٪'], ['(مایع + تخم‌مرغ) ÷ شکر', chk(r.liqSugar, 100, null), 'حداقل 100٪ برای پخت درست شکر و نشاسته'], ['تخم‌مرغ ÷ چربی', chk(r.eggFat, 100, null), 'حداقل 100٪ برای پایداری امولسیون'], ['چربی ÷ آرد', chk(r.fatFlour, 30, 70), 'حدود 30 تا 70٪ (بسته به نوع)']]);
  h += '<h3>گاز و مواد پودر کیک</h3>' + stats([U.stat('CO₂ تولیدی', U.num(r.co2, 3), 'g'), U.stat('گاز در 100°C', U.num(r.co2mL100, 1), 'mL به ازای 100 g خمیر'), U.stat('جوش‌شیرین باقی‌مانده', U.num(r.excess, 2), 'g', r.excess > 0.05 ? 'bad' : 'good'), U.stat('اسید باقی‌مانده', U.num(r.acidLeft, 2), 'g')]);
  if (r.excess > 0.05) h += '<div class="note bad">جوش‌شیرین اضافی ' + U.num(r.excess, 2) + ' g با اسید خنثی نمی‌شود: pH بالا، رنگ زرد-قهوه‌ای مغز، طعم صابونی. اسید را بیشتر یا سودا را کمتر کنید.</div>';
  else if (r.acidLeft > 0.3) h += '<div class="note">اسید اضافی ' + U.num(r.acidLeft, 2) + ' g مانده؛ طعم ترش یا CO₂ کمتر از ظرفیت است. اگر عمداً اسید بیشتر گذاشته‌اید مشکلی نیست.</div>';
  if (r.needBatter) {
    h += '<h3>وزن خمیر هر قالب</h3>' + stats([U.stat('خمیر لازم هر قالب', U.num(r.needBatter, 0), 'g'), U.stat('حجم خمیر در قالب', U.num(r.needFill, 0), '% قالب', r.needFill > 67 || r.needFill < 35 ? 'bad' : 'good'), U.stat('تعداد قالب از این بچ', U.num(r.pans, 1), ''), U.stat('پرشدگی با کل این بچ در یک قالب', U.num(r.fill, 0), '%')]);
    if (r.needFill > 67) h += '<div class="note warn">خمیر بیش از حدود دو‌سوم قالب را پر می‌کند؛ سرریز و بالاآمدن ناقص محتمل است. قالب بزرگ‌تر یا حجم مخصوص کمتر.</div>';
    if (r.needFill < 35) h += '<div class="note warn">پرشدگی کمتر از حدود یک‌سوم است؛ کیک کوتاه و پوسته‌ای خواهد شد.</div>';
  }
  h += '<div class="note">CO₂: NaHCO₃ + H⁺ → CO₂ با 0.524 g CO₂ به ازای g سودای خنثی‌شده؛ سودای اضافی فقط با حرارت (2NaHCO₃ → Na₂CO₃ + CO₂ + H₂O) نصف آن را می‌دهد. بیشتر انبساط کیک از بخار آب و هوای ورودی در همزن می‌آید؛ CO₂ هسته‌های حباب را بزرگ می‌کند و عدد mL فقط برای مقایسهٔ دستورها است. aw کیک با Norrish روی آب باقی‌مانده تقریب زده شده و محافظه‌کارانه است.</div>';
  $('#outC').innerHTML = h; U.msg('msgC', '', '');
  last.C = [['metric', 'value'], ['batter_g', r.M], ['batter_moisture_pct', r.moist], ['bake_loss_pct', r.loss], ['cake_g', r.fin], ['aw_batter', r.awBatter], ['aw_cake', r.awCake], ['co2_g', r.co2], ['excess_soda_g', r.excess], ['batter_per_pan_g', r.needBatter || ''], ['pan_fill_pct', r.needFill || '']];
};
$('#csvC').onclick = function () { if (last.C) U.download('cake.csv', U.csv(last.C)); };

// ================= 4 wafer
$('#runW').onclick = function () {
  var o = { batter: rd('wba'), solids: rd('wso'), sheetM: rd('wmo'), T0: rd('wT0'), pL: rd('wpl'), pW: rd('wpw'), cycle: rd('wcy'), plates: rd('wpn'), n: Math.round(rd('wn')), cream: rd('wcr'), creamFat: rd('wcf'), bL: rd('wbl'), bW: rd('wbw'), cSheet: rd('wcs'), cCream: rd('wcc'), declared: rd('wdc'), sd: rd('wsd'), alpha: rd('wal') };
  var yr = rd('wyr');
  if (bad(Object.keys(o).map(function (k) { return o[k]; }))) return U.msg('msgW', 'همهٔ ورودی‌ها را پر کنید.', 'bad');
  if (o.n < 2) return U.msg('msgW', 'حداقل دو ورقه لازم است.', 'bad');
  var r = E.wafer(o);
  var h = '<h3>ورقه</h3>' + stats([U.stat('وزن ورقه', U.num(r.sheet, 1), 'g'), U.stat('آب تبخیرشده/صفحه', U.num(r.ev, 1), 'g'), U.stat('توان تبخیر', U.num(r.kW, 0), 'kW'), U.stat('ورقه در ساعت', U.num(r.sheetsH, 0), ''), U.stat('تولید ورقه', U.num(r.sheetKgH, 0), 'kg/h'), U.stat('آب تبخیری', U.num(r.evapKgH, 0), 'kg/h')]);
  h += '<h3>بلوک و بار</h3>' + stats([U.stat('وزن بلوک', U.num(r.block, 0), 'g'), U.stat('بار از هر بلوک', U.num(r.pieces, 0), ''), U.stat('ضایعات برش', U.num(r.trim, 1), '%'), U.stat('وزن هر بار', U.num(r.bar, 2), 'g', r.bar < o.declared ? 'bad' : ''), U.stat('کرم در بار', U.num(r.creamPct, 1), '%'), U.stat('چربی بار', U.num(r.fatPct, 1), '%'), U.stat('هزینهٔ هر بار', U.num(r.costBar, 2), '')]);
  var save = (r.bar - r.target);
  h += '<h3>وزن اعلامی ' + U.num(o.declared, 1) + ' g</h3>' + stats([U.stat('هدف میانگین (با ریسک)', U.num(r.target, 2), 'g'), U.stat('کرم لازم هر لایه', U.num(r.creamNeeded, 1), 'g (فعلی ' + U.num(o.cream, 1) + ')'), U.stat('احتمال زیر وزن اعلامی', U.num(r.pBelow, 2), '%', r.pBelow > 1 ? 'bad' : 'good'), U.stat('بخشش فعلی', U.num(r.give, 2), 'g/بار')]);
  if (save > 0) h += '<div class="note ok">با کم‌کردن کرم هر لایه به ' + U.num(r.creamNeeded, 1) + ' g، حدود ' + U.num(save, 2) + ' g در هر بار صرفه‌جویی می‌شود؛ در ' + money(yr) + ' بار ≈ <b>' + money(save * yr / 1000 * o.cCream) + '</b> (واحد پولی قیمت کرم). مشروط بر اینکه SD ورودی واقعی باشد.</div>';
  else h += '<div class="note bad">میانگین فعلی کمتر از هدف ایمن است؛ کرم را به ' + U.num(r.creamNeeded, 1) + ' g در هر لایه برسانید یا SD را کم کنید.</div>';
  h += '<div class="note">وزن بار = (n·ورقه + (n−1)·کرم) × مساحت بار ÷ مساحت صفحه؛ برش بهترین جهت (طولی یا عرضی) انتخاب می‌شود و ضایعات لبه حساب شده است. SD وزن را از 50 بار متوالی بگیرید، چون تغییر ضخامت لایهٔ کرم عامل اصلی آن است.</div>';
  $('#outW').innerHTML = h; U.msg('msgW', '', '');
  last.W = [['metric', 'value'], ['sheet_g', r.sheet], ['evap_g_per_plate', r.ev], ['evap_kW', r.kW], ['sheets_per_h', r.sheetsH], ['block_g', r.block], ['bars_per_block', r.pieces], ['trim_pct', r.trim], ['bar_g', r.bar], ['cream_pct', r.creamPct], ['fat_pct', r.fatPct], ['cost_per_bar', r.costBar], ['target_mean_g', r.target], ['cream_needed_g_per_layer', r.creamNeeded], ['p_below_declared_pct', r.pBelow]];
};
$('#csvW').onclick = function () { if (last.W) U.download('wafer.csv', U.csv(last.W)); };

// ================= 5 migration
var mT = ET('mT', ['لایه', 'جرم g', 'رطوبت فعلی %', 'aw نقطهٔ 1', 'رطوبت % در نقطهٔ 1', 'aw نقطهٔ 2', 'رطوبت % در نقطهٔ 2'],
  [['ویفر', 12, 2, 0.11, 1, 0.57, 7], ['کرم', 12, 1, 0.2, 0.5, 0.6, 3]], ['لایه جدید', 10, 2, 0.1, 1, 0.6, 5]);
$('#addM').onclick = mT.add; $('#exM').onclick = mT.reset;
$('#runM').onclick = function () {
  var C = mT.collect().map(function (r) { return { n: r[0], m: pf(r[1], NaN), wb: pf(r[2], NaN), a1: pf(r[3], NaN), w1: pf(r[4], NaN), a2: pf(r[5], NaN), w2: pf(r[6], NaN) }; });
  if (C.length < 2) return U.msg('msgM', 'حداقل دو لایه لازم است.', 'bad');
  for (var i = 0; i < C.length; i++) { var c = C[i]; if (bad([c.m, c.wb, c.a1, c.w1, c.a2, c.w2]) || !(c.m > 0) || c.a1 === c.a2 || c.w1 === c.w2) return U.msg('msgM', 'ردیف ' + (i + 1) + ' ناقص است (دو نقطهٔ aw باید متفاوت باشند).', 'bad'); if ((c.w2 - c.w1) / (c.a2 - c.a1) <= 0) return U.msg('msgM', 'ردیف ' + (i + 1) + ': رطوبت باید با aw افزایش یابد.', 'bad'); }
  var r = E.migrate(C), crit = rd('mcr');
  var rows = r.rows.map(function (q, i) { var flag = (q.out || q.outNow) ? ' ⚠ خارج از بازهٔ ایزوترم' : ''; return { cells: ['<span dir="rtl">' + U.esc(C[i].n) + '</span>', U.num(q.awNow, 3), U.num(q.wb, 2), U.num(q.wbF, 2), (q.dW >= 0 ? '+' : '') + U.num(q.dW, 3), U.num(100 * q.dW / (C[i].m * C[i].wb / 100 || 1), 0) + '٪' + flag] }; });
  var h = stats([U.stat('aw تعادلی مجموعه', U.num(r.aw, 3), '', r.aw > crit ? 'bad' : 'good'), U.stat('aw بحرانی', U.num(crit, 2), '')]);
  h += grid(['لایه', 'aw فعلی', 'رطوبت فعلی %', 'رطوبت نهایی %', 'آب منتقل‌شده g', 'تغییر آب لایه'], rows.map(function (x) { return x.cells; }));
  var any = r.rows.some(function (q) { return q.out || q.outNow; });
  if (any) h += '<div class="note warn">در بعضی لایه‌ها aw تعادلی یا فعلی بیرون از دو نقطهٔ ایزوترم است؛ برون‌یابی خطی خطا دارد. نقطهٔ سوم در aw نزدیک‌تر اندازه بگیرید.</div>';
  h += '<h3>ایزوترم‌ها و aw تعادلی</h3><div id="chM"></div>';
  h += '<div class="note">پایستگی آب: Σ s<sub>i</sub>·M<sub>i</sub>(aw) = Σ آب اولیه، با M بر پایهٔ خشک و ایزوترم خطی بین دو نقطه. aw بالاتر از aw بحرانی یعنی «در پایان ماندگاری، لایهٔ ترد نرم شده».</div>';
  $('#outM').innerHTML = h;
  U.msg('msgM', r.aw > crit ? 'aw تعادلی (' + U.num(r.aw, 2) + ') از حد بحرانی (' + U.num(crit, 2) + ') بیشتر است؛ طبق این مدل لایهٔ ترد در انتها نرم می‌شود. فیلینگ با aw کمتر یا لایهٔ مانع رطوبت بگذارید.' : 'aw تعادلی (' + U.num(r.aw, 2) + ') زیر حد بحرانی است.', r.aw > crit ? 'bad' : 'ok');
  var ser = r.rows.map(function (q, i) { var xs = [0.05, q.a1, q.a2, 0.8].sort(function (a, b) { return a - b; }), ys = xs.map(function (a) { var M = q.M1 + q.sl * (a - q.a1); return 100 * M / (1 + M); }); return { name: C[i].n, x: xs, y: ys, color: U.PAL[i % 8] }; });
  U.chart($('#chM'), { series: ser, xl: 'aw', yl: 'رطوبت % (پایهٔ تر)', vlines: [{ x: r.aw, label: 'aw تعادلی' }, { x: crit, label: 'بحرانی' }], title: 'ایزوترم‌ها' });
  last.M = [['layer', 'aw_now', 'moisture_now_pct', 'moisture_final_pct', 'water_transfer_g']].concat(r.rows.map(function (q, i) { return [C[i].n, q.awNow, q.wb, q.wbF, q.dW]; })).concat([['equilibrium_aw', r.aw, '', '', '']]);
};
$('#csvM').onclick = function () { if (last.M) U.download('migration.csv', U.csv(last.M)); };

// ================= 6 bake time
function zones() { var z = E.parseTable($('#tz').value).filter(function (r) { return r.length >= 2 && r[0] > 0; }); if (!z.length) return null; var cum = [], s = 0; z.forEach(function (r) { s += r[0] * 60; cum.push([s, r[1]]); }); return { cum: cum, total: s, f: function (t) { for (var i = 0; i < cum.length; i++) if (t <= cum[i][0]) return cum[i][1]; return cum[cum.length - 1][1]; } }; }
function probeData() { return E.parseTable($('#td').value).filter(function (r) { return r.length >= 2; }).map(function (r) { return { t: r[0] * 60, T: r[1] }; }).sort(function (a, b) { return a.t - b.t; }); }
function params() { return { L: rd('tL') / 1000, two: $('#tTwo').value === '1', k: rd('tk'), rho: rd('trho'), cp: rd('tcp') * 1000, h: rd('th'), T0: rd('tT0'), xev: rd('txe'), target: rd('ttg') }; }
$('#exT').onclick = function () {
  var z = zones() || { f: function () { return 180; } }, p = params(), tmax = 2400, s = E.slab({ L: p.L, two: p.two, k: 0.35, rho: p.rho, cp: p.cp, h: 45, Tair: z.f, T0: p.T0, xev: p.xev, N: 20, dt: 3, tmax: tmax }), lines = [];
  for (var t = 120; t <= tmax; t += 120) lines.push((t / 60) + ', ' + (s.Tc[t / 3] + ((t / 120) % 2 ? 0.3 : -0.3)).toFixed(1));
  $('#td').value = lines.join('\n');
};
var run = function (fit) {
  var p = params(), z = zones(); if (bad([p.L, p.k, p.rho, p.cp, p.h, p.T0, p.xev, p.target]) || !(p.L > 0)) return U.msg('msgT', 'ورودی‌های عددی را کامل کنید.', 'bad');
  if (!z) return U.msg('msgT', 'برنامهٔ دمای فر را وارد کنید (مدت min، دما °C).', 'bad');
  var data = probeData(), note = '', fitRes = null;
  if (fit) {
    if (data.length < 5) return U.msg('msgT', 'برای برازش حداقل 5 نقطهٔ دما-زمان لازم است.', 'bad');
    fitRes = E.slabFit(data, { L: p.L, two: p.two, rho: p.rho, cp: p.cp, Tair: z.f, T0: p.T0, xev: p.xev, h0: p.h, k0: p.k }); p.h = fitRes.h; p.k = fitRes.k;
    $('#th').value = U.num(p.h, 1); $('#tk').value = U.num(p.k, 3);
    note = 'برازش: h = ' + U.num(p.h, 1) + ' W/m²K ، k = ' + U.num(p.k, 3) + ' W/mK ، RMSE = ' + U.num(fitRes.rmse, 2) + '°C.' + (fitRes.rmse > 3 ? ' خطا زیاد است؛ مدل ساده برای این داده کافی نیست (مثلاً پوستهٔ ضخیم یا انبساط زیاد).' : '');
  }
  var tmax = Math.max(7200, z.total * 1.8), r = E.slab({ L: p.L, two: p.two, k: p.k, rho: p.rho, cp: p.cp, h: p.h, Tair: z.f, T0: p.T0, xev: p.xev, target: p.target, N: 30, dt: 2, tmax: tmax });
  var h = stats([U.stat('زمان رسیدن مرکز به ' + U.num(p.target, 0) + '°C', r.tTarget == null ? 'نرسید' : U.num(r.tTarget / 60, 1), r.tTarget == null ? '' : 'min', r.tTarget == null ? 'bad' : 'good'), U.stat('دمای سطح در آن لحظه', r.tTarget == null ? '—' : U.num(r.Ts[Math.round(r.tTarget / 2)], 0), '°C'), U.stat('α = k/(ρ·cp)', U.sig(p.k / (p.rho * p.cp) * 1e7, 3), '×10⁻⁷ m²/s'), U.stat('Bi', U.num(p.h * (p.two ? p.L / 2 : p.L) / p.k, 1), '')]);
  h += '<div id="chT"></div>';
  // what-if table
  var Ts = [-20, 0, 20], Ls = [0.9, 1, 1.1], tz0 = z.f(1e-6), rows = Ls.map(function (lf) { return ['ضخامت ' + U.num(p.L * lf * 1000, 0) + ' mm'].concat(Ts.map(function (dT) { var q = E.slab({ L: p.L * lf, two: p.two, k: p.k, rho: p.rho, cp: p.cp, h: p.h, Tair: function (t) { return z.f(t) + dT; }, T0: p.T0, xev: p.xev, target: p.target, N: 20, dt: 3, tmax: tmax, stop: true }); return q.tTarget == null ? '—' : U.num(q.tTarget / 60, 1); })); });
  h += '<h3>اگر ضخامت یا دمای فر تغییر کند (دقیقه تا هدف)</h3>' + grid(['', 'فر ' + (-20) + '°C', 'فر فعلی', 'فر +20°C'], rows);
  h += '<div class="note">h و k را با داده برازش کنید؛ مقدار پیش‌فرض فقط نقطهٔ شروع است. h در فر هوای داغ حدود 20 تا 60 و در فر تابشی نواری تا 100 W/m²K است (تقریبی).</div>';
  $('#outT').innerHTML = h; U.msg('msgT', note, fitRes && fitRes.rmse > 3 ? 'warn' : (note ? 'ok' : ''));
  var ser = [{ name: 'مرکز (مدل)', x: r.t.map(function (t) { return t / 60; }), y: r.Tc, color: U.PAL[0] }, { name: 'سطح گرم (مدل)', x: r.t.map(function (t) { return t / 60; }), y: r.Ts, color: U.PAL[3], dash: '4 3' }];
  if (data.length) ser.push({ name: 'ترموکوپل', x: data.map(function (d) { return d.t / 60; }), y: data.map(function (d) { return d.T; }), kind: 'pts', color: U.PAL[1] });
  var ex = r.tTarget != null ? Math.min(tmax, r.tTarget * 1.4) / 60 : tmax / 60;
  U.chart($('#chT'), { series: ser, xl: 'زمان (min)', yl: 'دما °C', hlines: [{ y: p.target, label: 'هدف' }], xmax: ex, xmin: 0, title: 'دمای مرکز' });
  last.T = [['t_min', 'center_C', 'surface_C']].concat(r.t.filter(function (t, i) { return i % 15 === 0; }).map(function (t, i) { return [t / 60, r.Tc[i * 15], r.Ts[i * 15]]; })).concat([['h', p.h, ''], ['k', p.k, ''], ['t_target_min', r.tTarget == null ? '' : r.tTarget / 60, '']]);
};
$('#runT').onclick = function () { run(false); }; $('#fitT').onclick = function () { run(true); };
$('#csvT').onclick = function () { if (last.T) U.download('bake-time.csv', U.csv(last.T)); };

// ================= 7 QC
var qT = ET('qT', ['آزمون', 'W1: عرض 6 کوکی (mm)', 'W2: بعد از چرخش (mm)', 'T: ارتفاع 6 کوکی (mm)'], [['بچ آرد A', 362, 358, 48], ['بچ آرد B', 345, 348, 52], ['بچ آرد C', 355, 352, 49], ['بچ آرد D', 375, 378, 45]], ['آزمون جدید', 0, 0, 0]);
$('#addQ').onclick = qT.add; $('#exQ').onclick = qT.reset;
$('#runQ').onclick = function () {
  var R = qT.collect().map(function (r) { var w1 = pf(r[1], NaN), w2 = pf(r[2], NaN), t = pf(r[3], NaN), D = (w1 + w2) / 12, th = t / 6; return { n: r[0], D: D, th: th, sf: D / th }; }).filter(function (r) { return isFinite(r.sf); });
  if (R.length < 2) return U.msg('msgQ', 'حداقل دو آزمون کامل لازم است.', 'bad');
  var v = R.map(function (r) { return r.sf; }), n = v.length, m = v.reduce(function (a, b) { return a + b; }, 0) / n, sd = Math.sqrt(v.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (n - 1)), ci = E.tcrit(n - 1) * sd / Math.sqrt(n), lo = rd('qlo'), hi = rd('qhi');
  var outc = v.filter(function (x) { return x < lo || x > hi; }).length;
  var pout = sd > 0 ? 100 * (E.normCdf((lo - m) / sd) + 1 - E.normCdf((hi - m) / sd)) : (m < lo || m > hi ? 100 : 0);
  var rows = R.map(function (r) { var okk = r.sf >= lo && r.sf <= hi; return [r.n, U.num(r.D, 1), U.num(r.th, 2), '<span style="color:var(--' + (okk ? 'ok' : 'bad') + ')">' + U.num(r.sf, 2) + (okk ? ' ✓' : ' ✗') + '</span>']; });
  var h = stats([U.stat('میانگین ضریب گسترش', U.num(m, 2), ''), U.stat('SD', U.num(sd, 2), ''), U.stat('بازهٔ اطمینان 95٪', U.num(m - ci, 2) + ' – ' + U.num(m + ci, 2), ''), U.stat('خارج از حد (مشاهده)', outc + ' از ' + n, ''), U.stat('خارج از حد (تخمین نرمال)', U.num(pout, 1), '%')]);
  h += grid(['آزمون', 'قطر mm', 'ضخامت mm', 'ضریب گسترش'], rows) + '<div class="note">قطر = (W1+W2)/12 ؛ ضخامت = T/6 (روش AACC 10-50D). افزایش ضریب گسترش معمولاً نشانهٔ آردی با پروتئین/جذب آب کمتر، شکر درشت‌تر یا خمیر گرم‌تر است. حدود پذیرش را از مشخصهٔ محصول خودتان بگذارید؛ ' + U.num(lo, 1) + ' تا ' + U.num(hi, 1) + ' فقط نمونه است.</div>';
  $('#outQ').innerHTML = h; U.msg('msgQ', '', '');
};
$('#exQW').onclick = function () { var l = [], s = 7; for (var i = 0; i < 40; i++) { s = (s * 16807) % 2147483647; var u1 = s / 2147483647; s = (s * 16807) % 2147483647; var u2 = s / 2147483647; l.push((406.5 + 4.2 * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)).toFixed(1)); } $('#qw').value = l.join('\n'); };
$('#runQW').onclick = function () {
  var v = E.parseTable($('#qw').value).map(function (r) { return r[0]; }).filter(isFinite), n = v.length, dc = rd('qdc'), al = rd('qal'), yr = rd('qyr'), pr = rd('qpr');
  if (n < 10) return U.msg('msgQW', 'حداقل 10 وزن لازم است (ترجیحاً 50).', 'bad'); if (bad([dc, al, yr, pr])) return U.msg('msgQW', 'ورودی‌ها را کامل کنید.', 'bad');
  var m = v.reduce(function (a, b) { return a + b; }, 0) / n, sd = Math.sqrt(v.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (n - 1)), z = E.normInv(1 - al), tgt = dc + z * sd, below = v.filter(function (x) { return x < dc; }).length, pb = 100 * E.normCdf((dc - m) / sd), sav = m - tgt;
  var h = stats([U.stat('تعداد نمونه', n, ''), U.stat('میانگین فعلی', U.num(m, 2), 'g'), U.stat('SD', U.num(sd, 2), 'g'), U.stat('بسته‌های زیر اعلامی', below + ' از ' + n, ''), U.stat('احتمال زیر اعلامی (نرمال)', U.num(pb, 2), '%', pb > 1 ? 'bad' : 'good'), U.stat('هدف میانگین', U.num(tgt, 2), 'g'), U.stat('بخشش فعلی', U.num(m - dc, 2), 'g/بسته')]);
  if (sav > 0) h += '<div class="note ok">اگر میانگین را از ' + U.num(m, 2) + ' به ' + U.num(tgt, 2) + ' g ببرید: ' + U.num(sav, 2) + ' g در بسته، حدود <b>' + money(sav / 1000 * yr * pr) + '</b> در سال. نصف شدن SD، هدف را ' + U.num(z * sd / 2, 2) + ' g پایین‌تر می‌آورد: ارزش آن ' + money(z * sd / 2 / 1000 * yr * pr) + ' در سال.</div>';
  else h += '<div class="note bad">میانگین فعلی از هدف ایمن کمتر است؛ ریسک زیر وزن اعلامی بیشتر از ' + U.num(100 * al, 1) + '٪ است. میانگین را به ' + U.num(tgt, 2) + ' g برسانید یا SD را کم کنید.</div>';
  h += '<div class="note">هدف = وزن اعلامی + z·SD. مقررات وزن (حداکثر خطای منفی مجاز و میانگین) را از استاندارد ملی خودتان بگذارید؛ این ابزار فقط ریسک نرمال را می‌سنجد. داده باید از بسته‌های پشت‌سرهم یک خط باشد.</div>';
  $('#outQW').innerHTML = h; U.msg('msgQW', '', '');
};
})();
