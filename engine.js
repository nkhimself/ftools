// Food-engineering numerical engine (no dependencies). Works in browsers and in Node (for tests).
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.FE = factory(); })(this, function () {
'use strict';
var E = {};

// ---------------------------------------------------------------- thermal process
E.lethal = function (T, Tref, z) { return Math.pow(10, (T - Tref) / z); };

// F-value of a logged profile. T is linearly interpolated between log points and integrated with sub-steps.
E.fValue = function (t, T, Tref, z, sub) {
  sub = sub || 20; var F = 0, cum = [0], i, k;
  for (i = 1; i < t.length; i++) {
    var dt = t[i] - t[i - 1], s = 0;
    for (k = 0; k < sub; k++) {
      var a = T[i - 1] + (T[i] - T[i - 1]) * k / sub, b = T[i - 1] + (T[i] - T[i - 1]) * (k + 1) / sub;
      s += (E.lethal(a, Tref, z) + E.lethal(b, Tref, z)) / 2;
    }
    F += s * dt / sub; cum.push(F);
  }
  return { F: F, cum: cum };
};

// Time at which a logged profile reaches a given F (linear search on cumulative F)
E.timeAtF = function (t, cum, target) {
  for (var i = 1; i < t.length; i++) if (cum[i] >= target) { var f = (target - cum[i - 1]) / (cum[i] - cum[i - 1] || 1); return t[i - 1] + f * (t[i] - t[i - 1]); }
  return null;
};

// Ball semilog heating / cooling model (numeric integration, no tables)
E.ballHeat = function (t, p) { var T = p.Tr - p.jh * (p.Tr - p.Ti) * Math.pow(10, -t / p.fh); return Math.max(p.Ti, Math.min(p.Tr, T)); };
E.ballCool = function (tc, p, Tg) { var T = p.Tw + p.jc * (Tg - p.Tw) * Math.pow(10, -tc / p.fc); return Math.min(Tg, Math.max(p.Tw, T)); };
E.ballProfile = function (th, p, dt) {
  dt = dt || 0.1; var t = [], T = [], x, Tg;
  for (x = 0; x < th; x += dt) { t.push(x); T.push(E.ballHeat(x, p)); }
  t.push(th); T.push(E.ballHeat(th, p)); Tg = T[T.length - 1];
  var tcMax = Math.max(10 * p.fc, 60);
  for (x = dt; x <= tcMax; x += dt) { t.push(th + x); T.push(E.ballCool(x, p, Tg)); if (T[T.length - 1] <= p.Tw + 0.05) break; }
  return { t: t, T: T, Tg: Tg };
};
E.ballF = function (th, p, Tref, z) {
  var pr = E.ballProfile(th, p, 0.1), r = E.fValue(pr.t, pr.T, Tref, z, 4), Fh = 0, i;
  for (i = 0; i < pr.t.length; i++) if (pr.t[i] >= th - 1e-9) { Fh = r.cum[i]; break; }
  return { F: r.F, Fh: Fh, Fc: r.F - Fh, Tg: pr.Tg, profile: pr };
};
// Heating time needed so that the total F (heating + cooling) reaches the target
E.solveHeatTime = function (target, p, Tref, z) {
  var lo = 0, hi = 30 * p.fh + 30, i;
  if (E.ballF(hi, p, Tref, z).F < target) return null;
  for (i = 0; i < 60; i++) { var mid = (lo + hi) / 2; if (E.ballF(mid, p, Tref, z).F < target) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
};
// fh and jh from a measured cold-spot log (retort temp Tr); uses points with t >= tStart
E.fitHeating = function (t, T, Tr, tStart) {
  var x = [], y = [], i;
  for (i = 0; i < t.length; i++) if (t[i] >= tStart && Tr - T[i] > 0.05) { x.push(t[i]); y.push(Math.log(Tr - T[i]) / Math.LN10); }
  if (x.length < 3) return null;
  var r = E.linreg(x, y); if (!(r.slope < 0)) return null;
  var Ti = T[0], fh = -1 / r.slope, jh = Math.pow(10, r.intercept) / (Tr - Ti);
  return { fh: fh, jh: jh, Ti: Ti, r2: r.r2, n: x.length };
};
// Mean kinetic temperature (Haynes). T in Celsius, dH in kJ/mol, optional times for time weighting
E.mkt = function (T, dH, t) {
  var R = 0.008314472, s = 0, w = 0, i;
  dH = dH || 83.144;
  if (t && t.length === T.length && T.length > 1) {
    for (i = 1; i < T.length; i++) { var d = t[i] - t[i - 1], a = Math.exp(-dH / (R * (T[i - 1] + 273.15))), b = Math.exp(-dH / (R * (T[i] + 273.15))); s += (a + b) / 2 * d; w += d; }
  } else { for (i = 0; i < T.length; i++) s += Math.exp(-dH / (R * (T[i] + 273.15))); w = T.length; }
  return (dH / R) / (-Math.log(s / w)) - 273.15;
};

// ---------------------------------------------------------------- statistics
var T975 = [0, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086, 2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042];
E.tcrit = function (df) {
  if (df < 1) return NaN; if (df <= 30) return T975[df];
  if (df <= 40) return 2.042 + (2.021 - 2.042) * (df - 30) / 10;
  if (df <= 60) return 2.021 + (2.000 - 2.021) * (df - 40) / 20;
  if (df <= 120) return 2.000 + (1.980 - 2.000) * (df - 60) / 60;
  return 1.960;
};
E.linreg = function (x, y) {
  var n = x.length, i, sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  for (i = 0; i < n; i++) { sx += x[i]; sy += y[i]; }
  var mx = sx / n, my = sy / n;
  for (i = 0; i < n; i++) { sxx += (x[i] - mx) * (x[i] - mx); sxy += (x[i] - mx) * (y[i] - my); syy += (y[i] - my) * (y[i] - my); }
  var slope = sxy / sxx, icpt = my - slope * mx, sse = 0;
  for (i = 0; i < n; i++) { var e = y[i] - (icpt + slope * x[i]); sse += e * e; }
  var df = n - 2, s2 = df > 0 ? sse / df : NaN;
  return { n: n, slope: slope, intercept: icpt, r2: syy > 0 ? 1 - sse / syy : 1, sse: sse, df: df, s: Math.sqrt(s2), seSlope: Math.sqrt(s2 / sxx), seInt: Math.sqrt(s2 * (1 / n + mx * mx / sxx)), mx: mx, sxx: sxx };
};
// prediction (mean response) interval of a regression at x0
E.linPredict = function (r, x0) {
  var y = r.intercept + r.slope * x0, se = r.s * Math.sqrt(1 / r.n + (x0 - r.mx) * (x0 - r.mx) / r.sxx), tc = E.tcrit(r.df);
  return { y: y, lo: y - tc * se, hi: y + tc * se, se: se };
};

// Arrhenius shelf-life
// series: [{T: Celsius, t: [..], q: [..]}], order 0 or 1; returns rate constants per temperature
E.rateConstants = function (series, order) {
  return series.map(function (s) {
    var y = order === 1 ? s.q.map(function (v) { return Math.log(v); }) : s.q.slice(), r = E.linreg(s.t, y);
    return { T: s.T, k: -r.slope * (order === 1 ? 1 : 1), kSigned: r.slope, r2: r.r2, q0: order === 1 ? Math.exp(r.intercept) : r.intercept, n: s.t.length };
  });
};
// pts: [{T (C), k (>0)}]  ->  Ea, Q10, prediction at Tstore
E.arrhenius = function (pts, Tstore) {
  var x = pts.map(function (p) { return 1 / (p.T + 273.15); }), y = pts.map(function (p) { return Math.log(p.k); }), r = E.linreg(x, y), R = 8.314462e-3;
  var Ea = -r.slope * R, x0 = 1 / (Tstore + 273.15), pr = E.linPredict(r, x0);
  var q10 = Math.exp(Ea / R * (1 / (Tstore + 273.15) - 1 / (Tstore + 10 + 273.15)));
  return { reg: r, Ea: Ea, Q10: q10, kStore: Math.exp(pr.y), kLo: Math.exp(pr.lo), kHi: Math.exp(pr.hi), r2: r.r2, df: r.df };
};

// ---------------------------------------------------------------- Nelder-Mead curve fitting
function nelderMead(f, x0, opt) {
  opt = opt || {}; var n = x0.length, maxit = opt.maxit || 4000, tol = opt.tol || 1e-12, i, j;
  var sim = [x0.slice()], fs = [];
  for (i = 0; i < n; i++) { var p = x0.slice(); p[i] = p[i] !== 0 ? p[i] * 1.2 + 0.05 : 0.1; sim.push(p); }
  for (i = 0; i <= n; i++) fs.push(f(sim[i]));
  for (var it = 0; it < maxit; it++) {
    var idx = fs.map(function (v, k) { return k; }).sort(function (a, b) { return fs[a] - fs[b]; });
    sim = idx.map(function (k) { return sim[k]; }); fs = idx.map(function (k) { return fs[k]; });
    if (Math.abs(fs[n] - fs[0]) < tol * (1 + Math.abs(fs[0]))) { var spread = 0; for (j = 1; j <= n; j++) for (i = 0; i < n; i++) spread = Math.max(spread, Math.abs(sim[j][i] - sim[0][i])); if (spread < 1e-9) break; }
    var c = new Array(n).fill(0);
    for (j = 0; j < n; j++) for (i = 0; i < n; i++) c[i] += sim[j][i] / n;
    var xr = c.map(function (v, i) { return v + (v - sim[n][i]); }), fr = f(xr);
    if (fr < fs[0]) {
      var xe = c.map(function (v, i) { return v + 2 * (v - sim[n][i]); }), fe = f(xe);
      if (fe < fr) { sim[n] = xe; fs[n] = fe; } else { sim[n] = xr; fs[n] = fr; }
    } else if (fr < fs[n - 1]) { sim[n] = xr; fs[n] = fr; }
    else {
      var xc = fr < fs[n] ? c.map(function (v, i) { return v + 0.5 * (xr[i] - v); }) : c.map(function (v, i) { return v + 0.5 * (sim[n][i] - v); }), fc = f(xc);
      if (fc < Math.min(fr, fs[n])) { sim[n] = xc; fs[n] = fc; }
      else for (j = 1; j <= n; j++) { sim[j] = sim[j].map(function (v, i) { return sim[0][i] + 0.5 * (v - sim[0][i]); }); fs[j] = f(sim[j]); }
    }
  }
  var b = 0; for (i = 1; i <= n; i++) if (fs[i] < fs[b]) b = i;
  return { x: sim[b], f: fs[b] };
}
E.nelderMead = nelderMead;

// model: {name, params:[{n, pos}], f(x, p), guess(x,y) -> [..]}
E.fitModel = function (model, x, y) {
  var np = model.params.length, N = x.length;
  function toP(u) { return u.map(function (v, i) { return model.params[i].pos ? Math.exp(Math.max(-40, Math.min(40, v))) : v; }); }
  function sse(u) {
    var p = toP(u), s = 0, i;
    for (i = 0; i < N; i++) { var v = model.f(x[i], p); if (!isFinite(v)) return 1e30; s += (y[i] - v) * (y[i] - v); }
    return s;
  }
  var g = model.guess(x, y), best = null, trials = [g], r;
  for (r = 0; r < 6; r++) trials.push(g.map(function (v, i) { return v * (0.5 + ((r * 7 + i * 3) % 11) / 5) + (model.params[i].pos ? 0 : 0.01 * (r - 2)); }));
  trials.forEach(function (g0) {
    var u0 = g0.map(function (v, i) { return model.params[i].pos ? Math.log(Math.max(1e-9, v)) : v; });
    var res = nelderMead(sse, u0), res2 = nelderMead(sse, res.x);
    if (!best || res2.f < best.f) best = res2;
  });
  var p = toP(best.x), yhat = x.map(function (xi) { return model.f(xi, p); });
  return { p: p, yhat: yhat, stats: E.fitStats(y, yhat, np) };
};
E.fitStats = function (y, yhat, np) {
  var n = y.length, my = 0, sse = 0, sst = 0, mrd = 0, i;
  for (i = 0; i < n; i++) my += y[i]; my /= n;
  for (i = 0; i < n; i++) { sse += (y[i] - yhat[i]) * (y[i] - yhat[i]); sst += (y[i] - my) * (y[i] - my); if (y[i] !== 0) mrd += Math.abs(y[i] - yhat[i]) / Math.abs(y[i]); }
  var df = n - np;
  return { n: n, sse: sse, r2: sst > 0 ? 1 - sse / sst : 1, adjR2: df > 0 && sst > 0 ? 1 - (sse / df) / (sst / (n - 1)) : NaN, rmse: Math.sqrt(sse / n), chi2: df > 0 ? sse / df : NaN, mrd: 100 * mrd / n, df: df };
};

var pos = function (n) { return { n: n, pos: true }; }, free = function (n) { return { n: n, pos: false }; };
function lastMR(x, y) { var i = y.length - 1; return { t: x[i], v: Math.max(1e-6, y[i]) }; }
E.dryingModels = [
  { id: 'lewis', name: 'Lewis (Newton)', eq: 'MR = exp(−k·t)', params: [pos('k')], f: function (t, p) { return Math.exp(-p[0] * t); }, guess: function (x, y) { var l = lastMR(x, y); return [Math.max(1e-6, -Math.log(l.v) / l.t)]; } },
  { id: 'page', name: 'Page', eq: 'MR = exp(−k·tⁿ)', params: [pos('k'), pos('n')], f: function (t, p) { return Math.exp(-p[0] * Math.pow(t, p[1])); }, guess: function (x, y) { var l = lastMR(x, y); return [Math.max(1e-6, -Math.log(l.v) / l.t), 1]; } },
  { id: 'henderson', name: 'Henderson & Pabis', eq: 'MR = a·exp(−k·t)', params: [pos('a'), pos('k')], f: function (t, p) { return p[0] * Math.exp(-p[1] * t); }, guess: function (x, y) { var l = lastMR(x, y); return [1, Math.max(1e-6, -Math.log(l.v) / l.t)]; } },
  { id: 'log', name: 'Logarithmic', eq: 'MR = a·exp(−k·t) + c', params: [pos('a'), pos('k'), free('c')], f: function (t, p) { return p[0] * Math.exp(-p[1] * t) + p[2]; }, guess: function (x, y) { var l = lastMR(x, y); return [1, Math.max(1e-6, -Math.log(l.v) / l.t), 0]; } },
  { id: 'twoterm', name: 'Two-term', eq: 'MR = a·exp(−k₀·t) + b·exp(−k₁·t)', params: [pos('a'), pos('k0'), pos('b'), pos('k1')], f: function (t, p) { return p[0] * Math.exp(-p[1] * t) + p[2] * Math.exp(-p[3] * t); }, guess: function (x, y) { var l = lastMR(x, y), k = Math.max(1e-6, -Math.log(l.v) / l.t); return [0.5, k * 0.7, 0.5, k * 1.5]; } },
  { id: 'midilli', name: 'Midilli et al.', eq: 'MR = a·exp(−k·tⁿ) + b·t', params: [pos('a'), pos('k'), pos('n'), free('b')], f: function (t, p) { return p[0] * Math.exp(-p[1] * Math.pow(t, p[2])) + p[3] * t; }, guess: function (x, y) { var l = lastMR(x, y); return [1, Math.max(1e-6, -Math.log(l.v) / l.t), 1, 0]; } },
  { id: 'wang', name: 'Wang & Singh', eq: 'MR = 1 + a·t + b·t²', params: [free('a'), free('b')], f: function (t, p) { return 1 + p[0] * t + p[1] * t * t; }, guess: function (x, y) { var l = lastMR(x, y); return [-1 / l.t * 0.8, 0.1 / (l.t * l.t)]; } }
];
E.sorptionModels = [
  { id: 'gab', name: 'GAB', eq: 'X = Xm·C·K·aw / [(1−K·aw)(1−K·aw+C·K·aw)]', params: [pos('Xm'), pos('C'), pos('K')], f: function (a, p) { var Xm = p[0], C = p[1], K = p[2]; return Xm * C * K * a / ((1 - K * a) * (1 - K * a + C * K * a)); }, guess: function (x, y) { return [Math.max(...y) * 0.25, 10, 0.8]; } },
  { id: 'oswin', name: 'Oswin', eq: 'X = A·(aw/(1−aw))^B', params: [pos('A'), pos('B')], f: function (a, p) { return p[0] * Math.pow(a / (1 - a), p[1]); }, guess: function (x, y) { return [Math.max(...y) * 0.3, 0.7]; } },
  { id: 'halsey', name: 'Halsey', eq: 'X = (−A / ln aw)^(1/B)', params: [pos('A'), pos('B')], f: function (a, p) { return Math.pow(-p[0] / Math.log(a), 1 / p[1]); }, guess: function (x, y) { return [0.1, 1.2]; } },
  { id: 'henderson', name: 'Henderson', eq: 'X = (−ln(1−aw)/K)^(1/n)', params: [pos('K'), pos('n')], f: function (a, p) { return Math.pow(-Math.log(1 - a) / p[0], 1 / p[1]); }, guess: function (x, y) { return [0.05, 1.2]; } },
  { id: 'peleg', name: 'Peleg', eq: 'X = k₁·aw^n₁ + k₂·aw^n₂', params: [pos('k1'), pos('n1'), pos('k2'), pos('n2')], f: function (a, p) { return p[0] * Math.pow(a, p[1]) + p[2] * Math.pow(a, p[3]); }, guess: function (x, y) { var m = Math.max(...y); return [m * 0.3, 0.8, m * 0.6, 6]; } },
  { id: 'smith', name: 'Smith', eq: 'X = a + b·ln(1−aw)', params: [free('a'), free('b')], f: function (a, p) { return p[0] + p[1] * Math.log(1 - a); }, guess: function (x, y) { return [0.05, -0.1]; } }
];
// BET (linear form, usually aw 0.05 to 0.35)
E.betLinear = function (aw, X, lo, hi) {
  var x = [], y = [], i;
  for (i = 0; i < aw.length; i++) if (aw[i] >= lo && aw[i] <= hi && X[i] > 0) { x.push(aw[i]); y.push(aw[i] / ((1 - aw[i]) * X[i])); }
  if (x.length < 3) return null;
  var r = E.linreg(x, y), Xm = 1 / (r.slope + r.intercept), C = 1 + r.slope / r.intercept;
  if (!(Xm > 0) || !(C > 0)) return null;
  return { Xm: Xm, C: C, r2: r.r2, n: x.length, f: function (a) { return Xm * C * a / ((1 - a) * (1 + (C - 1) * a)); } };
};

// ---------------------------------------------------------------- linear programming (two-phase simplex)
// minimise c.x  subject to rows: A[i].x (<=,>=,=) b[i], x >= 0
E.lp = function (c, A, rel, b) {
  var n = c.length, m = A.length, i, j, EPS = 1e-9;
  var rows = [], rhs = [], rr = [];
  for (i = 0; i < m; i++) {
    var a = A[i].slice(), bi = b[i], r = rel[i];
    if (bi < 0) { a = a.map(function (v) { return -v; }); bi = -bi; r = r === '<=' ? '>=' : r === '>=' ? '<=' : '='; }
    rows.push(a); rhs.push(bi); rr.push(r);
  }
  var ns = 0, na = 0; rr.forEach(function (r) { if (r !== '=') ns++; if (r !== '<=') na++; });
  var N = n + ns + na, T = [], basis = [], sCol = n, aCol = n + ns, artCols = [];
  for (i = 0; i < m; i++) {
    var row = new Array(N + 1).fill(0); for (j = 0; j < n; j++) row[j] = rows[i][j]; row[N] = rhs[i];
    if (rr[i] === '<=') { row[sCol] = 1; basis.push(sCol); sCol++; }
    else if (rr[i] === '>=') { row[sCol] = -1; sCol++; row[aCol] = 1; basis.push(aCol); artCols.push(aCol); aCol++; }
    else { row[aCol] = 1; basis.push(aCol); artCols.push(aCol); aCol++; }
    T.push(row);
  }
  function run(obj, allowed) {
    for (var it = 0; it < 5000; it++) {
      var z = new Array(N + 1).fill(0), k;
      for (k = 0; k <= N; k++) { var s = 0; for (i = 0; i < m; i++) s += obj[basis[i]] * T[i][k]; z[k] = (k < N ? obj[k] : 0) - s; }
      var enter = -1; for (k = 0; k < N; k++) if (allowed(k) && z[k] < -EPS) { enter = k; break; }
      if (enter < 0) return 'optimal';
      var leave = -1, best = Infinity;
      for (i = 0; i < m; i++) if (T[i][enter] > EPS) { var ratio = T[i][N] / T[i][enter]; if (ratio < best - 1e-12 || (Math.abs(ratio - best) <= 1e-12 && basis[i] < basis[leave])) { best = ratio; leave = i; } }
      if (leave < 0) return 'unbounded';
      var pv = T[leave][enter]; for (k = 0; k <= N; k++) T[leave][k] /= pv;
      for (i = 0; i < m; i++) if (i !== leave && Math.abs(T[i][enter]) > 0) { var f = T[i][enter]; for (k = 0; k <= N; k++) T[i][k] -= f * T[leave][k]; }
      basis[leave] = enter;
    }
    return 'iterations';
  }
  var isArt = function (k) { return k >= n + ns; };
  if (na > 0) {
    var o1 = new Array(N).fill(0); artCols.forEach(function (k) { o1[k] = 1; });
    run(o1, function () { return true; });
    var inf = 0; for (i = 0; i < m; i++) if (isArt(basis[i])) inf += T[i][N];
    if (inf > 1e-7) return { status: 'infeasible' };
    for (i = 0; i < m; i++) if (isArt(basis[i])) { for (j = 0; j < n + ns; j++) if (Math.abs(T[i][j]) > EPS) { var pv2 = T[i][j]; for (var k2 = 0; k2 <= N; k2++) T[i][k2] /= pv2; for (var r2 = 0; r2 < m; r2++) if (r2 !== i) { var f2 = T[r2][j]; for (k2 = 0; k2 <= N; k2++) T[r2][k2] -= f2 * T[i][k2]; } basis[i] = j; break; } }
  }
  var o2 = new Array(N).fill(0); for (j = 0; j < n; j++) o2[j] = c[j];
  var st = run(o2, function (k) { return !isArt(k); });
  if (st !== 'optimal') return { status: st };
  var x = new Array(n).fill(0), obj = 0; for (i = 0; i < m; i++) if (basis[i] < n) x[basis[i]] = T[i][N];
  for (j = 0; j < n; j++) obj += c[j] * x[j];
  return { status: 'optimal', x: x, obj: obj };
};
// shadow price of constraint i = d(objective)/d(rhs i) by re-solving with a small change
E.lpShadow = function (c, A, rel, b, i, base) {
  var h = 1e-4 * (1 + Math.abs(b[i])), b2 = b.slice(); b2[i] += h;
  var r = E.lp(c, A, rel, b2);
  if (r.status !== 'optimal') { b2[i] -= 2 * h; r = E.lp(c, A, rel, b2); if (r.status !== 'optimal') return null; return (base - r.obj) / h; }
  return (r.obj - base) / h;
};


// ---------------------------------------------------------------- dairy
E.normCdf = function (x) { // Abramowitz-Stegun 7.1.26 via erf
  var t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2);
  return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
};
E.normInv = function (p) { var lo = -8, hi = 8, i; for (i = 0; i < 80; i++) { var m = (lo + hi) / 2; if (E.normCdf(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; };

// Fat standardisation by separator + cream/skim blend. masses in kg, fat in %.
E.standardize = function (raw, Fr, Fs, Fc, Ft) {
  var cream = raw * (Fr - Fs) / (Fc - Fs), skim = raw - cream, r = { raw: raw };
  if (!(Fc > Ft && Ft > Fs)) return { error: 'باید F_skim < F_target < F_cream باشد.' };
  var need = skim * (Ft - Fs) / (Fc - Ft);                    // cream to add back to the skim
  r.skim = skim; r.cream = cream; r.creamBack = need; r.milk = skim + need; r.surplusCream = cream - need;
  if (r.surplusCream < 0) { // raw milk leaner than target: add external cream to the raw milk instead
    var x = raw * (Ft - Fr) / (Fc - Ft); r = { raw: raw, add: x, milk: raw + x, surplusCream: 0, needExternal: true, skim: 0, cream: 0, creamBack: 0 };
  }
  r.check = (r.needExternal ? (raw * Fr + r.add * Fc) / r.milk : (skim * Fs + need * Fc) / r.milk);
  return r;
};
// target (mean) so that P(fat < legal) = alpha with process sd
E.fatTarget = function (legal, sd, alpha) { return legal + sd * -E.normInv(alpha); };

// Steam table (saturated, absolute bar): [P, Tsat, hf, hg]
E.STEAM = [[1, 99.6, 417.5, 2675.4], [2, 120.2, 504.7, 2706.2], [3, 133.5, 561.4, 2724.9], [4, 143.6, 604.7, 2738.1], [5, 151.8, 640.2, 2748.1], [6, 158.8, 670.4, 2756.8]];
E.steam = function (P) {
  var t = E.STEAM, i; P = Math.max(1, Math.min(6, P));
  for (i = 0; i < t.length - 1; i++) if (P <= t[i + 1][0]) { var f = (P - t[i][0]) / (t[i + 1][0] - t[i][0]); return { Tsat: t[i][1] + f * (t[i + 1][1] - t[i][1]), hf: t[i][2] + f * (t[i + 1][2] - t[i][2]), hg: t[i][3] + f * (t[i + 1][3] - t[i][3]), hfg: (t[i][3] - t[i][2]) + f * ((t[i + 1][3] - t[i + 1][2]) - (t[i][3] - t[i][2])) }; }
  return { Tsat: t[5][1], hf: t[5][2], hg: t[5][3], hfg: t[5][3] - t[5][2] };
};
// Process-cheese cooker balance. rec: [{x (kg), w, f, p}] (percent comp). o: {T0,T1,loss (fraction),mode,P,evap (fraction of final)}
E.cheeseBalance = function (rec, o) {
  var M0 = 0, W = 0, F = 0, Pr = 0, i;
  rec.forEach(function (r) { M0 += r.x; W += r.x * r.w / 100; F += r.x * r.f / 100; Pr += r.x * r.p / 100; });
  if (!(M0 > 0)) return null;
  var rest = M0 - W - F - Pr, cp = (4.18 * W + 2.0 * F + 1.9 * Pr + 1.5 * Math.max(0, rest)) / M0;
  var Q = M0 * cp * (o.T1 - o.T0) * (1 + (o.loss || 0)), st = E.steam(o.P), steam, cond = 0;
  if (o.mode === 'direct') { steam = Q / (st.hg - 4.18 * o.T1); cond = steam; } else steam = Q / st.hfg;
  var Mpre = M0 + cond, evap = (o.evap || 0) * Mpre, Mf = Mpre - evap, Wf = W + cond - evap;
  return { M0: M0, cp: cp, Q: Q, steam: steam, cond: cond, evap: evap, Mf: Mf, moist: 100 * Wf / Mf, fat: 100 * F / Mf, prot: 100 * Pr / Mf, fdm: 100 * F / (Mf - Wf), c: cond - evap, T: Mpre, stSat: st.Tsat };
};
// Holding tube: fastest-particle residence time
E.holdingTube = function (o) {
  var D = o.D / 1000, A = Math.PI * D * D / 4, q = o.Q / 1000 / 3600, u = q / A, Re = o.rho * u * D / o.mu, tm = o.L / u;
  var lam = Re < 2100, tmin = tm / (lam ? 2 : (Re < 4000 ? 1.5 : 1.2));
  return { u: u, Re: Re, regime: lam ? 'laminar' : (Re < 4000 ? 'transition' : 'turbulent'), tmean: tm, tmin: tmin, ok: tmin >= o.treq, Lneeded: o.treq * u * (lam ? 2 : (Re < 4000 ? 1.5 : 1.2)), Qmax: q * tmin / o.treq * 3600 * 1000 };
};
// Yogurt acidification: logistic pH curve with fixed floor pHf
E.phModel = function (pHf) {
  return { id: 'ph', name: 'logistic pH', params: [{ n: 'pH0', pos: true }, { n: 'k', pos: true }, { n: 't50', pos: true }], f: function (t, p) { return pHf + (p[0] - pHf) / (1 + Math.exp(p[1] * (t - p[2]))); },
    guess: function (x, y) { var tm = x[x.length - 1]; return [Math.max(y[0], pHf + 0.2), 0.02, Math.max(tm, 60)]; } };
};
E.phTime = function (p, pHf, target) { var r = (p[0] - pHf) / (target - pHf) - 1; return r > 0 ? p[2] + Math.log(r) / p[1] : null; };
E.fitPH = function (t, y, pHf, target) {
  var m = E.phModel(pHf), fit = E.fitModel(m, t, y), te = E.phTime(fit.p, pHf, target), js = [], i;
  if (t.length >= 6) for (i = 0; i < t.length; i++) { var tt = t.filter(function (_, k) { return k !== i; }), yy = y.filter(function (_, k) { return k !== i; }), f2 = E.fitModel(m, tt, yy), te2 = E.phTime(f2.p, pHf, target); if (te2 != null && isFinite(te2)) js.push(te2); }
  var lo = js.length ? Math.min.apply(null, js) : null, hi = js.length ? Math.max.apply(null, js) : null;
  return { fit: fit, model: m, tEnd: te, lo: lo, hi: hi };
};

// ---------------------------------------------------------------- text tables
E.parseTable = function (txt) {
  var out = [];
  String(txt || '').replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); }).replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); }).replace(/٫/g, '.').replace(/٬/g, '')
    .split(/\r?\n/).forEach(function (line) {
      line = line.trim(); if (!line) return;
      var parts = line.split(/[\s,;\t]+/).filter(function (s) { return s !== ''; }).map(Number);
      if (parts.every(function (v) { return isFinite(v); })) out.push(parts);
    });
  return out;
};
// ---------------------------------------------------------------- bakery
var MW_SUC = 342.3, MW_GLU = 180.16, MW_W = 18.015;
// Norrish water activity: aw = x_w * exp(-(sum sqrt(K_i) x_i)^2), K sucrose 6.47, glucose-type 2.25 (masses in g)
E.norrish = function (water, suc, glu) {
  var nw = water / MW_W, ns = suc / MW_SUC, ng = glu / MW_GLU, n = nw + ns + ng;
  if (!(nw > 0)) return 0;
  var s = Math.sqrt(6.47) * ns / n + Math.sqrt(2.25) * ng / n;
  return nw / n * Math.exp(-s * s);
};
// dough balance + dough temperature. rows: {m kg, w %, suc %, glu %, fat %, cp kJ/kg/K, T C}; first row = flour.
// o: {water kg, cpw, ddt, fric kJ, tmin}
E.dough = function (rows, o) {
  var cpw = o.cpw || 4.18, M = 0, W = 0, suc = 0, glu = 0, fat = 0, mc = 0, mcT = 0, i, r;
  for (i = 0; i < rows.length; i++) { r = rows[i]; M += r.m; W += r.m * r.w / 100; suc += r.m * r.suc / 100; glu += r.m * r.glu / 100; fat += r.m * r.fat / 100; mc += r.m * r.cp; mcT += r.m * r.cp * r.T; }
  var Wadd = o.water || 0; M += Wadd; W += Wadd;
  var flour = rows[0] ? rows[0].m : 0, aq = W + suc + glu;
  var A = o.ddt * (mc + Wadd * cpw) - mcT - (o.fric || 0), Tw = Wadd > 0 ? A / (Wadd * cpw) : NaN, tmin = o.tmin == null ? 2 : o.tmin, ice = 0, Tliq = Tw;
  if (Wadd > 0 && Tw < tmin) { ice = (Wadd * cpw * tmin - A) / (cpw * tmin + 334); ice = Math.max(0, Math.min(Wadd, ice)); Tliq = tmin; }
  return { M: M, W: W, moist: 100 * W / M, suc: suc, glu: glu, fat: fat, fatPct: 100 * fat / M, sucPct: 100 * suc / M, sugarFlour: flour ? 100 * (suc + glu) / flour : NaN, fatFlour: flour ? 100 * fat / flour : NaN, waterFlour: flour ? 100 * W / flour : NaN, addFlour: flour ? 100 * Wadd / flour : NaN, aw: E.norrish(W, suc, glu), syrup: aq > 0 ? 100 * (suc + glu) / aq : 0, cp: (mc + Wadd * cpw) / M, Tw: Tw, Tliq: Tliq, ice: ice };
};
// bake mass and energy balance for one piece (g) and a band oven
E.bake = function (o) {
  var d = o.dough, m0 = o.m0 / 100, mf = o.mf / 100, sl = (o.sl || 0) / 100;
  var solids = d * (1 - m0), sf = solids * (1 - sl), fin = sf / (1 - mf), water0 = d * m0, wf = fin * mf, ev = water0 - wf;
  var cpw = 4.18, L = 2257, T0 = o.T0, Tf = o.Tf, cp = o.cp || 2;
  var eP = ev / 1000 * (cpw * (100 - T0) + L) + fin / 1000 * cp * (Tf - T0); // kJ per piece: evaporation + heating
  var r = { fin: fin, ev: ev, loss: 100 * (d - fin) / d, kJ: eP, kWhPerTon: eP / (fin / 1e6) / 3600, perPct: null };
  if (o.speed > 0 && o.pitch > 0 && o.across > 0) {
    r.pcsMin = o.speed * 1000 / o.pitch * o.across; r.bakeMin = o.length / o.speed; r.kgH = r.pcsMin * fin * 60 / 1000; r.evapKgH = r.pcsMin * ev * 60 / 1000; r.kW = eP * r.pcsMin / 60;
    if (o.inputKW > 0) r.eff = 100 * r.kW / o.inputKW;
  }
  // value of 1 point of final moisture per 1000 kg dough
  function finOf(m) { return sf / (1 - m); }
  r.perPct = (finOf(mf + 0.01) - finOf(mf)) / d * 1e6 / 1000; // kg product per 1000 kg dough (dough in g, product in g)
  if (o.target > 0) { var tgt = o.target / (1 - (o.post || 0) / 100); r.doughNeeded = tgt * (1 - mf) / ((1 - m0) * (1 - sl)); r.tgtExit = tgt; }
  return r;
};
// cake batter: grams
E.cake = function (o) {
  var fl = o.flour, su = o.sugar, fa = o.fat, eg = o.egg, li = o.liquid, ot = o.other || 0;
  var wF = fl * 0.14, wFat = fa * (o.fatW || 0) / 100, wE = eg * (o.eggW == null ? 75 : o.eggW) / 100, wL = li * (o.liqW == null ? 87 : o.liqW) / 100, wO = ot * 0.04;
  var M = fl + su + fa + eg + li + ot, W = wF + wFat + wE + wL + wO, S = M - W;
  var mf = o.mf / 100, fin = S / (1 - mf), loss = 100 * (M - fin) / M, wfin = fin * mf;
  var r = { M: M, W: W, moist: 100 * W / M, fin: fin, loss: loss, sugarFlour: 100 * su / fl, liqSugar: 100 * (li + eg) / su, eggFat: fa > 0 ? 100 * eg / fa : NaN, fatFlour: 100 * fa / fl, awBatter: E.norrish(W, su, 0), awCake: E.norrish(wfin, su, 0), syrupBatter: 100 * su / (su + W), syrupCake: 100 * su / (su + wfin) };
  // CO2 from leavening (grams)
  var neut = (o.acid || 0) * (o.nv || 0) / 100, used = Math.min(o.soda || 0, neut), excess = Math.max(0, (o.soda || 0) - used);
  r.co2 = used * 44.01 / 84.007 + excess * 0.5 * 44.01 / 84.007; r.excess = excess; r.acidLeft = Math.max(0, neut - (o.soda || 0)) * 100 / (o.nv || 100);
  r.co2mL100 = r.co2 / 44.01 * 30.6 * 1000 / M * 100; // mL of CO2 at 100C per 100 g batter
  if (o.pan > 0 && o.sg > 0) {
    r.batterVol = M / o.sg; r.fill = 100 * r.batterVol / o.pan;
    if (o.sv > 0) { r.needBatter = o.pan * (o.fillTarget || 1) / (o.sv * (1 - loss / 100)); r.needVol = r.needBatter / o.sg; r.needFill = 100 * r.needVol / o.pan; r.pans = M / r.needBatter; r.cakeVolNow = fin * o.sv; }
  }
  return r;
};
// wafer sheet + sandwich
E.wafer = function (o) {
  var sheet = o.batter * o.solids / 100 / (1 - o.sheetM / 100), ev = o.batter - sheet, plateA = o.pL * o.pW;
  var r = { sheet: sheet, ev: ev, plateA: plateA };
  r.kJcycle = ev / 1000 * (4.18 * (100 - o.T0) + 2257); r.kW = r.kJcycle * o.plates / o.cycle; r.sheetsH = o.plates * 3600 / o.cycle; r.sheetKgH = r.sheetsH * sheet / 1000; r.evapKgH = r.sheetsH * ev / 1000;
  var n = o.n, lay = n - 1, block = n * sheet + lay * o.cream;
  var c1 = Math.floor(o.pL / o.bL) * Math.floor(o.pW / o.bW), c2 = Math.floor(o.pL / o.bW) * Math.floor(o.pW / o.bL);
  r.pieces = Math.max(c1, c2); r.block = block; r.barA = o.bL * o.bW;
  r.bar = block * r.barA / plateA; r.creamPct = 100 * lay * o.cream / block; r.fatPct = o.creamFat * r.creamPct / 100;
  r.trim = 100 * (1 - r.pieces * r.barA / plateA);
  r.costBlock = (n * sheet * o.cSheet + lay * o.cream * o.cCream) / 1000; r.costBar = r.pieces > 0 ? r.costBlock / r.pieces : NaN;
  if (o.declared > 0) { var z = E.normInv(1 - o.alpha), tgt = o.declared + z * o.sd; r.z = z; r.target = tgt; r.give = r.bar - o.declared; r.creamNeeded = lay > 0 ? (tgt / (r.barA / plateA) - n * sheet) / lay : NaN; r.pBelow = 100 * E.normCdf((o.declared - r.bar) / o.sd); }
  return r;
};
// moisture migration, linear isotherm per component between two measured points (wet-basis %)
E.migrate = function (cs) {
  var den = 0, num = 0, W0 = 0, rows = cs.map(function (c) {
    var s = c.m * (1 - c.wb / 100), db = function (w) { return w / (100 - w); };
    var M1 = db(c.w1), M2 = db(c.w2), sl = (M2 - M1) / (c.a2 - c.a1), Mc = db(c.wb);
    W0 += c.m * c.wb / 100; num += s * (M1 - sl * c.a1); den += s * sl;
    return { s: s, M1: M1, sl: sl, a1: c.a1, a2: c.a2, Mc: Mc, awNow: sl > 0 ? c.a1 + (Mc - M1) / sl : NaN, m: c.m, wb: c.wb };
  });
  var aw = (W0 - num) / den;
  rows.forEach(function (r) { r.M = r.M1 + r.sl * (aw - r.a1); r.wbF = 100 * r.M / (1 + r.M); r.dW = r.s * (r.M - r.Mc); r.out = aw < Math.min(r.a1, r.a2) - 1e-9 || aw > Math.max(r.a1, r.a2) + 1e-9; r.outNow = r.awNow < Math.min(r.a1, r.a2) - 1e-9 || r.awNow > Math.max(r.a1, r.a2) + 1e-9; });
  return { aw: aw, rows: rows };
};
// 1-D slab conduction (implicit), convective boundary, optional apparent-cp latent bump.
// o: {L m (full thickness), two (heated both faces), k, rho, cp J/kg/K, h, Tair (number or function(t)), T0, xev, Tev1, Tev2, N, dt, tmax, target}
E.slab = function (o) {
  var N = o.N || 30, dt = o.dt || 2, tmax = o.tmax || 7200, half = o.two ? o.L / 2 : o.L, dx = half / N, n = N + 1, i;
  var T = []; for (i = 0; i < n; i++) T.push(o.T0);
  var Ta = typeof o.Tair === 'function' ? o.Tair : function () { return o.Tair; };
  var e1 = o.Tev1 == null ? 85 : o.Tev1, e2 = o.Tev2 == null ? 100 : o.Tev2, lat = (o.xev || 0) * 2.257e6 / Math.max(1e-6, e2 - e1);
  function cpEff(t) { return o.cp + (t >= e1 && t <= e2 ? lat : 0); }
  var ts = [0], Tc = [T[0]], Ts = [T[N]], tT = null, t = 0, a = new Array(n), b = new Array(n), c = new Array(n), d = new Array(n);
  while (t < tmax - 1e-9) {
    t += dt; var tair = Ta(t), vol;
    for (i = 0; i < n; i++) {
      var C = o.rho * cpEff(T[i]), w = (i === 0 || i === N) ? dx / 2 : dx, cap = C * w / dt;
      a[i] = i > 0 ? -o.k / dx : 0; c[i] = i < N ? -o.k / dx : 0; b[i] = cap - a[i] - c[i]; d[i] = cap * T[i];
      if (i === N) { b[i] += o.h; d[i] += o.h * tair; }
    }
    for (i = 1; i < n; i++) { var m = a[i] / b[i - 1]; b[i] -= m * c[i - 1]; d[i] -= m * d[i - 1]; }
    T[N] = d[N] / b[N]; for (i = N - 1; i >= 0; i--) T[i] = (d[i] - c[i] * T[i + 1]) / b[i];
    ts.push(t); Tc.push(T[0]); Ts.push(T[N]);
    if (tT == null && o.target != null && T[0] >= o.target) { tT = t - dt + dt * (o.target - Tc[Tc.length - 2]) / (T[0] - Tc[Tc.length - 2]); if (o.stop) break; }
  }
  return { t: ts, Tc: Tc, Ts: Ts, tTarget: tT, T: T.slice(), dx: dx };
};
// fit h and k to measured center temperature [{t s, T C}]
E.slabFit = function (data, o) {
  function sse(h, k) { var r = E.slab({ L: o.L, two: o.two, k: k, rho: o.rho, cp: o.cp, h: h, Tair: o.Tair, T0: o.T0, xev: o.xev, N: 20, dt: 3, tmax: data[data.length - 1].t + 3 }), s = 0, j, tt = r.t, Tc = r.Tc;
    data.forEach(function (p) { j = Math.min(Tc.length - 2, Math.max(0, Math.floor(p.t / 3))); var f = (p.t - tt[j]) / 3, y = Tc[j] + f * (Tc[j + 1] - Tc[j]); s += (y - p.T) * (y - p.T); }); return s; }
  var res = E.nelderMead(function (p) { if (p[0] < 0 || p[0] > 8 || p[1] < -3.5 || p[1] > 1) return 1e12; return sse(Math.exp(p[0]), Math.exp(p[1])); }, [Math.log(o.h0 || 40), Math.log(o.k0 || 0.3)], { maxit: 600 });
  var h = Math.exp(res.x[0]), k = Math.exp(res.x[1]);
  return { h: h, k: k, rmse: Math.sqrt(res.f / data.length) };
};

