const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const empleadosController = require('../controllers/empleados.controller');

const router = express.Router();
router.get('/', requireAuth, requireRole('administrador'), empleadosController.listar);
router.put('/:id/rol', requireAuth, requireRole('administrador'), empleadosController.cambiarRol);
router.put('/:id/estado', requireAuth, requireRole('administrador'), empleadosController.cambiarEstado);

module.exports = router;
