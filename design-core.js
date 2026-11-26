/* Shared calculator definitions and browser renderer for Factory Design. */
'use strict';
const FactoryCalc = (() => {
  // Field: key, label, unit, example, minimum, maximum (optional).
  const percent = (key, label, value, max = 100) => [key, label, '%', value, 0, max];
  const positive = (key, label, unit, value) => [key, label, unit, value, Number.MIN_VALUE];
  const nonnegative = (key, label, unit, value) => [key, label, unit, value, 0];
  const temperature = (key, label, value) => [key, label, '°C', value, -273.15];
  const efficiency = (key, label, value) => [key, label, '%', value, Number.MIN_VALUE, 100];
  const need = (condition, message) => { if (!condition) throw new Error(message); };
  // Round up without letting floating-point noise (e.g. 3.0000000001) add a whole extra unit.
  const ceil = x => Math.ceil(x - 1e-9 * Math.max(1, Math.abs(x)));
  const lmtd = (a, b) => {
    need(a > 0 && b > 0, 'هر دو اختلاف دمای انتهایی باید مثبت باشند؛ جهت جریان و دماها را بررسی کنید.');
    const lo = Math.min(a, b), hi = Math.max(a, b), d = hi - lo;
    return d === 0 ? lo : d / (d < lo ? Math.log1p(d / lo) : Math.log(hi) - Math.log(lo));
  };
  const floor = x => Math.floor(x + 1e-9 * Math.max(1, Math.abs(x)));
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
  function el(tag, text, cls) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  }
  const fmt = new Intl.NumberFormat('en-US', {maximumSignificantDigits: 5});
  const sci = new Intl.NumberFormat('en-US', {notation:'scientific', maximumSignificantDigits: 4});
  function mount(host, groups) {
    const links = el('div', '', 'row noprint');
    host.append(links);
    for (const [groupId, title, tools] of groups) {
      const link = el('a', title, 'btn');
      link.href = '#' + groupId;
      links.append(link);
      const heading = el('h2', title);
      heading.id = groupId;
      heading.className = 'design-heading';
      host.append(heading);
      const shortcuts = el('div', '', 'toc noprint');
      host.append(shortcuts);
      for (const tool of tools) {
        const shortcut = el('a', tool.title);
        shortcut.href = '#' + tool.id;
        shortcuts.append(shortcut);
        const card = el('section', '', 'card');
        card.id = tool.id;
        card.append(el('h3', tool.title), el('p', tool.note, 'lead'));
        const form = el('form');
        form.noValidate = true;
        const grid = el('div', '', 'grid');
        const inputs = {};
        for (const [key, label, unit, example] of tool.fields) {
          const wrap = el('label', `${label} (${unit})`, 'f');
          const control = el('input');
          control.type = 'number';
          control.step = 'any';
          control.defaultValue = example;
          control.required = true;
          inputs[key] = control;
          wrap.append(control);
          grid.append(wrap);
        }
        const buttons = el('div', '', 'row');
        const submit = el('button', 'محاسبه', 'pri');
        submit.type = 'submit';
        const reset = el('button', 'بازنشانی مثال');
        reset.type = 'reset';
        buttons.append(submit, reset);
        form.append(grid, buttons);
        const output = el('div');
        output.setAttribute('aria-live', 'polite');
        const methods = el('details');
        methods.append(el('summary', 'فرمول و فرض‌ها'), el('div', tool.eq, 'eq'));
        function calculate() {
          output.replaceChildren();
          try {
            const values = Object.fromEntries(Object.entries(inputs).map(([k, input]) => [k, input.valueAsNumber]));
            const stats = el('div', '', 'stats');
            for (const [label, value, unit] of solve(tool, values)) {
              const stat = el('div', '', 'stat');
              const reading = el('div', (Math.abs(value) > 0 && (Math.abs(value) < 0.001 || Math.abs(value) >= 1e9) ? sci : fmt).format(value), 'sv');
              reading.append(el('small', ' ' + unit));
              stat.append(el('div', label, 'sl'), reading);
              stats.append(stat);
            }
            output.append(stats);
          } catch (error) {
            output.append(el('p', error.message, 'note bad'));
          }
        }
        form.addEventListener('submit', event => { event.preventDefault(); calculate(); });
        form.addEventListener('input', () => output.replaceChildren(el('p', 'ورودی تغییر کرد؛ دوباره محاسبه کنید.', 'lead')));
        form.addEventListener('reset', () => setTimeout(calculate, 0));
        card.append(form, output, methods);
        host.append(card);
        calculate();
      }
    }
    // Calculator anchors are generated after parsing; honor an incoming deep link.
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }
  return {f, solve, mount};
})();
if (typeof module === 'object') module.exports = FactoryCalc;
