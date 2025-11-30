const app = Vue.createApp({
  data() {
    return {
      productos: [],
      filtroTipo: "",
      productoSeleccionado: "",

      venta: {
        id_producto: "",
        nombre: "",
        cantidad: 1,
        precio_unitario: 0,
        total: 0,
        unidad_medida: "pieza"
      },

      stockDisponible: 0,
      productosFiltrados: [],
      carrito: []
    };
  },

  computed: {
    totalCarrito() {
      return this.carrito.reduce((sum, p) => sum + p.total, 0);
    }
  },

  mounted() {
    this.cargarProductos();
  },

  watch: {
    filtroTipo() {
      this.filtrarProductos();
    }
  },

  methods: {
    formatoPrecio(v) {
      return Number(v).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN"
      });
    },

    cargarProductos() {
      fetch("api.php?action=list")
        .then(r => r.json())
        .then(data => {
          this.productos = data;
          this.productosFiltrados = data;
        });
    },

    filtrarProductos() {
      if (this.filtroTipo === "") {
        this.productosFiltrados = this.productos;
      } else {
        this.productosFiltrados = this.productos.filter(
          p => p.tipo === this.filtroTipo
        );
      }

      this.productoSeleccionado = "";
      this.cancelarVenta();
    },

    asignarProducto() {
      const p = this.productos.find(
        prod => prod.id_producto == this.productoSeleccionado
      );

      if (!p) return;

      this.venta.id_producto = p.id_producto;
      this.venta.nombre = p.nombre;
      this.venta.unidad_medida = p.unidad_medida;
      this.venta.precio_unitario = parseFloat(p.precio);
      this.stockDisponible = parseFloat(p.stock);

      this.venta.cantidad = 1;
      this.calcularTotal();
    },

    calcularTotal() {
      if (this.venta.cantidad > this.stockDisponible) {
        Swal.fire({
          icon: "error",
          title: "Stock insuficiente",
          text: "La cantidad supera el stock disponible",
          background: "#E3F2FD",
          iconColor: "#1A73E8",
          confirmButtonColor: "#0D47A1"
        });
        this.venta.cantidad = this.stockDisponible;
      }

      if (this.venta.unidad_medida === "pieza") {
        this.venta.cantidad = Math.floor(this.venta.cantidad);
      }

      this.venta.total = this.venta.cantidad * this.venta.precio_unitario;
    },

    agregarAlCarrito() {
      if (!this.venta.id_producto) {
        Swal.fire({
          icon: "warning",
          title: "Selecciona un producto",
          background: "#E3F2FD",
          iconColor: "#1A73E8",
          confirmButtonColor: "#1A73E8"
        });
        return;
      }

      if (this.venta.cantidad <= 0) {
        Swal.fire({
          icon: "warning",
          title: "Cantidad inválida",
          text: "La cantidad debe ser mayor a cero",
          background: "#E3F2FD",
          iconColor: "#1A73E8",
          confirmButtonColor: "#1A73E8"
        });
        return;
      }

      const existente = this.carrito.find(
        p => p.id_producto === this.venta.id_producto
      );

      if (existente) {
        const nuevaCantidad = existente.cantidad + this.venta.cantidad;

        if (nuevaCantidad > this.stockDisponible) {
          Swal.fire({
            icon: "error",
            title: "Cantidad excedida",
            text: "La cantidad total supera el stock disponible",
            background: "#E3F2FD",
            iconColor: "#1A73E8",
            confirmButtonColor: "#0D47A1"
          });
          return;
        }

        existente.cantidad = nuevaCantidad;
        existente.total = existente.cantidad * existente.precio_unitario;
      } else {
        this.carrito.push({ ...this.venta });
      }

      this.cancelarVenta();
    },

    eliminarDelCarrito(index) {
      this.carrito.splice(index, 1);
    },

    registrarVentaCarrito() {
      if (!this.carrito.length) {
        Swal.fire({
          icon: "warning",
          title: "Carrito vacío",
          text: "No hay productos en el carrito",
          background: "#E3F2FD",
          iconColor: "#1A73E8",
          confirmButtonColor: "#1A73E8"
        });
        return;
      }

      const ventaCompleta = {
        total: this.totalCarrito,
        fecha: new Date().toISOString().slice(0, 10),
        productos: this.carrito
      };

      fetch("api.php?action=venta_ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ventaCompleta)
      })
        .then(r => r.json())
        .then(res => {
          if (res.status === "ok") {
            Swal.fire({
              icon: "success",
              title: "Venta registrada correctamente",
              background: "#E3F2FD",
              iconColor: "#1A73E8",
              confirmButtonColor: "#1A73E8"
            });
            this.carrito = [];
            this.cargarProductos();
          } else {
            Swal.fire({
              icon: "error",
              title: "Error",
              text: "Error: " + res.error,
              background: "#E3F2FD",
              iconColor: "#1A73E8",
              confirmButtonColor: "#0D47A1"
            });
          }
        })
        .catch(() =>
          Swal.fire({
            icon: "error",
            title: "Error de conexión",
            text: "No se pudo conectar con el servidor",
            background: "#E3F2FD",
            iconColor: "#1A73E8",
            confirmButtonColor: "#0D47A1"
          })
        );
    },

    cancelarVenta() {
      this.venta = {
        id_producto: "",
        nombre: "",
        cantidad: 1,
        precio_unitario: 0,
        total: 0,
        unidad_medida: "pieza"
      };

      this.stockDisponible = 0;
    },

    cancelarVentaCompleta() {
      Swal.fire({
        title: "¿Cancelar venta completa?",
        text: "Se borrarán todos los productos del carrito.",
        icon: "warning",
        background: "#E3F2FD",
        iconColor: "#1A73E8",
        showCancelButton: true,
        confirmButtonColor: "#0D47A1",
        cancelButtonColor: "#64B5F6",
        confirmButtonText: "Sí, cancelar",
        cancelButtonText: "No"
      }).then((result) => {
        if (result.isConfirmed) {
          this.carrito = [];
          this.cancelarVenta();

          Swal.fire({
            icon: "success",
            title: "Venta cancelada",
            background: "#E3F2FD",
            iconColor: "#1A73E8",
            confirmButtonColor: "#1A73E8"
          });
        }
      });
    }
  }
});

app.mount("#appVue");
