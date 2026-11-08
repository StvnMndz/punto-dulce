// Configura el servidor Express, middleware y rutas principales del backend.
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const empleadosRoutes = require('./routes/empleados');
const insumosRoutes = require('./routes/insumos');
const productosRoutes = require('./routes/productos');
const comprasRoutes = require('./routes/compras');
const ventasRoutes = require('./routes/ventas');
const pedidosRoutes = require('./routes/pedidos');

const app = express();

// Permite que el sitio público desplegado en Render consuma esta API.
app.use(cors({
  origin: 'https://punto-dulce.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Convierte el cuerpo JSON de cada solicitud en req.body.
app.use(express.json());

// Endpoint sencillo para comprobar que el servicio está activo.
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    servicio: 'Punto Dulce Backend'
  });
});

// Conecta cada grupo de endpoints con sus rutas y controladores.
app.use('/api/auth', authRoutes);
app.use('/api/empleados', empleadosRoutes);
app.use('/api/insumos', insumosRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/pedidos', pedidosRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada'
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(
    `Punto Dulce Backend escuchando en http://localhost:${PORT}`
  );
});
