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
/* Registrar una orden de compra */
router.post('/', requireAuth, async (req, res) => {

  const {
    id,
    items,
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

  /*
    Compatibilidad:
    Si el frontend todavía envía un solo artículo,
    lo convertimos en una lista de un solo elemento.
  */
  const listaItems = Array.isArray(items) && items.length > 0
    ? items
    : [{
        insumoId,
        insumoNombre,
        cantidad,
        unidad,
        costo
      }];

  if (!listaItems.length) {
    return res.status(400).json({
      error: 'Debes agregar al menos un artículo'
    });
  }

  for (const item of listaItems) {

    if (!item.insumoNombre || !item.cantidad || Number(item.cantidad) <= 0) {
      return res.status(400).json({
        error: 'Todos los artículos deben tener nombre y cantidad válida'
      });
    }

  }

  const connection = await pool.getConnection();

  try {

    await connection.beginTransaction();

    const orderId = id || 'OC-' + Date.now();

    /*
      Primero procesamos todos los artículos:
      - Si existe el insumo, aumenta su stock.
      - Si es nuevo, se crea.
    */
    const itemsProcesados = [];

    for (const item of listaItems) {

      let finalInsumoId = item.insumoId
        ? Number(item.insumoId)
        : null;

      if (finalInsumoId) {

        await connection.query(
          `
          UPDATE insumos
          SET cantidad = cantidad + ?,
              actualizado_at = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [
            Number(item.cantidad),
            finalInsumoId
          ]
        );

      } else {

        const [result] = await connection.query(
          `
          INSERT INTO insumos
          (nombre, cantidad, unidad, stock_minimo, proveedor)
          VALUES (?, ?, ?, 0, ?)
          `,
          [
            item.insumoNombre,
            Number(item.cantidad),
            item.unidad || 'unidades',
            tienda || null
          ]
        );

        finalInsumoId = result.insertId;

      }

      itemsProcesados.push({
        insumoId: finalInsumoId,
        insumoNombre: item.insumoNombre,
        cantidad: Number(item.cantidad),
        unidad: item.unidad || 'unidades',
        costo: Number(item.costo) || 0
      });

    }

    /*
      Guardamos la orden principal usando
      el primer artículo para mantener compatibilidad
      con la tabla actual.
    */
    const primerItem = itemsProcesados[0];

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
        orderId,
        primerItem.insumoId,
        primerItem.insumoNombre,
        primerItem.cantidad,
        primerItem.unidad,
        primerItem.costo,
        tienda || null,
        fecha || new Date().toISOString().slice(0, 10),
        fechaISO || new Date(),
        registradoPor || (req.empleado && req.empleado.nombre) || '-'
      ]
    );

    /*
      Guardamos TODOS los artículos
      en detalle_orden_compra.
    */
    for (const item of itemsProcesados) {

      await connection.query(
        `
        INSERT INTO detalle_orden_compra
        (
          orden_id,
          insumo_id,
          insumo_nombre,
          cantidad,
          unidad,
          costo
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          orderId,
          item.insumoId,
          item.insumoNombre,
          item.cantidad,
          item.unidad,
          item.costo
        ]
      );

    }

    await connection.commit();

    res.status(201).json({
      ok: true,
      message: 'Orden de compra registrada correctamente',
      orderId,
      itemsSaved: itemsProcesados.length
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
