/* ============================================================
   HMWK 02 · Aditi Maharjan · 2287561
   Exercise 1 – Riemann vs. Lebesgue numerical integration
   ============================================================ */

// ---- Test functions (a, b, exact integral if known) ----
const FUNCS = [
  { name: "sin x on [0, π]",        f: Math.sin,               a: 0,    b: Math.PI, exact: 2 },
  { name: "x² on [0, 1]",           f: x => x*x,               a: 0,    b: 1,       exact: 1/3 },
  { name: "step 1/3 on [0, 1]",     f: x => x < 0.5 ? 1 : 3,   a: 0,    b: 1,       exact: 2 },
  { name: "|x − 0.5| on [0, 1]",    f: x => Math.abs(x-0.5),   a: 0,    b: 1,       exact: 0.25 },
  { name: "1/√x on (0, 1]",         f: x => 1/Math.sqrt(x),    a: 1e-9, b: 1,       exact: 2 },
  { name: "step 0/1 on [0, 1]",     f: x => x < 0.5 ? 1 : 0,   a: 0,    b: 1,       exact: 0.5 },
  { name: "sinc on [0, π]",         f: x => x === 0 ? 1 : Math.sin(x)/x,
                                                              a: 0,    b: Math.PI, exact: 1.851937051982466 },
];

// Functions we probe on the plot (only ones with exact values)
const PLOT_FUNCS = [
  { name: "sin x",    f: Math.sin,             a: 0, b: Math.PI, exact: 2,    color: "#0b5fff" },
  { name: "|x−0.5|",  f: x => Math.abs(x-0.5), a: 0, b: 1,       exact: 0.25, color: "#e8590c" },
];

// ---- Riemann midpoint ----
function riemann(f, a, b, n) {
  const dx = (b - a) / n;
  let s = 0;
  for (let i = 0; i < n; i++) s += f(a + (i + 0.5) * dx);
  return s * dx;
}

// ---- Lebesgue-style: fine grid → bin range → measure × centre ----
function lebesgue(f, a, b, m, N = 200000) {
  const dx = (b - a) / N;
  const ys = new Float64Array(N);
  let ymin = Infinity, ymax = -Infinity;
  for (let i = 0; i < N; i++) {
    const v = f(a + i * dx);
    ys[i] = v;
    if (v < ymin) ymin = v;
    if (v > ymax) ymax = v;
  }
  if (ymax === ymin) return ymin * (b - a);
  const width = (ymax - ymin) / m;
  const counts = new Array(m).fill(0);
  for (let i = 0; i < N; i++) {
    let k = Math.floor((ys[i] - ymin) / width);
    if (k < 0) k = 0;
    if (k >= m) k = m - 1;
    counts[k]++;
  }
  let s = 0;
  for (let j = 0; j < m; j++)
    s += (ymin + (j + 0.5) * width) * counts[j] * dx;
  return s;
}

// ---- Populate Es1 table ----
(function buildEs1Table() {
  const tbody = document.querySelector("#es1-table tbody");
  const rows = FUNCS.map(({ name, f, a, b, exact }) => {
    const r = riemann(f, a, b, 10000);
    const l = lebesgue(f, a, b, 200);
    return { name, exact, r, l };
  });

  rows.push({ name: "Dirichlet on [0, 1]", exact: "0 (Lebesgue)", r: "does not converge", l: 0 });
  rows.push({ name: "Thomae on [0, 1]",    exact: 0,               r: 0,                    l: 0 });

  for (const row of rows) {
    const tr = document.createElement("tr");
    const fmt = v => typeof v === "number" ? v.toFixed(8) : v;
    tr.innerHTML = `
      <td style="font-family:inherit">${row.name}</td>
      <td>${fmt(row.exact)}</td>
      <td>${fmt(row.r)}</td>
      <td>${fmt(row.l)}</td>`;
    tbody.appendChild(tr);
  }
})();

/* ============================================================
   Convergence plot + interactive probe
   ============================================================ */
