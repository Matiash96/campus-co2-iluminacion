# Modelo de datos – Iluminación por edificio (Campus CO₂)

21/10/2026 · Matias

El módulo de la dimensión 4 (Infraestructura y edificios: análisis de iluminación por edificio) usa 11 entidades centrales de la base de la cátedra y agrega 2 entidades propias. No crea una base de datos propia: las 2 entidades nuevas se proponen para que la cátedra las aloje en la base central.

- **Entidades centrales:** las define la cátedra y las comparten las 15 dimensiones. El módulo las consume a través de la API REST común.
- **Entidades propias de la dimensión 4:** TIPOS_LUMINARIA y DETALLE_ILUMINACION. Guardan los datos que solo necesita el análisis de iluminación.
- **DIMENSIONES:** DIMENSIONES es la entidad central que separa los datos de los 15 grupos. El módulo siempre usa la dimensión 4 (`INFRA_ILUMINACION`): obtiene su `id_dimension` de la API y lo completa solo en cada envío. No es un campo del formulario de carga.
- **Catálogos administrables:** UNIVERSIDADES, EDIFICIOS, TIPOS_LUMINARIA y FUENTES_DATOS tienen alta, baja y modificación en la página *Catálogos (ABM)*.
- **Notación:** PK = clave primaria, FK = clave foránea. Los nombres siguen `snake_case`, igual que el JSON de la API.
- **Diagrama entidad-relación:** archivo `mapa_entidad_relacion_iluminacion_v3.drawio` (Google Drive y carpeta `docs/` del proyecto).

## Entidades y atributos

Son 13 entidades: 11 centrales y 2 propias de la dimensión 4. DETALLE_ILUMINACION es una extensión 1:1 de DATOS_ACTIVIDAD, así la entidad central queda genérica (`valor` + `id_unidad`) para todas las dimensiones.

| Entidad | Origen | Clave primaria | Claves foráneas | Otros atributos |
| --- | --- | --- | --- | --- |
| UNIVERSIDADES | Central | id_universidad | — | nombre, localidad |
| EDIFICIOS | Central | id_edificio | id_universidad | nombre, direccion |
| PERIODOS | Central | id_periodo | — | anio, fecha_inicio, fecha_fin, estado |
| DIMENSIONES | Central | id_dimension | — | codigo, nombre, descripcion |
| UNIDADES | Central | id_unidad | — | nombre, simbolo, magnitud, factor_a_base |
| FUENTES_DATOS | Central | id_fuente | — | nombre, tipo, referencia |
| FACTORES_EMISION | Central | id_factor | id_periodo, id_fuente, id_unidad | categoria, valor, alcance |
| DATOS_ACTIVIDAD | Central | id_actividad | id_edificio, id_periodo, id_dimension, id_unidad, id_fuente | valor, descripcion, created_at, updated_at |
| RESULTADOS_EMISIONES | Central | id_resultado | id_actividad, id_factor | alcance, consumo_kwh, emisiones_kg_co2e, emisiones_t_co2e, fecha_calculo, version_metodologia, trazabilidad |
| PROYECTOS_MITIGACION | Central | id_proyecto | id_edificio, id_dimension | nombre, descripcion, tipo_medida, fecha_inicio, estado |
| EMISIONES_EVITADAS | Central | id_emision_evitada | id_proyecto, id_periodo, id_factor | consumo_base_kwh, consumo_mejorado_kwh, kg_co2e_evitados, parametros, trazabilidad |
| TIPOS_LUMINARIA | Dimensión 4 | id_tipo_luminaria | — | nombre, tecnologia, potencia_referencia_w, eficiente |
| DETALLE_ILUMINACION | Dimensión 4 | id_actividad (también FK) | id_actividad, id_tipo_luminaria | cantidad, potencia_unitaria, unidad_potencia, horas_uso, unidad_tiempo, dias_anio, factor_simultaneidad, fecha_relevamiento, responsable, observaciones |

## Relaciones con las entidades centrales

