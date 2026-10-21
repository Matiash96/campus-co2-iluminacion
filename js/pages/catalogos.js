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
  mostrarTab(location.hash === "#fuentes" ? "fuentes" : "tipos");
  window.addEventListener("hashchange", () => mostrarTab(location.hash === "#fuentes" ? "fuentes" : "tipos"));

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
      const repetido = registros.some((r) => String(r[cfg.idField]) !== String(id) && String(r.nombre).trim().toLowerCase() === nombre.toLowerCase());
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
        } catch (err) {
          toast(err.status === 409 ? err.message : `No se pudo eliminar: ${err.message}`, "err");
        }
      }
    });

    limpiar();
    listar();
  }

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
