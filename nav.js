/* Header dropdown menus: open on hover (mouse) or click/tap, close on outside click or Escape. */
(function () {
  'use strict';
  var groups = Array.prototype.slice.call(document.querySelectorAll('header.top details.dd'));
  if (!groups.length) return;
  var canHover = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  function closeAll(except) { groups.forEach(function (g) { if (g !== except) g.removeAttribute('open'); }); }
  groups.forEach(function (g) {
    g.addEventListener('toggle', function () { if (g.open) closeAll(g); });
    if (canHover) {
      // With a mouse the menu is already open from hover; a click must not toggle it shut.
      g.querySelector('summary').addEventListener('click', function (e) { e.preventDefault(); closeAll(g); g.setAttribute('open', ''); });
      g.addEventListener('mouseenter', function () { closeAll(g); g.setAttribute('open', ''); });
      g.addEventListener('mouseleave', function () { g.removeAttribute('open'); });
    }
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('header.top details.dd')) closeAll(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
})();
