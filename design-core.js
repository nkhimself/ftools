/* Logarina factory design: shared calculator helpers and the page renderer.
   Calculator definitions live in dairy-design.js and plant-utilities.js.
   Field: [key, label, unit, example, minimum, maximum(optional)].
   Works in the browser (mount) and in Node (solve, f) for the regression tests. */
'use strict';
const FactoryCalc = (() => {
  const percent = (key, label, value, max = 100) => [key, label, '%', value, 0, max];
  const positive = (key, label, unit, value) => [key, label, unit, value, Number.MIN_VALUE];
  const nonnegative = (key, label, unit, value) => [key, label, unit, value, 0];
  const temperature = (key, label, value) => [key, label, '°C', value, -273.15];
  const efficiency = (key, label, value) => [key, label, '%', value, Number.MIN_VALUE, 100];
  const need = (condition, message) => { if (!condition) throw new Error(message); };
  // Round without letting floating-point noise (3.0000000001) add or drop a whole unit.
  const ceil = x => Math.ceil(x - 1e-9 * Math.max(1, Math.abs(x)));
  const floor = x => Math.floor(x + 1e-9 * Math.max(1, Math.abs(x)));
  const lmtd = (a, b) => {
    need(a > 0 && b > 0, 'هر دو اختلاف دمای انتهایی باید مثبت باشند؛ جهت جریان و دماها را بررسی کنید.');
    const lo = Math.min(a, b), hi = Math.max(a, b), d = hi - lo;
    return d === 0 ? lo : d / (d < lo ? Math.log1p(d / lo) : Math.log(hi) - Math.log(lo));
  };
  const f = {percent, positive, nonnegative, temperature, efficiency, need, lmtd, ceil, floor};

  function solve(tool, values) {
    for (const [key, label, , , min = -Infinity, max = Infinity] of tool.fields) {
      const value = values[key];
      need(Number.isFinite(value) && value >= min && value <= max, `مقدار «${label}» خالی یا خارج از محدوده است.`);
    }
    const results = tool.run(values);
    need(results.every(([, value]) => Number.isFinite(value)), 'نتیجه خارج از محدودهٔ عددی است.');
    return results;
  }
  const defaults = tool => Object.fromEntries(tool.fields.map(([k, , , v]) => [k, v]));

  const nf = new Intl.NumberFormat('en-US', {maximumSignificantDigits: 5});
  const sf = new Intl.NumberFormat('en-US', {notation: 'scientific', maximumSignificantDigits: 4});
  const fmt = v => (Math.abs(v) > 0 && (Math.abs(v) < 0.001 || Math.abs(v) >= 1e9) ? sf : nf).format(v);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

  // Worked example for the guide, computed from the default inputs so it can never drift from the calculator.
  function example(tool) {
    const rows = solve(tool, defaults(tool)).slice(0, 4).map(([l, v, u]) => `${l} ≈ ${fmt(v)} ${u}`);
    return 'با مقدارهای پیش‌فرض همین ابزار: ' + rows.join('؛ ') + '.';
  }

  function guideHTML(tool) {
    const parts = (tool.parts || []).map(([s, t]) => `<li><b dir="ltr">${esc(s)}</b> — ${esc(t)}</li>`).join('');
    const src = tool.src || {};
    const srcRows = tool.fields.filter(([k]) => src[k]).map(([k, label]) => `<tr><td class="t">${esc(label)}</td><td class="t" style="white-space:normal">${esc(src[k])}</td></tr>`).join('');
    return `<details class="g" id="guide-${tool.id}"><summary>${esc(tool.title)}</summary>` +
      `<h4>این چه کاری می‌کند؟</h4><p>${esc(tool.lead)}</p>` +
      `<h4>فرمول</h4><div class="eq">${esc(tool.eq).replace(/; /g, '<br>')}</div>` +
      (parts ? `<h4>اجزای فرمول</h4><ul>${parts}</ul>` : '') +
      (tool.hand ? `<h4>ساده‌ترین راه انجام دستی</h4><p>${esc(tool.hand)}</p>` : '') +
      (srcRows ? `<h4>ورودی‌ها را از کجا بیاورم؟</h4><div class="tw"><table class="gt"><thead><tr><th class="t">ورودی</th><th class="t">از کجا و چطور</th></tr></thead><tbody>${srcRows}</tbody></table></div>` : '') +
      `<h4>مثال عددی</h4><p>${esc(example(tool))}</p>` +
      `<div class="note warn">${esc(tool.warn)}</div></details>`;
  }

  function statHTML([label, value, unit]) {
    return `<div class="stat"><div class="sl">${esc(label)}</div><div class="sv"><span dir="ltr">${fmt(value)}</span> <small>${esc(unit)}</small></div></div>`;
  }

  function mount(host, groups, options = {}) {
    const tools = groups.flatMap(([gid, , ts]) => ts.map(t => ({...t, gid})));
    const many = groups.length > 1;
    let html = '';
    if (many) html += '<div class="gchips noprint" role="group" aria-label="بخش‌های طراحی" data-xbar-before>' +
      groups.map(([gid, title, ts]) => `<button type="button" data-g="${gid}">${esc(title)}<i>${ts.length}</i></button>`).join('') + '</div>';
    html += '<div class="tabs" id="tb" role="tablist">' + tools.map(t => `<button type="button" role="tab" data-tab="${t.id}" data-g="${t.gid}">${esc(t.short || t.title)}</button>`).join('') + '</div>';
    tools.forEach((t, i) => {
      const fields = t.fields.map(([k, label, unit, value]) =>
        `<label class="f">${esc(label)} <span class="u">${esc(unit)}</span><input id="${t.id}__${k}" type="number" step="any" value="${value}" inputmode="decimal"></label>`).join('');
      const see = (t.see || []).map(([href, text]) => `<a href="${href}">${esc(text)}</a>`).join('، ');
      html += `<section data-pane="${t.id}" class="card" hidden><div class="step"><b class="n">${i + 1}</b><h2>${esc(t.title)}</h2></div>` +
        `<p class="lead">${esc(t.lead)}</p>` +
        `<div class="grid">${fields}</div>` +
        `<div class="row noprint"><button type="button" class="pri" data-run="${t.id}">محاسبه</button><button type="button" data-reset="${t.id}">بازنشانی مثال</button><a class="btn ghost" href="#guide-${t.id}" data-guide="${t.id}">راهنمای این ابزار</a></div>` +
        `<div id="msg-${t.id}"></div><div id="out-${t.id}" aria-live="polite"></div>` +
        (see ? `<p class="rel">ابزارهای مرتبط: ${see}</p>` : '') + `</section>`;
    });
    html += '<section class="card guide" id="guide"><h2>راهنما: فرمول‌ها و ورودی‌ها</h2>' +
      `<p class="lead">${esc(options.guideLead || 'هر بخش را باز کنید. عددهای پیش‌فرض نمونه‌اند و تأیید رسمی نشده‌اند؛ با داده و استاندارد پروژهٔ خودتان جایگزین کنید.')}</p>` +
      tools.map(guideHTML).join('') + '</section>';
    host.innerHTML = html;

    const $ = (s, r) => (r || host).querySelector(s), $$ = (s, r) => Array.from((r || host).querySelectorAll(s));
    function read(t) {
      return Object.fromEntries(t.fields.map(([k]) => [k, document.getElementById(`${t.id}__${k}`).valueAsNumber]));
    }
    function calculate(t) {
      const msg = document.getElementById('msg-' + t.id), out = document.getElementById('out-' + t.id);
      msg.innerHTML = ''; out.innerHTML = '';
      try {
        out.innerHTML = '<div class="stats">' + solve(t, read(t)).map(statHTML).join('') + '</div>';
      } catch (error) {
        msg.innerHTML = `<div class="note bad">${esc(error.message)}</div>`;
      }
    }
    tools.forEach(t => {
      const pane = $(`[data-pane="${t.id}"]`);
      pane.addEventListener('input', () => calculate(t));
      pane.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); calculate(t); } });
      $(`[data-run="${t.id}"]`).addEventListener('click', () => calculate(t));
      $(`[data-reset="${t.id}"]`).addEventListener('click', () => { t.fields.forEach(([k, , , v]) => { document.getElementById(`${t.id}__${k}`).value = v; }); calculate(t); });
      $(`[data-guide="${t.id}"]`).addEventListener('click', e => {
        e.preventDefault();
        const d = document.getElementById('guide-' + t.id); d.open = true; d.scrollIntoView({behavior: 'smooth', block: 'start'});
      });
      calculate(t);
    });

    // group chips show only the tabs of the chosen group; the tabs themselves are handled by U.tabs
    const show = window.U && U.tabs ? U.tabs(host) : null;
    function setGroup(gid) {
      $$('.tabs [data-tab]').forEach(b => { b.hidden = b.getAttribute('data-g') !== gid; });
      $$('.gchips [data-g]').forEach(b => b.classList.toggle('on', b.getAttribute('data-g') === gid));
    }
    if (many) {
      $$('.gchips [data-g]').forEach(b => b.addEventListener('click', () => {
        const gid = b.getAttribute('data-g'); setGroup(gid);
        const first = $(`.tabs [data-g="${gid}"]`); if (first) first.click();
      }));
    }
    $$('.tabs [data-tab]').forEach(b => b.addEventListener('click', () => { if (many) setGroup(b.getAttribute('data-g')); }));
    setGroup(groups[0][0]);
    return show;
  }
  return {f, solve, defaults, example, mount};
})();
if (typeof module === 'object') module.exports = FactoryCalc;
