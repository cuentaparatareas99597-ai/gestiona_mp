const app = Vue.createApp({
        mounted() {
            // Validar sesión
            if (!localStorage.getItem("usuario")) {
                window.location = "login.html";
            }
        },
        methods: {
            cerrarSesion() {
                localStorage.removeItem("usuario");
                window.location = "login.html";
            }
        }
    });
    app.mount("#appVue");