/* =========================================================
   CLIENTE DE LA API CENTRAL
   ---------------------------------------------------------
   Única capa que habla con el servidor. Las páginas nunca
   usan fetch directamente: llaman a CampusCO2.api.*.
   - useMock = false -> fetch() real a config.baseUrl
   - useMock = true  -> CampusCO2.mock (simulador local)
   Acepta respuestas como arreglo plano o envueltas en
   { data: [...] } para adaptarse a la API de la cátedra.
   ========================================================= */
window.CampusCO2 = window.CampusCO2 || {};

CampusCO2.api = (function () {
  const cfg = () => CampusCO2.config.get();
  const EP = CampusCO2.config.ENDPOINTS;

  class ApiError extends Error {
    constructor(message, status, detail) { super(message); this.status = status; this.detail = detail; }
  }

  function buildUrl(key, pathParams = {}, query = {}) {
    const ep = EP[key];
    if (!ep) throw new ApiError(`Endpoint no configurado: ${key}`, 0);
    const path = ep.path.replace(/\{(\w+)\}/g, (_, p) => {
      if (pathParams[p] === undefined) throw new ApiError(`Falta el parámetro ${p} para ${key}`, 0);
      return encodeURIComponent(pathParams[p]);
    });
    const qs = Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
    return cfg().baseUrl.replace(/\/$/, "") + path + (qs ? `?${qs}` : "");
  }

  function unwrap(json) {
    if (json && typeof json === "object" && !Array.isArray(json) && "data" in json) return json.data;
    return json;
  }

  async function request(key, { pathParams = {}, query = {}, body = null } = {}) {
    const ep = EP[key];
    const c = cfg();

    if (c.useMock) {
      await new Promise((res) => setTimeout(res, 120)); // latencia simulada
      try {
        return CampusCO2.mock.handle(key, ep.method, pathParams, query, body);
      } catch (e) {
        throw new ApiError(e.message, e.status || 500);
      }
    }

    const url = buildUrl(key, pathParams, query);
    const headers = { Accept: "application/json" };
    if (body) headers["Content-Type"] = "application/json";
    if (c.token) headers.Authorization = `Bearer ${c.token}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), c.timeoutMs);
    let resp;
    try {
      resp = await fetch(url, { method: ep.method, headers, body: body ? JSON.stringify(body) : undefined, signal: controller.signal });
    } catch (e) {
      throw new ApiError(e.name === "AbortError" ? "Tiempo de espera agotado al contactar la API" : "No se pudo conectar con la API central (red o CORS)", 0, e.message);
    } finally {
      clearTimeout(timer);
    }
    if (resp.status === 204) return null;
    let json = null;
    const text = await resp.text();
    try { json = text ? JSON.parse(text) : null; } catch (e) { json = text; }
    if (!resp.ok) {
      const msg = (json && (json.message || json.error || json.detail)) || `Error HTTP ${resp.status}`;
      throw new ApiError(typeof msg === "string" ? msg : JSON.stringify(msg), resp.status, json);
    }
    return unwrap(json);
  }

  /* --- Caché simple para catálogos (duran toda la página) --- */
  const cache = {};
  const invalidar = (name) => { delete cache[name]; };
  function cached(name, fn) {
    if (!cache[name]) cache[name] = fn().catch((e) => { delete cache[name]; throw e; });
    return cache[name];
  }

  const idDim = () => cached("dimension", async () => {
    const lista = await request("dimensiones", { query: { codigo: cfg().codigoDimension } });
    const d = (lista || []).find((x) => x.codigo === cfg().codigoDimension) || (lista || [])[0];
    if (!d) throw new ApiError(`La dimensión ${cfg().codigoDimension} no existe en la API`, 404);
    return d;
  });

  return {
    ApiError,
    buildUrl,
    request,
    ping: () => request("health"),

    // Catálogos centrales
    getUniversidades: () => cached("universidades", () => request("universidades")),
    getEdificios: () => cached("edificios", () => request("edificios", { query: { id_universidad: cfg().idUniversidad } })),
    getPeriodos: () => cached("periodos", async () => (await request("periodos")).sort((a, b) => a.anio - b.anio)),
    getDimension: idDim,
    getUnidades: () => cached("unidades", () => request("unidades")),
    getFuentes: () => cached("fuentes", () => request("fuentesDatos")),
    crearFuente: (payload) => request("crearFuente", { body: payload }).finally(() => invalidar("fuentes")),
    actualizarFuente: (id_fuente, payload) => request("actualizarFuente", { pathParams: { id_fuente }, body: payload }).finally(() => invalidar("fuentes")),
    eliminarFuente: (id_fuente) => request("eliminarFuente", { pathParams: { id_fuente } }).finally(() => invalidar("fuentes")),
    getFactores: (id_periodo) => request("factoresEmision", { query: { id_periodo, categoria: cfg().categoriaFactor } }),
    async getFactorPeriodo(id_periodo) {
      const lista = await this.getFactores(id_periodo);
      const f = (lista || []).find((x) => String(x.id_periodo) === String(id_periodo));
      if (!f) throw new ApiError("No hay factor de emisión de red cargado para el período seleccionado", 404);
      return f;
    },

    // Catálogo de la dimensión
    getTiposLuminaria: () => cached("tipos", () => request("tiposLuminaria")),
    crearTipo: (payload) => request("crearTipo", { body: payload }).finally(() => invalidar("tipos")),
    actualizarTipo: (id_tipo_luminaria, payload) => request("actualizarTipo", { pathParams: { id_tipo_luminaria }, body: payload }).finally(() => invalidar("tipos")),
    eliminarTipo: (id_tipo_luminaria) => request("eliminarTipo", { pathParams: { id_tipo_luminaria } }).finally(() => invalidar("tipos")),

    // Datos de actividad
    async listarActividades(filtros = {}) {
      const d = await idDim();
      return request("listarActividades", { query: Object.assign({ id_dimension: d.id_dimension }, filtros) });
    },
    crearActividad: (payload) => request("crearActividad", { body: payload }),
    actualizarActividad: (id_actividad, payload) => request("actualizarActividad", { pathParams: { id_actividad }, body: payload }),
    eliminarActividad: (id_actividad) => request("eliminarActividad", { pathParams: { id_actividad } }),

    // Resultados
    async listarResultados(filtros = {}) {
      const d = await idDim();
      return request("listarResultados", { query: Object.assign({ id_dimension: d.id_dimension }, filtros) });
    },
    crearResultado: (payload) => request("crearResultado", { body: payload }),

    // Mitigación
    async listarProyectos() {
      const d = await idDim();
      return request("listarProyectos", { query: { id_dimension: d.id_dimension } });
    },
    crearProyecto: (payload) => request("crearProyecto", { body: payload }),
    listarEvitadas: (filtros = {}) => request("listarEvitadas", { query: filtros }),
    crearEvitada: (payload) => request("crearEvitada", { body: payload })
  };
})();
