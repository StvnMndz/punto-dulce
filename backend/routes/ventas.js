const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/', async (req, res) => {
  try {
    const {
      id,
      tipo,
      nombre,
      telefono,
      notas,
      items,
      total,
      detalle,
      fechaISO
    } = req.body;

    if (!nombre || !telefono || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Faltan datos para registrar la venta'
      });
    }

    const ventaId = id || 'PD-' + Date.now();
    const fechaIsoFinal = fechaISO || new Date().toISOString();

    const totalFinal = Number(total) || items.reduce(
      (s, item) => s + (Number(item.price) * (Number(item.qty) || 1)),
      0
    );

    await db.query(
      `INSERT INTO ventas
      (id, tipo, nombre, telefono, notas, total, estado, detalle, fecha_iso)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ventaId,
        tipo || 'delivery',
        nombre,
        telefono,
        notas || '',
        totalFinal,
        'Pendiente',
        detalle || '',
        fechaIsoFinal
      ]
    );

    for (const item of items) {
      const cantidad = Number(item.qty) || 1;
      const precio = Number(item.price) || 0;
      const subtotal = cantidad * precio;

      await db.query(
        `INSERT INTO detalle_ventas
        (venta_id, producto_id, producto_nombre, cantidad, precio, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
      ventaId,
  null,
  item.name,
  cantidad,
  precio,
  subtotal
        ]
      );
    }

    res.status(201).json({
      ok: true,
      message: 'Venta registrada correctamente',
      ventaId,
      total: totalFinal,
      itemsSaved: items.length
    });

  } catch (error) {
    console.error('Error al registrar venta:', error);

    res.status(500).json({
      error: 'No se pudo registrar la venta'
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const [ventas] = await db.query(
      'SELECT * FROM ventas ORDER BY fecha DESC'
    );

    res.json(ventas);

  } catch (error) {
    console.error('Error al listar ventas:', error);

    res.status(500).json({
      error: 'No se pudieron obtener las ventas'
    });
  }
});

router.get('/:id/detalle', async (req, res) => {
  try {
    const [detalle] = await db.query(
      'SELECT * FROM detalle_ventas WHERE venta_id = ?',
      [req.params.id]
    );

    res.json(detalle);

  } catch (error) {
    console.error('Error al obtener detalle:', error);

    res.status(500).json({
      error: 'No se pudo obtener el detalle de la venta'
    });
  }
});

module.exports = router;
