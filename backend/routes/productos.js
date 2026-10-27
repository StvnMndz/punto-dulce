const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const productosController = require('../controllers/productos.controller');

const router = express.Router();
router.get('/', productosController.listar);
router.get('/:id', productosController.obtener);
router.post('/', requireAuth, requireRole('administrador', 'produccion'), productosController.crear);
router.put('/:id', requireAuth, requireRole('administrador', 'produccion'), productosController.actualizar);
router.delete('/:id', requireAuth, requireRole('administrador', 'produccion'), productosController.eliminar);

module.exports = router;
