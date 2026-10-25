/* Configuración: listado de endpoints y datos de demostración */
document.addEventListener("DOMContentLoaded", () => {
  const { $, esc, toast } = CampusCO2.ui;
  const config = CampusCO2.config;

  /* Para qué usa el módulo cada endpoint de js/config.js */
  const USOS = {
    health: "Chequeo de estado (opcional, no se usa)",
    universidades: "Consultar universidades",
    crearUniversidad: "ABM: alta de universidad",
    actualizarUniversidad: "ABM: modificación de universidad",
    eliminarUniversidad: "ABM: baja de universidad",
    edificios: "Consultar edificios",
    crearEdificio: "ABM: alta de edificio",
    actualizarEdificio: "ABM: modificación de edificio",
    eliminarEdificio: "ABM: baja de edificio",
    periodos: "Consultar períodos anuales",
    dimensiones: "Obtener el id de la dimensión 4",
    unidades: "Consultar unidades (kWh)",
    fuentesDatos: "Consultar fuentes de datos",
    crearFuente: "ABM: alta de fuente de datos",
    actualizarFuente: "ABM: modificación de fuente de datos",
    eliminarFuente: "ABM: baja de fuente de datos",
    factoresEmision: "Consultar el factor de emisión del año",
    tiposLuminaria: "Consultar tipos de luminaria",
    crearTipo: "ABM: alta de tipo de luminaria",
    actualizarTipo: "ABM: modificación de tipo de luminaria",
    eliminarTipo: "ABM: baja de tipo de luminaria",
    listarActividades: "Consultar datos de actividad (tablas y gráficos)",
    crearActividad: "Enviar un dato de actividad",
    actualizarActividad: "Corregir un dato de actividad",
    eliminarActividad: "Borrar un dato de actividad",
    listarResultados: "Consultar resultados (tablas y gráficos)",
    crearResultado: "Enviar el cálculo con su trazabilidad",
    listarProyectos: "Consultar proyectos de mitigación",
    crearProyecto: "Registrar un proyecto de mitigación",
    listarEvitadas: "Consultar emisiones evitadas",
    crearEvitada: "Enviar las emisiones evitadas"
  };

  const entradas = Object.entries(config.ENDPOINTS).filter(([k]) => k !== "health");
  $("ep-count").textContent = `${entradas.length} endpoints`;
  $("ep-table").innerHTML = entradas.map(([k, ep]) =>
    `<tr><td><span class="badge ${ep.method === "GET" ? "" : ep.method === "DELETE" ? "err" : "ok"}">${ep.method}</span></td><td><code>${esc(ep.path)}</code></td><td>${esc(USOS[k] || k)}</td></tr>`).join("");

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
