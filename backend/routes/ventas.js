const express = require('express');
const router = express.Router();
const db = require('../db');

// REGISTRAR VENTA
router.post('/', async (req, res) => {
  try {
    const {
      id,
      pedidoId,
      nombre,
      telefono,
      metodoPago,
      items,
      subtotal,
      total
    } = req.body;

    if (!nombre || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Faltan datos para registrar la venta'
      });
    }

    const itemsLimpios = items.map(item => ({
      nombre: String(item.name || item.nombre || ''),
      cantidad: Number(item.qty || item.cantidad || 1),
      precio: Number(item.price || item.precio || 0),
      subtotal:
        Number(item.qty || item.cantidad || 1) *
        Number(item.price || item.precio || 0)
    }));

    const subtotalFinal =
      Number(subtotal) ||
      itemsLimpios.reduce((s, item) => s + item.subtotal, 0);

    const totalFinal = Number(total) || subtotalFinal;

    const [resultado] = await db.query(
      `INSERT INTO ventas
      (
        pedido_id,
        cliente_nombre,
        cliente_telefono,
        metodo_pago,
        items,
        subtotal,
        total
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        pedidoId || null,
        nombre,
        telefono || null,
        metodoPago || null,
        JSON.stringify(itemsLimpios),
        subtotalFinal,
        totalFinal
      ]
    );

    res.status(201).json({
      ok: true,
      message: 'Venta registrada correctamente',
      ventaId: resultado.insertId,
      total: totalFinal
    });

  } catch (error) {
    console.error('Error al registrar venta:', error);

    res.status(500).json({
      error: 'No se pudo registrar la venta'
    });
  }
});


// LISTAR VENTAS
router.get('/', async (req, res) => {
  try {
    const [ventas] = await db.query(
      `SELECT *
       FROM ventas
       ORDER BY fecha DESC`
    );

    res.json(ventas);

  } catch (error) {
    console.error('Error al listar ventas:', error);

    res.status(500).json({
      error: 'No se pudieron obtener las ventas'
    });
  }
});


// OBTENER UNA VENTA
router.get('/:id', async (req, res) => {
  try {
    const [ventas] = await db.query(
      `SELECT *
       FROM ventas
       WHERE id = ?`,
      [req.params.id]
    );

    if (!ventas.length) {
      return res.status(404).json({
        error: 'Venta no encontrada'
      });
    }

    res.json(ventas[0]);

  } catch (error) {
    console.error('Error al obtener venta:', error);

    res.status(500).json({
      error: 'No se pudo obtener la venta'
    });
  }
});

module.exports = router;
