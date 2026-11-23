(function () {
  'use strict';
  var q = document.getElementById('gq'), items = Array.prototype.slice.call(document.querySelectorAll('.gl')), no = document.getElementById('gno'); if (!q) return;
  function norm(s) { return String(s || '').toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\u064b-\u065f]/g, '').replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }); }
  var hay = items.map(function (e) { return norm(e.textContent); });
  q.addEventListener('input', function () {
    var ts = norm(q.value).split(/\s+/).filter(Boolean), n = 0;
    items.forEach(function (e, i) { var ok = ts.every(function (t) { return hay[i].indexOf(t) > -1; }); e.hidden = !ok; if (ok) n++; });
    no.hidden = n > 0;
  });
})();
