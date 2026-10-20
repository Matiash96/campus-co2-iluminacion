/* =========================================================
   MÓDULO DE CÁLCULO — Iluminación por edificio
   ---------------------------------------------------------
   Funciones puras (sin DOM ni red): conversiones de unidades,
   consumo anual, emisiones (Alcance 2) y emisiones evitadas.
   Cada cálculo devuelve un objeto de TRAZABILIDAD que se envía
   a la API junto con el resultado.
   ========================================================= */
window.CampusCO2 = window.CampusCO2 || {};

CampusCO2.calculo = (function () {
  const VERSION = "ILUM-1.0";

  /* Unidad -> { magnitud, factor a la unidad base de la magnitud } */
  const UNIDADES = {
    // Potencia (base: W)
    "W":   { magnitud: "potencia", aBase: 1 },
    "kW":  { magnitud: "potencia", aBase: 1000 },
    // Energía (base: kWh)
    "Wh":  { magnitud: "energia", aBase: 0.001 },
    "kWh": { magnitud: "energia", aBase: 1 },
    "MWh": { magnitud: "energia", aBase: 1000 },
    // Masa de CO2e (base: kg)
    "gCO2e":  { magnitud: "masa", aBase: 0.001 },
    "kgCO2e": { magnitud: "masa", aBase: 1 },
    "tCO2e":  { magnitud: "masa", aBase: 1000 },
    // Tiempo de uso (base: h/año) — h/día requiere días/año
    "h/año": { magnitud: "tiempo", aBase: 1 }
  };

  /* Unidades de factor de emisión -> multiplicador a kgCO2e/kWh */
  const UNIDADES_FACTOR = {
    "kgCO2e/kWh": 1,
    "tCO2e/MWh": 1,        // 1 t/MWh = 1000 kg / 1000 kWh
    "kgCO2e/MWh": 0.001,
    "gCO2e/kWh": 0.001
  };

  const r = (n, d = 6) => Math.round(n * 10 ** d) / 10 ** d;
  const num = (n) => Number(n).toLocaleString("es-AR", { maximumFractionDigits: 6 });

  function convertir(valor, de, a) {
    const u1 = UNIDADES[de], u2 = UNIDADES[a];
    if (!u1 || !u2) throw new Error(`Unidad desconocida: ${!u1 ? de : a}`);
    if (u1.magnitud !== u2.magnitud) throw new Error(`No se puede convertir ${de} a ${a}`);
    return (Number(valor) * u1.aBase) / u2.aBase;
  }

  /* Horas de uso anuales a partir del modo de carga elegido */
  function horasAnuales(det) {
    const horas = Number(det.horas_uso);
    if (det.unidad_tiempo === "h/año") {
      return { horas, conversion: null };
    }
    const dias = Number(det.dias_anio);
    return {
      horas: horas * dias,
      conversion: { magnitud: "Tiempo de uso", de: `${num(horas)} h/día × ${num(dias)} días/año`, a: `${num(horas * dias)} h/año`, regla: "h/año = h/día × días/año" }
    };
  }

  /* Consumo eléctrico anual de un registro de iluminación */
  function calcularConsumo(det) {
    const conversiones = [];
    const pasos = [];
    const cantidad = Number(det.cantidad);
    const simult = det.factor_simultaneidad == null || det.factor_simultaneidad === "" ? 100 : Number(det.factor_simultaneidad);
    const unidadPot = det.unidad_potencia || "W";

    const potenciaW = convertir(det.potencia_unitaria, unidadPot, "W");
    if (unidadPot !== "W") {
      conversiones.push({ magnitud: "Potencia unitaria", de: `${num(det.potencia_unitaria)} ${unidadPot}`, a: `${num(potenciaW)} W`, regla: `1 ${unidadPot} = ${UNIDADES[unidadPot].aBase} W` });
    }
    const potenciaInstaladaKW = convertir(cantidad * potenciaW, "W", "kW");
    conversiones.push({ magnitud: "Potencia instalada", de: `${num(cantidad * potenciaW)} W`, a: `${num(potenciaInstaladaKW)} kW`, regla: "kW = W ÷ 1000" });

    const t = horasAnuales(det);
    if (t.conversion) conversiones.push(t.conversion);

    pasos.push({ descripcion: "Potencia instalada", formula: `${num(cantidad)} luminarias × ${num(potenciaW)} W ÷ 1000`, resultado: `${num(r(potenciaInstaladaKW, 4))} kW` });
    pasos.push({ descripcion: "Horas de uso anuales", formula: t.conversion ? t.conversion.regla : "dato ingresado en h/año", resultado: `${num(t.horas)} h/año` });

    const kwh = potenciaInstaladaKW * t.horas * (simult / 100);
    pasos.push({ descripcion: "Consumo eléctrico anual", formula: `${num(r(potenciaInstaladaKW, 4))} kW × ${num(t.horas)} h × ${num(simult)} % simultaneidad`, resultado: `${num(r(kwh, 3))} kWh` });

    return {
      kwh: r(kwh),
      potencia_unitaria_w: r(potenciaW),
      potencia_instalada_kw: r(potenciaInstaladaKW),
      horas_anio: r(t.horas, 2),
      factor_simultaneidad: simult,
      conversiones,
      pasos
    };
  }

  /* Normaliza el factor de emisión a kgCO2e/kWh */
  function normalizarFactor(factor) {
    const mult = UNIDADES_FACTOR[factor.unidad];
    if (mult == null) throw new Error(`Unidad de factor no soportada: ${factor.unidad}`);
    const valor = Number(factor.valor) * mult;
    const conversion = factor.unidad === "kgCO2e/kWh" ? null : {
      magnitud: "Factor de emisión", de: `${num(factor.valor)} ${factor.unidad}`, a: `${num(r(valor))} kgCO2e/kWh`,
      regla: factor.unidad === "tCO2e/MWh" ? "1 tCO2e/MWh = 1000 kg / 1000 kWh = 1 kgCO2e/kWh" : `× ${mult}`
    };
    return { valor_kg_kwh: valor, conversion };
  }

  /* Emisiones de un dato de actividad (Alcance 2 – método basado en ubicación) */
  function calcularEmisiones(actividad, factor, contexto = {}) {
    const det = actividad.detalle_iluminacion || actividad;
    const consumo = calcularConsumo(det);
    const fe = normalizarFactor(factor);
    const conversiones = consumo.conversiones.slice();
    if (fe.conversion) conversiones.push(fe.conversion);

    const kg = consumo.kwh * fe.valor_kg_kwh;
    const t = convertir(kg, "kgCO2e", "tCO2e");
    conversiones.push({ magnitud: "Emisiones", de: `${num(r(kg, 3))} kgCO2e`, a: `${num(r(t, 6))} tCO2e`, regla: "t = kg ÷ 1000" });

    const pasos = consumo.pasos.concat([
      { descripcion: "Aplicación del factor de emisión", formula: `${num(r(consumo.kwh, 3))} kWh × ${num(r(fe.valor_kg_kwh))} kgCO2e/kWh`, resultado: `${num(r(kg, 3))} kgCO2e` },
      { descripcion: "Conversión a toneladas", formula: `${num(r(kg, 3))} kgCO2e ÷ 1000`, resultado: `${num(r(t, 6))} tCO2e` }
    ]);

    return {
      id_actividad: actividad.id_actividad ?? null,
      id_factor: factor.id_factor ?? null,
      alcance: 2,
      consumo_kwh: r(consumo.kwh, 4),
      emisiones_kg_co2e: r(kg, 4),
      emisiones_t_co2e: r(t, 6),
      version_metodologia: VERSION,
      fecha_calculo: new Date().toISOString(),
      trazabilidad: {
        metodo: "Alcance 2 – basado en ubicación (GHG Protocol Scope 2 Guidance)",
        formula_general: "E [kgCO2e] = (cantidad × P_unitaria[W] ÷ 1000) × horas_año × simultaneidad × FE [kgCO2e/kWh]",
        entradas: {
          edificio: contexto.edificio || null,
          sector: contexto.sector || null,
          periodo: contexto.periodo || null,
          tipo_luminaria: contexto.tipo_luminaria || null,
          cantidad: Number(det.cantidad),
          potencia_unitaria: Number(det.potencia_unitaria),
          unidad_potencia: det.unidad_potencia || "W",
          horas_uso: Number(det.horas_uso),
          unidad_tiempo: det.unidad_tiempo,
          dias_anio: det.unidad_tiempo === "h/año" ? null : Number(det.dias_anio),
          factor_simultaneidad: consumo.factor_simultaneidad
        },
        factor_emision: {
          id_factor: factor.id_factor ?? null,
          valor_original: Number(factor.valor),
          unidad_original: factor.unidad,
          valor_normalizado_kg_kwh: r(fe.valor_kg_kwh, 6),
          fuente: factor.fuente_nombre || factor.fuente || null,
          anio: factor.anio || null
        },
        conversiones,
        pasos
      }
    };
  }

  /* Emisiones evitadas por un recambio de luminarias */
  function calcularEvitadas(p, factor) {
    const horas = horasAnuales(p);
    const base = calcularConsumo({ cantidad: p.cantidad_base, potencia_unitaria: p.potencia_base, unidad_potencia: "W", horas_uso: p.horas_uso, unidad_tiempo: p.unidad_tiempo, dias_anio: p.dias_anio });
    const mejorado = calcularConsumo({ cantidad: p.cantidad_nueva, potencia_unitaria: p.potencia_nueva, unidad_potencia: "W", horas_uso: p.horas_uso, unidad_tiempo: p.unidad_tiempo, dias_anio: p.dias_anio });
    const fe = normalizarFactor(factor);
    const ahorroKwh = Math.max(0, base.kwh - mejorado.kwh);
    const kg = ahorroKwh * fe.valor_kg_kwh;
    return {
      consumo_base_kwh: r(base.kwh, 4),
      consumo_mejorado_kwh: r(mejorado.kwh, 4),
      ahorro_kwh: r(ahorroKwh, 4),
      reduccion_pct: base.kwh > 0 ? r((ahorroKwh / base.kwh) * 100, 2) : 0,
      kg_co2e_evitados: r(kg, 4),
      t_co2e_evitados: r(kg / 1000, 6),
      trazabilidad: {
        metodo: "Emisiones evitadas = (consumo escenario base − consumo escenario mejorado) × FE",
        horas_anio: horas.horas,
        factor_emision: { id_factor: factor.id_factor ?? null, valor_original: Number(factor.valor), unidad_original: factor.unidad, valor_normalizado_kg_kwh: r(fe.valor_kg_kwh, 6), anio: factor.anio || null },
        pasos: [
          { descripcion: "Consumo escenario base", formula: `${num(p.cantidad_base)} × ${num(p.potencia_base)} W ÷ 1000 × ${num(horas.horas)} h`, resultado: `${num(r(base.kwh, 2))} kWh` },
          { descripcion: "Consumo escenario mejorado", formula: `${num(p.cantidad_nueva)} × ${num(p.potencia_nueva)} W ÷ 1000 × ${num(horas.horas)} h`, resultado: `${num(r(mejorado.kwh, 2))} kWh` },
          { descripcion: "Ahorro energético", formula: "base − mejorado", resultado: `${num(r(ahorroKwh, 2))} kWh` },
          { descripcion: "Emisiones evitadas", formula: `${num(r(ahorroKwh, 2))} kWh × ${num(r(fe.valor_kg_kwh))} kgCO2e/kWh`, resultado: `${num(r(kg, 2))} kgCO2e` }
        ]
      }
    };
  }

  return { VERSION, UNIDADES, UNIDADES_FACTOR, convertir, horasAnuales, calcularConsumo, normalizarFactor, calcularEmisiones, calcularEvitadas };
})();
