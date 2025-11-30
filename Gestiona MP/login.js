const app = Vue.createApp({
    data() {
        return {
            usuario: "",
            password: ""
        };
    },

    methods: {
        mostrarAlerta(icono, texto) {
            Swal.fire({
                icon: icono,
                text: texto,
                confirmButtonText: "OK",
                confirmButtonColor: "#1565c0",   // azul corporativo
                background: "#eaf3ff",           // azul muy claro
                color: "#0a2e46"                 // azul oscuro
            });
        },

        login() {
            if (this.password.length !== 7) {
                this.mostrarAlerta("warning", "La contraseña debe tener exactamente 7 dígitos");
                return;
            }

            fetch("api.php?action=login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    usuario: this.usuario,
                    password: this.password
                })
            })
            .then(res => res.json())
            .then(r => {
                if (r.status === "ok") {

                    Swal.fire({
                        icon: "success",
                        title: "Acceso concedido",
                        text: "Bienvenido al sistema.",
                        confirmButtonColor: "#1565c0",
                        background: "#eaf3ff",
                        color: "#0a2e46"
                    }).then(() => {
                        localStorage.setItem("usuario", this.usuario);
                        window.location = "menú.html";
                    });

                } else {
                    this.mostrarAlerta("error", "Usuario o contraseña incorrectos");
                }
            })
            .catch(() => {
                this.mostrarAlerta("error", "Error de conexión");
            });
        }
    }
});

app.mount("#appVue");

function verContraseña() {
    const input = document.getElementById("passInput");
    input.type = input.type === "password" ? "text" : "password";
}
