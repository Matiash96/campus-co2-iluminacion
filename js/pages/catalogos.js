/* =========================================================
   ABM de catálogos: TIPOS_LUMINARIA y FUENTES_DATOS
   Alta (POST), baja (DELETE) y modificación (PUT) contra la API.
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const { $, esc, fmt, toast } = CampusCO2.ui;
  const api = CampusCO2.api;

  /* ---------- Pestañas (recuerda la elegida en la URL: #tipos / #fuentes) ---------- */
  function mostrarTab(tab) {
    document.querySelectorAll(".tab").forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on);
    });
    document.querySelectorAll(".tab-panel").forEach((p) => (p.hidden = p.id !== `tab-${tab}`));
    history.replaceState(null, "", `#${tab}`);
  }
  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => mostrarTab(b.dataset.tab)));
  const TABS = ["universidades", "edificios", "tipos", "fuentes"];
  const tabDeHash = () => (TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : TABS[0]);
  mostrarTab(tabDeHash());
  window.addEventListener("hashchange", () => mostrarTab(tabDeHash()));

  /* ---------- ABM genérico ---------- */
  function crearABM(cfg) {
    const form = $(cfg.form);
    let registros = [];

    const setInvalid = (id, bad, texto) => {
      const field = $(id).closest(".field");
      field.classList.toggle("invalid", bad);
      if (texto && field.querySelector(".error-text")) field.querySelector(".error-text").textContent = texto;
      return bad;
    };

    function limpiar() {
      form.reset();
      $(cfg.idInput).value = "";
      $(cfg.title).textContent = cfg.tituloAlta;
      $(cfg.submit).textContent = cfg.botonAlta;
      form.querySelectorAll(".field.invalid").forEach((f) => f.classList.remove("invalid"));
      cfg.alLimpiar && cfg.alLimpiar();
    }

    async function listar() {
      const tbody = $(cfg.table);
      try {
        registros = (await cfg.listar()) || [];
      } catch (e) {
        tbody.innerHTML = `<tr><td colspan="${cfg.columnas}" class="empty">Error al consultar la API: ${esc(e.message)}</td></tr>`;
        return;
      }
      registros.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
      $(cfg.count).textContent = `${registros.length} registro${registros.length === 1 ? "" : "s"}`;
      tbody.innerHTML = registros.length ? registros.map((r) => `<tr>
          <td>${esc(r[cfg.idField])}</td>${cfg.fila(r)}
          <td><div class="row-actions">
            <button class="btn btn-outline btn-sm" data-edit="${esc(r[cfg.idField])}">Editar</button>
            <button class="btn btn-danger btn-sm" data-del="${esc(r[cfg.idField])}">Eliminar</button>
          </div></td></tr>`).join("")
        : `<tr><td colspan="${cfg.columnas}" class="empty">No hay registros. Cargá el primero con el formulario.</td></tr>`;
    }

    function validar(datos, id) {
      let errores = 0;
      const nombre = datos.nombre || "";
      const mismoAmbito = cfg.mismoAmbito || (() => true);
      const repetido = registros.some((r) => String(r[cfg.idField]) !== String(id) && mismoAmbito(r, datos) && String(r.nombre).trim().toLowerCase() === nombre.toLowerCase());
      if (setInvalid(cfg.nombreInput, nombre.length < 3 || nombre.length > 100 || repetido,
        repetido ? "Ya existe un registro con ese nombre." : "Ingresá un nombre de 3 a 100 caracteres.")) errores++;
      errores += cfg.validar(datos, setInvalid);
      return errores;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = $(cfg.msg);
      const id = $(cfg.idInput).value;
      const datos = cfg.leer();
      const errores = validar(datos, id);
      if (errores) {
        msg.className = "form-message err";
        msg.textContent = `Hay ${errores} campo(s) con errores.`;
        return;
      }
      $(cfg.submit).disabled = true;
      try {
        const r = id ? await cfg.actualizar(id, datos) : await cfg.crear(datos);
        msg.className = "form-message ok";
        const o = cfg.genero || "o";
        msg.textContent = `${cfg.entidad} #${(r && r[cfg.idField]) || id} ${id ? "modificad" + o : "cread" + o} en la API.`;
        toast(`${cfg.entidad} ${id ? "modificad" + o : "cread" + o}`, "ok");
        limpiar();
        await listar();
        cfg.alCambiar && cfg.alCambiar();
      } catch (err) {
        msg.className = "form-message err";
        msg.textContent = `La API rechazó la operación: ${err.message}${err.status ? ` (HTTP ${err.status})` : ""}`;
      } finally {
        $(cfg.submit).disabled = false;
      }
    });

    $(cfg.cancel).addEventListener("click", () => { limpiar(); $(cfg.msg).textContent = ""; });

    $(cfg.table).addEventListener("click", async (e) => {
      const ed = e.target.closest("[data-edit]");
      const del = e.target.closest("[data-del]");
      if (ed) {
        const r = registros.find((x) => String(x[cfg.idField]) === ed.dataset.edit);
        limpiar();
        $(cfg.idInput).value = r[cfg.idField];
        cfg.cargar(r);
        $(cfg.title).textContent = `Editar ${cfg.entidad.toLowerCase()} #${r[cfg.idField]}`;
        $(cfg.submit).textContent = "Guardar cambios (PUT)";
        $(cfg.msg).textContent = "";
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (del) {
        const r = registros.find((x) => String(x[cfg.idField]) === del.dataset.del);
        if (!confirm(`¿Eliminar "${r.nombre}"? Se enviará DELETE a la API.`)) return;
        try {
          await cfg.eliminar(r[cfg.idField]);
          toast(`${cfg.entidad} eliminad${cfg.genero || "o"}`, "ok");
          if ($(cfg.idInput).value === String(r[cfg.idField])) limpiar();
          await listar();
          cfg.alCambiar && cfg.alCambiar();
        } catch (err) {
          toast(err.status === 409 ? err.message : `No se pudo eliminar: ${err.message}`, "err");
        }
      }
    });

    limpiar();
    listar();
    return { listar };
  }

  /* ---------- UNIVERSIDADES ---------- */
  let universidades = [];
  async function cargarUniversidades() {
    try { universidades = (await api.getUniversidades()) || []; } catch (e) { universidades = []; }
    const sel = $("e-universidad"), actual = sel.value;
    sel.innerHTML = '<option value="">Seleccionar…</option>' + universidades.map((u) => `<option value="${esc(u.id_universidad)}">${esc(u.nombre)}</option>`).join("");
    sel.value = actual;
  }
  let abmEdificios = null;

  crearABM({
    entidad: "Universidad", genero: "a", idField: "id_universidad", columnas: 4,
    form: "form-univ", idInput: "u-id", title: "u-title", submit: "u-submit", cancel: "u-cancel", msg: "u-msg", table: "u-table", count: "u-count",
    nombreInput: "u-nombre", tituloAlta: "Nueva universidad", botonAlta: "Guardar universidad",
    listar: () => api.getUniversidades(), crear: api.crearUniversidad, actualizar: api.actualizarUniversidad, eliminar: api.eliminarUniversidad,
    // al cambiar universidades se refresca el selector y la tabla de edificios
    alCambiar: async () => { await cargarUniversidades(); abmEdificios && abmEdificios.listar(); },
    leer: () => ({ nombre: $("u-nombre").value.trim(), localidad: $("u-localidad").value.trim() }),
    cargar: (r) => { $("u-nombre").value = r.nombre; $("u-localidad").value = r.localidad || ""; },
    validar: (d, setInvalid) => Number(setInvalid("u-localidad", d.localidad.length < 2 || d.localidad.length > 80)),
    fila: (r) => `<td><b>${esc(r.nombre)}</b></td><td>${esc(r.localidad || "—")}</td>`
  });

  /* ---------- EDIFICIOS ---------- */
  const nombreUniversidad = (id) => (universidades.find((u) => String(u.id_universidad) === String(id)) || {}).nombre || `#${id}`;
  abmEdificios = crearABM({
    entidad: "Edificio", idField: "id_edificio", columnas: 5,
    form: "form-edif", idInput: "e-id", title: "e-title", submit: "e-submit", cancel: "e-cancel", msg: "e-msg", table: "e-table", count: "e-count",
    nombreInput: "e-nombre", tituloAlta: "Nuevo edificio", botonAlta: "Guardar edificio",
    // el nombre solo no puede repetirse dentro de la misma universidad
    mismoAmbito: (r, d) => String(r.id_universidad) === String(d.id_universidad),
    listar: async () => { await cargarUniversidades(); return api.listarTodosLosEdificios(); },
    crear: api.crearEdificio, actualizar: api.actualizarEdificio, eliminar: api.eliminarEdificio,
    leer: () => ({ id_universidad: Number($("e-universidad").value) || null, nombre: $("e-nombre").value.trim(), direccion: $("e-direccion").value.trim() || null }),
    cargar: (r) => { $("e-universidad").value = r.id_universidad; $("e-nombre").value = r.nombre; $("e-direccion").value = r.direccion || ""; },
    validar: (d, setInvalid) =>
      Number(setInvalid("e-universidad", !d.id_universidad)) +
      Number(setInvalid("e-direccion", (d.direccion || "").length > 150)),
    fila: (r) => `<td><b>${esc(r.nombre)}</b></td><td>${esc(nombreUniversidad(r.id_universidad))}</td><td style="white-space:normal">${esc(r.direccion || "—")}</td>`
  });

  /* ---------- TIPOS_LUMINARIA ---------- */
  crearABM({
    entidad: "Tipo de luminaria", idField: "id_tipo_luminaria", columnas: 6,
    form: "form-tipo", idInput: "t-id", title: "t-title", submit: "t-submit", cancel: "t-cancel", msg: "t-msg", table: "t-table", count: "t-count",
    nombreInput: "t-nombre", tituloAlta: "Nuevo tipo de luminaria", botonAlta: "Guardar tipo",
    listar: () => api.getTiposLuminaria(), crear: api.crearTipo, actualizar: api.actualizarTipo, eliminar: api.eliminarTipo,
    leer: () => ({
      nombre: $("t-nombre").value.trim(),
      tecnologia: $("t-tecnologia").value,
      potencia_referencia_w: Number($("t-potencia").value),
      eficiente: $("t-eficiente").checked
    }),
    cargar: (r) => {
      $("t-nombre").value = r.nombre;
      $("t-tecnologia").value = r.tecnologia;
      $("t-potencia").value = r.potencia_referencia_w;
      $("t-eficiente").checked = !!r.eficiente;
    },
    validar: (d, setInvalid) =>
      Number(setInvalid("t-tecnologia", !d.tecnologia)) +
      Number(setInvalid("t-potencia", !(d.potencia_referencia_w >= 0.5 && d.potencia_referencia_w <= 2000))),
    fila: (r) => `<td><b>${esc(r.nombre)}</b></td><td>${esc(r.tecnologia)}</td><td class="num">${fmt(r.potencia_referencia_w, 1)} W</td>
      <td>${r.eficiente ? '<span class="badge ok">Sí</span>' : '<span class="badge warn">No</span>'}</td>`
  });

  // Sugerencia: si la tecnología es LED, se marca como eficiente
  $("t-tecnologia").addEventListener("change", () => { if ($("t-tecnologia").value === "LED") $("t-eficiente").checked = true; });

  /* ---------- FUENTES_DATOS ---------- */
  const TIPOS_FUENTE = { relevamiento: "Relevamiento", inventario: "Inventario", documento_tecnico: "Documento técnico", factura: "Factura", estimacion: "Estimación", factor_emision: "Factor de emisión" };
  crearABM({
    entidad: "Fuente de datos", genero: "a", idField: "id_fuente", columnas: 5,
    form: "form-fuente", idInput: "f-id", title: "f-title", submit: "f-submit", cancel: "f-cancel", msg: "f-msg", table: "f-table", count: "f-count",
    nombreInput: "f-nombre", tituloAlta: "Nueva fuente de datos", botonAlta: "Guardar fuente",
    listar: () => api.getFuentes(), crear: api.crearFuente, actualizar: api.actualizarFuente, eliminar: api.eliminarFuente,
    leer: () => ({
      nombre: $("f-nombre").value.trim(),
      tipo: $("f-tipo").value,
      referencia: $("f-referencia").value.trim() || null
    }),
    cargar: (r) => {
      $("f-nombre").value = r.nombre;
      $("f-tipo").value = r.tipo;
      $("f-referencia").value = r.referencia || "";
    },
    validar: (d, setInvalid) =>
      Number(setInvalid("f-tipo", !TIPOS_FUENTE[d.tipo])) +
      Number(setInvalid("f-referencia", (d.referencia || "").length > 250)),
    fila: (r) => `<td><b>${esc(r.nombre)}</b></td><td><span class="badge">${esc(TIPOS_FUENTE[r.tipo] || r.tipo)}</span></td><td style="white-space:normal">${esc(r.referencia || "—")}</td>`
  });
});
