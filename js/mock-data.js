/* =========================================================
   SIMULADOR DE LA API CENTRAL (solo para modo demostración)
   ---------------------------------------------------------
   NO es una API propia: imita las respuestas que se esperan
   de la API de la cátedra para poder presentar el módulo
   sin servidor. Los datos se guardan en localStorage para que
   persistan entre páginas. Todos los valores son ILUSTRATIVOS.
   Se desactiva desde "Configuración API" (useMock = false).
   ========================================================= */
window.CampusCO2 = window.CampusCO2 || {};

CampusCO2.mock = (function () {
  const DB_KEY = "campusco2.iluminacion.mockdb.v1";

  function seed() {
    const universidades = [{ id_universidad: 1, nombre: "UTN – Facultad Regional Córdoba", localidad: "Córdoba" }];

    const edificios = [
      { id_edificio: 1, id_universidad: 1, nombre: "Edificio Central (ejemplo)" },
      { id_edificio: 2, id_universidad: 1, nombre: "Edificio de Aulas (ejemplo)" },
      { id_edificio: 3, id_universidad: 1, nombre: "Biblioteca (ejemplo)" },
      { id_edificio: 4, id_universidad: 1, nombre: "Laboratorios (ejemplo)" }
    ];

    const sectores = [
      { id_sector: 1, id_edificio: 1, nombre: "Aulas planta baja", tipo_espacio: "Aula", superficie_m2: 320 },
      { id_sector: 2, id_edificio: 1, nombre: "Pasillos y circulación", tipo_espacio: "Circulación", superficie_m2: 180 },
      { id_sector: 3, id_edificio: 1, nombre: "Oficinas administrativas", tipo_espacio: "Oficina", superficie_m2: 150 },
      { id_sector: 10, id_edificio: 1, nombre: "Iluminación exterior / perímetro", tipo_espacio: "Exterior", superficie_m2: null },
      { id_sector: 4, id_edificio: 2, nombre: "Aulas primer piso", tipo_espacio: "Aula", superficie_m2: 400 },
      { id_sector: 5, id_edificio: 2, nombre: "Pasillos", tipo_espacio: "Circulación", superficie_m2: 120 },
      { id_sector: 6, id_edificio: 3, nombre: "Sala de lectura", tipo_espacio: "Biblioteca", superficie_m2: 260 },
      { id_sector: 7, id_edificio: 3, nombre: "Depósito", tipo_espacio: "Depósito", superficie_m2: 60 },
      { id_sector: 8, id_edificio: 4, nombre: "Laboratorio de informática", tipo_espacio: "Laboratorio", superficie_m2: 210 },
      { id_sector: 9, id_edificio: 4, nombre: "Laboratorio de química", tipo_espacio: "Laboratorio", superficie_m2: 140 }
    ];

    const periodos = [2023, 2024, 2025, 2026].map((anio, i) => ({
      id_periodo: i + 1, anio, fecha_inicio: `${anio}-01-01`, fecha_fin: `${anio}-12-31`, estado: anio === 2026 ? "abierto" : "cerrado"
    }));

    const dimensiones = [
      { id_dimension: 1, codigo: "ENERGIA_ELECTRICA", nombre: "Energía eléctrica", descripcion: "kWh consumidos, medidores, facturas" },
      { id_dimension: 4, codigo: "INFRA_ILUMINACION", nombre: "Infraestructura y edificios", descripcion: "Análisis de iluminación por edificio" },
      { id_dimension: 15, codigo: "MITIGACION", nombre: "Proyectos de mitigación y emisiones evitadas", descripcion: "LED, paneles solares, eficiencia" }
    ];

    const unidades = [
      { id_unidad: 1, nombre: "Watt", simbolo: "W", magnitud: "potencia", factor_a_base: 1 },
      { id_unidad: 2, nombre: "Kilowatt", simbolo: "kW", magnitud: "potencia", factor_a_base: 1000 },
      { id_unidad: 3, nombre: "Watt-hora", simbolo: "Wh", magnitud: "energia", factor_a_base: 0.001 },
      { id_unidad: 4, nombre: "Kilowatt-hora", simbolo: "kWh", magnitud: "energia", factor_a_base: 1 },
      { id_unidad: 5, nombre: "Megawatt-hora", simbolo: "MWh", magnitud: "energia", factor_a_base: 1000 },
      { id_unidad: 6, nombre: "Horas por día", simbolo: "h/día", magnitud: "tiempo", factor_a_base: null },
      { id_unidad: 7, nombre: "Horas por año", simbolo: "h/año", magnitud: "tiempo", factor_a_base: 1 },
      { id_unidad: 8, nombre: "Kilogramo CO2 equivalente", simbolo: "kgCO2e", magnitud: "masa", factor_a_base: 1 },
      { id_unidad: 9, nombre: "Tonelada CO2 equivalente", simbolo: "tCO2e", magnitud: "masa", factor_a_base: 1000 },
      { id_unidad: 10, nombre: "kgCO2e por kWh", simbolo: "kgCO2e/kWh", magnitud: "factor", factor_a_base: 1 },
      { id_unidad: 11, nombre: "tCO2e por MWh", simbolo: "tCO2e/MWh", magnitud: "factor", factor_a_base: 1 },
      { id_unidad: 12, nombre: "Unidad (luminaria)", simbolo: "u", magnitud: "cantidad", factor_a_base: 1 }
    ];

    const fuentes_datos = [
      { id_fuente: 1, nombre: "Relevamiento presencial", tipo: "relevamiento", referencia: "Recorrido por sectores – planilla de campo" },
      { id_fuente: 2, nombre: "Inventario de Mantenimiento", tipo: "inventario", referencia: "Dpto. Mantenimiento / Infraestructura FRC" },
      { id_fuente: 3, nombre: "Ficha técnica del fabricante", tipo: "documento_tecnico", referencia: "Datasheet de la luminaria" },
      { id_fuente: 4, nombre: "Estimación por catálogo", tipo: "estimacion", referencia: "Potencia típica de catálogo comercial" },
      { id_fuente: 5, nombre: "Factor de red – valor de demostración", tipo: "factor_emision", referencia: "Reemplazar por el FE oficial de la red argentina (Secretaría de Energía / CAMMESA)" }
    ];

    const tipos_luminaria = [
      { id_tipo_luminaria: 1, nombre: "Tubo fluorescente T8 120 cm", tecnologia: "Fluorescente", potencia_referencia_w: 36, eficiente: false },
      { id_tipo_luminaria: 2, nombre: "Tubo LED T8 120 cm", tecnologia: "LED", potencia_referencia_w: 18, eficiente: true },
      { id_tipo_luminaria: 3, nombre: "Panel LED 60×60", tecnologia: "LED", potencia_referencia_w: 40, eficiente: true },
      { id_tipo_luminaria: 4, nombre: "Plafón LED circular", tecnologia: "LED", potencia_referencia_w: 18, eficiente: true },
      { id_tipo_luminaria: 5, nombre: "Lámpara bajo consumo (LFC)", tecnologia: "Fluorescente compacta", potencia_referencia_w: 20, eficiente: false },
      { id_tipo_luminaria: 6, nombre: "Lámpara halógena dicroica", tecnologia: "Halógena", potencia_referencia_w: 50, eficiente: false },
      { id_tipo_luminaria: 7, nombre: "Reflector halogenuro metálico", tecnologia: "Descarga", potencia_referencia_w: 150, eficiente: false },
      { id_tipo_luminaria: 8, nombre: "Reflector LED", tecnologia: "LED", potencia_referencia_w: 50, eficiente: true }
    ];

    // Factores ilustrativos: la API real debe devolver el FE oficial por año.
    const factores_emision = [
      { id_factor: 1, id_periodo: 1, anio: 2023, categoria: "electricidad_red", valor: 0.300, unidad: "kgCO2e/kWh", id_fuente: 5, fuente_nombre: "Factor de red – valor de demostración", alcance: 2 },
      { id_factor: 2, id_periodo: 2, anio: 2024, categoria: "electricidad_red", valor: 0.290, unidad: "kgCO2e/kWh", id_fuente: 5, fuente_nombre: "Factor de red – valor de demostración", alcance: 2 },
      { id_factor: 3, id_periodo: 3, anio: 2025, categoria: "electricidad_red", valor: 0.283, unidad: "kgCO2e/kWh", id_fuente: 5, fuente_nombre: "Factor de red – valor de demostración", alcance: 2 },
      { id_factor: 4, id_periodo: 4, anio: 2026, categoria: "electricidad_red", valor: 0.283, unidad: "tCO2e/MWh", id_fuente: 5, fuente_nombre: "Factor de red – valor de demostración", alcance: 2 }
    ];

    // Configuración por sector para generar una evolución creíble 2023-2026
    const plan = [
      { s: 1, viejo: 1, nuevo: 2, cant: 96, h: 10, d: 200, cambio: 2025 },
      { s: 2, viejo: 5, nuevo: 4, cant: 40, h: 14, d: 240, cambio: 2024 },
      { s: 3, viejo: 1, nuevo: 2, cant: 30, h: 9, d: 230, cambio: 2026 },
      { s: 10, viejo: 7, nuevo: 8, cant: 12, h: 12, d: 365, cambio: 2026 },
      { s: 4, viejo: 1, nuevo: 2, cant: 120, h: 11, d: 200, cambio: 2026 },
      { s: 5, viejo: 5, nuevo: 5, cant: 24, h: 14, d: 240, cambio: 9999 },
      { s: 6, viejo: 1, nuevo: 3, cant: 60, h: 12, d: 250, cambio: 2024, cantNueva: 30 },
      { s: 7, viejo: 6, nuevo: 6, cant: 10, h: 3, d: 200, cambio: 9999 },
      { s: 8, viejo: 1, nuevo: 2, cant: 48, h: 12, d: 220, cambio: 2025 },
      { s: 9, viejo: 1, nuevo: 1, cant: 32, h: 8, d: 200, cambio: 9999 }
    ];

    const datos_actividad = [];
    const resultados_emisiones = [];
    let idAct = 1, idRes = 1;
    periodos.forEach((p) => {
      plan.forEach((c) => {
        const sector = sectores.find((x) => x.id_sector === c.s);
        const usaNuevo = p.anio >= c.cambio;
        const tipo = tipos_luminaria.find((t) => t.id_tipo_luminaria === (usaNuevo ? c.nuevo : c.viejo));
        const cantidad = usaNuevo && c.cantNueva ? c.cantNueva : c.cant + (p.anio - 2023) * (c.s === 4 ? 4 : 0);
        const detalle = {
          id_sector: c.s, id_tipo_luminaria: tipo.id_tipo_luminaria, tipo_actividad: c.s === 10 ? "Iluminación exterior" : "Iluminación interior",
          cantidad, potencia_unitaria: tipo.potencia_referencia_w, unidad_potencia: "W",
          horas_uso: c.h, unidad_tiempo: "h/día", dias_anio: c.d, factor_simultaneidad: 100,
          fecha_relevamiento: `${p.anio}-05-15`, responsable: "Grupo 4 – Iluminación", observaciones: "Dato de demostración"
        };
        const consumo = CampusCO2.calculo.calcularConsumo(detalle);
        const act = {
          id_actividad: idAct++, id_edificio: sector.id_edificio, id_periodo: p.id_periodo, id_dimension: 4,
          id_unidad: 4, id_fuente: usaNuevo ? 1 : 2, valor: consumo.kwh, descripcion: `${tipo.nombre} – ${sector.nombre}`,
          detalle_iluminacion: detalle, created_at: `${p.anio}-05-15T12:00:00Z`
        };
        datos_actividad.push(act);
        // En 2026 se dejan dos registros sin calcular para mostrar el flujo del módulo de cálculo
        if (!(p.anio === 2026 && (c.s === 9 || c.s === 10))) {
          const factor = factores_emision.find((f) => f.id_periodo === p.id_periodo);
          const res = CampusCO2.calculo.calcularEmisiones(act, factor, { edificio: sector.id_edificio, sector: sector.nombre, periodo: p.anio, tipo_luminaria: tipo.nombre });
          res.id_resultado = idRes++;
          res.id_dimension = 4;
          res.id_periodo = p.id_periodo;
          res.id_edificio = sector.id_edificio;
          res.fecha_calculo = `${p.anio}-06-01T12:00:00Z`;
          resultados_emisiones.push(res);
        }
      });
    });

    const proyectos_mitigacion = [
      { id_proyecto: 1, id_edificio: 1, id_dimension: 4, nombre: "Recambio LED – Aulas planta baja", descripcion: "Reemplazo de tubos fluorescentes T8 36 W por tubos LED 18 W.", tipo_medida: "Recambio a LED", fecha_inicio: "2025-02-01", estado: "Implementado" }
    ];
    const emisiones_evitadas = [
      { id_emision_evitada: 1, id_proyecto: 1, id_periodo: 3, id_factor: 3, consumo_base_kwh: 6912, consumo_mejorado_kwh: 3456, kg_co2e_evitados: 978.048, parametros: { cantidad_base: 96, potencia_base: 36, cantidad_nueva: 96, potencia_nueva: 18, horas_uso: 10, unidad_tiempo: "h/día", dias_anio: 200 } }
    ];

    return { universidades, edificios, sectores, periodos, dimensiones, unidades, fuentes_datos, tipos_luminaria, factores_emision, datos_actividad, resultados_emisiones, proyectos_mitigacion, emisiones_evitadas };
  }

  let db = null;
  function getDb() {
    if (db) return db;
    try { db = JSON.parse(localStorage.getItem(DB_KEY) || "null"); } catch (e) { db = null; }
    if (!db) { db = seed(); persist(); }
    return db;
  }
  function persist() { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { /* sin almacenamiento */ } }
  function reset() { db = seed(); persist(); }

  /* Endpoint -> tabla e id */
  const TABLES = {
    universidades: ["universidades"], edificios: ["edificios"], periodos: ["periodos"], dimensiones: ["dimensiones"],
    unidades: ["unidades"], fuentesDatos: ["fuentes_datos"], factoresEmision: ["factores_emision"],
    sectores: ["sectores"], tiposLuminaria: ["tipos_luminaria"],
    listarActividades: ["datos_actividad"], crearActividad: ["datos_actividad", "id_actividad"],
    actualizarActividad: ["datos_actividad", "id_actividad"], eliminarActividad: ["datos_actividad", "id_actividad"],
    listarResultados: ["resultados_emisiones"], crearResultado: ["resultados_emisiones", "id_resultado"],
    listarProyectos: ["proyectos_mitigacion"], crearProyecto: ["proyectos_mitigacion", "id_proyecto"],
    listarEvitadas: ["emisiones_evitadas"], crearEvitada: ["emisiones_evitadas", "id_emision_evitada"]
  };

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function handle(key, method, pathParams = {}, query = {}, body = null) {
    const data = getDb();
    if (key === "health") return { status: "ok", modo: "mock" };
    const [table, idField] = TABLES[key] || [];
    if (!table) throw Object.assign(new Error(`Endpoint no simulado: ${key}`), { status: 404 });
    const rows = data[table];
    const filters = Object.assign({}, query, pathParams);

    if (method === "GET") {
      return clone(rows.filter((row) => Object.entries(filters).every(([k, v]) => v === undefined || v === "" || row[k] === undefined || String(row[k]) === String(v))));
    }
    if (method === "POST") {
      const nextId = rows.reduce((m, r) => Math.max(m, r[idField] || 0), 0) + 1;
      const row = Object.assign({}, clone(body), { [idField]: nextId, created_at: new Date().toISOString() });
      rows.push(row); persist();
      return clone(row);
    }
    const id = Number(pathParams[idField]);
    const idx = rows.findIndex((r) => r[idField] === id);
    if (idx < 0) throw Object.assign(new Error("Registro inexistente"), { status: 404 });
    if (method === "PUT") {
      rows[idx] = Object.assign({}, rows[idx], clone(body), { [idField]: id, updated_at: new Date().toISOString() });
      persist();
      return clone(rows[idx]);
    }
    if (method === "DELETE") {
      rows.splice(idx, 1);
      // Integridad referencial simulada: se eliminan los resultados del dato de actividad
      if (table === "datos_actividad") data.resultados_emisiones = data.resultados_emisiones.filter((r) => r.id_actividad !== id);
      persist();
      return null;
    }
    throw Object.assign(new Error(`Método no soportado: ${method}`), { status: 405 });
  }

  return { handle, reset, exportar: () => clone(getDb()) };
})();
