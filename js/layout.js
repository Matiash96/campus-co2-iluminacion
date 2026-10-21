/* =========================================================
   Layout compartido (menú lateral, encabezado, pie) y
   utilidades de interfaz comunes a todas las páginas.
   Cada página declara <body data-page="..." data-title="...">
   ========================================================= */
window.CampusCO2 = window.CampusCO2 || {};

CampusCO2.ui = (function () {
  const PAGES = [
    { id: "inicio",        href: "index.html",         icon: "⌂", label: "Inicio" },
    { id: "metodologia",   href: "metodologia.html",   icon: "≡", label: "Modelo de medición" },
    { id: "nosotros",      href: "nosotros.html",      icon: "☺", label: "Nosotros" },
    { id: "carga",         href: "carga.html",         icon: "＋", label: "Carga de datos", group: "Módulos" },
    { id: "calculo",       href: "calculo.html",       icon: "∑", label: "Cálculo y trazabilidad" },
    { id: "visualizacion", href: "visualizacion.html", icon: "▥", label: "Visualización" },
    { id: "mitigacion",    href: "mitigacion.html",    icon: "↘", label: "Mitigación (LED)" },
    { id: "catalogos",     href: "catalogos.html",     icon: "☰", label: "Catálogos (ABM)", group: "Administración" },
    { id: "configuracion", href: "configuracion.html", icon: "⚙", label: "Configuración API", group: "Integración" }
  ];

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n, d = 1) => (n == null || isNaN(n) ? "–" : Number(n).toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d }));

  /* Emisiones: muestra kg o t según magnitud */
  function fmtCO2(kg, unidad) {
    if (unidad === "t" || (unidad === undefined && Math.abs(kg) >= 1000)) return `${fmt(kg / 1000, 2)} <em>tCO₂e</em>`;
    return `${fmt(kg, 1)} <em>kgCO₂e</em>`;
  }

  function renderLayout() {
    const body = document.body;
    const current = body.dataset.page;
    const c = CampusCO2.config.get();

    let nav = '<nav><div class="nav-label">General</div>';
    PAGES.forEach((p) => {
      if (p.group) nav += `<div class="nav-label">${p.group}</div>`;
      nav += `<a class="nav-item${p.id === current ? " active" : ""}" href="${p.href}"><span>${p.icon}</span>${p.label}</a>`;
    });
    nav += "</nav>";

    const modo = c.useMock
      ? '<span class="status-dot mock"></span> Modo demostración<small>Datos simulados · sin servidor</small>'
      : `<span class="status-dot"></span> API central<small>${esc(c.baseUrl)}</small>`;

    $("app-sidebar").className = "sidebar";
    $("app-sidebar").innerHTML = `
      <a class="brand" href="index.html" aria-label="Campus CO₂ – Inicio"><span class="brand-logo"><img src="img/greensoftware-logo.png" alt="Cátedra Green Software"></span><span class="brand-text"><strong>Campus CO₂</strong><small>UTN · Facultad Regional Córdoba</small></span></a>
      ${nav}
      <div class="sidebar-bottom">${modo}</div>`;

    $("app-topbar").className = "topbar";
    $("app-topbar").innerHTML = `
      <div><div class="eyebrow">Campus CO₂ / Dimensión 4 · Infraestructura y edificios</div><h1>${esc(body.dataset.title || "")}</h1></div>
      <div class="top-actions">
        <button type="button" class="theme-toggle" id="theme-toggle"></button>
        <a class="pill" href="configuracion.html" title="Configurar conexión"><span class="status-dot ${c.useMock ? "mock" : ""}"></span>${c.useMock ? "Modo demo (API simulada)" : "Conectado a API central"}</a>
      </div>`;

    $("theme-toggle").addEventListener("click", () => setTheme(temaActual() === "dark" ? "light" : "dark"));
    pintarBotonTema();

    const footer = document.createElement("footer");
    footer.innerHTML = `<span>Campus CO₂ · Infraestructura y edificios – Análisis de iluminación por edificio</span><span>Cátedra Green Software · UTN FRC · Metodología ${esc(c.versionMetodologia)}</span>`;
    document.querySelector(".main").appendChild(footer);

    const host = document.createElement("div");
    host.className = "toast-host";
    host.id = "toast-host";
    document.body.appendChild(host);
  }

  /* ---------- Modo claro / oscuro ----------
     Sin elección guardada se sigue el tema del sistema operativo. */
  const THEME_KEY = "campusco2.theme";
  const sistemaOscuro = () => window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const temaActual = () => document.documentElement.dataset.theme || (sistemaOscuro() ? "dark" : "light");

  function pintarBotonTema() {
    const b = $("theme-toggle");
    if (!b) return;
    const oscuro = temaActual() === "dark";
    b.innerHTML = oscuro ? "<span>☀</span> Modo claro" : "<span>☾</span> Modo oscuro";
    b.setAttribute("aria-label", oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
  }

  function setTheme(tema) {
    document.documentElement.dataset.theme = tema;
    try { localStorage.setItem(THEME_KEY, tema); } catch (e) { /* sin almacenamiento */ }
    pintarBotonTema();
    document.dispatchEvent(new CustomEvent("themechange", { detail: tema }));
  }

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (!document.documentElement.dataset.theme) { pintarBotonTema(); document.dispatchEvent(new CustomEvent("themechange")); }
    });
  }

  /* Lee un color definido en css/styles.css (para los gráficos) */
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function toast(msg, type = "") {
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.textContent = msg;
    $("toast-host").appendChild(t);
    setTimeout(() => t.remove(), 4200);
  }

  function fillSelect(sel, items, valueKey, labelFn, { placeholder } = {}) {
    sel.innerHTML = (placeholder ? `<option value="">${esc(placeholder)}</option>` : "") +
      items.map((i) => `<option value="${esc(i[valueKey])}">${esc(labelFn(i))}</option>`).join("");
  }

  function apiErrorBox(container, err) {
    container.innerHTML = `<div class="alert alert-err"><b>No se pudo obtener la información de la API.</b> ${esc(err.message)}${err.status ? ` (HTTP ${err.status})` : ""}. Revisá la <a href="configuracion.html">configuración</a>.</div>`;
  }

  /* Paleta categórica consistente para gráficos */
  const PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];

  document.addEventListener("DOMContentLoaded", renderLayout);

  return { $, esc, fmt, fmtCO2, toast, fillSelect, apiErrorBox, PALETTE, PAGES, cssVar, setTheme };
})();
