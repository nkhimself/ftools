'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {solve, f} = require('../design-core.js');
const groups = [...require('../dairy-design.js'), ...require('../plant-utilities.js')];
const tools = new Map(groups.flatMap(([, , ts]) => ts.map(t => [t.id, t])));
function values(id, overrides = {}) {
  const tool = tools.get(id);
  return solve(tool, {...Object.fromEntries(tool.fields.map(([k, , , value]) => [k, value])), ...overrides}).map(([, value]) => value);
}
function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) <= 1e-8 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
}
const cases = {
  throughput: [1000/0.97, {m:1000}], tankers: [3], silos: [21000],
  'cheese-whey': [2000], 'cheese-vats': [4120], ripening: [4000], yogurt: [3536], regeneration: [61.95],
  homogenizer: [15/1.03], packaging: [20000], 'water-effluent': [10], equalization: [1.875],
  'cip-hydraulics': [10.602875205865553], 'air-power': [225], 'utility-summary': [1150], warehouse: [50000], economics: [6000000],
  exchanger: [541.6666666666666], steam: [1814400/2100, {hs:2700,hc:600,loss:0.8,q:500}],
  boiler: [664.4444444444445], pump: [0.5/(60*Math.PI*0.0325**2)], cip: [1020]
};
assert.equal(tools.size, Object.keys(cases).length);
for (const [id, [expected, overrides]] of Object.entries(cases)) {
  test(`${id}: reference case and valid defaults`, () => {
    assert.ok(values(id).length > 1);
    close(values(id, overrides)[0], expected);
  });
}
test('tankers: count, unloading time and bays', () => {
  const [n, time, rate, bays] = values('tankers');
  close(n, 3); close(time, 7000/20000*60+20); close(rate, 0.9); close(bays, 1);
  assert.equal(values('tankers', {m: 21001})[0], 4);
  assert.ok(values('tankers', {m: 210000, h: 2})[3] > 1);
});
test('ripening: brine volume and pallet count', () => {
  const [brining, brine, stock, pallets, area] = values('ripening');
  close(brining, 4000); close(brine, 2*4000/1180); close(stock, 120000);
  close(pallets, Math.ceil(120000/(800*0.85))); close(area, Math.ceil(pallets/3)*1.2/0.45);
});
test('utility summary: design loads apply coincidence to the sum', () => {
  const r = values('utility-summary');
  close(r[1], 1150*0.8); close(r[2], 220); close(r[3], 220*0.75);
  close(r[4], 310); close(r[5], 310*0.85); close(r[6], 18); close(r[7], 18*0.7);
});
test('rounding guard: exact multiples do not gain an extra unit', () => {
  assert.equal(f.ceil(3.0000000000001), 3);
  assert.equal(f.ceil(3.1), 4);
  assert.equal(f.floor(2.9999999999999), 3);
});
test('LMTD: equal differences and nearly equal differences', () => {
  close(f.lmtd(20,20),20);
  close(f.lmtd(20,20 + 1e-10),20);
  assert.throws(() => f.lmtd(0,20));
});
test('CIP: active and total mass closure', () => {
  const [mass, active, stock, litres, water] = values('cip');
  close(mass, 100+stock+water);
  close(active, 100*0.005+stock*0.5);
  close(litres, stock/1.52);
});
test('steam and condensate: boiler and makeup closure', () => {
  const [steam,returned,feed,blowdown,makeup] = values('steam');
  close(feed, steam+blowdown);
  close(feed, returned+makeup);
  close(blowdown, 0.04*feed);
});
test('regeneration: external heat minus external cooling matches net product enthalpy change', () => {
  const [, , , heat, cooling] = values('regeneration');
  close(heat-cooling, 3000*3.9*(4-5)/3600);
});
test('pump: frictionless static case and conversion to electrical input', () => {
  const [, , loss, head, hyd, shaft, electric, npsh] = values('pump', {l:0,k:0,dp:0});
  close(loss,0);
  close(head,6);
  close(hyd,1030*9.80665*30/3600*6/1000);
  close(shaft,hyd/0.7);
  close(electric,shaft/0.9);
  assert.ok(npsh>0);
});
test('bad, missing and physically inconsistent inputs are rejected', () => {
  for (const [id,override] of [
    ['pump',{q:NaN}], ['pump',{ps:3}], ['pump',{q:1}], ['exchanger',{co:75}],
    ['steam',{b:100}], ['boiler',{fuel:1}], ['cip',{mr:300,cr:40}], ['cip',{ct:80}],
    ['cheese-whey',{tc:1}], ['cheese-vats',{cycle:24}], ['fat-balance',{ft:5}],
    ['silos',{count:1.5}], ['tankers',{load:0}], ['tankers',{peak:0.5}], ['ripening',{levels:2.5}], ['ripening',{occ:0}], ['utility-summary',{s1:-1}],  ['yogurt',{h:2}], ['regeneration',{tf:35}],
    ['packaging',{rej:100}], ['water-effluent',{out:100}], ['warehouse',{levels:2.5}]
  ]) assert.throws(() => values(id,override), id);
});

test('every calculator has full descriptions, sources and an example', () => {
  const FC = require('../design-core.js');
  for (const tool of tools.values()) {
    for (const key of ['title', 'short', 'lead', 'eq', 'warn', 'hand']) assert.ok(tool[key], `${tool.id} lacks ${key}`);
    assert.ok(tool.parts && tool.parts.length >= 2, `${tool.id} lacks parts`);
    assert.ok(tool.src && Object.keys(tool.src).length >= 2, `${tool.id} lacks input sources`);
    for (const k of Object.keys(tool.src)) assert.ok(tool.fields.some(([fk]) => fk === k), `${tool.id}: source for unknown field ${k}`);
    assert.match(FC.example(tool), /≈/);
  }
});
test('tool ids are unique and links point to real tabs', () => {
  const fs = require('node:fs');
  const ids = new Set(tools.keys()); assert.equal(ids.size, tools.size);
  const pages = {'dairy-design.html': new Set(), 'plant-utilities.html': new Set()};
  for (const [, , ts] of require('../dairy-design.js')) ts.forEach(t => pages['dairy-design.html'].add(t.id));
  for (const [, , ts] of require('../plant-utilities.js')) ts.forEach(t => pages['plant-utilities.html'].add(t.id));
  for (const tool of tools.values()) for (const [href] of tool.see || []) {
    const [file, hash] = href.split('#');
    assert.ok(fs.existsSync(__dirname + '/../' + file), `${href}: missing page`);
    if (pages[file] && hash) assert.ok(pages[file].has(hash.replace('tab-', '')), `${href}: no such tab`);
  }
});
