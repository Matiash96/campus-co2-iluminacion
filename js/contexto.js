/* =========================================================
   Contexto común: carga los catálogos de la API y arma
   índices por id para unir datos de actividad, resultados
   y catálogos del lado del cliente.
   ========================================================= */
window.CampusCO2 = window.CampusCO2 || {};

CampusCO2.contexto = (function () {
  const api = CampusCO2.api;
  const byId = (arr, key) => Object.fromEntries((arr || []).map((x) => [x[key], x]));

  async function cargar() {
    const [edificios, periodos, tipos, fuentes, dimension, sectores] = await Promise.all([
      api.getEdificios(), api.getPeriodos(), api.getTiposLuminaria(), api.getFuentes(), api.getDimension(), api.getTodosLosSectores()
    ]);
    return {
      edificios, periodos, tipos, fuentes, dimension, sectores,
      edificioPorId: byId(edificios, "id_edificio"),
      periodoPorId: byId(periodos, "id_periodo"),
      tipoPorId: byId(tipos, "id_tipo_luminaria"),
      fuentePorId: byId(fuentes, "id_fuente"),
      sectorPorId: byId(sectores, "id_sector")
    };
  }

  /* Último resultado calculado por cada dato de actividad */
  function ultimoResultadoPorActividad(resultados) {
    const map = {};
    (resultados || []).forEach((r) => {
      const prev = map[r.id_actividad];
      if (!prev || new Date(r.fecha_calculo) >= new Date(prev.fecha_calculo)) map[r.id_actividad] = r;
    });
    return map;
  }

  /* Une actividad + catálogos + último resultado en una fila plana para tablas y gráficos */
  function enriquecer(ctx, actividades, resultados) {
    const ult = ultimoResultadoPorActividad(resultados);
    return (actividades || []).map((a) => {
      const det = a.detalle_iluminacion || {};
      const sector = ctx.sectorPorId[det.id_sector] || {};
      const tipo = ctx.tipoPorId[det.id_tipo_luminaria] || {};
      const consumo = CampusCO2.calculo.calcularConsumo(det);
      const res = ult[a.id_actividad] || null;
      return {
        actividad: a, det, sector, tipo, resultado: res,
        edificio: (ctx.edificioPorId[a.id_edificio] || {}).nombre || `Edificio ${a.id_edificio}`,
        anio: (ctx.periodoPorId[a.id_periodo] || {}).anio,
        cantidad: Number(det.cantidad) || 0,
        potencia_kw: consumo.potencia_instalada_kw,
        kwh: res ? Number(res.consumo_kwh) : consumo.kwh,
        kg: res ? Number(res.emisiones_kg_co2e) : null,
        eficiente: !!tipo.eficiente
      };
    });
  }

  return { cargar, enriquecer, ultimoResultadoPorActividad, byId };
})();
