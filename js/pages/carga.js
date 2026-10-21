/* =========================================================
   MÓDULO DE CARGA — formulario, validaciones y envío a la API
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  const { $, esc, fmt, toast, fillSelect, apiErrorBox } = CampusCO2.ui;
  const api = CampusCO2.api;
  const calc = CampusCO2.calculo;
  const form = $("activity-form");

  let ctx, unidades, actividades = [], resultados = [], factorActual = null;

  /* ---------- Inicialización ---------- */
  try {
    ctx = await CampusCO2.contexto.cargar();
    unidades = await api.getUnidades();
    const univ = (await api.getUniversidades()).find((u) => u.id_universidad === CampusCO2.config.get().idUniversidad);
    $("universidad").value = univ ? univ.nombre : "—";

    fillSelect($("id_edificio"), ctx.edificios, "id_edificio", (e) => e.nombre, { placeholder: "Seleccionar…" });
    fillSelect($("id_periodo"), ctx.periodos.slice().reverse(), "id_periodo", (p) => `${p.anio}${p.estado === "cerrado" ? " (cerrado)" : ""}`, { placeholder: "Seleccionar…" });
    fillSelect($("id_tipo_luminaria"), ctx.tipos, "id_tipo_luminaria", (t) => `${t.nombre} · ${t.potencia_referencia_w} W`, { placeholder: "Seleccionar…" });
    fillSelect($("id_fuente"), ctx.fuentes.filter((f) => f.tipo !== "factor_emision"), "id_fuente", (f) => f.nombre, { placeholder: "Seleccionar…" });
    fillSelect($("f-periodo"), ctx.periodos.slice().reverse(), "id_periodo", (p) => p.anio, { placeholder: "Todos" });
    fillSelect($("f-edificio"), ctx.edificios, "id_edificio", (e) => e.nombre, { placeholder: "Todos" });

    // Valores sugeridos
    const abierto = ctx.periodos.find((p) => p.estado === "abierto") || ctx.periodos[ctx.periodos.length - 1];
    $("id_periodo").value = abierto.id_periodo;
    $("f-periodo").value = abierto.id_periodo;
    setDefaults();
    await onPeriodoChange();
    await refreshTable();
  } catch (e) {
    apiErrorBox(form, e);
    return;
  }

  function setDefaults() {
    $("unidad_tiempo").value = "h/día";
    $("horas_uso").value = 8;
    $("dias_anio").value = 200;
    $("factor_simultaneidad").value = 100;
    $("cantidad").value = "";
    $("potencia_unitaria").value = "";
    $("responsable").value = "Grupo 4 – Iluminación";
    const p = ctx.periodoPorId[$("id_periodo").value];
    const hoy = new Date().toISOString().slice(0, 10);
    $("fecha_relevamiento").value = p && hoy.startsWith(String(p.anio)) ? hoy : p ? `${p.anio}-06-01` : hoy;
    onUnidadTiempoChange();
  }

  /* ---------- Dependencias entre campos ---------- */
  $("id_edificio").addEventListener("change", preview);
  $("id_tipo_luminaria").addEventListener("change", () => {
    const t = ctx.tipoPorId[$("id_tipo_luminaria").value];
    if (t) {
      $("unidad_potencia").value = "W";
      $("potencia_unitaria").value = t.potencia_referencia_w;
      $("tipo-info").textContent = `Tecnología: ${t.tecnologia}${t.eficiente ? " · eficiente" : ""}`;
    } else $("tipo-info").textContent = "";
    preview();
  });
  $("unidad_tiempo").addEventListener("change", onUnidadTiempoChange);
  $("id_periodo").addEventListener("change", onPeriodoChange);
  form.addEventListener("input", preview);

  function onUnidadTiempoChange() {
    const anual = $("unidad_tiempo").value === "h/año";
    $("dias_anio").disabled = anual;
    $("err-horas").textContent = anual ? "Ingresá entre 1 y 8.784 h/año." : "Ingresá entre 0,5 y 24 h/día.";
    if (anual && Number($("horas_uso").value) <= 24) $("horas_uso").value = Math.round(Number($("horas_uso").value || 0) * Number($("dias_anio").value || 0)) || "";
    if (!anual && Number($("horas_uso").value) > 24) $("horas_uso").value = 8;
    preview();
  }

  async function onPeriodoChange() {
    factorActual = null;
    const id = $("id_periodo").value;
    $("periodo-info").textContent = "";
    if (!id) return preview();
    const p = ctx.periodoPorId[id];
    if (p && !$("fecha_relevamiento").value.startsWith(String(p.anio))) {
      const hoy = new Date().toISOString().slice(0, 10);
      $("fecha_relevamiento").value = hoy.startsWith(String(p.anio)) ? hoy : `${p.anio}-06-01`;
    }
    try {
      factorActual = await api.getFactorPeriodo(id);
      $("periodo-info").textContent = `FE de red: ${fmt(factorActual.valor, 3)} ${factorActual.unidad}`;
    } catch (e) {
      $("periodo-info").textContent = "Sin factor de emisión para este período.";
    }
    preview();
  }

  /* ---------- Lectura del formulario ---------- */
  function readDetalle() {
    return {
      id_tipo_luminaria: Number($("id_tipo_luminaria").value) || null,
      cantidad: Number($("cantidad").value),
      potencia_unitaria: Number($("potencia_unitaria").value),
      unidad_potencia: $("unidad_potencia").value,
      horas_uso: Number($("horas_uso").value),
      unidad_tiempo: $("unidad_tiempo").value,
      dias_anio: $("unidad_tiempo").value === "h/año" ? null : Number($("dias_anio").value),
      factor_simultaneidad: Number($("factor_simultaneidad").value),
      fecha_relevamiento: $("fecha_relevamiento").value,
      responsable: $("responsable").value.trim(),
      observaciones: $("observaciones").value.trim()
    };
  }

  function buildPayload() {
    const det = readDetalle();
    const kwhUnidad = unidades.find((u) => u.simbolo === "kWh");
    const tipo = ctx.tipoPorId[det.id_tipo_luminaria];
    const edificio = ctx.edificioPorId[$("id_edificio").value];
    let valor = null;
    try { valor = calc.calcularConsumo(det).kwh; } catch (e) { /* datos incompletos */ }
    return {
      id_edificio: Number($("id_edificio").value) || null,
      id_periodo: Number($("id_periodo").value) || null,
      id_dimension: ctx.dimension.id_dimension,
      id_fuente: Number($("id_fuente").value) || null,
      id_unidad: kwhUnidad ? kwhUnidad.id_unidad : null,
      valor,
      descripcion: tipo && edificio ? `${tipo.nombre} – ${edificio.nombre}` : null,
      detalle_iluminacion: det
    };
  }

  /* ---------- Vista previa del cálculo ---------- */
  function preview() {
    const payload = buildPayload();
    $("payload-preview").textContent = JSON.stringify(payload, null, 2);
    const det = payload.detalle_iluminacion;
    const ok = det.cantidad > 0 && det.potencia_unitaria > 0 && det.horas_uso > 0 && (det.unidad_tiempo === "h/año" || det.dias_anio > 0);
    if (!ok) { $("pv-kw").textContent = "–"; $("pv-kwh").textContent = "–"; $("pv-co2").textContent = "–"; return; }
    const c = calc.calcularConsumo(det);
    $("pv-kw").textContent = `${fmt(c.potencia_instalada_kw, 3)} kW`;
    $("pv-kwh").textContent = `${fmt(c.kwh, 1)} kWh/año`;
    if (factorActual) {
      const fe = calc.normalizarFactor(factorActual);
      $("pv-co2").textContent = `${fmt(c.kwh * fe.valor_kg_kwh, 1)} kgCO₂e`;
    } else $("pv-co2").textContent = "Sin FE";
    checkWarnings(payload);
  }

  function checkWarnings(payload) {
    const msgs = [];
    const det = payload.detalle_iluminacion;
    const dup = actividades.find((a) => a.id_periodo === payload.id_periodo && a.id_edificio === payload.id_edificio && a.detalle_iluminacion &&
      a.detalle_iluminacion.id_tipo_luminaria === det.id_tipo_luminaria && String(a.id_actividad) !== $("id_actividad").value);
    if (dup) msgs.push(`Ya existe un registro de este tipo de luminaria para el mismo edificio y período (#${dup.id_actividad}). Si guardás, se sumará como un registro adicional.`);
    const t = ctx.tipoPorId[det.id_tipo_luminaria];
    if (t && det.potencia_unitaria > 0) {
      const w = calc.convertir(det.potencia_unitaria, det.unidad_potencia, "W");
      if (w > t.potencia_referencia_w * 2 || w < t.potencia_referencia_w / 2) msgs.push(`La potencia ingresada (${fmt(w, 1)} W) difiere mucho de la referencia para “${t.nombre}” (${t.potencia_referencia_w} W). Verificá la unidad o el dato de placa.`);
    }
    $("dup-warning").innerHTML = msgs.map((m) => `<div class="alert alert-warn">${esc(m)}</div>`).join("");
  }

  /* ---------- Validaciones ---------- */
  function setInvalid(id, invalid) { $(id).closest(".field").classList.toggle("invalid", invalid); return invalid; }

  function validate() {
    const det = readDetalle();
    const periodo = ctx.periodoPorId[$("id_periodo").value];
    const diasDelAnio = periodo && ((periodo.anio % 4 === 0 && periodo.anio % 100 !== 0) || periodo.anio % 400 === 0) ? 366 : 365;
    let errors = 0;
    const flag = (id, cond) => { if (setInvalid(id, cond)) errors++; };

    flag("id_edificio", !$("id_edificio").value);
    flag("id_periodo", !periodo);
    flag("id_tipo_luminaria", !det.id_tipo_luminaria);
    flag("id_fuente", !$("id_fuente").value);

    let w = NaN;
    try { w = calc.convertir(det.potencia_unitaria, det.unidad_potencia, "W"); } catch (e) { /* unidad inválida */ }
    flag("potencia_unitaria", !(w >= 0.5 && w <= 2000));
    flag("cantidad", !(Number.isInteger(det.cantidad) && det.cantidad >= 1 && det.cantidad <= 10000));
    flag("factor_simultaneidad", !(det.factor_simultaneidad >= 1 && det.factor_simultaneidad <= 100));

    if (det.unidad_tiempo === "h/año") {
      flag("horas_uso", !(det.horas_uso >= 1 && det.horas_uso <= diasDelAnio * 24));
      setInvalid("dias_anio", false);
    } else {
      flag("horas_uso", !(det.horas_uso >= 0.5 && det.horas_uso <= 24));
      flag("dias_anio", !(Number.isInteger(det.dias_anio) && det.dias_anio >= 1 && det.dias_anio <= diasDelAnio));
    }

    const hoy = new Date().toISOString().slice(0, 10);
    flag("fecha_relevamiento", !det.fecha_relevamiento || det.fecha_relevamiento > hoy || (periodo && !det.fecha_relevamiento.startsWith(String(periodo.anio))));
    flag("responsable", det.responsable.length < 3);
    return errors;
  }

  /* ---------- Envío ---------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("form-message");
    const errors = validate();
    if (errors) {
      msg.className = "form-message err";
      msg.textContent = `Hay ${errors} campo(s) con errores. Revisalos antes de enviar.`;
      form.querySelector(".field.invalid input, .field.invalid select")?.focus();
      return;
    }
    const payload = buildPayload();
    const id = $("id_actividad").value;
    $("btn-submit").disabled = true;
    try {
      const saved = id ? await api.actualizarActividad(id, payload) : await api.crearActividad(payload);
      msg.className = "form-message ok";
      msg.innerHTML = `Dato de actividad #${esc(saved && saved.id_actividad || id)} ${id ? "actualizado" : "registrado"} en la API. <a href="calculo.html?periodo=${payload.id_periodo}">Calcular emisiones →</a>`;
      toast(id ? "Dato de actividad actualizado" : "Dato de actividad guardado", "ok");
      resetForm(false);
      $("f-periodo").value = payload.id_periodo;
      await refreshTable();
    } catch (err) {
      msg.className = "form-message err";
      msg.textContent = `La API rechazó el envío: ${err.message}`;
    } finally {
      $("btn-submit").disabled = false;
    }
  });

  $("btn-cancel").addEventListener("click", () => { resetForm(true); });

  function resetForm(clearMsg) {
    $("id_actividad").value = "";
    $("form-title").textContent = "Nuevo dato de actividad";
    $("btn-submit").innerHTML = "Guardar dato de actividad <span>→</span>";
    ["id_edificio", "id_tipo_luminaria", "id_fuente", "observaciones"].forEach((i) => ($(i).value = ""));
    $("id_edificio").dispatchEvent(new Event("change"));
    $("tipo-info").textContent = "";
    form.querySelectorAll(".field.invalid").forEach((f) => f.classList.remove("invalid"));
    if (clearMsg) $("form-message").textContent = "";
    setDefaults();
  }

  /* ---------- Edición ---------- */
  function loadForEdit(a) {
    const d = a.detalle_iluminacion || {};
    $("id_actividad").value = a.id_actividad;
    $("form-title").textContent = `Editar dato de actividad #${a.id_actividad}`;
    $("btn-submit").innerHTML = "Actualizar (PUT) <span>→</span>";
    $("id_edificio").value = a.id_edificio;
    $("id_edificio").dispatchEvent(new Event("change"));
    $("id_periodo").value = a.id_periodo;
    $("id_tipo_luminaria").value = d.id_tipo_luminaria;
    $("potencia_unitaria").value = d.potencia_unitaria;
    $("unidad_potencia").value = d.unidad_potencia || "W";
    $("cantidad").value = d.cantidad;
    $("factor_simultaneidad").value = d.factor_simultaneidad ?? 100;
    $("unidad_tiempo").value = d.unidad_tiempo || "h/día";
    $("horas_uso").value = d.horas_uso;
    $("dias_anio").value = d.dias_anio ?? "";
    $("dias_anio").disabled = d.unidad_tiempo === "h/año";
    $("id_fuente").value = a.id_fuente;
    $("fecha_relevamiento").value = d.fecha_relevamiento || "";
    $("responsable").value = d.responsable || "";
    $("observaciones").value = d.observaciones || "";
    onPeriodoChange();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- Tabla ---------- */
  $("f-periodo").addEventListener("change", refreshTable);
  $("f-edificio").addEventListener("change", refreshTable);

  async function refreshTable() {
    const tbody = $("activity-table");
    try {
      [actividades, resultados] = await Promise.all([api.listarActividades(), api.listarResultados()]);
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty">Error al consultar la API: ${esc(e.message)}</td></tr>`;
      return;
    }
    const fp = $("f-periodo").value, fe = $("f-edificio").value;
    const filas = CampusCO2.contexto.enriquecer(ctx, actividades, resultados)
      .filter((f) => (!fp || String(f.actividad.id_periodo) === fp) && (!fe || String(f.actividad.id_edificio) === fe))
      .sort((a, b) => b.actividad.id_actividad - a.actividad.id_actividad);

    if (!filas.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty">No hay datos de actividad para el filtro seleccionado.</td></tr>'; return; }
    tbody.innerHTML = filas.map((f) => {
      const a = f.actividad, d = f.det;
      const desact = f.resultado && a.updated_at && new Date(a.updated_at) > new Date(f.resultado.fecha_calculo);
      const estado = !f.resultado ? '<span class="badge warn">Pendiente de cálculo</span>' : desact ? '<span class="badge err">Recalcular</span>' : '<span class="badge ok">Calculado</span>';
      const horas = calc.horasAnuales(d).horas;
      return `<tr>
        <td><b>${esc(f.edificio)}</b><br><small>Período ${esc(f.anio)}</small></td>
        <td>${esc(f.tipo.nombre || "")}</td>
        <td class="num">${fmt(d.cantidad, 0)}</td>
        <td class="num">${fmt(d.potencia_unitaria, 1)} ${esc(d.unidad_potencia || "W")}</td>
        <td class="num">${fmt(horas, 0)}</td>
        <td class="num">${fmt(f.kwh, 1)} kWh</td>
        <td>${esc((ctx.fuentePorId[a.id_fuente] || {}).nombre || "")}</td>
        <td>${estado}</td>
        <td><div class="row-actions"><button class="btn btn-outline btn-sm" data-edit="${a.id_actividad}">Editar</button><button class="btn btn-danger btn-sm" data-del="${a.id_actividad}">Eliminar</button></div></td>
      </tr>`;
    }).join("");
    preview();
  }

  $("activity-table").addEventListener("click", async (e) => {
    const edit = e.target.closest("[data-edit]");
    const del = e.target.closest("[data-del]");
    if (edit) loadForEdit(actividades.find((a) => String(a.id_actividad) === edit.dataset.edit));
    if (del) {
      if (!confirm(`¿Eliminar el dato de actividad #${del.dataset.del}? Se enviará DELETE a la API.`)) return;
      try {
        await api.eliminarActividad(del.dataset.del);
        toast("Dato de actividad eliminado", "ok");
        await refreshTable();
      } catch (err) { toast(`No se pudo eliminar: ${err.message}`, "err"); }
    }
  });
});
