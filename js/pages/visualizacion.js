/* =========================================================
   MÓDULO DE VISUALIZACIÓN — indicadores, evolución temporal,
   comparaciones y distribución de emisiones.
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  const { $, esc, fmt, fillSelect, apiErrorBox, PALETTE, cssVar } = CampusCO2.ui;
  const api = CampusCO2.api;
  const charts = {};
  let T = {}; // colores del tema actual (se leen de css/styles.css)
  let ctx, filas = [], proyectos = [], evitadas = [];

  try {
    ctx = await CampusCO2.contexto.cargar();
    const [actividades, resultados, pr, ev] = await Promise.all([api.listarActividades(), api.listarResultados(), api.listarProyectos(), api.listarEvitadas()]);
    filas = CampusCO2.contexto.enriquecer(ctx, actividades, resultados);
    proyectos = pr || []; evitadas = ev || [];
  } catch (e) { apiErrorBox($("viz-error"), e); return; }

  const conDatos = ctx.periodos.filter((p) => filas.some((f) => f.actividad.id_periodo === p.id_periodo));
  fillSelect($("periodo"), conDatos.slice().reverse(), "id_periodo", (p) => p.anio);
  fillSelect($("edificio"), ctx.edificios, "id_edificio", (e) => e.nombre, { placeholder: "Todos los edificios" });
  ["periodo", "edificio", "unidad"].forEach((id) => $(id).addEventListener("change", render));
  document.addEventListener("themechange", () => render());

  // Color fijo por entidad (no por ranking): el edificio i siempre usa el mismo color
  const colorEdificio = Object.fromEntries(ctx.edificios.map((e, i) => [e.id_edificio, PALETTE[i % PALETTE.length]]));
  const TECNOLOGIAS = [...new Set(ctx.tipos.map((t) => t.tecnologia))];
  const colorTec = Object.fromEntries(TECNOLOGIAS.map((t, i) => [t, PALETTE[i % PALETTE.length]]));

  const unidad = () => $("unidad").value;
  const conv = (kg) => (unidad() === "t" ? kg / 1000 : kg);
  const co2Html = (kg) => (unidad() === "t" ? `${fmt(kg / 1000, 2)} <em>tCO₂e</em>` : `${fmt(kg, 0)} <em>kgCO₂e</em>`);
  const co2Txt = (kg) => (unidad() === "t" ? `${fmt(kg / 1000, 3)} tCO₂e` : `${fmt(kg, 1)} kgCO₂e`);
  const sum = (arr, k) => arr.reduce((s, x) => s + (Number(typeof k === "function" ? k(x) : x[k]) || 0), 0);

  function agregados(lista) {
    const kw = sum(lista, "potencia_kw"), kwh = sum(lista, "kwh"), kg = sum(lista, "kg");
    const lum = sum(lista, "cantidad"), led = sum(lista.filter((f) => f.eficiente), "cantidad");
    return {
      kg, kwh, kw, lum, led,
      pctLed: lum ? (led / lum) * 100 : 0,
      kwhLum: lum ? kwh / lum : null,
      kgLum: lum ? kg / lum : null,
      horas: kw ? kwh / kw : null,
      pendientes: lista.filter((f) => !f.resultado).length
    };
  }

  const delta = (act, prev) => (prev ? ((act - prev) / prev) * 100 : null);
  const deltaHtml = (d, label) => d == null ? `Sin datos del ${label}` :
    `<span class="${d > 0 ? "delta-up" : "delta-down"}">${d > 0 ? "▲" : "▼"} ${fmt(Math.abs(d), 1)} %</span> vs. ${label}`;

  function baseOptions(extra = {}) {
    return Object.assign({
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      plugins: {
        legend: { labels: { usePointStyle: true, boxWidth: 8, color: T.text, font: { size: 11 } } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label || c.label}: ${fmt(c.parsed.y ?? c.parsed.x ?? c.parsed, unidad() === "t" ? 3 : 1)} ${unidad() === "t" ? "tCO₂e" : "kgCO₂e"}` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: T.axis } },
        y: { beginAtZero: true, grid: { color: T.grid }, ticks: { color: T.axis }, title: { display: true, text: unidad() === "t" ? "tCO₂e" : "kgCO₂e", color: T.axis } }
      }
    }, extra);
  }

  function draw(id, config) {
    if (charts[id]) charts[id].destroy();
    if (!window.Chart) {
      $(id).parentElement.innerHTML = '<div class="chart-fallback">No se pudo cargar Chart.js (requiere conexión a internet). Los datos están disponibles en las tablas.</div>';
      return;
    }
    charts[id] = new Chart($(id), config);
  }

  function render() {
    T = { text: cssVar("--chart-text"), axis: cssVar("--chart-axis"), grid: cssVar("--chart-grid"), card: cssVar("--card"), prev: cssVar("--muted") };
    if (window.Chart) Chart.defaults.color = T.axis;
    const idP = Number($("periodo").value);
    const idE = $("edificio").value;
    const periodo = ctx.periodoPorId[idP];
    const prev = ctx.periodos.find((p) => p.anio === periodo.anio - 1);
    const filtroEd = (f) => !idE || String(f.actividad.id_edificio) === idE;
    const actual = filas.filter((f) => f.actividad.id_periodo === idP && filtroEd(f));
    const anterior = prev ? filas.filter((f) => f.actividad.id_periodo === prev.id_periodo && filtroEd(f)) : [];
    const A = agregados(actual), P = anterior.length ? agregados(anterior) : null;

    // --- KPIs principales ---
    $("k-co2").innerHTML = co2Html(A.kg);
    $("k-co2-d").innerHTML = deltaHtml(P && delta(A.kg, P.kg), prev ? prev.anio : "año anterior") + (A.pendientes ? ` · ${A.pendientes} pendiente(s)` : "");
    $("k-kwh").innerHTML = `${fmt(A.kwh, 0)} <em>kWh</em>`;
    $("k-kwh-d").innerHTML = deltaHtml(P && delta(A.kwh, P.kwh), prev ? prev.anio : "año anterior");
    $("k-lum").textContent = fmt(A.lum, 0);
    $("k-led").textContent = `${fmt(A.pctLed, 0)} % con tecnología LED`;
    const proyPorId = Object.fromEntries(proyectos.map((p) => [p.id_proyecto, p]));
    const ev = evitadas.filter((e) => e.id_periodo === idP && (!idE || String((proyPorId[e.id_proyecto] || {}).id_edificio) === idE));
    $("k-evit").innerHTML = co2Html(sum(ev, "kg_co2e_evitados"));
    $("k-kw").innerHTML = `${fmt(A.kw, 2)} <em>kW</em>`;
    $("k-lpd").innerHTML = A.kwhLum == null ? "–" : `${fmt(A.kwhLum, 1)} <em>kWh/u</em>`;
    $("k-int").innerHTML = A.kgLum == null ? "–" : `${fmt(A.kgLum, 2)} <em>kgCO₂e/u</em>`;
    $("k-hrs").innerHTML = A.horas == null ? "–" : `${fmt(A.horas, 0)} <em>h/año</em>`;

    const edificios = ctx.edificios.filter((e) => !idE || String(e.id_edificio) === idE);

    // --- Emisiones por edificio (barra horizontal) ---
    $("t-edif").textContent = `Período ${periodo.anio}, ordenado de mayor a menor.`;
    const porEd = edificios.map((e) => ({ e, kg: sum(actual.filter((f) => f.actividad.id_edificio === e.id_edificio), "kg") })).sort((a, b) => b.kg - a.kg);
    draw("ch-edificio", {
      type: "bar",
      data: { labels: porEd.map((x) => x.e.nombre), datasets: [{ label: "Emisiones", data: porEd.map((x) => conv(x.kg)), backgroundColor: porEd.map((x) => colorEdificio[x.e.id_edificio]), borderRadius: 4, maxBarThickness: 28 }] },
      options: baseOptions({ indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => co2Txt(unidad() === "t" ? c.parsed.x * 1000 : c.parsed.x) } } },
        scales: { x: { beginAtZero: true, grid: { color: T.grid }, ticks: { color: T.axis }, title: { display: true, text: unidad() === "t" ? "tCO₂e" : "kgCO₂e", color: T.axis } }, y: { grid: { display: false }, ticks: { color: T.axis } } } })
    });

    // --- Evolución temporal (línea por edificio) ---
    const anios = conDatos.map((p) => String(p.anio));
    draw("ch-evolucion", {
      type: "line",
      data: {
        labels: anios,
        datasets: edificios.map((e) => ({
          label: e.nombre,
          data: conDatos.map((p) => conv(sum(filas.filter((f) => f.actividad.id_periodo === p.id_periodo && f.actividad.id_edificio === e.id_edificio), "kg"))),
          borderColor: colorEdificio[e.id_edificio], backgroundColor: colorEdificio[e.id_edificio],
          borderWidth: 2, pointRadius: 4, pointHoverRadius: 6, tension: 0.25
        }))
      },
      options: baseOptions({ interaction: { mode: "index", intersect: false } })
    });

    // --- Comparación con período anterior ---
    $("t-comp").textContent = prev ? `${prev.anio} vs. ${periodo.anio} por edificio.` : "No hay período anterior para comparar.";
    draw("ch-comparacion", {
      type: "bar",
      data: {
        labels: edificios.map((e) => e.nombre),
        datasets: [
          prev && { label: String(prev.anio), data: edificios.map((e) => conv(sum(anterior.filter((f) => f.actividad.id_edificio === e.id_edificio), "kg"))), backgroundColor: T.prev, borderRadius: 4, maxBarThickness: 26 },
          { label: String(periodo.anio), data: edificios.map((e) => conv(sum(actual.filter((f) => f.actividad.id_edificio === e.id_edificio), "kg"))), backgroundColor: PALETTE[0], borderRadius: 4, maxBarThickness: 26 }
        ].filter(Boolean)
      },
      options: baseOptions()
    });

    // --- Distribución por tecnología (dona) ---
    const porTec = TECNOLOGIAS.map((t) => ({ t, kg: sum(actual.filter((f) => f.tipo.tecnologia === t), "kg") })).filter((x) => x.kg > 0);
    const totalTec = sum(porTec, "kg");
    draw("ch-tecnologia", {
      type: "doughnut",
      data: { labels: porTec.map((x) => x.t), datasets: [{ data: porTec.map((x) => conv(x.kg)), backgroundColor: porTec.map((x) => colorTec[x.t]), borderColor: T.card, borderWidth: 2, hoverOffset: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: "62%",
        plugins: { legend: { position: "right", labels: { usePointStyle: true, boxWidth: 8, color: T.text, font: { size: 11 },
          generateLabels: (ch) => ch.data.labels.map((l, i) => ({ text: `${l} · ${fmt((porTec[i].kg / totalTec) * 100, 0)} %`, fillStyle: ch.data.datasets[0].backgroundColor[i], strokeStyle: T.card, pointStyle: "circle", index: i, fontColor: T.text })) } },
          tooltip: { callbacks: { label: (c) => `${c.label}: ${co2Txt(porTec[c.dataIndex].kg)} (${fmt((porTec[c.dataIndex].kg / totalTec) * 100, 1)} %)` } } } }
    });

    // --- Emisiones por tipo de luminaria ---
    const porEsp = ctx.tipos.map((t) => ({ t: t.nombre, kg: sum(actual.filter((f) => f.tipo.id_tipo_luminaria === t.id_tipo_luminaria), "kg") })).filter((x) => x.kg > 0).sort((a, b) => b.kg - a.kg);
    draw("ch-espacio", {
      type: "bar",
      data: { labels: porEsp.map((x) => x.t), datasets: [{ label: "Emisiones", data: porEsp.map((x) => conv(x.kg)), backgroundColor: PALETTE[0], borderRadius: 4, maxBarThickness: 40 }] },
      options: baseOptions({ plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => co2Txt(porEsp[c.dataIndex].kg) } } } })
    });

    // --- Tabla resumen por edificio ---
    const resumen = edificios.map((e) => {
      const a = agregados(actual.filter((f) => f.actividad.id_edificio === e.id_edificio));
      const pa = anterior.filter((f) => f.actividad.id_edificio === e.id_edificio);
      return { e, a, d: pa.length ? delta(a.kg, sum(pa, "kg")) : null };
    });
    $("tbl-edificios").innerHTML = resumen.map(({ e, a, d }) => `<tr>
      <td><span class="scenario-dot" style="display:inline-block;background:${colorEdificio[e.id_edificio]};margin-right:6px"></span><b>${esc(e.nombre)}</b></td>
      <td class="num">${fmt(a.lum, 0)}</td><td class="num">${fmt(a.pctLed, 0)} %</td><td class="num">${fmt(a.kw, 2)} kW</td>
      <td class="num">${fmt(a.kwh, 0)} kWh</td><td class="num">${co2Txt(a.kg)}</td>
      <td class="num">${d == null ? "–" : `<span class="badge ${d > 0 ? "err" : "ok"}">${d > 0 ? "+" : ""}${fmt(d, 1)} %</span>`}</td>
      <td class="num">${a.kwhLum == null ? "–" : fmt(a.kwhLum, 1)}</td><td class="num">${a.kgLum == null ? "–" : fmt(a.kgLum, 2)}</td></tr>`).join("") +
      `<tr><td><b>Total</b></td><td class="num"><b>${fmt(A.lum, 0)}</b></td><td class="num"><b>${fmt(A.pctLed, 0)} %</b></td><td class="num"><b>${fmt(A.kw, 2)} kW</b></td><td class="num"><b>${fmt(A.kwh, 0)} kWh</b></td><td class="num"><b>${co2Txt(A.kg)}</b></td><td class="num">${P ? `${fmt(delta(A.kg, P.kg), 1)} %` : "–"}</td><td class="num">${A.kwhLum == null ? "–" : fmt(A.kwhLum, 1)}</td><td class="num">${A.kgLum == null ? "–" : fmt(A.kgLum, 2)}</td></tr>`;

    // --- Ranking de grupos de luminarias (edificio + tipo) ---
    const grupos = {};
    actual.forEach((f) => {
      const k = `${f.actividad.id_edificio}-${f.tipo.id_tipo_luminaria}`;
      (grupos[k] = grupos[k] || { edificio: f.edificio, tipo: f.tipo, filas: [] }).filas.push(f);
    });
    const ranking = Object.values(grupos).map((g) => Object.assign(g, agregados(g.filas))).sort((a, b) => b.kg - a.kg);
    const promedioKg = ranking.length ? sum(ranking, "kg") / ranking.length : 0;
    $("tbl-grupos").innerHTML = ranking.map((x) => {
      const prioridad = x.tipo.eficiente ? '<span class="badge ok">Eficiente</span>' : x.kg >= promedioKg ? '<span class="badge err">Alta</span>' : '<span class="badge warn">Media</span>';
      return `<tr><td><b>${esc(x.edificio)}</b></td><td>${esc(x.tipo.nombre || "")}</td><td>${esc(x.tipo.tecnologia || "")}</td>
        <td class="num">${fmt(x.lum, 0)}</td><td class="num">${fmt(x.kw, 2)} kW</td><td class="num">${fmt(x.kwh, 0)} kWh</td>
        <td class="num">${co2Txt(x.kg)}</td><td>${prioridad}</td></tr>`;
    }).join("") || '<tr><td colspan="8" class="empty">Sin datos.</td></tr>';

    $("btn-csv").onclick = () => {
      const rows = [["edificio", "periodo", "luminarias", "pct_led", "potencia_kw", "consumo_kwh", "emisiones_kg_co2e", "kwh_por_luminaria", "kg_co2e_por_luminaria"]]
        .concat(resumen.map(({ e, a }) => [e.nombre, periodo.anio, a.lum, a.pctLed.toFixed(1), a.kw.toFixed(3), a.kwh.toFixed(2), a.kg.toFixed(3), a.kwhLum == null ? "" : a.kwhLum.toFixed(2), a.kgLum == null ? "" : a.kgLum.toFixed(3)]));
      const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
      a.download = `iluminacion_resumen_${periodo.anio}.csv`;
      a.click();
    };
  }

  render();
});