// ---------------------------------------------------------------- beverages
E.brixSG = function (b) { return 1 + b / (258.6 - (b / 258.2) * 227.1); }; // SG 20/20 from degrees Brix/Plato
E.sgBrix = function (sg) { var lo = 0, hi = 90, i; for (i = 0; i < 60; i++) { var m = (lo + hi) / 2; if (E.brixSG(m) < sg) lo = m; else hi = m; } return (lo + hi) / 2; };
E.rhoW = function (T) { return (999.83952 + 16.945176 * T - 7.9870401e-3 * T * T - 46.170461e-6 * T * T * T + 105.56302e-9 * Math.pow(T, 4) - 280.54253e-12 * Math.pow(T, 5)) / (1 + 16.87985e-3 * T); }; // kg/m3, Kell
E.rhoBev = function (B, T) { T = T == null ? 20 : T; return E.brixSG(B) * 998.203 * E.rhoW(T) / E.rhoW(20); }; // kg/m3, approximate temperature scaling
// syrup + water batch. o: {V L finished at 20C, Bt, Bs, cs price/kg optional}
E.syrup = function (o) {
  var rb = E.rhoBev(o.Bt), M = o.V * rb / 1000, Ms = M * o.Bt / 100, sy = Ms / (o.Bs / 100), w = M - sy, rs = E.rhoBev(o.Bs);
  var Vsy = sy / rs * 1000, Vw = w / 0.998203; // L
  return { M: M, sugar: Ms, syrup: sy, water: w, Vsyrup: Vsy, Vwater: Vw, ratio: Vw / Vsy, rhoB: rb, rhoS: rs, contraction: 100 * (Vsy + Vw - o.V) / o.V };
};
// correct an off-spec tank: M kg at Bc -> target Bt; syrup Bs
E.correct = function (M, Bc, Bt, Bs) {
  if (Bc > Bt) return { add: 'water', kg: M * (Bc - Bt) / Bt };
  if (Bc < Bt) return { add: 'syrup', kg: M * (Bt - Bc) / (Bs - Bt) };
  return { add: 'none', kg: 0 };
};
// CO2: gauge psi from T (C) and volumes V (brewing correlation, water/beer); inverse by bisection
E.co2P = function (Tc, V) { var T = Tc * 9 / 5 + 32; return -16.6999 - 0.0101059 * T + 0.00116512 * T * T + 0.173354 * T * V + 4.24267 * V - 0.0684226 * V * V; };
E.co2V = function (Tc, Ppsi) { var lo = 0, hi = 8, i; for (i = 0; i < 70; i++) { var m = (lo + hi) / 2; if (E.co2P(Tc, m) < Ppsi) lo = m; else hi = m; } return (lo + hi) / 2; };
// Langelier index. ca, alk mg/L as CaCO3, tds mg/L
E.lsi = function (o) {
  var A = (Math.log(o.tds) / Math.LN10 - 1) / 10, B = -13.12 * Math.log(o.T + 273) / Math.LN10 + 34.55, C = Math.log(o.ca) / Math.LN10 - 0.4, D = Math.log(o.alk) / Math.LN10, pHs = 9.3 + A + B - (C + D);
  return { pHs: pHs, lsi: o.pH - pHs, rsi: 2 * pHs - o.pH };
};
// RO: Q feed, Y recovery (0-1), R rejection (0-1), ions as object of mg/L
E.ro = function (Q, Y, R, ions) {
  var cf = Math.log(1 / (1 - Y)) / Y, Qp = Q * Y, Qc = Q - Qp, P = {}, C = {};
  Object.keys(ions).forEach(function (k) { P[k] = (1 - R) * ions[k] * cf; C[k] = (ions[k] - Y * P[k]) / (1 - Y); });
  return { Qp: Qp, Qc: Qc, perm: P, conc: C, cfAvg: cf };
};
// acid-base: acids [{c mol/L, pk:[...]}], cat mol/L strong cation, an mol/L strong anion
E.acidCharge = function (pH, pk) {
  var n = pk.length, h = Math.pow(10, -pH), T = [], k, j, s = 0, q = 0, t;
  for (k = 0; k <= n; k++) { t = Math.pow(h, n - k); for (j = 0; j < k; j++) t *= Math.pow(10, -pk[j]); T.push(t); s += t; q += k * t; }
  return q / s;
};
E.chargeF = function (pH, sp) { var h = Math.pow(10, -pH), f = (sp.cat || 0) + h - (sp.an || 0) - 1e-14 / h; (sp.acids || []).forEach(function (a) { f -= a.c * E.acidCharge(pH, a.pk); }); return f; };
E.phSolve = function (sp) { var lo = 0, hi = 14, i; for (i = 0; i < 80; i++) { var m = (lo + hi) / 2; if (E.chargeF(m, sp) > 0) lo = m; else hi = m; } return (lo + hi) / 2; };
E.baseTo = function (sp, pH) { return Math.max(0, -E.chargeF(pH, sp)); }; // mol/L of strong base to reach pH
E.undis = function (pH, pk) { return 1 / (1 + Math.pow(10, pH - pk)); };
E.pvw = function (T) { return Math.pow(10, 8.07131 - 1730.63 / (233.426 + T)) * 0.133322; }; // kPa, Antoine 1-100C
// fill, thermal contraction and headspace vacuum. o: {Vdec mL at 20C, B, Tfill, Vb brimful mL, T2, SD, alpha}
E.fill = function (o) {
  var r20 = E.rhoBev(o.B, 20), m = o.Vdec * r20 / 1000, rT = E.rhoBev(o.B, o.Tfill), VT = m / rT * 1000, Vh1 = o.Vb - VT, Vh2 = o.Vb - o.Vdec, T1 = o.Tfill + 273.15, T2 = (o.T2 == null ? 20 : o.T2) + 273.15;
  var pa1 = 101.325 - E.pvw(o.Tfill), pa2 = pa1 * (Vh1 / Vh2) * (T2 / T1), tot = pa2 + E.pvw(o.T2 == null ? 20 : o.T2);
  var r = { m: m, VT: VT, expansion: 100 * (VT / o.Vdec - 1), Vh1: Vh1, Vh2: Vh2, hs1: 100 * Vh1 / o.Vb, hs2: 100 * Vh2 / o.Vb, vac: 101.325 - tot, pv: E.pvw(o.Tfill) };
  if (o.SD > 0) { var z = E.normInv(1 - o.alpha); r.z = z; r.targetV = o.Vdec + z * o.SD; r.targetM = r.targetV * r20 / 1000; r.targetVT = r.targetM / rT * 1000; }
  return r;
};

return E;
});
