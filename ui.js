// Shared UI helpers
(function () {
'use strict';
var U = window.U = {};
U.$ = function (s, r) { return (r || document).querySelector(s); };
U.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
U.el = function (tag, attrs, html) { var e = document.createElement(tag); if (attrs) for (var k in attrs) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); } if (html != null) e.innerHTML = html; return e; };
U.esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
U.num = function (v, d) { if (v == null || !isFinite(v)) return '—'; d = d == null ? 3 : d; var a = Math.abs(v); if (a !== 0 && (a < 1e-3 || a >= 1e7)) return v.toExponential(2); return String(+v.toFixed(d)); };
U.sig = function (v, n) { if (v == null || !isFinite(v)) return '—'; if (v === 0) return '0'; var a = Math.abs(v); if (a < 1e-3 || a >= 1e7) return v.toExponential(n - 1); return String(+v.toPrecision(n)); };
U.read = function (id) { return parseFloat(U.$('#' + id).value); };
U.csv = function (rows) { return '﻿' + rows.map(function (r) { return r.map(function (c) { c = String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\r\n'); };
U.download = function (name, text, type) {
  var b = new Blob([text], { type: type || 'text/csv;charset=utf-8' }), a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
};
U.msg = function (id, text, kind) { var e = U.$('#' + id); if (!e) return; e.className = 'note ' + (kind || ''); e.innerHTML = text; e.style.display = text ? '' : 'none'; };
// table from rows [[...]], head [..]
U.table = function (head, rows, cls) {
  return '<div class="tw"><table class="' + (cls || '') + '"><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
    rows.map(function (r) { return '<tr' + (r.cls ? ' class="' + r.cls + '"' : '') + '>' + (r.cells || r).map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
};
U.stat = function (label, value, unit, cls) { return '<div class="stat ' + (cls || '') + '"><div class="sl">' + label + '</div><div class="sv"><span dir="ltr">' + value + '</span>' + (unit ? ' <small>' + unit + '</small>' : '') + '</div></div>'; };
// file → textarea
U.bindFile = function (inputId, areaId) {
  var f = U.$('#' + inputId); if (!f) return;
  f.addEventListener('change', function () { var file = f.files[0]; if (!file) return; var r = new FileReader(); r.onload = function () { U.$('#' + areaId).value = r.result; U.$('#' + areaId).dispatchEvent(new Event('input')); }; r.readAsText(file); f.value = ''; });
};
// nice ticks
function nice(lo, hi, n) {
  if (!(hi > lo)) { hi = lo + 1; }
  var span = hi - lo, step = Math.pow(10, Math.floor(Math.log(span / n) / Math.LN10)), err = span / n / step;
  if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
  var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for (var v = a; v <= b + step * 1e-6; v += step) t.push(+v.toPrecision(12));
  return { lo: a, hi: b, ticks: t };
}
function TK(t) { return Math.abs(t) >= 10000 ? Math.round(t).toLocaleString('en-US') : U.num(t, 4); }
var PAL = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0891b2', '#be185d', '#4b5563'];
U.PAL = PAL;
// opts: {w,h,xl,yl,series:[{name,x,y,kind:'line'|'pts'|'step',color,dash,w}], vlines:[{x,label}], hlines:[{y,label}], xmin,xmax,ymin,ymax}
U.chart = function (host, o) {
  var W = o.w || 640, H = o.h || 340, m = { l: 62, r: 16, t: 14, b: 48 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
  var xs = [], ys = [];
  o.series.forEach(function (s) { s.x.forEach(function (v, i) { if (isFinite(v) && isFinite(s.y[i])) { xs.push(v); ys.push(s.y[i]); } }); });
  (o.vlines || []).forEach(function (l) { if (isFinite(l.x)) xs.push(l.x); }); (o.hlines || []).forEach(function (l) { if (isFinite(l.y)) ys.push(l.y); });
  if (!xs.length) { host.innerHTML = '<div class="empty">داده‌ای برای نمایش نیست</div>'; return; }
  var xmin = o.xmin != null ? o.xmin : Math.min.apply(null, xs), xmax = o.xmax != null ? o.xmax : Math.max.apply(null, xs);
  var ymin = o.ymin != null ? o.ymin : Math.min.apply(null, ys), ymax = o.ymax != null ? o.ymax : Math.max.apply(null, ys);
  var nx = nice(xmin, xmax, 7), ny = nice(ymin, ymax, 6);
  if (o.xmin != null) nx.lo = o.xmin; if (o.xmax != null) nx.hi = o.xmax; if (o.ymin != null) ny.lo = o.ymin; if (o.ymax != null) ny.hi = o.ymax;
  function X(v) { return m.l + (v - nx.lo) / (nx.hi - nx.lo) * pw; } function Y(v) { return m.t + ph - (v - ny.lo) / (ny.hi - ny.lo) * ph; }
  var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" direction="ltr" role="img" aria-label="' + U.esc(o.title || 'chart') + '" style="direction:ltr">';
  nx.ticks.forEach(function (t) { if (t < nx.lo - 1e-9 || t > nx.hi + 1e-9) return; s += '<line x1="' + X(t) + '" x2="' + X(t) + '" y1="' + m.t + '" y2="' + (m.t + ph) + '" class="grid"/><text x="' + X(t) + '" y="' + (H - m.b + 16) + '" class="tick" text-anchor="middle">' + TK(t) + '</text>'; });
  ny.ticks.forEach(function (t) { if (t < ny.lo - 1e-9 || t > ny.hi + 1e-9) return; s += '<line y1="' + Y(t) + '" y2="' + Y(t) + '" x1="' + m.l + '" x2="' + (m.l + pw) + '" class="grid"/><text y="' + (Y(t) + 4) + '" x="' + (m.l - 7) + '" class="tick" text-anchor="end">' + TK(t) + '</text>'; });
  s += '<rect x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '" class="frame"/>';
  (o.hlines || []).forEach(function (l) { if (!isFinite(l.y)) return; s += '<line x1="' + m.l + '" x2="' + (m.l + pw) + '" y1="' + Y(l.y) + '" y2="' + Y(l.y) + '" class="ref"/><text x="' + (m.l + pw - 4) + '" y="' + (Y(l.y) - 4) + '" class="reft" text-anchor="end">' + U.esc(l.label || '') + '</text>'; });
  (o.vlines || []).forEach(function (l) { if (!isFinite(l.x)) return; s += '<line y1="' + m.t + '" y2="' + (m.t + ph) + '" x1="' + X(l.x) + '" x2="' + X(l.x) + '" class="ref"/><text transform="translate(' + (X(l.x) - 4) + ',' + (m.t + 10) + ') rotate(-90)" class="reft" text-anchor="end">' + U.esc(l.label || '') + '</text>'; });
  o.series.forEach(function (se, k) {
    var c = se.color || PAL[k % PAL.length], pts = [], i;
    for (i = 0; i < se.x.length; i++) if (isFinite(se.x[i]) && isFinite(se.y[i])) pts.push([X(se.x[i]), Y(se.y[i])]);
    if (se.kind === 'pts') { s += pts.map(function (p) { return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.6" fill="' + c + '" fill-opacity=".85"/>'; }).join(''); }
    else if (pts.length > 1) {
      var d = ''; pts.forEach(function (p, j) { if (se.kind === 'step' && j) d += 'L' + p[0].toFixed(1) + ',' + pts[j - 1][1].toFixed(1); d += (j ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); });
      s += '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + (se.w || 2) + '"' + (se.dash ? ' stroke-dasharray="' + se.dash + '"' : '') + ' stroke-linejoin="round"/>';
    }
  });
  s += '<text x="' + (m.l + pw / 2) + '" y="' + (H - 8) + '" class="axl" text-anchor="middle">' + (o.xl || '') + '</text>';
  s += '<text transform="translate(14,' + (m.t + ph / 2) + ') rotate(-90)" class="axl" text-anchor="middle">' + (o.yl || '') + '</text></svg>';
  var leg = o.series.filter(function (x) { return x.name; }).map(function (se, k) { return '<span class="lg"><i style="background:' + (se.color || PAL[o.series.indexOf(se) % PAL.length]) + '"></i>' + se.name + '</span>'; }).join('');
  host.innerHTML = s + (leg ? '<div class="legend">' + leg + '</div>' : '');
};
// tabs
U.tabs = function (root) {
  var bs = U.$$('[data-tab]', root), ps = U.$$('[data-pane]', root);
  function show(id) { bs.forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === id); b.setAttribute('aria-selected', b.getAttribute('data-tab') === id); }); ps.forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== id; }); }
  bs.forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-tab')); }); });
  if (bs.length) show(bs[0].getAttribute('data-tab'));
  return show;
};
})();