Las 2 entidades propias se cuelgan de una entidad central: DETALLE_ILUMINACION extiende a DATOS_ACTIVIDAD, y TIPOS_LUMINARIA es el catálogo de ese detalle. El edificio se toma de DATOS_ACTIVIDAD. El resto del cálculo (factor, resultado, emisiones evitadas) usa solo entidades centrales.

| Entidad padre (1) | Entidad hija (N) | Cardinalidad | Qué representa |
| --- | --- | --- | --- |
| DATOS_ACTIVIDAD | DETALLE_ILUMINACION | 1 : 0..1 | Extensión con las variables propias de la iluminación |
| TIPOS_LUMINARIA | DETALLE_ILUMINACION | 1 : N | Tecnología y potencia de referencia de la luminaria |
| UNIVERSIDADES | EDIFICIOS | 1 : N | Edificios de la UTN FRC |
| EDIFICIOS | DATOS_ACTIVIDAD | 1 : N | El relevamiento se imputa a un edificio |
| PERIODOS | DATOS_ACTIVIDAD | 1 : N | Cada dato pertenece a un año (periodicidad anual) |
| DIMENSIONES | DATOS_ACTIVIDAD | 1 : N | Identifica a la dimensión 4 (`INFRA_ILUMINACION`); el sistema completa `id_dimension` |
| UNIDADES | DATOS_ACTIVIDAD | 1 : N | `valor` se expresa en kWh/año |
| FUENTES_DATOS | DATOS_ACTIVIDAD | 1 : N | Origen y calidad del dato relevado |
| PERIODOS | FACTORES_EMISION | 1 : N | Un factor de red eléctrica por año |
| FUENTES_DATOS | FACTORES_EMISION | 1 : N | Organismo que publica el factor |
| UNIDADES | FACTORES_EMISION | 1 : N | Unidad del factor (por ejemplo kgCO₂e/kWh) |
| DATOS_ACTIVIDAD | RESULTADOS_EMISIONES | 1 : N | Historial de cálculos de cada dato |
| FACTORES_EMISION | RESULTADOS_EMISIONES | 1 : N | Factor aplicado en cada cálculo (trazabilidad) |
| EDIFICIOS | PROYECTOS_MITIGACION | 1 : N | Proyecto de recambio LED en un edificio |
| DIMENSIONES | PROYECTOS_MITIGACION | 1 : N | Proyectos de la dimensión 4 |
| PROYECTOS_MITIGACION | EMISIONES_EVITADAS | 1 : N | Emisiones evitadas por año |
| PERIODOS | EMISIONES_EVITADAS | 1 : N | Año evaluado |
| FACTORES_EMISION | EMISIONES_EVITADAS | 1 : N | Factor aplicado al ahorro |

## Diccionario de datos

Una tabla por entidad, en el orden en que se usan al cargar y calcular. Los tipos son SQL de referencia; la cátedra puede ajustarlos a su motor.

### TIPOS_LUMINARIA (dimensión 4)

| Campo | Tipo | Nulo | Descripción | Ejemplo / validación |
| --- | --- | --- | --- | --- |
| id_tipo_luminaria | INTEGER PK | No | Identificador | 2 |
| nombre | VARCHAR(100) | No | Descripción comercial | Tubo LED T8 120 cm |
| tecnologia | VARCHAR(40) | No | Familia tecnológica | LED, Fluorescente, Fluorescente compacta, Halógena, Descarga |
| potencia_referencia_w | DECIMAL(8,2) | No | Potencia típica por unidad, en W | 18 |
| eficiente | BOOLEAN | No | Si se considera tecnología eficiente | true |

### DETALLE_ILUMINACION (dimensión 4)

