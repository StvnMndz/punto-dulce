const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const ventasController = require('../controllers/ventas.controller');

const router = express.Router();
router.post('/', ventasController.registrar);
router.post('/registrar', requireAuth, requireRole('administrador', 'ventas'), ventasController.registrar);
router.get('/', requireAuth, requireRole('administrador', 'ventas'), ventasController.listar);
router.get('/:id', requireAuth, requireRole('administrador', 'ventas'), ventasController.obtener);
router.put('/:id', requireAuth, requireRole('administrador', 'ventas'), ventasController.actualizar);
router.delete('/:id', requireAuth, requireRole('administrador', 'ventas'), ventasController.eliminar);

module.exports = router;
