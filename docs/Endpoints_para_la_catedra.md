# Endpoints requeridos: Grupo 4, Infraestructura y edificios (iluminación)

**Para:** Cátedra Green Software, UTN FRC
**De:** Grupo 4, dimensión "Infraestructura y edificios: análisis de iluminación por edificio"
**Frontend:** https://campus-co2-iluminacion.vercel.app (hoy funciona con la API simulada)

Este es el listado de endpoints que nuestro frontend consume de la API REST común. Son **19 endpoints**: 10 de consulta de catálogos y 9 de datos, de los cuales 7 son de escritura. Las rutas son una propuesta: si ustedes las definen distinto, las cambiamos en un solo archivo (`js/config.js`).

---

## 1. Convenciones generales

| Tema | Lo que espera el frontend |
|---|---|
| URL base | `https://<servidor>/api/v1` (necesitamos que nos pasen la definitiva) |
| Formato | JSON UTF-8. Las peticiones con cuerpo llevan `Content-Type: application/json` |
| Autenticación | Opcional. Si la usan: `Authorization: Bearer <token>` |
| Nombres de campos | `snake_case`. Las claves primarias se llaman `id_<entidad>` |
| Respuesta de listas | Un arreglo JSON **o** `{ "data": [ ... ] }`. El frontend acepta los dos |
| Filtros | Por query string. Un filtro que no se envía no filtra |
| Fechas | ISO 8601: `2026-05-15` para fechas y `2026-06-01T12:00:00Z` para fecha y hora |
| Números | JSON numérico con punto decimal, no strings |
| Errores | `{ "message": "texto legible" }`. El frontend muestra `message` al usuario |
| Códigos HTTP | `200` OK · `201` creado · `204` borrado sin cuerpo · `400` validación · `401`/`403` auth · `404` no existe · `409` conflicto |
| CORS | Permitir el origen `https://campus-co2-iluminacion.vercel.app` |

---

## 2. Resumen

| # | Método | Ruta | Filtros (query) | Para qué lo usamos |
|---|---|---|---|---|
| 1 | GET | `/universidades` | — | Mostrar la universidad en el formulario |
| 2 | GET | `/edificios` | `id_universidad` | Selector de edificio |
| 3 | GET | `/edificios/{id_edificio}/sectores` | — | Selector de sector y superficie ⭐ |
| 4 | GET | `/periodos` | — | Selector de período anual |
| 5 | GET | `/dimensiones` | `codigo` | Obtener el `id_dimension` de `INFRA_ILUMINACION` |
| 6 | GET | `/unidades` | — | Obtener el `id_unidad` de kWh |
| 7 | GET | `/fuentes-datos` | — | Selector de fuente del dato |
| 8 | GET | `/factores-emision` | `id_periodo`, `categoria` | **Factor de emisión de la red eléctrica del año** |
| 9 | GET | `/tipos-luminaria` | — | Catálogo de luminarias ⭐ |
| 10 | GET | `/datos-actividad` | `id_dimension`, `id_periodo` | Listar los relevamientos |
| 11 | POST | `/datos-actividad` | — | **Enviar un dato relevado** |
| 12 | PUT | `/datos-actividad/{id_actividad}` | — | Corregir un dato |
| 13 | DELETE | `/datos-actividad/{id_actividad}` | — | Borrar un dato |
| 14 | GET | `/resultados-emisiones` | `id_dimension` | Tablero y estado de cálculo |
| 15 | POST | `/resultados-emisiones` | — | **Enviar el cálculo con su trazabilidad** |
| 16 | GET | `/proyectos-mitigacion` | `id_dimension` | Listar los proyectos de recambio LED |
| 17 | POST | `/proyectos-mitigacion` | — | Registrar un proyecto |
| 18 | GET | `/emisiones-evitadas` | — | Indicador de emisiones evitadas |
| 19 | POST | `/emisiones-evitadas` | — | Enviar las emisiones evitadas calculadas |