| Campo | Tipo | Nulo | Descripción | Ejemplo / validación |
| --- | --- | --- | --- | --- |
| id_actividad | INTEGER PK, FK → DATOS_ACTIVIDAD | No | Relación 1:1 con el dato de actividad | 41 |
| id_tipo_luminaria | INTEGER FK → TIPOS_LUMINARIA | No | Tipo de luminaria | 4 |
| cantidad | INTEGER | No | Luminarias instaladas | Entero de 1 a 10.000 |
| potencia_unitaria | DECIMAL(10,3) | No | Potencia por luminaria, en la unidad cargada | Entre 0,5 W y 2.000 W una vez convertida |
| unidad_potencia | VARCHAR(5) | No | Símbolo de UNIDADES | W o kW |
| horas_uso | DECIMAL(8,2) | No | Tiempo de uso | 0,5 a 24 si es h/día; 1 a 8.784 si es h/año |
| unidad_tiempo | VARCHAR(6) | No | Unidad de horas_uso | h/día o h/año |
| dias_anio | SMALLINT | Sí | Días de uso al año; nulo si se usa h/año | 1 a 365 (366 en año bisiesto) |
| factor_simultaneidad | DECIMAL(5,2) | No | Porcentaje de luminarias encendidas a la vez | 1 a 100 |
| fecha_relevamiento | DATE | No | Fecha del relevamiento | Dentro del año del período y no futura |
| responsable | VARCHAR(80) | No | Persona o grupo que relevó | Mínimo 3 caracteres |
| observaciones | VARCHAR(500) | Sí | Notas sobre la calidad del dato | Potencia tomada de la etiqueta |

### DATOS_ACTIVIDAD (central)

| Campo | Tipo | Nulo | Descripción | Ejemplo / validación |
| --- | --- | --- | --- | --- |
| id_actividad | INTEGER PK | No | Identificador del dato de actividad | 41 |
| id_edificio | INTEGER FK → EDIFICIOS | No | Edificio relevado | 3 |
| id_periodo | INTEGER FK → PERIODOS | No | Año del relevamiento | 4 (2026) |
| id_dimension | INTEGER FK → DIMENSIONES | No | Dimensión del dato; lo completa el sistema, no se carga en el formulario | 4 = iluminación |
| id_unidad | INTEGER FK → UNIDADES | No | Unidad de valor | kWh |
| id_fuente | INTEGER FK → FUENTES_DATOS | No | Origen del dato | 1 = Relevamiento presencial |
| valor | DECIMAL(14,4) | No | Consumo anual estimado | 259,2 |
| descripcion | VARCHAR(200) | Sí | Texto descriptivo | Plafón LED – Depósito |
| created_at | TIMESTAMP | No | Fecha de alta | ISO 8601 |
| updated_at | TIMESTAMP | Sí | Última modificación; si es posterior al resultado, hay que recalcular | ISO 8601 |

### FACTORES_EMISION (central)

| Campo | Tipo | Nulo | Descripción | Ejemplo / validación |
| --- | --- | --- | --- | --- |
| id_factor | INTEGER PK | No | Identificador | 4 |
| id_periodo | INTEGER FK → PERIODOS | No | Año de vigencia | 4 |
| id_fuente | INTEGER FK → FUENTES_DATOS | No | Organismo que lo publica | Secretaría de Energía / CAMMESA |
| id_unidad | INTEGER FK → UNIDADES | No | Unidad del valor | kgCO₂e/kWh o tCO₂e/MWh |
| categoria | VARCHAR(40) | No | Tipo de factor | electricidad_red |
| valor | DECIMAL(12,6) | No | Valor del factor | Lo carga la cátedra (valor oficial) |
| alcance | SMALLINT | No | Alcance GHG | 2 |

### RESULTADOS_EMISIONES (central)

| Campo | Tipo | Nulo | Descripción | Ejemplo / validación |
| --- | --- | --- | --- | --- |
| id_resultado | INTEGER PK | No | Identificador | 120 |
| id_actividad | INTEGER FK → DATOS_ACTIVIDAD | No | Dato calculado | 41 |
| id_factor | INTEGER FK → FACTORES_EMISION | No | Factor aplicado | 4 |
| alcance | SMALLINT | No | Alcance GHG | 2 |
| consumo_kwh | DECIMAL(14,4) | No | Energía anual calculada | 259,2 |
| emisiones_kg_co2e | DECIMAL(14,4) | No | Emisiones en kg | 73,3536 |
| emisiones_t_co2e | DECIMAL(14,6) | No | Emisiones en toneladas | 0,073354 |
| fecha_calculo | TIMESTAMP | No | Momento del cálculo; cada recálculo es un registro nuevo | ISO 8601 |
| version_metodologia | VARCHAR(20) | No | Versión de las fórmulas | ILUM-1.0 |
| trazabilidad | JSON | No | Entradas, conversiones, factor y pasos del cálculo | Objeto JSON |

