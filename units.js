/* Unit converter: all math in the browser; data comes from units-data.js (generated). */
(function () {
  'use strict';
  var D = window.LGU, tabs = document.getElementById('ucats'); if (!D || !tabs) return;
  var inp = document.getElementById('uv'), sel = document.getElementById('uf'), tb = document.getElementById('ut'), no = document.getElementById('uno');
  var cat = D[0];
  function num(s) {
    s = String(s).replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; }).replace(/٫/g, '.').replace(/[٬,\s]/g, '');
    return /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s) ? parseFloat(s) : NaN;
  }
  function fmt(x) { if (!isFinite(x)) return '—'; if (x === 0) return '0'; var a = Math.abs(x); return (a >= 1e9 || a < 1e-5) ? x.toExponential(4) : String(parseFloat(x.toPrecision(7))); }
  function toK(v, i) { return i === 0 ? v + 273.15 : i === 1 ? (v - 32) * 5 / 9 + 273.15 : v; }
  function fromK(k, i) { return i === 0 ? k - 273.15 : i === 1 ? (k - 273.15) * 9 / 5 + 32 : k; }
  window.LGU_convert = function (c, v, from, to) { return c.s === 'T' ? fromK(toK(v, from), to) : v * c.u[from][1] / c.u[to][1]; };
  function draw() {
    var v = num(inp.value), from = sel.selectedIndex < 0 ? 0 : sel.selectedIndex;
    tb.textContent = ''; no.hidden = !isNaN(v); no.textContent = 'یک عدد معتبر وارد کنید.';
    if (isNaN(v)) return;
    cat.u.forEach(function (u, i) {
      var tr = document.createElement('tr'), a = document.createElement('td'), b = document.createElement('td');
      a.textContent = u[0]; b.textContent = fmt(window.LGU_convert(cat, v, from, i)); if (i === from) tr.className = 'src';
      tr.appendChild(a); tr.appendChild(b); tb.appendChild(tr);
    });
  }
  function setCat(id, keep) {
    cat = D.filter(function (c) { return c.id === id; })[0] || D[0];
    Array.prototype.forEach.call(tabs.children, function (b) { b.classList.toggle('on', b.getAttribute('data-cat') === cat.id); });
    sel.textContent = ''; cat.u.forEach(function (u) { var o = document.createElement('option'); o.textContent = u[0]; sel.appendChild(o); });
    if (!keep) inp.value = '1'; draw();
  }
  D.forEach(function (c) { var b = document.createElement('button'); b.type = 'button'; b.textContent = c.t; b.setAttribute('data-cat', c.id); b.addEventListener('click', function () { history.replaceState(null, '', '#cat-' + c.id); setCat(c.id); }); tabs.appendChild(b); });
  inp.addEventListener('input', draw); sel.addEventListener('change', draw);
  function fromHash() { var m = /^#cat-(\w+)$/.exec(location.hash); setCat(m ? m[1] : D[0].id); }
  fromHash(); window.addEventListener('hashchange', fromHash);
})();
