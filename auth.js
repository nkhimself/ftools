/* Demo signup/login: validates in the browser and shows a result. Nothing is saved or sent. */
(function () {
  'use strict';
  var form = document.getElementById('af'); if (!form) return;
  var mode = form.getAttribute('data-mode'), top = document.getElementById('aerr'), done = document.getElementById('done');
  function en(s) { return s.replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; }); }
  var PH = /^09\d{9}$/, EM = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function check(f) {
    var k = f.getAttribute('data-v') || '', req = f.hasAttribute('data-req'), v = f.type === 'password' ? f.value : f.value.trim();
    if (f.type === 'checkbox') return req && !f.checked ? 'برای ادامه باید موافقت کنید.' : '';
    if (req && !v) return 'این بخش را پر کنید.';
    if (!v) return '';
    if (k === 'phone' && !PH.test(en(v))) return 'موبایل را مثل 09123456789 وارد کنید.';
    if (k === 'email' && !EM.test(v)) return 'ایمیل معتبر نیست.';
    if (k === 'id' && !(PH.test(en(v)) || EM.test(v))) return 'موبایل یا ایمیل معتبر وارد کنید.';
    if (k === 'pw' && v.length < 8) return 'رمز عبور دست‌کم ۸ نویسه باشد.';
    if (k === 'pw2' && v !== form.elements.pw.value) return 'تکرار رمز با رمز بالا یکسان نیست.';
    return '';
  }
  function show(f, msg) {
    var box = f.closest('.fld'); if (!box) return;
    box.classList.toggle('err', !!msg); var em = box.querySelector('.em'); if (em) em.textContent = msg;
  }
  var fields = Array.prototype.slice.call(form.querySelectorAll('[data-req],[data-v]'));
  fields.forEach(function (f) { f.addEventListener('blur', function () { show(f, check(f)); }); });
  Array.prototype.forEach.call(form.querySelectorAll('[data-show]'), function (b) {
    b.addEventListener('click', function () { var i = b.parentNode.querySelector('input'); var p = i.type === 'password'; i.type = p ? 'text' : 'password'; b.textContent = p ? 'پنهان' : 'نمایش'; });
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var first = null;
    fields.forEach(function (f) { var m = check(f); show(f, m); if (m && !first) first = f; });
    if (first) { top.hidden = false; first.focus(); return; }
    top.hidden = true;
    var nm = form.elements.fn ? form.elements.fn.value.trim() : '';
    var who = document.getElementById('who'); if (who) who.textContent = nm ? ' ' + nm : '';
    form.reset(); form.hidden = true; done.hidden = false; done.scrollIntoView();
  });
})();
