require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const empleadosRoutes = require('./routes/empleados');
const insumosRoutes = require('./routes/insumos');
const productosRoutes = require('./routes/productos');
const comprasRoutes = require('./routes/compras');

const app = express();

app.use(cors({
  origin: 'https://punto-dulce.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    servicio: 'Punto Dulce Backend'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/empleados', empleadosRoutes);
app.use('/api/insumos', insumosRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/compras', comprasRoutes);

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
