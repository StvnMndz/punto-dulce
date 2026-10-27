const express = require('express');
const { requireAuth } = require('../middleware/auth');
const insumosController = require('../controllers/insumos.controller');

const router = express.Router();
router.get('/', requireAuth, insumosController.listar);
router.post('/', requireAuth, insumosController.crear);
router.put('/:id', requireAuth, insumosController.actualizar);
router.delete('/:id', requireAuth, insumosController.eliminar);

module.exports = router;
