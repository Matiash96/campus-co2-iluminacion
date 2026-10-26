/* =========================================================
   SIMULADOR DE LA API CENTRAL (solo para modo demostración)
   ---------------------------------------------------------
   NO es una API propia: imita las respuestas que se esperan
   de la API de la cátedra para poder presentar el módulo
   sin servidor. Los datos se guardan en localStorage para que
   persistan entre páginas. Edificios y cantidades salen del
   relevamiento del grupo; horas, días y el proyecto de mitigación
   son supuestos de prueba.
   Para conectar la API real: useMock = false en js/config.js.
   ========================================================= */
window.CampusCO2 = window.CampusCO2 || {};

CampusCO2.mock = (function () {
  const DB_KEY = "campusco2.iluminacion.mockdb.v3";

  function seed() {
    const universidades = [{ id_universidad: 1, nombre: "UTN – Facultad Regional Córdoba", localidad: "Córdoba" }];

    // Edificios y cantidades del relevamiento del grupo (planilla de relevamiento)
    const edificios = [
      { id_edificio: 1, id_universidad: 1, nombre: "Edif. Central" },
      { id_edificio: 2, id_universidad: 1, nombre: "Edif. Ing. Irico - Dr. Sananez" },
      { id_edificio: 3, id_universidad: 1, nombre: "Edif. Ing. Soro" },
      { id_edificio: 4, id_universidad: 1, nombre: "Edif. Ing. Maders" },
      { id_edificio: 5, id_universidad: 1, nombre: "Edif. Ing. Gallardo" },
      { id_edificio: 6, id_universidad: 1, nombre: "Edif. Ing. Salcedo" },
      { id_edificio: 7, id_universidad: 1, nombre: "Edif. Ing. Inchaurrondo" },
      { id_edificio: 8, id_universidad: 1, nombre: "Edif. Área Informática y Física" },
      { id_edificio: 9, id_universidad: 1, nombre: "Edif. Sueldo" }
    ];

    const ANIOS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
    const periodos = ANIOS.map((anio, i) => ({
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
      { id_fuente: 1, nombre: "Relevamiento presencial", tipo: "relevamiento", referencia: "Recorrido por cada edificio – planilla de relevamiento del grupo" },
      { id_fuente: 2, nombre: "Inventario de Mantenimiento", tipo: "inventario", referencia: "Dpto. Mantenimiento / Infraestructura FRC" },
      { id_fuente: 3, nombre: "Ficha técnica del fabricante", tipo: "documento_tecnico", referencia: "Datasheet de la luminaria" },
      { id_fuente: 4, nombre: "Estimación por catálogo", tipo: "estimacion", referencia: "Potencia típica de catálogo comercial" },
      { id_fuente: 5, nombre: "Factores de emisión de GEI – Argentina (SNI-GEI-AR)", tipo: "factor_emision", referencia: "https://inventariogei.ambiente.gob.ar/files/Factores_de_Emision_SNIGEIAR_para_HC_2025.pdf" }
    ];

    // Catálogo: los datos de prueba usan solo el tubo LED (id 1). El resto queda para el ABM y Mitigación.
    const tipos_luminaria = [
      { id_tipo_luminaria: 1, nombre: "Tubo LED 120cm Luz Neutra", tecnologia: "LED", potencia_referencia_w: 9, eficiente: true },
      { id_tipo_luminaria: 2, nombre: "Plafón circular LED mediano", tecnologia: "LED", potencia_referencia_w: 18, eficiente: true },
      { id_tipo_luminaria: 3, nombre: "Plafón circular LED grande", tecnologia: "LED", potencia_referencia_w: 24, eficiente: true },
      { id_tipo_luminaria: 4, nombre: "Plafón cuadrado LED mediano", tecnologia: "LED", potencia_referencia_w: 18, eficiente: true },
      { id_tipo_luminaria: 5, nombre: "Plafón cuadrado LED grande", tecnologia: "LED", potencia_referencia_w: 24, eficiente: true },
      { id_tipo_luminaria: 6, nombre: "Tubo fluorescente T8 120 cm", tecnologia: "Fluorescente", potencia_referencia_w: 36, eficiente: false },
      { id_tipo_luminaria: 7, nombre: "Lámpara bajo consumo (LFC)", tecnologia: "Fluorescente compacta", potencia_referencia_w: 20, eficiente: false },
      { id_tipo_luminaria: 8, nombre: "Lámpara halógena dicroica", tecnologia: "Halógena", potencia_referencia_w: 50, eficiente: false }
    ];

    // Factores de la red eléctrica argentina (planilla del grupo, fuente SNI-GEI-AR).
    // 2023-2026 no tienen valor publicado: se usa el último disponible (2022 = 0,283).
    // 2026 se expresa en tCO2e/MWh (mismo valor) para mostrar la conversión de unidades.
    const FE = { 2020: 0.275, 2021: 0.292, 2022: 0.283, 2023: 0.283, 2024: 0.283, 2025: 0.283, 2026: 0.283 };
    const factores_emision = periodos.map((p) => ({
      id_factor: p.id_periodo, id_periodo: p.id_periodo, anio: p.anio, categoria: "electricidad_red",
      valor: FE[p.anio], unidad: p.anio === 2026 ? "tCO2e/MWh" : "kgCO2e/kWh", id_fuente: 5,
      fuente_nombre: p.anio <= 2022 ? "SNI-GEI-AR – factor de la red eléctrica argentina"
        : "SNI-GEI-AR – último valor publicado (2022), sin dato oficial para el año",
      alcance: 2
    }));

    // Datos de prueba: cantidades del relevamiento; horas y días son SUPUESTOS de prueba.
    // Horas por día según turnos de uso de cada edificio. Días por año según la actividad presencial:
    // 2020 actividad mínima (ASPO), 2021 presencialidad parcial, 2022 en adelante calendario completo.
    const plan = [
      { e: 1, cant: 1100, h: 14 },
      { e: 2, cant: 140, h: 8 },
      { e: 3, cant: 504, h: 12 },
      { e: 4, cant: 291, h: 10 },
      { e: 5, cant: 344, h: 10 },
      { e: 6, cant: 94, h: 8 },
      { e: 7, cant: 168, h: 10 },
      { e: 8, cant: 478, h: 12 },
      { e: 9, cant: 30, h: 6 }
    ];
    const DIAS = { 2020: 60, 2021: 120, 2022: 190, 2023: 200, 2024: 200, 2025: 205, 2026: 200 };
    const tubo = tipos_luminaria[0];

    const datos_actividad = [];
    const resultados_emisiones = [];
    let idAct = 1, idRes = 1;
    periodos.forEach((p) => {
      const factor = factores_emision.find((f) => f.id_periodo === p.id_periodo);
      plan.forEach((c) => {
        const edificio = edificios.find((x) => x.id_edificio === c.e);
        const detalle = {
          id_tipo_luminaria: tubo.id_tipo_luminaria,
          cantidad: c.cant, potencia_unitaria: tubo.potencia_referencia_w, unidad_potencia: "W",
          horas_uso: c.h, unidad_tiempo: "h/día", dias_anio: DIAS[p.anio], factor_simultaneidad: 100,
          fecha_relevamiento: `${p.anio}-05-15`, responsable: "Grupo 4 – Iluminación",
          observaciones: "Cantidad del relevamiento; horas y días supuestos para datos de prueba"
        };
        const consumo = CampusCO2.calculo.calcularConsumo(detalle);
        const act = {
          id_actividad: idAct++, id_edificio: c.e, id_periodo: p.id_periodo, id_dimension: 4,
          id_unidad: 4, id_fuente: 1, valor: consumo.kwh, descripcion: `${tubo.nombre} – ${edificio.nombre}`,
          detalle_iluminacion: detalle, created_at: `${p.anio}-05-15T12:00:00Z`
        };
        datos_actividad.push(act);
        const res = CampusCO2.calculo.calcularEmisiones(act, factor, { edificio: edificio.nombre, periodo: p.anio, tipo_luminaria: tubo.nombre });
        res.id_resultado = idRes++;
        res.id_dimension = 4;
        res.id_periodo = p.id_periodo;
        res.id_edificio = c.e;
        res.fecha_calculo = `${p.anio}-06-01T12:00:00Z`;
        resultados_emisiones.push(res);
      });
    });

    // Proyecto de prueba: recambio de tubos fluorescentes por tubos LED en el Edificio Central.
    // Emisiones evitadas de cada año respecto del escenario sin recambio (fluorescente 36 W).
    const proyectos_mitigacion = [
      { id_proyecto: 1, id_edificio: 1, id_dimension: 4, nombre: "Recambio a tubos LED – Edif. Central", descripcion: "Reemplazo de 1.100 tubos fluorescentes T8 de 36 W por tubos LED de 120 cm de 9 W (proyecto de prueba).", tipo_medida: "Recambio a LED", fecha_inicio: "2019-03-01", estado: "Implementado" }
    ];
    const emisiones_evitadas = periodos.map((p, i) => {
      const factor = factores_emision.find((f) => f.id_periodo === p.id_periodo);
      const params = { cantidad_base: 1100, potencia_base: 36, cantidad_nueva: 1100, potencia_nueva: 9, horas_uso: 14, unidad_tiempo: "h/día", dias_anio: DIAS[p.anio] };
      const ev = CampusCO2.calculo.calcularEvitadas(params, factor);
      return { id_emision_evitada: i + 1, id_proyecto: 1, id_periodo: p.id_periodo, id_factor: factor.id_factor, consumo_base_kwh: ev.consumo_base_kwh, consumo_mejorado_kwh: ev.consumo_mejorado_kwh, kg_co2e_evitados: ev.kg_co2e_evitados, parametros: params, trazabilidad: ev.trazabilidad };
    });

    return { universidades, edificios, periodos, dimensiones, unidades, fuentes_datos, tipos_luminaria, factores_emision, datos_actividad, resultados_emisiones, proyectos_mitigacion, emisiones_evitadas };
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
    universidades: ["universidades"], edificios: ["edificios"],
    crearUniversidad: ["universidades", "id_universidad"], actualizarUniversidad: ["universidades", "id_universidad"], eliminarUniversidad: ["universidades", "id_universidad"],
    crearEdificio: ["edificios", "id_edificio"], actualizarEdificio: ["edificios", "id_edificio"], eliminarEdificio: ["edificios", "id_edificio"], periodos: ["periodos"], dimensiones: ["dimensiones"],
    unidades: ["unidades"], fuentesDatos: ["fuentes_datos"], factoresEmision: ["factores_emision"],
    crearFuente: ["fuentes_datos", "id_fuente"], actualizarFuente: ["fuentes_datos", "id_fuente"], eliminarFuente: ["fuentes_datos", "id_fuente"],
    tiposLuminaria: ["tipos_luminaria"],
    crearTipo: ["tipos_luminaria", "id_tipo_luminaria"], actualizarTipo: ["tipos_luminaria", "id_tipo_luminaria"], eliminarTipo: ["tipos_luminaria", "id_tipo_luminaria"],
    listarActividades: ["datos_actividad"], crearActividad: ["datos_actividad", "id_actividad"],
    actualizarActividad: ["datos_actividad", "id_actividad"], eliminarActividad: ["datos_actividad", "id_actividad"],
    listarResultados: ["resultados_emisiones"], crearResultado: ["resultados_emisiones", "id_resultado"],
    listarProyectos: ["proyectos_mitigacion"], crearProyecto: ["proyectos_mitigacion", "id_proyecto"],
    listarEvitadas: ["emisiones_evitadas"], crearEvitada: ["emisiones_evitadas", "id_emision_evitada"]
  };

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  /* Integridad referencial simulada para los catálogos (la API real debería responder 409) */
  function referencias(data, table, id) {
    if (table === "universidades") {
      const n = data.edificios.filter((e) => e.id_universidad === id).length;
      return n ? `${n} edificio(s)` : "";
    }
    if (table === "edificios") {
      const n = data.datos_actividad.filter((a) => a.id_edificio === id).length + data.proyectos_mitigacion.filter((p) => p.id_edificio === id).length;
      return n ? `${n} dato(s) de actividad o proyecto(s)` : "";
    }
    if (table === "fuentes_datos") {
      const n = data.datos_actividad.filter((a) => a.id_fuente === id).length + data.factores_emision.filter((f) => f.id_fuente === id).length;
      return n ? `${n} dato(s) de actividad o factor(es) de emisión` : "";
    }
    if (table === "tipos_luminaria") {
      const n = data.datos_actividad.filter((a) => (a.detalle_iluminacion || {}).id_tipo_luminaria === id).length;
      return n ? `${n} dato(s) de actividad` : "";
    }
    return "";
  }

  /* Nombre único en los catálogos (la API real debería responder 409) */
  function nombreDuplicado(rows, idField, body, id) {
    const nombre = String((body || {}).nombre || "").trim().toLowerCase();
    // Los edificios se comparan dentro de la misma universidad
    const mismoAmbito = (r) => idField !== "id_edificio" || String(r.id_universidad) === String((body || {}).id_universidad);
    return nombre && rows.some((r) => r[idField] !== id && mismoAmbito(r) && String(r.nombre).trim().toLowerCase() === nombre);
  }

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
    const esCatalogo = ["fuentes_datos", "tipos_luminaria", "universidades", "edificios"].includes(table);
    if (method === "POST") {
      if (esCatalogo && nombreDuplicado(rows, idField, body, null)) throw Object.assign(new Error("Ya existe un registro con ese nombre"), { status: 409 });
      const nextId = rows.reduce((m, r) => Math.max(m, r[idField] || 0), 0) + 1;
      const row = Object.assign({}, clone(body), { [idField]: nextId, created_at: new Date().toISOString() });
      rows.push(row); persist();
      return clone(row);
    }
    const id = Number(pathParams[idField]);
    const idx = rows.findIndex((r) => r[idField] === id);
    if (idx < 0) throw Object.assign(new Error("Registro inexistente"), { status: 404 });
    if (method === "PUT") {
      if (esCatalogo && nombreDuplicado(rows, idField, body, id)) throw Object.assign(new Error("Ya existe un registro con ese nombre"), { status: 409 });
      rows[idx] = Object.assign({}, rows[idx], clone(body), { [idField]: id, updated_at: new Date().toISOString() });
      persist();
      return clone(rows[idx]);
    }
    if (method === "DELETE") {
      const enUso = referencias(data, table, id);
      if (enUso) throw Object.assign(new Error(`No se puede eliminar: está en uso por ${enUso}`), { status: 409 });
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
