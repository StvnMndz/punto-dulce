# Punto Dulce — Sitio web + backend de personal (MySQL)

Proyecto de página web para la repostería "Punto Dulce": catálogo, personalización de tortas, pedidos por delivery/encargo, seguimiento de estado y un **panel de personal con registro/login y roles respaldados por una base de datos MySQL real**.

## Estructura

```
punto-dulce/
├── index.html          → Inicio
├── catalogo.html        → Catálogo de productos + personalización de tortas
├── como-pedir.html       → Explicación de delivery vs. por encargo
├── pedido.html            → Carrito y formulario de pedido
├── seguimiento.html      → Seguimiento del estado de pedidos (vista del cliente)
├── nosotros.html          → Problema, propuesta y modelo de negocio
├── contacto.html           → Datos de contacto y formulario
├── empleado-login.html   → Registro / inicio de sesión del personal (contra el backend)
├── empleado-panel.html   → Panel del personal (productos, ventas, materia prima, pedidos, roles)
├── styles.css              → Estilos compartidos por todas las páginas
├── script.js                → Lógica compartida del front-end
├── backend/                 → Servidor Node.js + Express + MySQL (registro, login y roles del personal)
│   ├── server.js
│   ├── db.js
│   ├── schema.sql
│   ├── package.json
│   ├── .env.example
│   ├── middleware/auth.js
│   └── routes/ (auth.js, empleados.js)
└── README.md
```

## Qué cambió: registro y roles del personal ahora usan MySQL

Antes, las cuentas del personal se guardaban en `localStorage`. Ahora:

- **Cualquier persona puede registrarse** desde "Acceso personal" → pestaña "Registrarme", con nombre, teléfono (opcional), usuario y contraseña.
- **Toda cuenta nueva se crea con rol `pendiente`**. Nadie puede elegir "administrador" ni "ventas" al registrarse.
- Un **administrador** entra al panel, va a la pestaña **"👥 Personal"** y le asigna un rol real a cada cuenta: `Administrador`, `Ventas / Atención` o `Producción` (o la deshabilita).
- Mientras una cuenta esté `pendiente`, esa persona puede iniciar sesión pero **no ve ninguna pestaña del panel**: solo un aviso de que su cuenta está esperando asignación de rol.
- Según el rol asignado, el panel muestra distintas pestañas:
  - **Administrador**: Resumen, Productos, Materia prima, Pedidos y Personal (puede asignar roles a los demás).
  - **Ventas / Atención**: Resumen y Pedidos.
  - **Producción**: Materia prima y Productos.

Todo esto vive en la tabla `empleados` de la base de datos `punto_dulce` en MySQL (contraseñas con hash `bcrypt`, sesiones con JSON Web Token). El resto del sistema (catálogo editable, materia prima, pedidos) sigue guardándose en `localStorage` del navegador, tal como antes — solo el registro/login/roles del personal se movió a una base de datos real.

## Cómo levantar todo en VS Code

Necesitas **dos cosas corriendo a la vez**: el backend (servidor + MySQL) y el sitio (Live Server). Usa dos terminales.

### 1. Instala y prepara MySQL

- Instala MySQL Server si no lo tienes (MySQL Installer en Windows, `brew install mysql` en Mac, o el gestor de paquetes de tu Linux).
- Asegúrate de que el servicio esté corriendo.
- Desde una terminal, crea la base de datos y la cuenta admin de arranque ejecutando el script incluido:

  ```bash
  mysql -u root -p < backend/schema.sql
  ```

  Esto crea la base `punto_dulce`, la tabla `empleados`, y una cuenta administradora de arranque:
  **usuario `admin`, contraseña `admin123`** (necesaria para poder empezar a asignar roles a las cuentas que se registren después). Cámbiale la contraseña apenas puedas.

- (Recomendado) Crea un usuario de MySQL dedicado en vez de usar `root` directamente:

  ```sql
  CREATE USER 'punto_dulce_user'@'localhost' IDENTIFIED BY 'una_clave_segura';
  GRANT ALL PRIVILEGES ON punto_dulce.* TO 'punto_dulce_user'@'localhost';
  FLUSH PRIVILEGES;
  ```

### 2. Configura y corre el backend (Terminal 1, en VS Code)

```bash
cd backend
cp .env.example .env
```

Edita `.env` con los datos de tu MySQL (usuario, contraseña, nombre de base) y cambia `JWT_SECRET` por una cadena larga y aleatoria.

```bash
npm install
npm start
```

Deberías ver: `Punto Dulce Backend escuchando en http://localhost:4000`.
Pruébalo abriendo `http://localhost:4000/api/health` en el navegador — debe responder `{"ok":true,...}`.

### 3. Abre el sitio (Terminal 2 / extensión Live Server)

1. Abre la carpeta `punto-dulce/` completa en VS Code.
2. Instala la extensión **Live Server** y haz clic en "Go Live" sobre `index.html`.
3. Ve a "Acceso personal" → "Registrarme" para crear una cuenta de prueba, o entra directo con `admin` / `admin123`.
4. Con la cuenta `admin`, ve a la pestaña **Personal** y asígnale un rol a la cuenta que acabas de registrar.

> Si el front-end corre en un puerto distinto a 5500 o en otra máquina, no hay problema: el backend ya tiene CORS abierto. Si mueves el backend a otra URL/puerto, actualiza la constante `API_BASE` al inicio de `script.js`.

## Notas técnicas

- HTML, CSS y JavaScript puro en el front-end, sin frameworks ni build tools.
- Backend: Node.js + Express + `mysql2` (consultas parametrizadas), `bcryptjs` para hashear contraseñas y `jsonwebtoken` para las sesiones.
- El carrito, los pedidos, el catálogo editable y la materia prima se guardan en `localStorage` del navegador. **Solo** el registro, login y roles del personal usan MySQL a través del backend en `backend/`.
- Es un prototipo educativo: no incluye HTTPS, límites de intentos de login, recuperación de contraseña ni la arquitectura completa en capas (DAO, DTO, etc.) que suele pedirse en un informe formal — quedaría como siguiente paso natural si se lleva a producción.