⭐ Son catálogos propios de nuestra dimensión, con las entidades SECTORES y TIPOS_LUMINARIA. Les pedimos que los agreguen a la base central. Su estructura está en `Modelo_de_Datos.md`.

> **Opcional:** `GET /health` → `{ "status": "ok" }`. Hoy no lo usamos; para probar la conexión consultamos `/dimensiones` y `/periodos`.

---

## 3. Catálogos (solo lectura)

### 1. `GET /universidades`

Respuesta `200`:
```json
[ { "id_universidad": 1, "nombre": "UTN – Facultad Regional Córdoba", "localidad": "Córdoba" } ]
```

### 2. `GET /edificios?id_universidad=1`

Respuesta `200`:
```json
[ { "id_edificio": 1, "id_universidad": 1, "nombre": "Edificio Central", "direccion": "..." } ]
```

### 3. `GET /edificios/{id_edificio}/sectores` ⭐

Devuelve los sectores de ese edificio. Respuesta `200`, o `404` si el edificio no existe:
```json
[
  { "id_sector": 1, "id_edificio": 1, "nombre": "Aulas planta baja", "tipo_espacio": "Aula", "superficie_m2": 320 },
  { "id_sector": 10, "id_edificio": 1, "nombre": "Perímetro exterior", "tipo_espacio": "Exterior", "superficie_m2": null }
]
```
`tipo_espacio` ∈ {Aula, Oficina, Circulación, Laboratorio, Biblioteca, Depósito, Exterior}. `superficie_m2` puede ser `null` en espacios exteriores.

### 4. `GET /periodos`

Respuesta `200`:
```json
[ { "id_periodo": 4, "anio": 2026, "fecha_inicio": "2026-01-01", "fecha_fin": "2026-12-31", "estado": "abierto" } ]
```
`estado` ∈ {abierto, cerrado}.

### 5. `GET /dimensiones?codigo=INFRA_ILUMINACION`

Respuesta `200`:
```json
[ { "id_dimension": 4, "codigo": "INFRA_ILUMINACION", "nombre": "Infraestructura y edificios", "descripcion": "Análisis de iluminación por edificio" } ]
```
Necesitamos que exista una dimensión con un `codigo` fijo para identificarla. Si eligen otro código, nos lo pasan.

### 6. `GET /unidades`

Respuesta `200`. Como mínimo deben existir `W`, `kW`, `kWh`, `kgCO2e/kWh` y `tCO2e/MWh`:
```json
[
  { "id_unidad": 1, "nombre": "Watt", "simbolo": "W", "magnitud": "potencia", "factor_a_base": 1 },
  { "id_unidad": 4, "nombre": "Kilowatt-hora", "simbolo": "kWh", "magnitud": "energia", "factor_a_base": 1 }
]
```

### 7. `GET /fuentes-datos`

Respuesta `200`:
```json
[ { "id_fuente": 1, "nombre": "Relevamiento presencial", "tipo": "relevamiento", "referencia": "Planilla de campo" } ]
```

### 8. `GET /factores-emision?id_periodo=4&categoria=electricidad_red`

Es el **factor de emisión de la red eléctrica argentina** para ese año. Lo usamos para calcular el Alcance 2. Respuesta `200`:
```json
[
  {
    "id_factor": 4,
    "id_periodo": 4,
    "anio": 2026,
    "categoria": "electricidad_red",
    "valor": 0.283,
    "unidad": "tCO2e/MWh",
    "id_unidad": 11,
    "id_fuente": 5,
    "fuente_nombre": "Secretaría de Energía – factor de emisión de la red",
    "alcance": 2
  }
]
```
Necesitamos que la respuesta incluya **`unidad` (el símbolo), `anio` y `fuente_nombre`**, porque los mostramos en la trazabilidad del cálculo. Aceptamos `valor` en `kgCO2e/kWh`, `tCO2e/MWh`, `kgCO2e/MWh` o `gCO2e/kWh`; la conversión la hace el frontend. **El valor oficial del factor lo tiene que cargar la cátedra.**

### 9. `GET /tipos-luminaria` ⭐

