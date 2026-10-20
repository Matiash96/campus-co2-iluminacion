/* Página de inicio: KPIs del último período con datos */
document.addEventListener("DOMContentLoaded", async () => {
  const { $, fmt, fmtCO2, apiErrorBox } = CampusCO2.ui;
  const api = CampusCO2.api;
  try {
    const ctx = await CampusCO2.contexto.cargar();
    const [actividades, resultados, evitadas] = await Promise.all([api.listarActividades(), api.listarResultados(), api.listarEvitadas()]);
    const filas = CampusCO2.contexto.enriquecer(ctx, actividades, resultados);

    const conDatos = ctx.periodos.filter((p) => filas.some((f) => f.actividad.id_periodo === p.id_periodo));
    const periodo = conDatos[conDatos.length - 1];
    if (!periodo) { $("home-period").textContent = "Sin datos cargados"; return; }
    const delPeriodo = filas.filter((f) => f.actividad.id_periodo === periodo.id_periodo);

    const kg = delPeriodo.reduce((s, f) => s + (f.kg || 0), 0);
    const kwh = delPeriodo.reduce((s, f) => s + f.kwh, 0);
    const lum = delPeriodo.reduce((s, f) => s + f.cantidad, 0);
    const led = delPeriodo.filter((f) => f.eficiente).reduce((s, f) => s + f.cantidad, 0);
    const pend = filas.filter((f) => !f.resultado).length;
    const evit = (evitadas || []).filter((e) => e.id_periodo === periodo.id_periodo).reduce((s, e) => s + Number(e.kg_co2e_evitados || 0), 0);

    $("home-period").textContent = `Período ${periodo.anio}`;
    $("k-co2").innerHTML = fmtCO2(kg, "t");
    $("k-kwh").innerHTML = `${fmt(kwh, 0)} <em>kWh</em>`;
    $("k-lum").textContent = fmt(lum, 0);
    $("k-led").textContent = `${fmt(lum ? (led / lum) * 100 : 0, 0)} % tecnología LED`;
    $("k-evit").innerHTML = fmtCO2(evit, "kg");
    $("k-pend").textContent = pend ? `${pend} dato(s) de actividad sin resultado de emisiones.` : "No hay datos pendientes de cálculo.";
  } catch (e) {
    $("home-period").textContent = "Sin conexión";
    apiErrorBox($("home-error"), e);
  }
});
