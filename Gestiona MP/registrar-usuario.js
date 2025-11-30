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
                background: "#eaf3ff",           // azul extra claro
                color: "#0a2e46"                 // azul oscuro
            });
        },

        registrar() {
            if (!this.usuario || !this.password) {
                this.mostrarAlerta("warning", "Completa todos los campos.");
                return;
            }

            if (this.password.length !== 7) {
                this.mostrarAlerta("warning", "La contraseña debe tener exactamente 7 dígitos.");
                return;
            }

            fetch("api.php?action=register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    usuario: this.usuario,
                    password: this.password
                })
            })
            .then(r => r.json())
            .then(res => {
                if (res.status === "ok") {

                    Swal.fire({
                        icon: "success",
                        title: "Usuario creado",
                        text: "El usuario se registró correctamente.",
                        confirmButtonColor: "#1565c0",
                        background: "#eaf3ff",
                        color: "#0a2e46"
                    }).then(() => {
                        window.location = "login.html";
                    });

                } else {
                    this.mostrarAlerta("error", "Error: " + res.error);
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
