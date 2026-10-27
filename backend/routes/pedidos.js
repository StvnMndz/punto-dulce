const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const pedidosController = require('../controllers/pedidos.controller');

const router = express.Router();
const gestionarPedidos = [requireAuth, requireRole('administrador', 'ventas')];

router.post('/', pedidosController.crear);
router.get('/seguimiento/:codigo', pedidosController.seguimiento);
router.get('/', ...gestionarPedidos, pedidosController.listar);
router.patch('/:id/estado', ...gestionarPedidos, pedidosController.actualizarEstado);
router.put('/:id/estado', ...gestionarPedidos, pedidosController.actualizarEstado);

module.exports = router;
