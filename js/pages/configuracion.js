/* Configuración de la conexión con la API central */
document.addEventListener("DOMContentLoaded", () => {
  const { $, esc, toast } = CampusCO2.ui;
  const config = CampusCO2.config;
  const FIELDS = ["baseUrl", "token", "idUniversidad", "codigoDimension", "categoriaFactor", "timeoutMs"];

  function fill() {
    const c = config.get();
    $("useMock").value = String(c.useMock);
    FIELDS.forEach((f) => ($(f).value = c[f]));
    renderEndpoints();
  }

  function renderEndpoints() {
    const base = $("baseUrl").value.replace(/\/$/, "");
    $("ep-table").innerHTML = Object.entries(config.ENDPOINTS).map(([k, ep]) =>
      `<tr><td>${esc(k)}</td><td><span class="badge ${ep.method === "GET" ? "" : ep.method === "DELETE" ? "err" : "ok"}">${ep.method}</span></td><td><code>${esc(base + ep.path)}</code></td></tr>`).join("");
  }
  $("baseUrl").addEventListener("input", renderEndpoints);

  function read() {
    return {
      useMock: $("useMock").value === "true",
      baseUrl: $("baseUrl").value.trim(),
      token: $("token").value.trim(),
      idUniversidad: Number($("idUniversidad").value) || 1,
      codigoDimension: $("codigoDimension").value.trim(),
      categoriaFactor: $("categoriaFactor").value.trim(),
      timeoutMs: Number($("timeoutMs").value) || 15000
    };
  }

  function validUrl() {
    const ok = /^https?:\/\/[^\s]+$/i.test($("baseUrl").value.trim());
    $("baseUrl").closest(".field").classList.toggle("invalid", !ok);
    return ok;
  }

  $("cfg-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validUrl()) return;
    config.save(read());
    toast("Configuración guardada", "ok");
    setTimeout(() => location.reload(), 500);
  });

  $("btn-defaults").addEventListener("click", () => { config.reset(); fill(); toast("Valores por defecto restaurados"); });

  $("btn-test").addEventListener("click", async () => {
    if (!validUrl()) return;
    const prev = config.get();
    config.save(read());
    const msg = $("cfg-message");
    msg.className = "form-message";
    msg.textContent = "Probando…";
    try {
      const t0 = performance.now();
      const [dims, periodos] = await Promise.all([CampusCO2.api.request("dimensiones"), CampusCO2.api.request("periodos")]);
      msg.className = "form-message ok";
      msg.textContent = `Conexión correcta (${Math.round(performance.now() - t0)} ms): ${dims.length} dimensiones y ${periodos.length} períodos recibidos.`;
    } catch (err) {
      msg.className = "form-message err";
      msg.textContent = `Falló la conexión: ${err.message}${err.status ? ` (HTTP ${err.status})` : ""}.`;
    } finally {
      config.save(prev); // la prueba no persiste cambios hasta "Guardar"
    }
  });

  $("btn-export").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(CampusCO2.mock.exportar(), null, 2)], { type: "application/json" }));
    a.download = "campusco2_iluminacion_demo.json";
    a.click();
  });

  $("btn-reset").addEventListener("click", () => {
    if (!confirm("¿Restablecer los datos de demostración? Se perderán los registros cargados en modo simulado.")) return;
    CampusCO2.mock.reset();
    toast("Datos de ejemplo restablecidos", "ok");
  });

  fill();
});
