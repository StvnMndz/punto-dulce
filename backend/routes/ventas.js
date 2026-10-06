const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');


// =====================================================
// REGISTRAR VENTA
// =====================================================

router.post('/', async (req, res) => {

  try {

    const {
      pedidoId,
      nombre,
      telefono,
      metodoPago,
      items,
      total
    } = req.body;


    if (
      !nombre ||
      !Array.isArray(items) ||
      items.length === 0
    ) {

      return res.status(400).json({
        error: 'Faltan datos para registrar la venta'
      });

    }


    // Generar ID de venta
    const id =
      'V-' +
      crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase();


    // Guardar productos como JSON dentro de detalle
    const detalle = JSON.stringify({
      items,
      metodoPago: metodoPago || 'Pendiente'
    });


    const totalFinal =
      Number(total) || 0;


    await db.query(
      `INSERT INTO ventas
      (
        id,
        tipo,
        nombre,
        telefono,
        notas,
        total,
        estado,
        detalle,
        fecha_iso,
        pedido_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [

        id,

        'venta',

        nombre,

        telefono || null,

        metodoPago || null,

        totalFinal,

        'Completada',

        detalle,

        new Date().toISOString(),

        pedidoId || null

      ]
    );


    res.status(201).json({

      ok: true,

      message:
        'Venta registrada correctamente',

      ventaId:
        id,

      total:
        totalFinal

    });


  } catch (error) {

    console.error(
      'Error al registrar venta:',
      error
    );

    res.status(500).json({

      error:
        'No se pudo registrar la venta'

    });

  }

});


// =====================================================
// LISTAR VENTAS
// =====================================================

router.get('/', async (req, res) => {

  try {

    const [ventas] =
      await db.query(
        `SELECT *
         FROM ventas
         ORDER BY fecha DESC`
      );

    res.json(ventas);

  } catch (error) {

    console.error(
      'Error al listar ventas:',
      error
    );

    res.status(500).json({

      error:
        'No se pudieron obtener las ventas'

    });

  }

});


// =====================================================
// OBTENER UNA VENTA
// =====================================================

router.get('/:id', async (req, res) => {

  try {

    const [ventas] =
      await db.query(
        `SELECT *
         FROM ventas
         WHERE id = ?`,
        [req.params.id]
      );


    if (!ventas.length) {

      return res.status(404).json({

        error:
          'Venta no encontrada'

      });

    }


    res.json(ventas[0]);

  } catch (error) {

    console.error(
      'Error al obtener venta:',
      error
    );

    res.status(500).json({

      error:
        'No se pudo obtener la venta'

    });

  }

});


module.exports = router;
