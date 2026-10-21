/* =========================================================
   Configuración de la integración con la API central (cátedra)
   ---------------------------------------------------------
   - NO se implementa ninguna API propia: este archivo solo
     describe CÓMO consumir la API REST común.
   - Cuando la cátedra publique la URL y las rutas definitivas,
     alcanza con modificar DEFAULTS.baseUrl y/o ENDPOINTS
     (o cargarlos desde la página "Configuración API").
   - Mientras tanto, useMock = true simula las respuestas
     (ver js/mock-data.js) para poder presentar el módulo.
   ========================================================= */
window.CampusCO2 = window.CampusCO2 || {};

CampusCO2.config = (function () {
  const STORAGE_KEY = "campusco2.iluminacion.config";

  const DEFAULTS = {
    baseUrl: "https://api.campusco2.frc.utn.edu.ar/api/v1", // URL tentativa: reemplazar por la que publique la cátedra
    useMock: true,                   // true = modo demostración sin servidor
    token: "",                       // Bearer token si la API lo requiere
    timeoutMs: 15000,
    idUniversidad: 1,                // UTN FRC en la base central
    codigoDimension: "INFRA_ILUMINACION",
    categoriaFactor: "electricidad_red", // factor de emisión de la red eléctrica argentina
    versionMetodologia: "ILUM-1.0"
  };

  /* Rutas relativas a baseUrl. {param} se reemplaza por pathParams. */
  const ENDPOINTS = {
    health:              { method: "GET",    path: "/health" },
    // --- Catálogos centrales (solo lectura) ---
    universidades:       { method: "GET",    path: "/universidades" },
    crearUniversidad:    { method: "POST",   path: "/universidades" },
    actualizarUniversidad: { method: "PUT",  path: "/universidades/{id_universidad}" },
    eliminarUniversidad: { method: "DELETE", path: "/universidades/{id_universidad}" },
    edificios:           { method: "GET",    path: "/edificios" },                  // ?id_universidad=
    crearEdificio:       { method: "POST",   path: "/edificios" },
    actualizarEdificio:  { method: "PUT",    path: "/edificios/{id_edificio}" },
    eliminarEdificio:    { method: "DELETE", path: "/edificios/{id_edificio}" },
    periodos:            { method: "GET",    path: "/periodos" },
    dimensiones:         { method: "GET",    path: "/dimensiones" },                // ?codigo=
    unidades:            { method: "GET",    path: "/unidades" },                   // ?magnitud=
    fuentesDatos:        { method: "GET",    path: "/fuentes-datos" },
    crearFuente:         { method: "POST",   path: "/fuentes-datos" },
    actualizarFuente:    { method: "PUT",    path: "/fuentes-datos/{id_fuente}" },
    eliminarFuente:      { method: "DELETE", path: "/fuentes-datos/{id_fuente}" },
    factoresEmision:     { method: "GET",    path: "/factores-emision" },           // ?id_periodo=&categoria=
    // --- Catálogo propio de la dimensión (alojado en la API central) ---
    tiposLuminaria:      { method: "GET",    path: "/tipos-luminaria" },
    crearTipo:           { method: "POST",   path: "/tipos-luminaria" },
    actualizarTipo:      { method: "PUT",    path: "/tipos-luminaria/{id_tipo_luminaria}" },
    eliminarTipo:        { method: "DELETE", path: "/tipos-luminaria/{id_tipo_luminaria}" },
    // --- Datos de actividad ---
    listarActividades:   { method: "GET",    path: "/datos-actividad" },            // ?id_dimension=&id_periodo=&id_edificio=
    crearActividad:      { method: "POST",   path: "/datos-actividad" },
    actualizarActividad: { method: "PUT",    path: "/datos-actividad/{id_actividad}" },
    eliminarActividad:   { method: "DELETE", path: "/datos-actividad/{id_actividad}" },
    // --- Resultados de emisiones ---
    listarResultados:    { method: "GET",    path: "/resultados-emisiones" },       // ?id_dimension=&id_periodo=
    crearResultado:      { method: "POST",   path: "/resultados-emisiones" },
    // --- Mitigación ---
    listarProyectos:     { method: "GET",    path: "/proyectos-mitigacion" },       // ?id_dimension=
    crearProyecto:       { method: "POST",   path: "/proyectos-mitigacion" },
    listarEvitadas:      { method: "GET",    path: "/emisiones-evitadas" },         // ?id_proyecto=&id_periodo=
    crearEvitada:        { method: "POST",   path: "/emisiones-evitadas" }
  };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return Object.assign({}, DEFAULTS, saved);
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  let current = load();

  return {
    DEFAULTS,
    ENDPOINTS,
    get: () => Object.assign({}, current),
    save(partial) {
      current = Object.assign({}, current, partial);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch (e) { /* sin almacenamiento */ }
      return current;
    },
    reset() {
      current = Object.assign({}, DEFAULTS);
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* sin almacenamiento */ }
      return current;
    }
  };
})();
