// El envío del formulario es público; la lectura exige cuenta activa de personal.
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const consultasController = require('../controllers/consultas.controller');

const router = express.Router();
const personalAutorizado = [requireAuth, requireRole('administrador', 'ventas', 'produccion')];

router.post('/', consultasController.crear);
router.get('/', ...personalAutorizado, consultasController.listar);

module.exports = router;
