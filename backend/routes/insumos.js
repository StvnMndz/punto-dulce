const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function puedeGestionarInsumos(req) {
  return req.empleado &&
    ['administrador', 'produccion'].includes(req.empleado.rol);
}

/**
 * GET /api/insumos
 * Administrador y producción pueden consultar los insumos.
 */
router.get('/', requireAuth, async (req, res) => {
  if (!puedeGestionarInsumos(req)) {
    return res.status(403).json({ error: 'No tienes permiso para ver los insumos' });
  }

  try {
    const [filas] = await pool.query(`
      SELECT
        id,
        nombre,
        cantidad,
        unidad,
        stock_minimo,
        proveedor,
        actualizado_at
      FROM insumos
      ORDER BY nombre ASC
    `);

    res.json(filas);
  } catch (err) {
    console.error('Error al obtener insumos:', err);
    res.status(500).json({ error: 'Error al obtener los insumos' });
  }
});

/**
 * POST /api/insumos
 * Registra un nuevo insumo.
 */
router.post('/', requireAuth, async (req, res) => {
  if (!puedeGestionarInsumos(req)) {
    return res.status(403).json({ error: 'No tienes permiso para registrar insumos' });
  }

  try {
    const { nombre, cantidad, unidad, stockMinimo, proveedor } = req.body;

    if (!nombre || cantidad === undefined || !unidad) {
      return res.status(400).json({
        error: 'Nombre, cantidad y unidad son obligatorios'
      });
    }

    const cantidadNum = Number(cantidad);
    const stockMinimoNum = Number(stockMinimo) || 0;

    if (isNaN(cantidadNum) || cantidadNum < 0) {
      return res.status(400).json({ error: 'Cantidad inválida' });
    }

    if (isNaN(stockMinimoNum) || stockMinimoNum < 0) {
      return res.status(400).json({ error: 'Stock mínimo inválido' });
    }

    const [resultado] = await pool.query(
      `INSERT INTO insumos
       (nombre, cantidad, unidad, stock_minimo, proveedor)
       VALUES (?, ?, ?, ?, ?)`,
      [
        nombre.trim(),
        cantidadNum,
        unidad,
        stockMinimoNum,
        proveedor ? proveedor.trim() : null
      ]
    );

    const [filas] = await pool.query(
      `SELECT id, nombre, cantidad, unidad, stock_minimo,
              proveedor, actualizado_at
       FROM insumos
       WHERE id = ?`,
      [resultado.insertId]
    );

    res.status(201).json(filas[0]);
  } catch (err) {
    console.error('Error al registrar insumo:', err);
    res.status(500).json({ error: 'Error al registrar el insumo' });
  }
});

/**
 * PUT /api/insumos/:id
 * Actualiza un insumo.
 */
router.put('/:id', requireAuth, async (req, res) => {
  if (!puedeGestionarInsumos(req)) {
    return res.status(403).json({ error: 'No tienes permiso para editar insumos' });
  }

  try {
    const id = Number(req.params.id);
    const { nombre, cantidad, unidad, stockMinimo, proveedor } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    if (!nombre || cantidad === undefined || !unidad) {
      return res.status(400).json({
        error: 'Nombre, cantidad y unidad son obligatorios'
      });
    }

    const cantidadNum = Number(cantidad);
    const stockMinimoNum = Number(stockMinimo) || 0;

    if (isNaN(cantidadNum) || cantidadNum < 0) {
      return res.status(400).json({ error: 'Cantidad inválida' });
    }

    if (isNaN(stockMinimoNum) || stockMinimoNum < 0) {
      return res.status(400).json({ error: 'Stock mínimo inválido' });
    }

    const [resultado] = await pool.query(
      `UPDATE insumos
       SET nombre = ?,
           cantidad = ?,
           unidad = ?,
           stock_minimo = ?,
           proveedor = ?
       WHERE id = ?`,
      [
        nombre.trim(),
        cantidadNum,
        unidad,
        stockMinimoNum,
        proveedor ? proveedor.trim() : null,
        id
      ]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    const [filas] = await pool.query(
      `SELECT id, nombre, cantidad, unidad, stock_minimo,
              proveedor, actualizado_at
       FROM insumos
       WHERE id = ?`,
      [id]
    );

    res.json(filas[0]);
  } catch (err) {
    console.error('Error al actualizar insumo:', err);
    res.status(500).json({ error: 'Error al actualizar el insumo' });
  }
});

/**
 * DELETE /api/insumos/:id
 * Elimina un insumo.
 */
router.delete('/:id', requireAuth, async (req, res) => {
  if (!puedeGestionarInsumos(req)) {
    return res.status(403).json({ error: 'No tienes permiso para eliminar insumos' });
  }

  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const [resultado] = await pool.query(
      'DELETE FROM insumos WHERE id = ?',
      [id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error al eliminar insumo:', err);
    res.status(500).json({ error: 'Error al eliminar el insumo' });
  }
});

module.exports = router;