const es1Plot = (function initPlot() {
  const canvas = document.getElementById("es1-plot");
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const pad = { l: 55, r: 20, t: 30, b: 45 };

  const ns = [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

  const series = PLOT_FUNCS.map(fn => ({
    ...fn,
    errs: ns.map(n => Math.abs(riemann(fn.f, fn.a, fn.b, n) - fn.exact) + 1e-16),
  }));

  const allErr = series.flatMap(s => s.errs);
  const yMin = Math.min(...allErr), yMax = Math.max(...allErr);
  const xMin = ns[0], xMax = ns[ns.length - 1];

  const X = n => pad.l + (Math.log10(n) - Math.log10(xMin)) /
                       (Math.log10(xMax) - Math.log10(xMin)) * (W - pad.l - pad.r);
  const Y = e => H - pad.b - (Math.log10(e) - Math.log10(yMin)) /
                       (Math.log10(yMax) - Math.log10(yMin)) * (H - pad.t - pad.b);

  const invX = px => {
    const t = (px - pad.l) / (W - pad.l - pad.r);
    return Math.pow(10, Math.log10(xMin) + t * (Math.log10(xMax) - Math.log10(xMin)));
  };

  function draw(markerN) {
    ctx.clearRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = "#eef0f4";
    ctx.lineWidth = 1;
    for (let d = Math.ceil(Math.log10(yMin)); d <= Math.floor(Math.log10(yMax)); d++) {
      const y = Y(Math.pow(10, d));
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    }

    // axes
    ctx.strokeStyle = "#9aa3b2";
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, H - pad.b); ctx.lineTo(W - pad.r, H - pad.b);
    ctx.stroke();

    // x-axis labels
    ctx.fillStyle = "#555";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ns.forEach(n => {
      if ([4, 16, 64, 256, 1024, 2048].includes(n))
        ctx.fillText(n, X(n), H - pad.b + 18);
    });
    ctx.fillText("n (subintervals)", (pad.l + W - pad.r) / 2, H - 10);

    ctx.save();
    ctx.translate(16, (pad.t + H - pad.b) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("|error|", 0, 0);
    ctx.restore();

    // series lines + markers
    series.forEach(s => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      s.errs.forEach((e, i) => {
        const x = X(ns[i]), y = Y(e);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillStyle = s.color;
      s.errs.forEach((e, i) => {
        ctx.beginPath();
        ctx.arc(X(ns[i]), Y(e), 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // legend
    series.forEach((s, li) => {
      ctx.fillStyle = s.color;
      ctx.fillRect(W - pad.r - 120, pad.t + 5 + li * 18, 10, 10);
      ctx.fillStyle = "#333";
      ctx.textAlign = "left";
      ctx.font = "12px monospace";
      ctx.fillText(s.name, W - pad.r - 105, pad.t + 14 + li * 18);
    });

    // vertical marker
    if (markerN && markerN >= xMin && markerN <= xMax) {
      const x = X(markerN);
      ctx.strokeStyle = "rgba(11, 95, 255, 0.35)";
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, pad.t);
      ctx.lineTo(x, H - pad.b);
      ctx.stroke();
      ctx.setLineDash([]);

      series.forEach(s => {
        const err = Math.abs(riemann(s.f, s.a, s.b, Math.round(markerN)) - s.exact) + 1e-16;
        ctx.fillStyle = s.color;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, Y(err), 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }
  }

  return { draw, invX, pad, W, H, xMin, xMax };
})();

// ---- Probe UI wiring ----
(function initProbe() {
  if (!es1Plot) return;
  const canvas   = document.getElementById("es1-plot");
  const input    = document.getElementById("probe-n");
  const btnGo    = document.getElementById("probe-btn");
  const btnClear = document.getElementById("probe-clear");
  const tbody    = document.querySelector("#probe-table tbody");

  let currentN = null;

  function evaluate(n) {
    n = Math.max(1, Math.floor(n));
    input.value = n;
    currentN = n;

    tbody.innerHTML = "";
    for (const fn of PLOT_FUNCS) {
      const est = riemann(fn.f, fn.a, fn.b, n);
      const absErr = Math.abs(est - fn.exact);
      const relErr = fn.exact !== 0 ? absErr / Math.abs(fn.exact) : NaN;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-family:inherit">${fn.name}</td>
        <td>${fn.exact.toFixed(10)}</td>
        <td>${est.toFixed(10)}</td>
        <td>${absErr.toExponential(4)}</td>
        <td>${isFinite(relErr) ? relErr.toExponential(4) : "—"}</td>`;
      tbody.appendChild(tr);
    }

    es1Plot.draw(n);
  }

  function clearMarker() {
    currentN = null;
    tbody.innerHTML = "";
    es1Plot.draw(null);
  }

  btnGo.addEventListener("click", () => {
    const n = Number(input.value);
    if (!Number.isFinite(n) || n < 1) { input.focus(); return; }
    evaluate(n);
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") btnGo.click();
  });

  btnClear.addEventListener("click", clearMarker);

  // Click on plot → snap to nearest n on log scale
  canvas.addEventListener("click", evt => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const px = (evt.clientX - rect.left) * scaleX;
    if (px < es1Plot.pad.l || px > es1Plot.W - es1Plot.pad.r) return;

    let n = es1Plot.invX(px);
    n = Math.round(n);
    n = Math.min(2048, Math.max(1, n));

    const nearestPow = Math.pow(2, Math.round(Math.log2(n)));
    if (Math.abs(n - nearestPow) / n < 0.08) n = nearestPow;

    evaluate(n);
  });
})();

/* ============================================================
   Exercise 2 – Normal CDF
   ============================================================ */

// Reference: high-accuracy erfc (Numerical Recipes)
function erfcNR(x) {
  const z = Math.abs(x);
  const t = 2 / (2 + z);
  const ty = 4 * t - 2;
  const cof = [-1.3026537197817094, 6.4196979235649026e-1,
    1.9476473204185836e-2, -9.561514786808631e-3,
    -9.46595344482036e-4, 3.66839497852761e-4,
    4.2523324806907e-5, -2.0278578112534e-5,
    -1.624290004647e-6, 1.303655835580e-6,
    1.5626441722e-8, -8.5238095915e-8,
    6.529054439e-9, 5.059343495e-9,
    -9.91364156e-10, -2.27365122e-10,
    9.6467911e-11, 2.394038e-12,
    -6.886027e-12, 8.94487e-13,
    3.13092e-13, -1.12708e-13,
    3.81e-16, 7.106e-15];
  let d = 0, dd = 0;
  for (let j = cof.length - 1; j > 0; j--) {
    const tmp = d;
    d = ty * d - dd + cof[j];
    dd = tmp;
  }
  const ans = t * Math.exp(-z * z + 0.5 * (cof[0] + ty * d) - dd);
  return x >= 0 ? ans : 2 - ans;
}

const PhiRef = x => 0.5 * erfcNR(-x / Math.SQRT2);

// Simpson on pdf
function phiSimpson(x, n = 2000) {
  if (n % 2) n++;
  const a = Math.min(-10, x - 8), b = x;
  if (b - a < 1e-12) return 0;
  const h = (b - a) / n;
  const f = t => Math.exp(-t * t / 2) / Math.sqrt(2 * Math.PI);
  let S = f(a) + f(b);
  for (let i = 1; i < n; i++) S += (i % 2 ? 4 : 2) * f(a + i * h);
  return S * h / 3;
}

// Power series for erf
function erfSeries(z, terms = 40) {
  let s = 0;
  for (let k = 0; k < terms; k++) {
    let fact = 1;
    for (let j = 1; j <= k; j++) fact *= j;
    s += (-1) ** k * z ** (2 * k + 1) / (fact * (2 * k + 1));
  }
  return 2 / Math.sqrt(Math.PI) * s;
}
const PhiSeries = x => 0.5 * (1 + erfSeries(x / Math.SQRT2));

// Abramowitz & Stegun 26.2.17
function PhiAS(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 +
              t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

// Populate Es2 table
(function buildEs2Table() {
  const tbody = document.querySelector("#es2-table tbody");
  const xs = [-3, -1, 0, 0.5, 1, 1.96, 2.5, 3];
  for (const x of xs) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${x.toFixed(2)}</td>
      <td>${PhiRef(x).toFixed(10)}</td>
      <td>${phiSimpson(x).toFixed(10)}</td>
      <td>${PhiSeries(x).toFixed(10)}</td>
      <td>${PhiAS(x).toFixed(10)}</td>`;
    tbody.appendChild(tr);
  }
})();