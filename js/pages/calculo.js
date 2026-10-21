/* =========================================================
   MÓDULO DE CÁLCULO — aplica FE, convierte unidades,
   muestra trazabilidad y envía resultados a la API.
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  const { $, esc, fmt, toast, fillSelect, apiErrorBox } = CampusCO2.ui;
  const api = CampusCO2.api;
  const calc = CampusCO2.calculo;

  let ctx, factor = null, actividades = [], resultados = [], seleccion = null;

  try {
    ctx = await CampusCO2.contexto.cargar();
  } catch (e) { apiErrorBox($("factor-box"), e); return; }

  fillSelect($("periodo"), ctx.periodos.slice().reverse(), "id_periodo", (p) => p.anio);
  fillSelect($("edificio"), ctx.edificios, "id_edificio", (e) => e.nombre, { placeholder: "Todos" });
  const qp = new URLSearchParams(location.search).get("periodo");
  if (qp && ctx.periodoPorId[qp]) $("periodo").value = qp;

  $("periodo").addEventListener("change", () => { seleccion = null; load(); });
  $("edificio").addEventListener("change", render);
  $("unidad").addEventListener("change", () => { render(); if (seleccion) showTrace(seleccion); });

  const showCO2 = (kg) => $("unidad").value === "t" ? `${fmt(kg / 1000, 4)} tCO₂e` : `${fmt(kg, 2)} kgCO₂e`;

  async function load() {
    const id_periodo = $("periodo").value;
    factor = null;
    try {
      factor = await api.getFactorPeriodo(id_periodo);
      const n = calc.normalizarFactor(factor);
      $("factor-box").innerHTML = `
        <strong style="font-size:22px">${fmt(factor.valor, 3)} <em style="font-size:12px;font-style:normal;color:var(--muted)">${esc(factor.unidad)}</em></strong>
        <dl class="kv mt"><dt>Normalizado</dt><dd>${fmt(n.valor_kg_kwh, 4)} kgCO₂e/kWh</dd>
        <dt>Fuente</dt><dd>${esc(factor.fuente_nombre || (ctx.fuentePorId[factor.id_fuente] || {}).nombre || "—")}</dd>
        <dt>Id factor</dt><dd>#${esc(factor.id_factor)} · ${esc(factor.anio || "")}</dd></dl>`;
    } catch (e) {
      $("factor-box").innerHTML = `<div class="alert alert-err">${esc(e.message)}</div>`;
    }
    try {
      [actividades, resultados] = await Promise.all([api.listarActividades({ id_periodo }), api.listarResultados()]);
    } catch (e) { apiErrorBox($("calc-table"), e); return; }
    render();
  }

  function filas() {
    const fe = $("edificio").value;
    return CampusCO2.contexto.enriquecer(ctx, actividades, resultados)
      .filter((f) => !fe || String(f.actividad.id_edificio) === fe)
      .map((f) => {
        const a = f.actividad;
        const desact = f.resultado && (
          (a.updated_at && new Date(a.updated_at) > new Date(f.resultado.fecha_calculo)) ||
          (factor && f.resultado.id_factor !== factor.id_factor));
        return Object.assign(f, { estado: !f.resultado ? "pendiente" : desact ? "desactualizado" : "calculado" });
      })
      .sort((a, b) => a.edificio.localeCompare(b.edificio) || (a.tipo.nombre || "").localeCompare(b.tipo.nombre || ""));
  }

  function render() {
    const lista = filas();
    const pend = lista.filter((f) => f.estado !== "calculado");
    $("btn-all").disabled = !pend.length || !factor;
    $("btn-all").textContent = pend.length ? `Calcular y enviar ${pend.length} pendiente(s)` : "Sin pendientes";
    const totKg = lista.reduce((s, f) => s + (f.kg || 0), 0);
    const totKwh = lista.reduce((s, f) => s + f.kwh, 0);
    $("estado-box").innerHTML = `
      <strong style="font-size:22px">${lista.length - pend.length} / ${lista.length}</strong> <small class="required-note">registros calculados</small>
      <dl class="kv mt"><dt>Consumo</dt><dd>${fmt(totKwh, 0)} kWh</dd><dt>Emisiones</dt><dd>${showCO2(totKg)}</dd></dl>`;

    const tbody = $("calc-table");
    if (!lista.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty">No hay datos de actividad en este período. <a href="carga.html">Cargar datos →</a></td></tr>'; $("calc-foot").innerHTML = ""; return; }
    const badge = { pendiente: '<span class="badge warn">Pendiente</span>', desactualizado: '<span class="badge err">Desactualizado</span>', calculado: '<span class="badge ok">Calculado</span>' };
    tbody.innerHTML = lista.map((f) => `
      <tr class="${seleccion === f.actividad.id_actividad ? "selected" : ""}">
        <td>${f.actividad.id_actividad}</td>
        <td><b>${esc(f.edificio)}</b><br><small>Período ${esc(f.anio)}</small></td>
        <td>${esc(f.tipo.nombre || "")}</td>
        <td class="num">${fmt(f.kwh, 1)} kWh</td>
        <td class="num">${f.kg == null ? "–" : showCO2(f.kg)}</td>
        <td>${f.resultado ? new Date(f.resultado.fecha_calculo).toLocaleDateString("es-AR") + ` · ${esc(f.resultado.version_metodologia || "")}` : "–"}</td>
        <td>${badge[f.estado]}</td>
        <td><div class="row-actions">
          <button class="btn btn-outline btn-sm" data-trace="${f.actividad.id_actividad}">Ver traza</button>
          ${f.estado !== "calculado" ? `<button class="btn btn-primary btn-sm" data-calc="${f.actividad.id_actividad}" ${factor ? "" : "disabled"}>${f.estado === "pendiente" ? "Calcular" : "Recalcular"}</button>` : ""}
        </div></td>
      </tr>`).join("");
    $("calc-foot").innerHTML = `<tr><td></td><td colspan="2"><b>Total del período${$("edificio").value ? " (edificio filtrado)" : ""}</b></td><td class="num"><b>${fmt(totKwh, 1)} kWh</b></td><td class="num"><b>${showCO2(totKg)}</b></td><td colspan="3"></td></tr>`;
  }

  function contexto(f) {
    return { edificio: f.edificio, periodo: f.anio, tipo_luminaria: f.tipo.nombre };
  }

  /* Payload enviado a POST /resultados-emisiones */
  function resultadoPayload(f) {
    const r = calc.calcularEmisiones(f.actividad, factor, contexto(f));
    return {
      id_actividad: f.actividad.id_actividad,
      id_factor: factor.id_factor,
      id_dimension: ctx.dimension.id_dimension,
      alcance: r.alcance,
      consumo_kwh: r.consumo_kwh,
      emisiones_kg_co2e: r.emisiones_kg_co2e,
      emisiones_t_co2e: r.emisiones_t_co2e,
      fecha_calculo: r.fecha_calculo,
      version_metodologia: r.version_metodologia,
      trazabilidad: r.trazabilidad
    };
  }

  async function enviar(f) {
    const payload = resultadoPayload(f);
    const saved = await api.crearResultado(payload);
    resultados.push(saved || payload);
    return saved || payload;
  }

  $("calc-table").addEventListener("click", async (e) => {
    const t = e.target.closest("[data-trace]");
    const c = e.target.closest("[data-calc]");
    if (t) { seleccion = Number(t.dataset.trace); render(); showTrace(seleccion); $("trace-panel").scrollIntoView({ behavior: "smooth" }); }
    if (c) {
      const f = filas().find((x) => x.actividad.id_actividad === Number(c.dataset.calc));
      c.disabled = true;
      try {
        await enviar(f);
        toast(`Resultado de la actividad #${f.actividad.id_actividad} enviado a la API`, "ok");
        seleccion = f.actividad.id_actividad;
        render(); showTrace(seleccion);
      } catch (err) { toast(`Error al enviar: ${err.message}`, "err"); c.disabled = false; }
    }
  });

  $("btn-all").addEventListener("click", async () => {
    const pend = filas().filter((f) => f.estado !== "calculado");
    $("btn-all").disabled = true;
    let ok = 0, fail = 0;
    for (const f of pend) {
      try { await enviar(f); ok++; } catch (err) { fail++; }
    }
    $("calc-message").className = `form-message ${fail ? "err" : "ok"}`;
    $("calc-message").textContent = `${ok} resultado(s) enviados a la API${fail ? `, ${fail} con error` : ""}.`;
    render();
  });

  function showTrace(idAct) {
    const f = filas().find((x) => x.actividad.id_actividad === idAct);
    if (!f) return;
    let r, origen;
    if (f.resultado && f.estado === "calculado" && f.resultado.trazabilidad) {
      r = f.resultado; origen = `Resultado #${f.resultado.id_resultado ?? "—"} almacenado en la API (${new Date(r.fecha_calculo).toLocaleString("es-AR")}).`;
    } else if (factor) {
      r = resultadoPayload(f); origen = "Vista previa: este cálculo todavía no fue enviado a la API.";
    } else { $("trace").innerHTML = '<div class="alert alert-err">No hay factor de emisión para el período.</div>'; return; }
    const tr = r.trazabilidad;
    $("trace-sub").textContent = `Actividad #${idAct} · ${f.edificio} · ${f.anio}. ${origen}`;
    const ent = tr.entradas || {};
    $("trace").innerHTML = `
      <div class="grid-3">
        <div class="trace-block"><h4>Datos de entrada</h4><dl class="kv">
          <dt>Tipo</dt><dd>${esc(ent.tipo_luminaria || f.tipo.nombre)}</dd>
          <dt>Cantidad</dt><dd>${fmt(ent.cantidad, 0)} u</dd>
          <dt>Potencia</dt><dd>${fmt(ent.potencia_unitaria, 2)} ${esc(ent.unidad_potencia)}</dd>
          <dt>Uso</dt><dd>${fmt(ent.horas_uso, 1)} ${esc(ent.unidad_tiempo)}${ent.dias_anio ? ` × ${fmt(ent.dias_anio, 0)} días` : ""}</dd>
          <dt>Simultaneidad</dt><dd>${fmt(ent.factor_simultaneidad, 0)} %</dd>
          <dt>Fuente</dt><dd>${esc((ctx.fuentePorId[f.actividad.id_fuente] || {}).nombre || "—")}</dd></dl></div>
        <div class="trace-block"><h4>Factor de emisión</h4><dl class="kv">
          <dt>Id</dt><dd>#${esc(tr.factor_emision.id_factor)}</dd>
          <dt>Valor original</dt><dd>${fmt(tr.factor_emision.valor_original, 4)} ${esc(tr.factor_emision.unidad_original)}</dd>
          <dt>Normalizado</dt><dd>${fmt(tr.factor_emision.valor_normalizado_kg_kwh, 4)} kgCO₂e/kWh</dd>
          <dt>Fuente</dt><dd>${esc(tr.factor_emision.fuente || "—")}</dd>
          <dt>Método</dt><dd>${esc(tr.metodo)}</dd></dl></div>
        <div class="trace-block"><h4>Resultado</h4><dl class="kv">
          <dt>Alcance</dt><dd>${esc(r.alcance)}</dd>
          <dt>Consumo</dt><dd>${fmt(r.consumo_kwh, 2)} kWh</dd>
          <dt>Emisiones</dt><dd>${fmt(r.emisiones_kg_co2e, 2)} kgCO₂e</dd>
          <dt></dt><dd>${fmt(r.emisiones_t_co2e, 5)} tCO₂e</dd>
          <dt>Versión</dt><dd>${esc(r.version_metodologia)}</dd></dl></div>
      </div>
      <div class="trace-block"><h4>Conversiones de unidades</h4>
        <div class="table-wrap"><table><thead><tr><th>Magnitud</th><th>De</th><th>A</th><th>Regla</th></tr></thead><tbody>
        ${(tr.conversiones || []).map((c) => `<tr><td>${esc(c.magnitud)}</td><td>${esc(c.de)}</td><td>${esc(c.a)}</td><td>${esc(c.regla)}</td></tr>`).join("")}
        </tbody></table></div></div>
      <div class="trace-block"><h4>Pasos del cálculo</h4><ol class="trace-steps">
        ${(tr.pasos || []).map((p) => `<li><span>${esc(p.descripcion)}<code>${esc(p.formula)}</code></span><strong>${esc(p.resultado)}</strong></li>`).join("")}
      </ol></div>
      <details class="trace-block"><summary style="cursor:pointer"><b>JSON enviado a POST /resultados-emisiones</b></summary><pre class="json-box mt">${esc(JSON.stringify(r, null, 2))}</pre></details>`;
  }

  load();
});