### PROYECTOS_MITIGACION (central)

| Campo | Tipo | Nulo | Descripción | Ejemplo / validación |
| --- | --- | --- | --- | --- |
| id_proyecto | INTEGER PK | No | Identificador | 2 |
| id_edificio | INTEGER FK → EDIFICIOS | No | Edificio del proyecto | 2 |
| id_dimension | INTEGER FK → DIMENSIONES | No | Dimensión | 4 |
| nombre | VARCHAR(120) | No | Nombre del proyecto | Mínimo 5 caracteres |
| descripcion | VARCHAR(500) | Sí | Detalle de la medida | Reemplazo de 24 LFC 20 W por plafones LED 18 W |
| tipo_medida | VARCHAR(60) | No | Tipo de medida | Recambio a LED |
| fecha_inicio | DATE | No | Inicio del proyecto | 2026-10-20 |
| estado | VARCHAR(20) | No | Avance | Planificado, En evaluación, En ejecución, Implementado |

### EMISIONES_EVITADAS (central)

| Campo | Tipo | Nulo | Descripción | Ejemplo / validación |
| --- | --- | --- | --- | --- |
| id_emision_evitada | INTEGER PK | No | Identificador | 2 |
| id_proyecto | INTEGER FK → PROYECTOS_MITIGACION | No | Proyecto evaluado | 2 |
| id_periodo | INTEGER FK → PERIODOS | No | Año evaluado | 4 |
| id_factor | INTEGER FK → FACTORES_EMISION | No | Factor aplicado | 4 |
| consumo_base_kwh | DECIMAL(14,4) | No | Consumo del escenario actual | 1.612,8 |
| consumo_mejorado_kwh | DECIMAL(14,4) | No | Consumo con la mejora | Menor que consumo_base_kwh |
| kg_co2e_evitados | DECIMAL(14,4) | No | (base − mejorado) × factor | 45,64 |
| parametros | JSON | Sí | Cantidades, potencias y horas de cada escenario | Objeto JSON |
| trazabilidad | JSON | Sí | Pasos del cálculo | Objeto JSON |

### Catálogos centrales usados sin cambios

| Entidad | Campo | Tipo | Nulo | Descripción |
| --- | --- | --- | --- | --- |
| UNIVERSIDADES | id_universidad / nombre / localidad | INTEGER PK / VARCHAR(120) / VARCHAR(80) | No | Universidad (UTN FRC) |
| EDIFICIOS | id_edificio / id_universidad / nombre / direccion | INTEGER PK / INTEGER FK / VARCHAR(100) / VARCHAR(150) | direccion sí | Edificios del campus |
| PERIODOS | id_periodo / anio / fecha_inicio / fecha_fin / estado | INTEGER PK / SMALLINT / DATE / DATE / VARCHAR(10) | No | Año calendario; estado abierto o cerrado |
| DIMENSIONES | id_dimension / codigo / nombre / descripcion | INTEGER PK / VARCHAR(30) / VARCHAR(80) / VARCHAR(200) | descripcion sí | Las 15 dimensiones del trabajo |
| UNIDADES | id_unidad / nombre / simbolo / magnitud / factor_a_base | INTEGER PK / VARCHAR(60) / VARCHAR(15) / VARCHAR(20) / DECIMAL(14,6) | factor_a_base sí | Unidades y su conversión a la unidad base |
| FUENTES_DATOS | id_fuente / nombre / tipo / referencia | INTEGER PK / VARCHAR(100) / VARCHAR(30) / VARCHAR(250) | referencia sí | Origen de datos y factores |
