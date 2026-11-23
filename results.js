/* Saved results (demo: this browser only). Replace load/store with API calls once the Laravel backend exists. */
(function () {
  'use strict';
  var KEY = 'lgx_saved_v1', list = document.getElementById('rl'); if (!list) return;
  var q = document.getElementById('rq'), f = document.getElementById('rf'), empty = document.getElementById('rempty');
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function store(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }
  function cell(c) { c = String(c); return /[",\r\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }
  function csv(rows) { return '\ufeff' + rows.map(function (r) { return r.map(cell).join(','); }).join('\r\n'); }
  function download(name, text, type) { var b = new Blob([text], { type: type }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 500); }
  function rowsOf(it) {
    var d = it.d, r = [[it.title], [it.tool + (it.tab ? ' / ' + it.tab : '')], [it.ts], [], ['ورودی‌ها']];
    d.inputs.forEach(function (x) { r.push(x); }); r.push([], ['نتیجه‌ها']); d.results.forEach(function (x) { r.push(x); });
    d.tables.forEach(function (t) { r.push([], [t.n]); t.rows.forEach(function (x) { r.push(x); }); }); return r;
  }
  function el(tag, txt, cls) { var e = document.createElement(tag); if (txt != null) e.textContent = txt; if (cls) e.className = cls; return e; }
  function kv(rows) { var t = el('table'); rows.forEach(function (r) { var tr = el('tr'); r.forEach(function (c) { tr.appendChild(el('td', c)); }); t.appendChild(tr); }); return t; }
  function render() {
    var all = load(), ts = (q.value || '').trim().toLowerCase(), tool = f.value;
    var tools = {}; all.forEach(function (i) { tools[i.tool] = 1; });
    var cur = f.value; f.textContent = ''; var o0 = el('option', 'همهٔ ابزارها'); o0.value = ''; f.appendChild(o0);
    Object.keys(tools).forEach(function (t) { var o = el('option', t); o.value = t; f.appendChild(o); }); f.value = tools[cur] ? cur : ''; tool = f.value;
    var shown = all.filter(function (i) { return (!tool || i.tool === tool) && (!ts || (i.title + ' ' + i.tool).toLowerCase().indexOf(ts) > -1); });
    list.textContent = ''; empty.hidden = all.length > 0;
    shown.forEach(function (it) {
      var box = el('div', null, 'sv-it'), when = '';
      try { when = new Date(it.ts).toLocaleString('fa-IR'); } catch (e) { when = it.ts; }
      box.appendChild(el('h3', it.title)); box.appendChild(el('div', it.tool + (it.tab ? ' · ' + it.tab : '') + ' · ' + when, 'meta'));
      var row = el('div', null, 'row'), go = el('a', 'باز کردن ابزار', 'btn ghost'); go.href = it.page + (it.tid ? '#tab-' + it.tid : '');
      var bc = el('button', 'CSV'), bd = el('button', 'حذف'); bc.type = bd.type = 'button';
      bc.addEventListener('click', function () { download('logarina-' + it.id + '.csv', csv(rowsOf(it)), 'text/csv;charset=utf-8'); });
      bd.addEventListener('click', function () { if (confirm('این نتیجه حذف شود؟')) { store(load().filter(function (x) { return x.id !== it.id; })); render(); } });
      row.appendChild(go); row.appendChild(bc); row.appendChild(bd); box.appendChild(row);
      var det = el('details'); det.appendChild(el('summary', 'دیدن جزئیات'));
      if (it.d.results.length) { det.appendChild(el('b', 'نتیجه‌ها')); det.appendChild(kv(it.d.results)); }
      if (it.d.inputs.length) { det.appendChild(el('b', 'ورودی‌ها')); det.appendChild(kv(it.d.inputs)); }
      it.d.tables.forEach(function (t) { det.appendChild(el('b', t.n)); det.appendChild(kv(t.rows)); });
      box.appendChild(det); list.appendChild(box);
    });
  }
  q.addEventListener('input', render); f.addEventListener('change', render);
  document.getElementById('rj').addEventListener('click', function () { download('logarina-results.json', JSON.stringify(load(), null, 1), 'application/json'); });
  document.getElementById('rx').addEventListener('click', function () { if (load().length && confirm('همهٔ نتیجه‌های ذخیره‌شده حذف شوند؟')) { store([]); render(); } });
  render();
})();
