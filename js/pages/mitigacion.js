/* =========================================================
   Proyectos de mitigación (recambio a LED) y emisiones evitadas
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  const { $, esc, fmt, toast, fillSelect, apiErrorBox } = CampusCO2.ui;
  const api = CampusCO2.api;
  const calc = CampusCO2.calculo;
  let ctx, factor = null, actividades = [], ultimo = null;

  try {
    ctx = await CampusCO2.contexto.cargar();
    actividades = await api.listarActividades();
  } catch (e) { apiErrorBox($("op-table").closest(".panel"), e); return; }

  const periodosDesc = ctx.periodos.slice().reverse();
  fillSelect($("op-periodo"), periodosDesc, "id_periodo", (p) => p.anio);
  fillSelect($("id_periodo"), periodosDesc, "id_periodo", (p) => p.anio);
  fillSelect($("id_edificio"), ctx.edificios, "id_edificio", (e) => e.nombre, { placeholder: "Seleccionar…" });
  fillSelect($("tipo_base"), ctx.tipos.filter((t) => !t.eficiente), "id_tipo_luminaria", (t) => `${t.nombre} · ${t.potencia_referencia_w} W`);
  fillSelect($("tipo_nuevo"), ctx.tipos.filter((t) => t.eficiente), "id_tipo_luminaria", (t) => `${t.nombre} · ${t.potencia_referencia_w} W`);

  // Valores iniciales de ejemplo
  $("nombre").value = "Recambio a LED";
  $("fecha_inicio").value = new Date().toISOString().slice(0, 10);
  $("cantidad_base").value = 40; $("cantidad_nueva").value = 40; $("horas_uso").value = 10; $("dias_anio").value = 200;
  $("potencia_base").value = ctx.tipoPorId[$("tipo_base").value].potencia_referencia_w;
  $("potencia_nueva").value = ctx.tipoPorId[$("tipo_nuevo").value].potencia_referencia_w;

  $("tipo_base").addEventListener("change", () => { $("potencia_base").value = ctx.tipoPorId[$("tipo_base").value].potencia_referencia_w; recalc(); });
  $("tipo_nuevo").addEventListener("change", () => { $("potencia_nueva").value = ctx.tipoPorId[$("tipo_nuevo").value].potencia_referencia_w; recalc(); });
  $("id_periodo").addEventListener("change", loadFactor);
  $("op-periodo").addEventListener("change", renderOportunidades);
  $("project-form").addEventListener("input", recalc);

  /* Reemplazo sugerido por tecnología */
  function sugerido(tipo) {
    const t = (tipo.nombre || "").toLowerCase();
    const id = t.includes("tubo") ? 2 : t.includes("reflector") ? 8 : 4;
    return ctx.tipoPorId[id] || ctx.tipos.find((x) => x.eficiente);
  }

  function renderOportunidades() {
    const idP = Number($("op-periodo").value);
    const filas = CampusCO2.contexto.enriquecer(ctx, actividades.filter((a) => a.id_periodo === idP), []).filter((f) => !f.eficiente);
    if (!filas.length) { $("op-table").innerHTML = '<tr><td colspan="7" class="empty">Todas las luminarias del período son eficientes.</td></tr>'; return; }
    $("op-table").innerHTML = filas.map((f) => {
      const nuevo = sugerido(f.tipo);
      const ahorro = f.kwh * (1 - nuevo.potencia_referencia_w / calc.convertir(f.det.potencia_unitaria, f.det.unidad_potencia || "W", "W"));
      return `<tr><td><b>${esc(f.edificio)}</b><br><small>Período ${esc(f.anio)}</small></td><td>${esc(f.tipo.nombre)}</td>
        <td class="num">${fmt(f.cantidad, 0)}</td><td class="num">${fmt(f.kwh, 0)} kWh</td><td>${esc(nuevo.nombre)}</td>
        <td class="num">${ahorro > 0 ? `${fmt(ahorro, 0)} kWh` : "–"}</td>
        <td><button class="btn btn-outline btn-sm" data-use="${f.actividad.id_actividad}">Usar</button></td></tr>`;
    }).join("");
  }

  $("op-table").addEventListener("click", (e) => {
    const b = e.target.closest("[data-use]");
    if (!b) return;
    const a = actividades.find((x) => String(x.id_actividad) === b.dataset.use);
    const d = a.detalle_iluminacion;
    const tipo = ctx.tipoPorId[d.id_tipo_luminaria];
    const nuevo = sugerido(tipo);
    $("nombre").value = `Recambio LED – ${tipo.nombre} (${ctx.edificioPorId[a.id_edificio].nombre})`;
    $("id_edificio").value = a.id_edificio;
    $("id_periodo").value = a.id_periodo;
    $("tipo_base").value = tipo.id_tipo_luminaria;
    $("tipo_nuevo").value = nuevo.id_tipo_luminaria;
    $("potencia_base").value = calc.convertir(d.potencia_unitaria, d.unidad_potencia || "W", "W");
    $("potencia_nueva").value = nuevo.potencia_referencia_w;
    $("cantidad_base").value = d.cantidad;
    $("cantidad_nueva").value = d.cantidad;
    const h = calc.horasAnuales(d).horas;
    $("horas_uso").value = d.unidad_tiempo === "h/año" ? +(h / 250).toFixed(2) : d.horas_uso;
    $("dias_anio").value = d.unidad_tiempo === "h/año" ? 250 : d.dias_anio;
    $("descripcion").value = `Reemplazo de ${d.cantidad} × ${tipo.nombre} por ${nuevo.nombre}. Origen: dato de actividad #${a.id_actividad}.`;
    loadFactor();
    $("project-form").scrollIntoView({ behavior: "smooth" });
  });

  async function loadFactor() {
    factor = null;
    try {
      factor = await api.getFactorPeriodo($("id_periodo").value);
      $("fe-info").textContent = `FE aplicado: ${fmt(factor.valor, 3)} ${factor.unidad}`;
    } catch (e) { $("fe-info").textContent = "Sin factor de emisión para el período."; }
    recalc();
  }

  function params() {
    return {
      cantidad_base: Number($("cantidad_base").value), potencia_base: Number($("potencia_base").value),
      cantidad_nueva: Number($("cantidad_nueva").value), potencia_nueva: Number($("potencia_nueva").value),
      horas_uso: Number($("horas_uso").value), unidad_tiempo: "h/día", dias_anio: Number($("dias_anio").value),
      id_tipo_base: Number($("tipo_base").value), id_tipo_nuevo: Number($("tipo_nuevo").value)
    };
  }

  function recalc() {
    const p = params();
    if (!factor || !(p.cantidad_base > 0 && p.potencia_base > 0 && p.cantidad_nueva > 0 && p.potencia_nueva > 0 && p.horas_uso > 0 && p.dias_anio > 0)) { ultimo = null; return; }
    ultimo = calc.calcularEvitadas(p, factor);
    $("avoided").innerHTML = `${fmt(ultimo.kg_co2e_evitados, 1)} <em>kgCO₂e/año</em>`;
    $("avoided-note").textContent = `Equivale a ${fmt(ultimo.t_co2e_evitados, 3)} tCO₂e por año con el factor del período ${ctx.periodoPorId[$("id_periodo").value].anio}.`;
    $("base-kwh").textContent = `${fmt(ultimo.consumo_base_kwh, 0)} kWh`;
    $("new-kwh").textContent = `${fmt(ultimo.consumo_mejorado_kwh, 0)} kWh`;
    $("base-bar").style.width = "100%";
    $("new-bar").style.width = `${ultimo.consumo_base_kwh ? Math.min(100, (ultimo.consumo_mejorado_kwh / ultimo.consumo_base_kwh) * 100) : 0}%`;
    $("saving").textContent = `${fmt(ultimo.reduccion_pct, 0)} %`;
    $("mit-trace").innerHTML = ultimo.trazabilidad.pasos.map((s) => `<li><span>${esc(s.descripcion)}<code>${esc(s.formula)}</code></span><strong>${esc(s.resultado)}</strong></li>`).join("");
  }

  function validate() {
    const p = params();
    let errors = 0;
    const flag = (id, bad) => { $(id).closest(".field").classList.toggle("invalid", bad); if (bad) errors++; };
    flag("nombre", $("nombre").value.trim().length < 5);
    flag("id_edificio", !$("id_edificio").value);
    flag("fecha_inicio", !$("fecha_inicio").value);
    flag("potencia_base", !(p.potencia_base >= 0.5 && p.potencia_base <= 2000));
    flag("potencia_nueva", !(p.potencia_nueva >= 0.5 && p.potencia_nueva * p.cantidad_nueva < p.potencia_base * p.cantidad_base));
    flag("cantidad_base", !(Number.isInteger(p.cantidad_base) && p.cantidad_base >= 1 && p.cantidad_base <= 10000));
    flag("cantidad_nueva", !(Number.isInteger(p.cantidad_nueva) && p.cantidad_nueva >= 1 && p.cantidad_nueva <= 10000));
    flag("horas_uso", !(p.horas_uso >= 0.5 && p.horas_uso <= 24));
    flag("dias_anio", !(Number.isInteger(p.dias_anio) && p.dias_anio >= 1 && p.dias_anio <= 366));
    return errors;
  }

  $("project-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("project-message");
    const errors = validate();
    if (errors || !ultimo) {
      msg.className = "form-message err";
      msg.textContent = errors ? `Hay ${errors} campo(s) con errores. La potencia total propuesta debe ser menor que la base.` : "No hay factor de emisión para el período.";
      return;
    }
    $("btn-save").disabled = true;
    try {
      const proyecto = await api.crearProyecto({
        id_edificio: Number($("id_edificio").value), id_dimension: ctx.dimension.id_dimension,
        nombre: $("nombre").value.trim(), descripcion: $("descripcion").value.trim(), tipo_medida: "Recambio a LED",
        fecha_inicio: $("fecha_inicio").value, estado: $("estado").value
      });
      await api.crearEvitada({
        id_proyecto: proyecto.id_proyecto, id_periodo: Number($("id_periodo").value), id_factor: factor.id_factor,
        consumo_base_kwh: ultimo.consumo_base_kwh, consumo_mejorado_kwh: ultimo.consumo_mejorado_kwh,
        kg_co2e_evitados: ultimo.kg_co2e_evitados, parametros: params(), trazabilidad: ultimo.trazabilidad
      });
      msg.className = "form-message ok";
      msg.textContent = `Proyecto #${proyecto.id_proyecto} y sus emisiones evitadas fueron enviados a la API.`;
      toast("Proyecto registrado", "ok");
      renderProyectos();
    } catch (err) {
      msg.className = "form-message err";
      msg.textContent = `Error al enviar a la API: ${err.message}`;
    } finally { $("btn-save").disabled = false; }
  });

  async function renderProyectos() {
    try {
      const [proyectos, evitadas] = await Promise.all([api.listarProyectos(), api.listarEvitadas()]);
      $("project-table").innerHTML = proyectos.map((p) => {
        const ev = evitadas.filter((x) => x.id_proyecto === p.id_proyecto);
        const s = (k) => ev.reduce((a, x) => a + Number(x[k] || 0), 0);
        return `<tr><td><b>${esc(p.nombre)}</b></td><td>${esc((ctx.edificioPorId[p.id_edificio] || {}).nombre || "")}</td>
          <td><span class="badge ${p.estado === "Implementado" ? "ok" : "violet"}">${esc(p.estado)}</span></td><td>${esc(p.fecha_inicio || "")}</td>
          <td class="num">${fmt(s("consumo_base_kwh"), 0)} kWh</td><td class="num">${fmt(s("consumo_mejorado_kwh"), 0)} kWh</td>
          <td class="num"><b>${fmt(s("kg_co2e_evitados"), 1)} kgCO₂e</b></td></tr>`;
      }).join("") || '<tr><td colspan="7" class="empty">Sin proyectos registrados.</td></tr>';
    } catch (e) { $("project-table").innerHTML = `<tr><td colspan="7" class="empty">${esc(e.message)}</td></tr>`; }
  }

  renderOportunidades();
  renderProyectos();
  loadFactor();
});
