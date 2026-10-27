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
│   ├── daos/ (acceso a datos por entidad)
│   ├── controllers/ (lógica de solicitudes)
│   └── routes/ (definición de endpoints)
└── README.md
```

## Qué cambió: registro y roles del personal ahora usan MySQL

Antes, las cuentas del personal se guardaban en `localStorage`. Ahora:

- **Cualquier persona puede registrarse** desde "Acceso personal" → pestaña "Registrarme", con nombre, teléfono (opcional), usuario y contraseña.
- **Toda cuenta nueva se crea con rol `pendiente`**. Nadie puede elegir "administrador" ni "ventas" al registrarse.
- Un **administrador** entra al panel, va a la pestaña **"👥 Personal"** y le asigna un rol real a cada cuenta: `Administrador`, `Ventas / Atención` o `Almacén / Producción` (o la deshabilita).
- Mientras una cuenta esté `pendiente`, esa persona puede iniciar sesión pero **no ve ninguna pestaña del panel**: solo un aviso de que su cuenta está esperando asignación de rol.
- Según el rol asignado, el panel muestra distintas pestañas:
  - **Administrador**: Resumen, Ventas, Productos, Materia prima, Pedidos y Personal.
  - **Ventas / Atención**: Resumen, Ventas y Pedidos; puede registrar ventas, filtrar el historial semanal y avanzar pedidos.
  - **Almacén / Producción**: Materia prima, órdenes de compra y productos; tiene búsqueda y alertas de stock bajo.

Las cuentas del personal y la operación del panel (productos, insumos, compras, pedidos y ventas) viven en MySQL. Las contraseñas se guardan con hash `bcrypt` y las sesiones usan JSON Web Token. El carrito del cliente continúa en `localStorage`.

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
- El carrito se guarda en `localStorage`; las cuentas del personal, productos, insumos, compras, ventas y pedidos se guardan en MySQL a través del backend.
- Es un prototipo educativo: no incluye HTTPS, límites de intentos de login ni recuperación de contraseña.

## Arquitectura MVC y DAO (backend)

El backend aplica MVC/DAO a autenticación, empleados, productos, insumos, compras, ventas y pedidos:

```
routes/       Define URLs y middlewares; envía cada solicitud al controlador.
controllers/  Valida la solicitud, aplica reglas del negocio y arma la respuesta JSON.
daos/         Ejecuta consultas SQL y devuelve registros; no conoce Express.
db.js         Configura el pool de MySQL desde variables de entorno.
```

El flujo de una petición es `Ruta → Controlador → DAO → MySQL`; la respuesta vuelve del controlador al cliente como JSON (vista de la API). Cada entidad cuenta con su DAO (`empleado`, `producto`, `insumo`, `compra`, `venta` y `pedido`). Las rutas solo conectan endpoints y middlewares con sus controladores; las consultas SQL se mantienen en los DAOs.

Para conectar el backend, copia `backend/.env.example` a `backend/.env` y configura `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y `DB_SSL` según tu servidor. El archivo `.env` no debe compartirse ni subirse al repositorio.

Si la tabla `ventas` ya existía antes de esta versión, agrega la columna usada para relacionar una venta con su pedido con `ALTER TABLE ventas ADD COLUMN pedido_id VARCHAR(12) NULL;`.

El panel de ventas permite registrar, buscar, actualizar y eliminar ventas; se puede filtrar por fecha y forma de pago, abrir el detalle de cada operación y exportar el resultado filtrado como PDF desde la ventana de impresión. Almacén permite administrar productos e insumos, gestionar compras con ajuste de stock, filtrar por fecha, artículo, tienda o responsable y recibir alertas al alcanzar el stock mínimo o agotarse. El panel también alerta sobre pedidos pendientes por más de 24 horas y entregas próximas. Pedidos tiene filtros de búsqueda, estado y tipo; el diseño se adapta a pantallas móviles.
