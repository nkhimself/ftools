/* Main navigation dropdowns: hover (mouse), click/tap, Esc, outside click. No storage, no network. */
(function () {
  'use strict';
  var groups = Array.prototype.slice.call(document.querySelectorAll('.mainnav details.dd'));
  if (!groups.length) return;
  var hover = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  function closeAll(except) { groups.forEach(function (g) { if (g !== except) g.removeAttribute('open'); }); }
  groups.forEach(function (g) {
    var s = g.querySelector('summary');
    g.addEventListener('toggle', function () { if (g.open) closeAll(g); });
    if (hover) {
      g.addEventListener('mouseenter', function () { closeAll(g); g.setAttribute('open', ''); });
      g.addEventListener('mouseleave', function () { g.removeAttribute('open'); });
      s.addEventListener('click', function (e) { e.preventDefault(); closeAll(g); g.setAttribute('open', ''); });
    }
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.mainnav details.dd')) closeAll(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
})();
