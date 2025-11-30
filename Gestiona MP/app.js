function mostrarAlerta(mensaje, tipo = "success") {
  const div = document.getElementById("alerta");
  if (!div) return;

  div.className = `alerta-flotante alert-${tipo}`;
  div.textContent = mensaje;

  div.classList.remove("d-none");
  div.classList.add("mostrar");

  setTimeout(() => {
    div.classList.remove("mostrar");
    div.classList.add("d-none");
  }, 2400);
}
const app = Vue.createApp({
  data() {
    return {
      productos: [],
nuevo: {
  nombre: "",
  tipo: "B",
  unidad_medida: "pieza",
  descripcion: "",
  precio: "",
  precio_compra: "",  
  stock: "",
},
      filtroTipo: "",
      busqueda: "",
      editado: {},
      idEliminar: null,
      inputError: "",
    };
  },
  computed: {
  productosFiltrados() {
    return this.productos.filter(p => {
      const coincideNombre = p.nombre.toLowerCase().includes(this.busqueda.toLowerCase());
      const coincideTipo = this.filtroTipo === "" || p.tipo === this.filtroTipo;
      return coincideNombre && coincideTipo;
    });
  }
},
mounted() {
  this.cargarProductos();
},
  methods: {
    tipoTexto(codigo) {
      return codigo === "B" ? "Base" :
             codigo === "C" ? "Concentrado" :
             "Terminado";
    },
    formatoPrecio(valor) {
      return Number(valor).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN"
      });
    },
    cargarProductos() {
      fetch("api.php?action=list")
        .then(res => res.json())
        .then(data => {
          this.productos = data;
        })
        .catch(() => mostrarAlerta("Error al cargar productos", "danger"));
    },
agregarProducto() {
  if (!this.nuevo.nombre || !this.nuevo.tipo || !this.nuevo.unidad_medida || !this.nuevo.descripcion) {
    mostrarAlerta("Todos los campos son obligatorios", "warning");
    return;
  }
  if (this.nuevo.precio === "" || isNaN(this.nuevo.precio) || this.nuevo.precio < 0) {
    mostrarAlerta("Precio inválido", "danger");
    return;
  }
  if (this.nuevo.precio_compra === "" || isNaN(this.nuevo.precio_compra) || this.nuevo.precio_compra < 0) {
  mostrarAlerta("Precio de compra inválido", "danger");
  return;
}
  if (this.nuevo.stock === "" || isNaN(this.nuevo.stock) || this.nuevo.stock < 0) {
    mostrarAlerta("Stock inválido", "danger");
    return;
  }
  // Validación del producto existente
  const existe = this.productos.some(p => p.nombre.toLowerCase() === this.nuevo.nombre.toLowerCase());
  if (existe) {
    mostrarAlerta("Producto ya registrado anteriormente", "warning");
    return;
  }
  this.nuevo.precio = parseFloat(this.nuevo.precio);
  this.nuevo.stock = parseFloat(this.nuevo.stock);
  this.nuevo.precio_compra = parseFloat(this.nuevo.precio_compra);
  fetch("api.php?action=add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(this.nuevo)
  })
    .then(res => res.json())
    .then(r => {
      if (r.status === "ok") {
        mostrarAlerta("Producto agregado", "success");
        this.cargarProductos();
        this.nuevo = { 
  nombre: "", 
  tipo: "B", 
  unidad_medida: "pieza", 
  descripcion: "", 
  precio: "", 
  precio_compra: "",   
  stock: "" 
};

      } else {
        mostrarAlerta("Error al agregar", "danger");
      }
    })
    .catch(() => mostrarAlerta("Error de red", "danger"));
},
abrirModalEditar(prod) {
  this.editado = JSON.parse(JSON.stringify(prod));
this.editado.precio = String(this.editado.precio);
this.editado.precio_compra = String(this.editado.precio_compra);   
this.editado.stock = String(this.editado.stock);


  const modal = new bootstrap.Modal(document.getElementById("modalEditar"));
  modal.show();
},
guardarEdicion() {

  this.inputError = ""; // limpiar errores previos

  // Validación del ID
  if (!this.editado.id_producto) {
    mostrarAlerta("ID inválido", "danger");
    return;
  }

  const original = this.productos.find(p => p.id_producto === this.editado.id_producto);

  // ----- 1. Detectar si no hubo cambios -----
  if (
    original.nombre === this.editado.nombre &&
    original.tipo === this.editado.tipo &&
    original.unidad_medida === this.editado.unidad_medida &&
    Number(original.precio) === Number(this.editado.precio) &&
    Number(original.precio_compra) === Number(this.editado.precio_compra) &&
    Number(original.stock) === Number(this.editado.stock) &&
    original.descripcion === this.editado.descripcion
  ) {
    mostrarAlerta("No se realizó ningún cambio", "warning");
    return;
  }

  // ----- 2. Nombre obligatorio -----
  if (!this.editado.nombre || this.editado.nombre.trim() === "") {
    this.inputError = "nombre";
    mostrarAlerta("El nombre es obligatorio", "warning");
    return;
  }

  // ----- 3. Validar nombre duplicado -----
  const duplicado = this.productos.some(
    p => p.nombre.toLowerCase() === this.editado.nombre.toLowerCase() &&
         p.id_producto !== this.editado.id_producto
  );

  if (duplicado) {
    this.inputError = "nombre";
    mostrarAlerta("Ya existe un producto con ese nombre", "danger");
    return;
  }

  // ----- 4. Validación de campos numéricos -----
  if (isNaN(this.editado.precio) || this.editado.precio === "" || this.editado.precio < 0) {
    mostrarAlerta("Precio inválido", "danger");
    return;
  }

  if (isNaN(this.editado.precio_compra) || this.editado.precio_compra === "" || this.editado.precio_compra < 0) {
    mostrarAlerta("Precio de compra inválido", "danger");
    return;
  }

  if (isNaN(this.editado.stock) || this.editado.stock === "" || this.editado.stock < 0) {
    mostrarAlerta("Stock inválido", "danger");
    return;
  }

  // ----- 5. Convertir a número -----
  this.editado.precio = parseFloat(this.editado.precio);
  this.editado.precio_compra = parseFloat(this.editado.precio_compra);
  this.editado.stock = parseFloat(this.editado.stock);

  // ----- 6. Guardar en la API -----
  fetch("api.php?action=edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(this.editado)
  })
    .then(res => res.json())
    .then(r => {
      if (r.status === "ok") {
        mostrarAlerta("Producto actualizado", "success");
        this.cargarProductos();

        const modal = bootstrap.Modal.getInstance(document.getElementById("modalEditar"));
        if (modal) modal.hide();
      } else {
        mostrarAlerta("Error al actualizar", "danger");
      }
    })
    .catch(() => mostrarAlerta("Error de red", "danger"));
},
confirmarEliminar(id) {
  this.idEliminar = id;
  const modal = new bootstrap.Modal(document.getElementById("modalEliminar"));
  modal.show();
},
eliminarProductoConfirmado() {
  console.log("ID a eliminar:", this.idEliminar);
  fetch(`api.php?action=delete&id=${this.idEliminar}`)
    .then(res => res.json())
    .then(r => {
      if (r.status === "ok") {
        mostrarAlerta("Producto eliminado", "success");
        this.cargarProductos();
      } else {
        mostrarAlerta("Error al eliminar", "danger");
      }
    })
    .catch(() => mostrarAlerta("Error de red", "danger"));

  const modal = bootstrap.Modal.getInstance(document.getElementById("modalEliminar"));
  if (modal) modal.hide();
  this.idEliminar = null;
}
  }
});
app.mount("#appProductos");