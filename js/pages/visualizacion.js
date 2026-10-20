/* =========================================================
   MÓDULO DE VISUALIZACIÓN — indicadores, evolución temporal,
   comparaciones y distribución de emisiones.
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  const { $, esc, fmt, fillSelect, apiErrorBox, PALETTE } = CampusCO2.ui;
  const api = CampusCO2.api;
  const charts = {};
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
    const interior = lista.filter((f) => f.sector.superficie_m2);
    const m2 = [...new Set(interior.map((f) => f.sector.id_sector))].reduce((s, id) => s + (ctx.sectorPorId[id].superficie_m2 || 0), 0);
    const kw = sum(lista, "potencia_kw"), kwh = sum(lista, "kwh"), kg = sum(lista, "kg");
    const lum = sum(lista, "cantidad"), led = sum(lista.filter((f) => f.eficiente), "cantidad");
    return {
      kg, kwh, kw, lum, led, m2,
      pctLed: lum ? (led / lum) * 100 : 0,
      lpd: m2 ? (sum(interior, "potencia_kw") * 1000) / m2 : null,
      intensidad: m2 ? sum(interior, "kg") / m2 : null,
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
        legend: { labels: { usePointStyle: true, boxWidth: 8, color: "#52514e", font: { size: 11 } } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label || c.label}: ${fmt(c.parsed.y ?? c.parsed.x ?? c.parsed, unidad() === "t" ? 3 : 1)} ${unidad() === "t" ? "tCO₂e" : "kgCO₂e"}` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#6b7280" } },
        y: { beginAtZero: true, grid: { color: "#eef0f4" }, ticks: { color: "#6b7280" }, title: { display: true, text: unidad() === "t" ? "tCO₂e" : "kgCO₂e", color: "#6b7280" } }
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
    $("k-lpd").innerHTML = A.lpd == null ? "–" : `${fmt(A.lpd, 1)} <em>W/m²</em>`;
    $("k-int").innerHTML = A.intensidad == null ? "–" : `${fmt(A.intensidad, 2)} <em>kgCO₂e/m²</em>`;
    $("k-hrs").innerHTML = A.horas == null ? "–" : `${fmt(A.horas, 0)} <em>h/año</em>`;

    const edificios = ctx.edificios.filter((e) => !idE || String(e.id_edificio) === idE);

    // --- Emisiones por edificio (barra horizontal) ---
    $("t-edif").textContent = `Período ${periodo.anio}, ordenado de mayor a menor.`;
    const porEd = edificios.map((e) => ({ e, kg: sum(actual.filter((f) => f.actividad.id_edificio === e.id_edificio), "kg") })).sort((a, b) => b.kg - a.kg);
    draw("ch-edificio", {
      type: "bar",
      data: { labels: porEd.map((x) => x.e.nombre), datasets: [{ label: "Emisiones", data: porEd.map((x) => conv(x.kg)), backgroundColor: porEd.map((x) => colorEdificio[x.e.id_edificio]), borderRadius: 4, maxBarThickness: 28 }] },
      options: baseOptions({ indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => co2Txt(unidad() === "t" ? c.parsed.x * 1000 : c.parsed.x) } } },
        scales: { x: { beginAtZero: true, grid: { color: "#eef0f4" }, title: { display: true, text: unidad() === "t" ? "tCO₂e" : "kgCO₂e" } }, y: { grid: { display: false } } } })
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
          prev && { label: String(prev.anio), data: edificios.map((e) => conv(sum(anterior.filter((f) => f.actividad.id_edificio === e.id_edificio), "kg"))), backgroundColor: "#a8b3c7", borderRadius: 4, maxBarThickness: 26 },
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
      data: { labels: porTec.map((x) => x.t), datasets: [{ data: porTec.map((x) => conv(x.kg)), backgroundColor: porTec.map((x) => colorTec[x.t]), borderColor: "#fff", borderWidth: 2, hoverOffset: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: "62%",
        plugins: { legend: { position: "right", labels: { usePointStyle: true, boxWidth: 8, color: "#52514e", font: { size: 11 },
          generateLabels: (ch) => ch.data.labels.map((l, i) => ({ text: `${l} · ${fmt((porTec[i].kg / totalTec) * 100, 0)} %`, fillStyle: ch.data.datasets[0].backgroundColor[i], strokeStyle: "#fff", pointStyle: "circle", index: i, fontColor: "#52514e" })) } },
          tooltip: { callbacks: { label: (c) => `${c.label}: ${co2Txt(porTec[c.dataIndex].kg)} (${fmt((porTec[c.dataIndex].kg / totalTec) * 100, 1)} %)` } } } }
    });

    // --- Distribución por tipo de espacio ---
    const espacios = [...new Set(ctx.sectores.map((s) => s.tipo_espacio))];
    const porEsp = espacios.map((t) => ({ t, kg: sum(actual.filter((f) => f.sector.tipo_espacio === t), "kg") })).filter((x) => x.kg > 0).sort((a, b) => b.kg - a.kg);
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
      <td class="num">${a.lpd == null ? "–" : fmt(a.lpd, 1)}</td><td class="num">${a.intensidad == null ? "–" : fmt(a.intensidad, 2)}</td></tr>`).join("") +
      `<tr><td><b>Total</b></td><td class="num"><b>${fmt(A.lum, 0)}</b></td><td class="num"><b>${fmt(A.pctLed, 0)} %</b></td><td class="num"><b>${fmt(A.kw, 2)} kW</b></td><td class="num"><b>${fmt(A.kwh, 0)} kWh</b></td><td class="num"><b>${co2Txt(A.kg)}</b></td><td class="num">${P ? `${fmt(delta(A.kg, P.kg), 1)} %` : "–"}</td><td class="num">${A.lpd == null ? "–" : fmt(A.lpd, 1)}</td><td class="num">${A.intensidad == null ? "–" : fmt(A.intensidad, 2)}</td></tr>`;

    // --- Ranking de sectores ---
    const sectores = [...new Set(actual.map((f) => f.sector.id_sector))].map((id) => {
      const s = ctx.sectorPorId[id];
      const fs = actual.filter((f) => f.sector.id_sector === id);
      const ag = agregados(fs);
      return { s, ag, lpd: s.superficie_m2 ? (ag.kw * 1000) / s.superficie_m2 : null, int: s.superficie_m2 ? ag.kg / s.superficie_m2 : null };
    }).sort((a, b) => (b.lpd ?? -1) - (a.lpd ?? -1));
    $("tbl-sectores").innerHTML = sectores.map((x) => {
      const prioridad = x.ag.pctLed >= 99 ? '<span class="badge ok">Eficiente</span>' : (x.lpd ?? 0) > 10 || x.lpd == null ? '<span class="badge err">Alta</span>' : '<span class="badge warn">Media</span>';
      return `<tr><td><b>${esc(x.s.nombre)}</b></td><td>${esc(ctx.edificioPorId[x.s.id_edificio].nombre)}</td><td>${esc(x.s.tipo_espacio)}</td>
        <td class="num">${x.s.superficie_m2 ? `${fmt(x.s.superficie_m2, 0)} m²` : "–"}</td><td class="num">${x.lpd == null ? "–" : fmt(x.lpd, 1)}</td>
        <td class="num">${x.int == null ? "–" : fmt(x.int, 2)}</td><td class="num">${fmt(x.ag.pctLed, 0)} %</td><td>${prioridad}</td></tr>`;
    }).join("") || '<tr><td colspan="8" class="empty">Sin datos.</td></tr>';

    $("btn-csv").onclick = () => {
      const rows = [["edificio", "periodo", "luminarias", "pct_led", "potencia_kw", "consumo_kwh", "emisiones_kg_co2e", "w_m2", "kg_co2e_m2"]]
        .concat(resumen.map(({ e, a }) => [e.nombre, periodo.anio, a.lum, a.pctLed.toFixed(1), a.kw.toFixed(3), a.kwh.toFixed(2), a.kg.toFixed(3), a.lpd == null ? "" : a.lpd.toFixed(2), a.intensidad == null ? "" : a.intensidad.toFixed(3)]));
      const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
      a.download = `iluminacion_resumen_${periodo.anio}.csv`;
      a.click();
    };
  }

  render();
});
