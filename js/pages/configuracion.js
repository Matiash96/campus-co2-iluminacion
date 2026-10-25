/* Configuración: endpoints de la API (principales y completos) y datos de demostración */
document.addEventListener("DOMContentLoaded", () => {
  const { $, esc, toast } = CampusCO2.ui;
  const EP = CampusCO2.config.ENDPOINTS;

  /* Parámetros de consulta que envía el módulo en cada GET */
  const QUERY = {
    edificios: "?id_universidad={id}",
    dimensiones: "?codigo=INFRA_ILUMINACION",
    factoresEmision: "?id_periodo={id}&categoria=electricidad_red",
    listarActividades: "?id_dimension=4&id_periodo={id}",
    listarResultados: "?id_dimension=4",
    listarProyectos: "?id_dimension=4",
    listarEvitadas: "?id_proyecto={id}&id_periodo={id}"
  };
  const ruta = (k) => EP[k].path + (QUERY[k] || "");
  const badge = (m) => `<span class="badge ${m === "GET" ? "" : m === "DELETE" ? "err" : "ok"}">${m}</span>`;

  /* ---------- Endpoints principales (los del informe) ---------- */
  const PRINCIPALES = [
    {
      titulo: "Consulta del factor de emisión según el año",
      texto: "Se pide el factor de la red eléctrica del período seleccionado. Lo usan Carga (vista previa), Cálculo y Mitigación.",
      claves: ["factoresEmision"],
      ejemplo: { titulo: "Respuesta", json: [{ id_factor: 4, id_periodo: 4, anio: 2026, categoria: "electricidad_red", valor: 0.283, unidad: "tCO2e/MWh", fuente_nombre: "Secretaría de Energía", alcance: 2 }] }
    },
    {
      titulo: "Envío del cálculo",
      texto: "Cada resultado se envía con su trazabilidad completa. Las emisiones evitadas de Mitigación se envían aparte.",
      claves: ["crearResultado", "crearEvitada"],
      ejemplo: { titulo: "Cuerpo de POST /resultados-emisiones", json: { id_actividad: 41, id_factor: 4, id_dimension: 4, alcance: 2, consumo_kwh: 259.2, emisiones_kg_co2e: 73.3536, emisiones_t_co2e: 0.073354, fecha_calculo: "2026-10-20T14:05:00Z", version_metodologia: "ILUM-1.0", trazabilidad: { entradas: "…", factor_emision: "…", conversiones: "…", pasos: "…" } } }
    },
    {
      titulo: "Consulta de datos para graficar",
      texto: "El tablero de Visualización vuelve a pedir los datos y los resultados guardados para armar indicadores y gráficos.",
      claves: ["listarActividades", "listarResultados", "listarProyectos", "listarEvitadas"],
      ejemplo: { titulo: "Respuesta de GET /resultados-emisiones", json: [{ id_resultado: 120, id_actividad: 41, id_factor: 4, consumo_kwh: 259.2, emisiones_kg_co2e: 73.3536, fecha_calculo: "2026-10-20T14:05:00Z" }] }
    }
  ];
  $("ep-main").innerHTML = PRINCIPALES.map((c, i) => `
    <article class="panel ep-card">
      <span class="ep-num">${i + 1}</span>
      <h3>${esc(c.titulo)}</h3>
      <p>${esc(c.texto)}</p>
      ${c.claves.map((k) => `<div class="ep-line">${badge(EP[k].method)}<code>${esc(ruta(k))}</code></div>`).join("")}
      <details><summary>${esc(c.ejemplo.titulo)}</summary><pre class="json-box mt">${esc(JSON.stringify(c.ejemplo.json, null, 2))}</pre></details>
    </article>`).join("");

  /* ---------- Tabla completa agrupada ---------- */
  const GRUPOS = [
    ["Consulta del factor de emisión", { factoresEmision: "Factor de la red eléctrica del año seleccionado" }],
    ["Envío de datos relevados y cálculos", {
      crearActividad: "Enviar un dato de actividad (relevamiento)",
      actualizarActividad: "Corregir un dato de actividad",
      eliminarActividad: "Borrar un dato de actividad",
      crearResultado: "Enviar el cálculo con su trazabilidad",
      crearProyecto: "Registrar un proyecto de mitigación",
      crearEvitada: "Enviar las emisiones evitadas calculadas"
    }],
    ["Consulta de datos para tablas y gráficos", {
      listarActividades: "Datos de actividad (luminarias, potencia, consumo)",
      listarResultados: "Resultados de emisiones calculados",
      listarProyectos: "Proyectos de mitigación",
      listarEvitadas: "Emisiones evitadas"
    }],
    ["Catálogos (consulta)", {
      universidades: "Universidades",
      edificios: "Edificios de la universidad",
      periodos: "Períodos anuales",
      dimensiones: "Id de la dimensión 4 (se completa solo)",
      unidades: "Unidades (kWh)",
      fuentesDatos: "Fuentes de datos",
      tiposLuminaria: "Tipos de luminaria y potencia de referencia"
    }],
    ["ABM de catálogos", {
      crearUniversidad: "Alta de universidad", actualizarUniversidad: "Modificación de universidad", eliminarUniversidad: "Baja de universidad",
      crearEdificio: "Alta de edificio", actualizarEdificio: "Modificación de edificio", eliminarEdificio: "Baja de edificio",
      crearTipo: "Alta de tipo de luminaria", actualizarTipo: "Modificación de tipo de luminaria", eliminarTipo: "Baja de tipo de luminaria",
      crearFuente: "Alta de fuente de datos", actualizarFuente: "Modificación de fuente de datos", eliminarFuente: "Baja de fuente de datos"
    }]
  ];
  let n = 0, html = "";
  GRUPOS.forEach(([nombre, items]) => {
    const claves = Object.keys(items).filter((k) => EP[k]);
    html += `<tr class="ep-group"><td colspan="4">${esc(nombre)} · ${claves.length}</td></tr>`;
    claves.forEach((k) => {
      n++;
      html += `<tr><td>${n}</td><td>${badge(EP[k].method)}</td><td><code>${esc(ruta(k))}</code></td><td>${esc(items[k])}</td></tr>`;
    });
  });
  $("ep-table").innerHTML = html;
  $("ep-count").textContent = `${n} endpoints`;

  /* ---------- Datos de demostración ---------- */
  $("btn-export").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(CampusCO2.mock.exportar(), null, 2)], { type: "application/json" }));
    a.download = "campusco2_iluminacion_demo.json";
    a.click();
  });

  $("btn-reset").addEventListener("click", () => {
    if (!confirm("¿Restablecer los datos de demostración? Se perderán los registros cargados.")) return;
    CampusCO2.mock.reset();
    toast("Datos de ejemplo restablecidos", "ok");
  });
});
