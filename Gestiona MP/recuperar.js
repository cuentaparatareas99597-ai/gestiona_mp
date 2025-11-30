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
                confirmButtonColor: "#1565c0",
                background: "#eaf3ff",
                color: "#0a2e46"
            });
        },

        cambiarPass() {

            // 1️⃣ Validar campos vacíos
            if (!this.usuario || !this.password) {
                this.mostrarAlerta("warning", "Completa todos los campos.");
                return;
            }

            // 2️⃣ Validar longitud de password
            if (this.password.length !== 7) {
                this.mostrarAlerta("warning", "La contraseña debe tener exactamente 7 dígitos.");
                return;
            }

            // 3️⃣ Enviar al servidor
            fetch("api.php?action=changePass", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    usuario: this.usuario,
                    password: this.password
                })
            })
            .then(res => res.json())
            .then(r => {

                // Usuario no existe
                if (r.status === "no_user") {
                    this.mostrarAlerta("error", "El usuario no existe.");
                    return;
                }

                // Todo salió bien
                if (r.status === "ok") {
                    Swal.fire({
                        icon: "success",
                        title: "Contraseña actualizada",
                        text: "Tu contraseña se cambió correctamente.",
                        confirmButtonColor: "#1565c0",
                        background: "#eaf3ff",
                        color: "#0a2e46"
                    }).then(() => {
                        window.location = "login.html";
                    });
                    return;
                }

                // Error general
                this.mostrarAlerta("error", "Error al actualizar la contraseña.");
            })
            .catch(() => {
                this.mostrarAlerta("error", "Error de conexión.");
            });
        }
    }
});

app.mount("#appVue");

function verContraseña() {
    const input = document.getElementById("passInput");
    input.type = input.type === "password" ? "text" : "password";
}
