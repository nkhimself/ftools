/* Logarina: header search, "/" shortcut, deep links (#tab-x), header shadow. No network, no storage. */
(function () {
  'use strict';
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\u064b-\u065f]/g, '')
      .replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; });
  }
  var IDX = (window.LGX || []).map(function (x) { x._n = norm(x.t); x._h = norm(x.t + ' ' + x.g + ' ' + (x.k || '')); return x; });
  function find(q) {
    var ts = norm(q).split(/\s+/).filter(Boolean);
    if (!ts.length) return [];
    var r = IDX.filter(function (x) { return ts.every(function (t) { return x._h.indexOf(t) > -1; }); });
    function inTitle(x) { return ts.every(function (t) { return x._n.indexOf(t) > -1; }) ? 0 : 1; }
    r.sort(function (a, b) { return inTitle(a) - inTitle(b); });
    return r.slice(0, 8);
  }
  function bind(inp) {
    var res = inp.parentNode.querySelector('.qres'), cur = -1;
    function close() { res.hidden = true; cur = -1; }
    function mark(as) { Array.prototype.forEach.call(as, function (a, i) { a.classList.toggle('on', i === cur); }); }
    function render() {
      res.textContent = '';
      if (!inp.value.trim()) { close(); return; }
      var items = find(inp.value);
      if (!items.length) { var d = document.createElement('div'); d.className = 'none'; d.textContent = 'ابزاری پیدا نشد. کلمهٔ دیگری امتحان کنید.'; res.appendChild(d); }
      items.forEach(function (x) {
        var a = document.createElement('a'), s = document.createElement('span'), g = document.createElement('small');
        a.href = x.u; s.textContent = x.t; g.textContent = x.g; a.appendChild(s); a.appendChild(g); res.appendChild(a);
      });
      cur = -1; res.hidden = false;
    }
    inp.addEventListener('input', render);
    inp.addEventListener('focus', render);
    inp.addEventListener('keydown', function (e) {
      var as = res.querySelectorAll('a');
      if (e.key === 'Escape') { close(); inp.blur(); return; }
      if (!as.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); cur = (cur + (e.key === 'ArrowDown' ? 1 : -1) + as.length) % as.length; mark(as); }
      else if (e.key === 'Enter') { e.preventDefault(); location.href = as[cur > -1 ? cur : 0].getAttribute('href'); }
    });
    document.addEventListener('click', function (e) { if (!inp.parentNode.contains(e.target)) close(); });
  }
  Array.prototype.forEach.call(document.querySelectorAll('.qin'), bind);
  document.addEventListener('keydown', function (e) {
    var t = (e.target.tagName || '').toLowerCase();
    if (e.key === '/' && t !== 'input' && t !== 'textarea' && t !== 'select') { var q = document.querySelector('.qin'); if (q) { e.preventDefault(); q.focus(); } }
  });
  function deep() {
    var m = /^#tab-([\w-]+)$/.exec(location.hash); if (!m) return;
    var b = document.querySelector('[data-tab="' + m[1] + '"]');
    if (b) { b.click(); var t = b.parentNode; if (t && t.scrollIntoView) t.scrollIntoView(); }
  }
  deep(); window.addEventListener('hashchange', deep);
  var h = document.querySelector('.hd2');
  if (h) window.addEventListener('scroll', function () { h.classList.toggle('sc', window.pageYOffset > 4); }, { passive: true });
})();