Respuesta `200`:
```json
[
  { "id_tipo_luminaria": 1, "nombre": "Tubo fluorescente T8 120 cm", "tecnologia": "Fluorescente", "potencia_referencia_w": 36, "eficiente": false },
  { "id_tipo_luminaria": 2, "nombre": "Tubo LED T8 120 cm", "tecnologia": "LED", "potencia_referencia_w": 18, "eficiente": true }
]
```

---

## 4. Datos de actividad (relevamientos)

El registro sigue la estructura **genérica** de DATOS_ACTIVIDAD (`valor` + `id_unidad`). Los datos propios de iluminación van anidados en `detalle_iluminacion`, que es una relación 1:1 con la entidad DETALLE_ILUMINACION ⭐.

### 10. `GET /datos-actividad?id_dimension=4&id_periodo=4`

`id_periodo` es opcional; sin ese filtro devuelve todos los años. Respuesta `200`: un arreglo de objetos como el del punto 11, con `id_actividad`, `created_at` y `updated_at`.

### 11. `POST /datos-actividad`

Cuerpo:
```json
{
  "id_edificio": 3,
  "id_periodo": 4,
  "id_dimension": 4,
  "id_fuente": 1,
  "id_unidad": 4,
  "valor": 259.2,
  "descripcion": "Plafón LED circular – Depósito",
  "detalle_iluminacion": {
    "id_sector": 7,
    "id_tipo_luminaria": 4,
    "tipo_actividad": "Iluminación interior",
    "cantidad": 12,
    "potencia_unitaria": 18,
    "unidad_potencia": "W",
    "horas_uso": 6,
    "unidad_tiempo": "h/día",
    "dias_anio": 200,
    "factor_simultaneidad": 100,
    "fecha_relevamiento": "2026-05-15",
    "responsable": "Grupo 4 – Iluminación",
    "observaciones": "Potencia tomada de la etiqueta"
  }
}
```
Respuesta `201`: el mismo objeto más `id_actividad` y `created_at`. Respuesta `400` si falla una validación.

Validaciones sugeridas (el frontend ya las aplica):

| Campo | Regla |
|---|---|
| `id_edificio`, `id_periodo`, `id_dimension`, `id_fuente`, `id_unidad` | Obligatorios y existentes |
| `detalle_iluminacion.id_sector` | Obligatorio; tiene que pertenecer a `id_edificio` |
| `detalle_iluminacion.id_tipo_luminaria` | Obligatorio y existente |
| `tipo_actividad` | Iluminación interior, Iluminación exterior o Iluminación de emergencia |
| `cantidad` | Entero de 1 a 10.000 |
| `potencia_unitaria` + `unidad_potencia` | `unidad_potencia` ∈ {W, kW}; entre 0,5 W y 2.000 W una vez convertida |
| `horas_uso` + `unidad_tiempo` | `h/día`: de 0,5 a 24 · `h/año`: de 1 a 8.784 |
| `dias_anio` | Entero de 1 a 366; tiene que ser `null` si `unidad_tiempo = "h/año"` |
| `factor_simultaneidad` | De 1 a 100 (%) |
| `fecha_relevamiento` | Dentro del año del período y no posterior a hoy |
| `responsable` | Al menos 3 caracteres |
| `valor` | Consumo en kWh/año, mayor o igual a 0 |

### 12. `PUT /datos-actividad/{id_actividad}`

Mismo cuerpo que el POST. Respuesta `200` con el registro actualizado, que **debe incluir `updated_at`**: lo usamos para saber si hay que recalcular. `404` si el registro no existe.

### 13. `DELETE /datos-actividad/{id_actividad}`

Respuesta `204`. Pedimos que borre en cascada el detalle y los resultados asociados. Si prefieren no hacerlo, que responda `409`.

---

## 5. Resultados de emisiones

### 14. `GET /resultados-emisiones?id_dimension=4`

Respuesta `200`: un arreglo de objetos como el del punto 15, con `id_resultado`. El frontend toma el resultado más reciente de cada `id_actividad` según `fecha_calculo`.

