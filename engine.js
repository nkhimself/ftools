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
return E;
});
