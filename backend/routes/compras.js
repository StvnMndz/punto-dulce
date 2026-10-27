const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const comprasController = require('../controllers/compras.controller');

const router = express.Router();
router.get('/', requireAuth, requireRole('administrador', 'produccion'), comprasController.listar);
router.post('/', requireAuth, requireRole('administrador', 'produccion'), comprasController.registrar);
router.put('/:id', requireAuth, requireRole('administrador', 'produccion'), comprasController.actualizarArticulo);
router.delete('/:id', requireAuth, requireRole('administrador', 'produccion'), comprasController.eliminarArticulo);

module.exports = router;
