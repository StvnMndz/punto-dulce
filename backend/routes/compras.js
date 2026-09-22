const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/* Obtener órdenes de compra */
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        insumo_id,
        insumo_nombre,
        cantidad,
        unidad,
        costo,
        tienda,
        fecha,
        fecha_iso,
        registrado_por
      FROM ordenes_compra
      ORDER BY fecha DESC, id DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener órdenes de compra:', error);
    res.status(500).json({
      error: 'No se pudieron obtener las órdenes de compra'
    });
  }
});


/* Registrar una orden de compra */
router.post('/', requireAuth, async (req, res) => {
  const {
    id,
    insumoId,
    insumoNombre,
    cantidad,
    unidad,
    costo,
    tienda,
    fecha,
    fechaISO,
    registradoPor
  } = req.body;

  if (!insumoNombre || !cantidad || Number(cantidad) <= 0) {
    return res.status(400).json({
      error: 'El insumo y una cantidad válida son obligatorios'
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let finalInsumoId = insumoId || null;

    /*
      Si se está registrando un insumo existente,
      se suma la cantidad comprada al stock.
    */
    if (finalInsumoId) {

      await connection.query(
        `
        UPDATE insumos
        SET cantidad = cantidad + ?,
            actualizado_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [Number(cantidad), finalInsumoId]
      );

    } else {

      /*
        Si es un insumo nuevo, se crea primero.
      */
      const [result] = await connection.query(
        `
        INSERT INTO insumos
        (nombre, cantidad, unidad, stock_minimo, proveedor)
        VALUES (?, ?, ?, 0, ?)
        `,
        [
          insumoNombre,
          Number(cantidad),
          unidad || 'unidades',
          tienda || null
        ]
      );

      finalInsumoId = result.insertId;
    }

    /* Registrar la orden de compra */
    await connection.query(
      `
      INSERT INTO ordenes_compra
      (
        id,
        insumo_id,
        insumo_nombre,
        cantidad,
        unidad,
        costo,
        tienda,
        fecha,
        fecha_iso,
        registrado_por
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id || 'OC-' + Date.now(),
        finalInsumoId,
        insumoNombre,
        Number(cantidad),
        unidad || 'unidades',
        Number(costo) || 0,
        tienda || null,
        fecha || new Date().toISOString().slice(0, 10),
        fechaISO || new Date(),
        registradoPor || (req.empleado && req.empleado.nombre) || '-'
      ]
    );

    await connection.commit();

    res.status(201).json({
      ok: true,
      message: 'Orden de compra registrada correctamente'
    });

  } catch (error) {

    await connection.rollback();

    console.error('Error al registrar orden de compra:', error);

    res.status(500).json({
      error: 'No se pudo registrar la orden de compra'
    });

  } finally {
    connection.release();
  }
});


module.exports = router;