### 15. `POST /resultados-emisiones`

Cuerpo:
```json
{
  "id_actividad": 41,
  "id_factor": 4,
  "id_dimension": 4,
  "alcance": 2,
  "consumo_kwh": 259.2,
  "emisiones_kg_co2e": 73.3536,
  "emisiones_t_co2e": 0.073354,
  "fecha_calculo": "2026-10-20T14:05:00.000Z",
  "version_metodologia": "ILUM-1.0",
  "trazabilidad": {
    "metodo": "Alcance 2 – basado en ubicación",
    "formula_general": "E = (cantidad × P[W] ÷ 1000) × horas_año × simultaneidad × FE",
    "entradas": { "cantidad": 12, "potencia_unitaria": 18, "unidad_potencia": "W", "horas_uso": 6, "unidad_tiempo": "h/día", "dias_anio": 200, "factor_simultaneidad": 100 },
    "factor_emision": { "id_factor": 4, "valor_original": 0.283, "unidad_original": "tCO2e/MWh", "valor_normalizado_kg_kwh": 0.283 },
    "conversiones": [ { "magnitud": "Potencia instalada", "de": "216 W", "a": "0,216 kW", "regla": "kW = W ÷ 1000" } ],
    "pasos": [ { "descripcion": "Consumo eléctrico anual", "formula": "0,216 kW × 1.200 h × 100 %", "resultado": "259,2 kWh" } ]
  }
}
```
Respuesta `201` con `id_resultado`. Les pedimos dos cosas:
- **No sobrescribir resultados:** cada recálculo crea un registro nuevo, así queda el historial.
- **Guardar `trazabilidad` tal como llega**, en una columna JSON.

---

## 6. Mitigación y emisiones evitadas

### 16. `GET /proyectos-mitigacion?id_dimension=4`

Respuesta `200`: un arreglo de objetos como el del punto 17, con `id_proyecto`.

### 17. `POST /proyectos-mitigacion`

Cuerpo:
```json
{
  "id_edificio": 2,
  "id_dimension": 4,
  "nombre": "Recambio LED – Pasillos",
  "descripcion": "Reemplazo de 24 LFC 20 W por plafones LED 18 W.",
  "tipo_medida": "Recambio a LED",
  "fecha_inicio": "2026-10-20",
  "estado": "Planificado"
}
```
`estado` ∈ {Planificado, En evaluación, En ejecución, Implementado}. Respuesta `201` con `id_proyecto`. **El frontend usa ese `id_proyecto` en el POST siguiente.**

### 18. `GET /emisiones-evitadas`

Acepta los filtros opcionales `id_proyecto` e `id_periodo`. Respuesta `200`: un arreglo de objetos como el del punto 19, con `id_emision_evitada`.

### 19. `POST /emisiones-evitadas`

Cuerpo:
```json
{
  "id_proyecto": 2,
  "id_periodo": 4,
  "id_factor": 4,
  "consumo_base_kwh": 1612.8,
  "consumo_mejorado_kwh": 1451.52,
  "kg_co2e_evitados": 45.6422,
  "parametros": { "cantidad_base": 24, "potencia_base": 20, "cantidad_nueva": 24, "potencia_nueva": 18, "horas_uso": 14, "unidad_tiempo": "h/día", "dias_anio": 240 },
  "trazabilidad": { "metodo": "(consumo base − consumo mejorado) × FE", "pasos": [] }
}
```
Respuesta `201` con `id_emision_evitada`. `parametros` y `trazabilidad` son JSON libres.

---

## 7. Lo que necesitamos de la cátedra

1. La URL base de la API y, si usan autenticación, cómo obtener el token.
2. Que confirmen las rutas o nos pasen las suyas.
3. Que carguen el factor de emisión oficial de la red eléctrica para cada año, con `categoria = electricidad_red`.
4. Que agreguen SECTORES, TIPOS_LUMINARIA y DETALLE_ILUMINACION a la base central.
5. Que habiliten CORS para `https://campus-co2-iluminacion.vercel.app`.
