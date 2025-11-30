const app = Vue.createApp({
  data() {
    return {
      ventas: [],
      fechaFiltro: ""
    };
  },
  mounted() {
    this.cargarVentas();
  },
  computed: {
    ventasPorDia() {
      const agrupadas = {};
      this.ventas.forEach(ticket => {
        const fecha = ticket.fecha_venta;
        if (!agrupadas[fecha]) agrupadas[fecha] = [];
        agrupadas[fecha].push(ticket);
      });
      return Object.fromEntries(
        Object.entries(agrupadas).sort((a,b) => new Date(b[0]) - new Date(a[0]))
      );
    },
    ventasFiltradasPorDia() {
      if (!this.fechaFiltro) return this.ventasPorDia;
      return { [this.fechaFiltro]: this.ventasPorDia[this.fechaFiltro] || [] };
    }
  },
  methods: {
    cargarVentas() {
      fetch("api.php?action=detalle_ventas")
        .then(r => r.json())
        .then(data => this.ventas = data);
    },
    eliminarTicket(id) {
      if (!confirm("¿Eliminar este ticket?")) return;
      fetch(`api.php?action=eliminar_ticket&id=${id}`)
        .then(r => r.json())
        .then(res => {
          if (res.status === "ok") this.cargarVentas();
        });
    },
    formatoPrecio(v) {
      return Number(v).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
    },
    totalPorTicket(ticket) {
      return ticket.productos.reduce((acc, p) => acc + parseFloat(p.total), 0);
    },
    totalPorDia(ticketsDia) {
      return ticketsDia.reduce((acc, t) => acc + this.totalPorTicket(t), 0);
    },
    gananciaProducto(prod) {
  const costoT = prod.precio_compra * prod.cantidad;
  const ventaT = prod.total;
  return ventaT - costoT;
},

gananciaTicket(ticket) {
  return ticket.productos.reduce((acc, p) => acc + this.gananciaProducto(p), 0);
},

gananciaPorDia(ticketsDia) {
  return ticketsDia.reduce((acc, t) => acc + this.gananciaTicket(t), 0);
},

  }
});
app.mount("#appVue");