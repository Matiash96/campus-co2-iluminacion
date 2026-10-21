CAMPUS CO2 — DIMENSIÓN 4: INFRAESTRUCTURA Y EDIFICIOS
Análisis de iluminación por edificio · UTN FRC · Cátedra Green Software
=======================================================================

Sitio multipágina (HTML + CSS + JavaScript, sin frameworks ni build).

Publicado en: https://campus-co2-iluminacion.vercel.app
(deploy automático en Vercel: se actualiza solo con cada push a la rama main)
Repositorio: https://github.com/Matiash96/campus-co2-iluminacion (privado)

PÁGINAS
- index.html ............ Inicio: KPIs del último período y flujo del módulo
- metodologia.html ...... Modelo de medición: alcance, variables, unidades, fórmulas, relevamiento
- nosotros.html ......... Descripción del proyecto y datos de la cursada (cátedra, curso y grupo)
- carga.html ............ MÓDULO DE CARGA: formulario con validaciones (edificio, período,
                          luminaria, potencia + unidad, horas, fuente)
- calculo.html .......... MÓDULO DE CÁLCULO: aplica el factor de emisión del período,
                          convierte unidades, muestra la trazabilidad y envía los resultados
- visualizacion.html .... MÓDULO DE VISUALIZACIÓN: KPIs, emisiones por edificio, evolución
                          temporal, comparación interanual, distribución por tecnología y
                          por tipo de luminaria, kWh y kgCO2e por luminaria, ranking, CSV
- mitigacion.html ....... Proyectos de recambio a LED y emisiones evitadas
- catalogos.html ........ ABM de universidades, edificios, tipos de luminaria y fuentes de datos
- configuracion.html .... INTEGRACIÓN CON LA API: URL base, token, modo demo, prueba de conexión

Todas las páginas tienen un botón para cambiar entre modo claro y oscuro (se recuerda
en el navegador; sin elección, sigue el tema del sistema).

ESTRUCTURA
- css/styles.css ........ estilos compartidos (responsive)
- js/config.js .......... URL base y ENDPOINTS de la API central (único lugar a modificar)
- js/api.js ............. cliente REST (fetch, token, timeout, errores)
- js/calculo.js ......... funciones de cálculo puras + trazabilidad
- js/mock-data.js ....... simulador de la API para el modo demostración (NO es una API propia)
- js/layout.js .......... menú, encabezado y utilidades de interfaz
- js/contexto.js ........ carga de catálogos y unión de datos
- js/pages/*.js ......... lógica de cada página
- docs/API_y_Modelo_de_Datos.md ............. endpoints + modelo de datos (para el profesor)
- docs/mapa_entidad_relacion_iluminacion_v3.drawio ... diagrama ER actualizado

CÓMO ABRIR
Opción A: abrir index.html con doble clic.
Opción B (recomendada): servir la carpeta, por ejemplo:
    python -m http.server 5173
  y abrir http://localhost:5173

Los gráficos usan Chart.js 4.4.1 desde un CDN: hace falta conexión a internet.

MODO DEMOSTRACIÓN vs. API REAL
- Por defecto funciona en "modo demostración": las respuestas de la API se simulan en el
  navegador y los datos persisten en localStorage. Se reinician desde Configuración API.
- Cuando la cátedra publique la API: ir a "Configuración API", elegir "API central",
  cargar la URL base (y el token si corresponde), probar la conexión y guardar.
  Si las rutas difieren, editar ENDPOINTS en js/config.js.

IMPORTANTE
- Los edificios, cantidades, potencias y factores de emisión del modo demostración son
  ILUSTRATIVOS, no datos oficiales de la Facultad. El factor oficial lo debe proveer la API central.
