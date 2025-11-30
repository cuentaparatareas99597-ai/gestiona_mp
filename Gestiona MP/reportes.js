const app = Vue.createApp({
data() {
  return {
    totalCaja: 0,
    gananciaDia: 0,
    gananciaMes: 0,
    gananciaMesTexto: '---',
    tooltipMes: false,
    fechaGanancia: new Date().toISOString().slice(0,10),
    intervalo: null
  };
},
mounted() {
  this.cargarReportes();
  this.intervalo = setInterval(this.cargarReportes, 10000); // refresca cada 10s
},
methods: {
  formato(num) {
    return Number(num).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  },
  cargarReportes() {
    // Dinero en caja (inversión)
    fetch("api.php?action=dashboard")
      .then(r => r.json())
      .then(data => {
        this.totalCaja = data.total_caja ?? 0;
        if (data.ganancia_hoy !== undefined) {
          this.gananciaDia = data.ganancia_hoy;
        }
      })
      .catch(() => { this.totalCaja = 0; });

    // Ganancia del día (según fecha seleccionada)
    this.cargarGananciaDia();

    // Ganancia del mes
    fetch("api.php?action=ganancia_mes")
      .then(r => r.json())
      .then(data => {
        if (data.ganancia_mes === null || data.ganancia_mes === undefined) {
          this.gananciaMesTexto = '---';
        } else {
          this.gananciaMes = Number(data.ganancia_mes) || 0;
          this.gananciaMesTexto = this.formato(this.gananciaMes);
        }
      })
      .catch(() => { this.gananciaMesTexto = '---'; });
  },
  cargarGananciaDia() {
    if (!this.fechaGanancia) return;
    fetch(`api.php?action=ganancia_fecha&fecha=${this.fechaGanancia}`)
      .then(r => r.json())
      .then(data => {
        this.gananciaDia = Number(data.ganancia) || 0;
      })
      .catch(() => { this.gananciaDia = 0; });
  },
  mostrarTooltipMes() {
    this.tooltipMes = true;
  },
  ocultarTooltipMes() {
    this.tooltipMes = false;
  }
}
});
app.mount("#appVue");