/* Save / export toolbar for tool pages. Reads the on-screen inputs and results only; never touches calculator code.
   Saved results go to localStorage (demo). Replace save() with an API call when the Laravel backend exists. */
(function () {
  'use strict';
  var KEY = 'lgx_saved_v1', main = document.querySelector('main'); if (!main) return;
  var isForm = /formulation\.html$/.test(location.pathname);
  if (!main.querySelector('[data-pane]') && !isForm) return;
  function T(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function vis(e) { return e.offsetParent !== null; }
  function scope() { var ps = Array.prototype.slice.call(main.querySelectorAll('[data-pane]')).filter(function (p) { return !p.hidden; }); return ps[0] || null; }
  function label(el) {
    var l = el.closest('label');
    if (l) { var c = l.cloneNode(true); Array.prototype.forEach.call(c.querySelectorAll('input,select,textarea,option,button'), function (x) { x.parentNode.removeChild(x); }); var t = T(c.textContent); if (t) return t; }
    return T(el.getAttribute('aria-label') || el.name || el.id);
  }
  function val(el) {
    if (el.tagName === 'SELECT') return T(el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '');
    if (el.type === 'checkbox') return el.checked ? 'بله' : 'خیر';
    if (el.tagName === 'TEXTAREA') { var n = el.value.split(/\r?\n/).filter(Boolean).length; return el.value.length > 200 ? n + ' ردیف داده' : T(el.value); }
    return T(el.value);
  }
  function rowsOfTable(tb) {
    var rows = [];
    Array.prototype.forEach.call(tb.querySelectorAll('tr'), function (tr) {
      var r = []; Array.prototype.forEach.call(tr.children, function (c) { var f = c.querySelector('input,select'); r.push(f ? val(f) : T(c.textContent)); });
      if (r.some(function (x) { return x !== ''; })) rows.push(r);
    });
    return rows;
  }
  function capture() {
    var sc = scope(), d = { inputs: [], tables: [], results: [], notes: [] };
    function mine(e) { var p = e.closest('[data-pane]'); return !p || p === sc; }
    Array.prototype.forEach.call(main.querySelectorAll('input,select,textarea'), function (el) {
      if (!mine(el) || el.closest('.xbar') || el.closest('table.edit') || el.closest('[id^="out"]') || el.type === 'file' || el.type === 'button' || el.type === 'search' || !vis(el)) return;
      d.inputs.push([label(el), val(el)]);
    });
    Array.prototype.forEach.call(main.querySelectorAll('table.edit'), function (tb) { if (mine(tb) && vis(tb)) d.tables.push({ n: 'جدول ورودی', rows: rowsOfTable(tb) }); });
    Array.prototype.forEach.call(main.querySelectorAll('[id^="out"]'), function (c) {
      if (!mine(c)) return;
      Array.prototype.forEach.call(c.querySelectorAll('.stat'), function (s) { var l = s.querySelector('.sl'), v = s.querySelector('.sv'); if (l && v) d.results.push([T(l.textContent), T(v.textContent)]); });
      Array.prototype.forEach.call(c.querySelectorAll('table:not(.edit)'), function (tb) { d.tables.push({ n: 'جدول نتیجه', rows: rowsOfTable(tb), r: 1 }); });
      Array.prototype.forEach.call(c.querySelectorAll('.note'), function (n) { if (d.notes.length < 6) d.notes.push(T(n.textContent)); });
    });
    d.has = d.results.length > 0 || d.tables.some(function (t) { return t.r; });
    var tab = main.querySelector('.tabs .on');
    return { d: d, tool: T(main.querySelector('h1').textContent), tab: tab ? T(tab.textContent) : '', tid: tab ? tab.getAttribute('data-tab') : '' };
  }
  function cell(c) { c = String(c); return /[",\r\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }
  function rowsOf(it) {
    var d = it.d, r = [[it.title], [it.tool + (it.tab ? ' / ' + it.tab : '')], [it.ts], [], ['ورودی‌ها']];
    d.inputs.forEach(function (x) { r.push(x); }); r.push([], ['نتیجه‌ها']); d.results.forEach(function (x) { r.push(x); });
    d.tables.forEach(function (t) { r.push([], [t.n]); t.rows.forEach(function (x) { r.push(x); }); }); d.notes.forEach(function (n) { r.push([n]); }); return r;
  }
  function download(name, text) { var b = new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 500); }
  var tt; function toast(m) { var t = document.querySelector('.toast') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'toast', role: 'status' })); t.textContent = m; t.hidden = false; clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, 2800); }
  function item(title) { var c = capture(); return { id: Date.now().toString(36), ts: new Date().toISOString(), page: location.pathname.split('/').pop() || 'index.html', tool: c.tool, tab: c.tab, tid: c.tid, title: title || c.tool, d: c.d }; }
  function save(title) {
    var it = item(title), a; try { a = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { a = []; }
    a.unshift(it); try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, 100))); toast('ذخیره شد (فقط در این مرورگر). در «نتایج من» ببینید.'); } catch (e) { toast('ذخیره ممکن نشد؛ مرورگر اجازهٔ ذخیره نمی‌دهد.'); }
  }
  var bar = document.createElement('div'); bar.className = 'xbar noprint';
  bar.innerHTML = '<b>خروجی</b><button type="button" data-x="save">ذخیره نتیجه</button><button type="button" data-x="print">چاپ / PDF</button><button type="button" data-x="csv">CSV</button><button type="button" data-x="copy">کپی متن</button><a class="btn ghost" href="results.html">نتایج ذخیره‌شده</a><span class="xsave" hidden><input type="text" class="rtl" maxlength="80" aria-label="عنوان"><button type="button" class="pri xok" data-x="ok">ذخیره</button></span>';
  var anchor = main.querySelector('[data-xbar-before]') || main.querySelector('.tabs') || main.querySelector('.card'); if (!anchor) return;
  anchor.parentNode.insertBefore(bar, anchor);
  var box = bar.querySelector('.xsave'), ti = box.querySelector('input');
  bar.addEventListener('click', function (e) {
    var x = e.target.getAttribute && e.target.getAttribute('data-x'); if (!x) return;
    if (x === 'print') { window.print(); return; }
    if (x === 'ok') { save(ti.value.trim()); box.hidden = true; return; }
    var c = capture(); if (!c.d.has) { toast('ابتدا محاسبه را اجرا کنید تا نتیجه‌ای برای ذخیره یا خروجی باشد.'); return; }
    if (x === 'save') { ti.value = c.tool + (c.tab ? ' — ' + c.tab : '') + ' — ' + new Date().toLocaleDateString('fa-IR'); box.hidden = false; ti.focus(); ti.select(); }
    else if (x === 'csv') { var it = item(''); download('logarina-' + it.page.replace('.html', '') + '.csv', rowsOf(it).map(function (r) { return r.map(cell).join(','); }).join('\r\n')); }
    else if (x === 'copy') {
      var it2 = item(''), txt = rowsOf(it2).map(function (r) { return r.join(': '); }).join('\n');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { toast('کپی شد.'); }, function () { toast('کپی ممکن نشد.'); }); else toast('مرورگر شما کپی خودکار را پشتیبانی نمی‌کند.');
    }
  });
  ti.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); save(ti.value.trim()); box.hidden = true; } });
})();
