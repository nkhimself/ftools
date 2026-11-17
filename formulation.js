(function () {
'use strict'; var $ = U.$, E = FE, S, lastRes = null;
var EX = {
  nut: ['پروتئین', 'چربی', 'کربوهیدرات', 'رطوبت'],
  ing: [['گوشت گاو', 450, 15, 100, 18, 12, 0, 69], ['سینهٔ مرغ', 220, 0, 100, 21, 3, 0, 75], ['مرغ ماشینی (MDM)', 120, 0, 30, 14, 15, 0, 69], ['چربی گاو', 60, 0, 100, 0, 99, 0, 0.5], ['ایزولهٔ پروتئین سویا', 180, 0, 3, 85, 1, 2, 6], ['نشاسته', 35, 0, 4, 0, 0, 88, 12], ['آب و یخ', 0.5, 0, 100, 0, 0, 0, 100]],
  cons: [[12, ''], ['', 20], ['', 6], [55, 65]]
};
function load(ex) { S = { nut: ex.nut.slice(), ing: ex.ing.map(function (r) { return r.slice(); }), cons: ex.cons.map(function (r) { return r.slice(); }) }; render(); }
function inp(v, cls, extra) { return '<input type="text" inputmode="decimal" class="' + (cls || '') + '" value="' + U.esc(v) + '" ' + (extra || '') + '>'; }
function render() {
  var h = '<thead><tr><th class="t">ماده</th><th>هزینه / kg</th><th>حداقل %</th><th>حداکثر %</th>' + S.nut.map(function (n, j) { return '<th class="t">' + inp(n, 'nm', 'data-nj="' + j + '"') + '</th>'; }).join('') + '<th></th></tr></thead><tbody>';
  S.ing.forEach(function (r, i) { h += '<tr data-i="' + i + '"><td>' + inp(r[0], 'nm') + '</td>' + r.slice(1).map(function (v) { return '<td>' + inp(v) + '</td>'; }).join('') + '<td><button data-del="' + i + '" title="حذف">×</button></td></tr>'; });
  $('#ing').innerHTML = h + '</tbody>';
  var c = '<thead><tr><th class="t">ترکیب</th><th>حداقل</th><th>حداکثر</th></tr></thead><tbody>';
  S.nut.forEach(function (n, j) { c += '<tr data-j="' + j + '"><td class="t nlab">' + U.esc(n) + '</td><td>' + inp(S.cons[j] ? S.cons[j][0] : '') + '</td><td>' + inp(S.cons[j] ? S.cons[j][1] : '') + '</td></tr>'; });
  $('#cons').innerHTML = c + '</tbody>';
}
function collect() {
  S.nut = $$('#ing thead input').map(function (e) { return e.value; });
  S.ing = $$('#ing tbody tr').map(function (tr) { return $$('input', tr).map(function (e, k) { return k ? e.value : e.value; }); });
  S.cons = $$('#cons tbody tr').map(function (tr) { return $$('input', tr).map(function (e) { return e.value; }); });
}
function $$(s, r) { return U.$$(s, r); }
function pf(v, d) { var x = E.parseTable(String(v))[0]; return x && x.length ? x[0] : d; }
$('#ing').addEventListener('click', function (e) { var d = e.target.getAttribute('data-del'); if (d == null) return; collect(); S.ing.splice(+d, 1); render(); });
$('#ing').addEventListener('input', function (e) { if (e.target.hasAttribute('data-nj')) { var j = +e.target.getAttribute('data-nj'), l = $$('#cons .nlab')[j]; if (l) l.textContent = e.target.value; } });
$('#addIng').addEventListener('click', function () { collect(); S.ing.push(['ماده جدید', '', 0, 100].concat(S.nut.map(function () { return 0; }))); render(); });
$('#addNut').addEventListener('click', function () { collect(); S.nut.push('ترکیب ' + (S.nut.length + 1)); S.ing.forEach(function (r) { r.push(0); }); S.cons.push(['', '']); render(); });
$('#exF').addEventListener('click', function () { load(EX); });

// build LP from state; skip = index of user constraint to drop (diagnostics)
function build(skip, priceOverride) {
  var n = S.ing.length, c = [], A = [], rel = [], b = [], lab = [], k = 0;
  S.ing.forEach(function (r, i) { var cost = pf(r[1], 0); if (priceOverride && priceOverride.i === i) cost = priceOverride.v; c.push(cost / 100); });
  var one = []; for (var i = 0; i < n; i++) one.push(1); A.push(one); rel.push('='); b.push(100); lab.push({ t: 'جمع = 100٪', kind: 'sum' });
  function add(row, r, v, text, kind) { if (skip === k++) return; A.push(row); rel.push(r); b.push(v); lab.push({ t: text, kind: kind }); }
  S.ing.forEach(function (r, i) {
    var mn = pf(r[2], 0), mx = pf(r[3], 100), e = []; for (var q = 0; q < n; q++) e.push(q === i ? 1 : 0);
    if (mn > 0) add(e, '>=', mn, 'حداقل «' + r[0] + '»: ' + mn + '٪', 'ing');
    if (mx < 100) add(e, '<=', mx, 'حداکثر «' + r[0] + '»: ' + mx + '٪', 'ing');
  });
  S.nut.forEach(function (nm, j) {
    var row = S.ing.map(function (r) { return pf(r[4 + j], 0) / 100; }), lo = S.cons[j] ? S.cons[j][0] : '', hi = S.cons[j] ? S.cons[j][1] : '';
    if (String(lo).trim() !== '') add(row, '>=', pf(lo, 0), 'حداقل ' + nm + ': ' + lo, 'nut');
    if (String(hi).trim() !== '') add(row, '<=', pf(hi, 0), 'حداکثر ' + nm + ': ' + hi, 'nut');
  });
  return { c: c, A: A, rel: rel, b: b, lab: lab };
}
function countUser() { return build(-1).lab.length - 1; }

$('#runF').addEventListener('click', function () {
  collect(); if (S.ing.length < 2) return U.msg('msgF', 'حداقل دو ماده لازم است.', 'bad');
  var L = build(-1), r = E.lp(L.c, L.A, L.rel, L.b), n = S.ing.length;
  if (r.status === 'infeasible') {
    var nu = L.lab.length - 1, fix = [], q;
    for (q = 0; q < nu; q++) { var L2 = build(q); if (E.lp(L2.c, L2.A, L2.rel, L2.b).status === 'optimal') fix.push(L.lab[q + 1].t); }
    $('#outF').innerHTML = ''; $('#sens').hidden = true; lastRes = null;
    return U.msg('msgF', '<b>هیچ فرمولی همهٔ محدودیت‌ها را هم‌زمان برآورده نمی‌کند.</b>' + (fix.length ? '<br>با برداشتن هر یک از این محدودیت‌ها (به‌تنهایی) جواب وجود دارد:<ul>' + fix.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' : '<br>برداشتن یک محدودیت به‌تنهایی کافی نیست؛ چند محدودیت هم‌زمان با هم ناسازگارند. حدها را گشادتر کنید یا ماده‌ای با ترکیب مناسب اضافه کنید.'), 'bad');
  }
  if (r.status !== 'optimal') { $('#outF').innerHTML = ''; return U.msg('msgF', 'حل نشد (' + r.status + '). ورودی‌ها را بررسی کنید.', 'bad'); }
  var rows = [], cost = r.obj;
  S.ing.forEach(function (row, i) { var x = r.x[i]; if (x < 1e-7) return; var mn = pf(row[2], 0), mx = pf(row[3], 100), st = Math.abs(x - mx) < 1e-6 && mx < 100 ? 'روی حد بالا' : (Math.abs(x - mn) < 1e-6 && mn > 0 ? 'روی حد پایین' : ''); rows.push({ cells: ['<span dir="rtl">' + U.esc(row[0]) + '</span>', U.num(x, 3), U.num(x * L.c[i], 3), U.num(x * L.c[i] / cost * 100, 1) + '%', '<span dir="rtl">' + st + '</span>'] }); });
  var out = S.ing.filter(function (_, i) { return r.x[i] < 1e-7; }).map(function (row) { return U.esc(row[0]); });
  var nutRows = S.nut.map(function (nm, j) { var v = 0; S.ing.forEach(function (row, i) { v += r.x[i] * pf(row[4 + j], 0) / 100; }); var lo = S.cons[j] ? S.cons[j][0] : '', hi = S.cons[j] ? S.cons[j][1] : '', lim = (String(lo).trim() ? '≥ ' + lo + ' ' : '') + (String(hi).trim() ? '≤ ' + hi : ''); return ['<span dir="rtl">' + U.esc(nm) + '</span>', U.num(v, 3), lim || '—']; });
  // shadow prices on user constraints
  var sh = [], i;
  for (i = 1; i < L.lab.length; i++) {
    var lhs = 0; L.A[i].forEach(function (a, q) { lhs += a * r.x[q]; });
    if (Math.abs(lhs - L.b[i]) > 1e-6) continue;
    var s = E.lpShadow(L.c, L.A, L.rel, L.b, i, r.obj); if (s == null || Math.abs(s) < 1e-7) continue; sh.push({ t: L.lab[i].t, s: s });
  }
  sh.sort(function (a, b) { return Math.abs(b.s) - Math.abs(a.s); });
  var h = '<div class="stats">' + U.stat('هزینه هر kg محصول', U.num(cost, 3), '', 'good') + U.stat('هزینه هر 1000 kg', U.num(cost * 1000, 1), '') + U.stat('تعداد مادهٔ مصرفی', rows.length, '') + '</div>';
  h += '<h3>فرمول بهینه</h3>' + U.table(['ماده', '٪ وزنی', 'هزینه (به ازای kg محصول)', 'سهم از هزینه', 'وضعیت'], rows);
  if (out.length) h += '<p class="lead">در فرمول نیامدند: ' + out.join('، ') + '</p>';
  h += '<h3>ترکیب محصول نهایی</h3>' + U.table(['ترکیب', 'مقدار', 'محدودیت'], nutRows);
  h += '<h3>کدام محدودیت بیشترین هزینه را ایجاد می‌کند؟</h3>';
  h += sh.length ? U.table(['محدودیت فعال', 'تغییر هزینهٔ هر kg به ازای +1 واحد در عدد حد'], sh.map(function (o) { return ['<span dir="rtl">' + U.esc(o.t) + '</span>', (o.s > 0 ? '+' : '') + U.num(o.s, 4)]; })) + '<p class="lead">مثبت: بالا بردن آن عدد، هزینه را زیاد می‌کند (معمولاً حداقل‌ها). منفی: بالا بردن آن عدد هزینه را کم می‌کند (معمولاً حداکثرها: شل‌کردن حد باعث صرفه‌جویی می‌شود). این اعداد فقط برای تغییر کوچک معتبرند؛ برای تغییر بزرگ دوباره حل کنید.</p>' : '<p class="lead">هیچ محدودیتی روی هزینه اثر نمی‌گذارد (جواب در درون ناحیه است).</p>';
  $('#outF').innerHTML = h; U.msg('msgF', 'جواب بهینه پیدا شد. توجه: این مدل فقط ترکیب شیمیایی را کنترل می‌کند؛ فناوری فرآیند، قوام امولسیون، آلرژن و الزامات استاندارد را باید جدا بررسی کنید.', 'ok');
  lastRes = [['ingredient', 'percent', 'cost_per_kg_product']].concat(S.ing.map(function (row, i) { return [row[0], r.x[i].toFixed(4), (r.x[i] * L.c[i]).toFixed(4)]; })).concat([['TOTAL_COST_PER_KG', '', cost.toFixed(4)]]);
  $('#sens').hidden = false; $('#sensIng').innerHTML = S.ing.map(function (row, i) { return '<option value="' + i + '">' + U.esc(row[0]) + '</option>'; }).join(''); sens();
});
function sens() {
  if (!lastRes) return; var i = +$('#sensIng').value, base = pf(S.ing[i][1], 0), xs = [], cs = [], ps = [];
  if (!(base > 0)) { $('#outS').innerHTML = '<div class="empty">قیمت این ماده صفر است؛ حساسیت نسبی تعریف نمی‌شود.</div>'; return; }
  for (var m = 0.2; m <= 2.0001; m += 0.05) { var L = build(-1, { i: i, v: base * m }), r = E.lp(L.c, L.A, L.rel, L.b); if (r.status === 'optimal') { xs.push(base * m); cs.push(r.obj); ps.push(r.x[i]); } }
  $('#outS').innerHTML = '<div class="two"><div id="s1"></div><div id="s2"></div></div>';
  U.chart($('#s1'), { xl: 'قیمت ماده', yl: 'هزینهٔ فرمول بهینه', series: [{ x: xs, y: cs, kind: 'line' }], vlines: [{ x: base, label: 'قیمت فعلی' }] });
  U.chart($('#s2'), { xl: 'قیمت ماده', yl: 'سهم ماده در فرمول (٪)', series: [{ x: xs, y: ps, kind: 'step', color: U.PAL[2] }], vlines: [{ x: base, label: 'قیمت فعلی' }] });
}
$('#sensIng').addEventListener('change', sens);
$('#csvF').addEventListener('click', function () { if (lastRes) U.download('least-cost-formula.csv', U.csv(lastRes)); });
load(EX);
})();
