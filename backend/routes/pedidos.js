const express = require('express');
const crypto = require('crypto');

// ⚠️ AJUSTA ESTAS 2 LÍNEAS a lo que usan tus otras rutas (mira ventas.js)
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const ESTADOS = ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'entregado', 'cancelado'];
const TIPOS = ['delivery', 'encargo'];
const ROLES_GESTION = ['administrador', 'ventas']; // ⚠️ los mismos valores que tu tabla empleados

const generarCodigo = () => 'PD-' + crypto.randomBytes(3).toString('hex').toUpperCase();

// PÚBLICO: el cliente crea un pedido
router.post('/', async (req, res) => {
  try {
    const { nombre, telefono, tipo, direccion, fechaEntrega, notas, items } = req.body || {};

    if (!nombre || !telefono) return res.status(400).json({ error: 'Nombre y teléfono son obligatorios.' });
    if (!TIPOS.includes(tipo)) return res.status(400).json({ error: 'Tipo de pedido inválido.' });
    if (tipo === 'delivery' && !direccion) return res.status(400).json({ error: 'La dirección es obligatoria para delivery.' });
    if (!Array.isArray(items) || items.length === 0 || items.length > 50)
      return res.status(400).json({ error: 'El pedido no tiene productos.' });

    const limpios = items.map(i => ({
      nombre: String(i.nombre || '').slice(0, 120),
      detalle: String(i.detalle || '').slice(0, 300),
      precio: Math.max(0, Number(i.precio) || 0),
      cantidad: Math.min(99, Math.max(1, parseInt(i.cantidad, 10) || 1)),
    }));
    const total = limpios.reduce((s, i) => s + i.precio * i.cantidad, 0);

    for (let intento = 0; intento < 5; intento++) {
      const codigo = generarCodigo();
      try {
        await pool.query(
          `INSERT INTO pedidos (codigo, cliente_nombre, cliente_telefono, tipo, direccion, fecha_entrega, notas, items, total)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [codigo, String(nombre).slice(0, 120), String(telefono).slice(0, 30), tipo,
           direccion || null, fechaEntrega || null, notas || null, JSON.stringify(limpios), total]
        );
        return res.status(201).json({ ok: true, codigo, total });
      } catch (e) {
        if (e.code !== 'ER_DUP_ENTRY') throw e;
      }
    }
    res.status(500).json({ error: 'No se pudo generar el código del pedido.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar el pedido.' });
  }
});

// PÚBLICO: seguimiento por código + teléfono
router.get('/seguimiento/:codigo', async (req, res) => {
  try {
    const { telefono } = req.query;
    if (!telefono) return res.status(400).json({ error: 'Falta el teléfono.' });
    const [rows] = await pool.query(
      `SELECT codigo, tipo, estado, total, items, fecha_entrega, created_at, updated_at
       FROM pedidos WHERE codigo = ? AND cliente_telefono = ?`,
      [String(req.params.codigo).toUpperCase(), telefono]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontramos ese pedido.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar el pedido.' });
  }
});

// PERSONAL: listar con búsqueda y filtros
router.get('/', requireAuth, requireRole(...ROLES_GESTION), async (req, res) => {
  try {
    const { q, estado, tipo, desde, hasta } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const where = [];
    const params = [];

    if (q) {
      where.push('(codigo LIKE ? OR cliente_nombre LIKE ? OR cliente_telefono LIKE ?)');
      const like = `%${q.trim()}%`;
      params.push(like, like, like);
    }
    if (estado && ESTADOS.includes(estado)) { where.push('estado = ?'); params.push(estado); }
    if (tipo && TIPOS.includes(tipo))       { where.push('tipo = ?');   params.push(tipo); }
    if (desde) { where.push('created_at >= ?'); params.push(`${desde} 00:00:00`); }
    if (hasta) { where.push('created_at <= ?'); params.push(`${hasta} 23:59:59`); }

    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM pedidos ${w}`, params);
    const [pedidos] = await pool.query(
      `SELECT * FROM pedidos ${w} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );

    res.json({ pedidos, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar pedidos.' });
  }
});

// PERSONAL: cambiar estado
router.patch('/:id/estado', requireAuth, requireRole(...ROLES_GESTION), async (req, res) => {
  try {
    const { estado } = req.body || {};
    if (!ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });
    const [r] = await pool.query('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Pedido no encontrado.' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el estado.' });
  }
});

module.exports = router;

// Actualizar estado de un pedido
router.put('/:id/estado', async (req, res) => {

  try {

    const { estado } = req.body;

    const estadosPermitidos = [
      'pendiente',
      'confirmado',
      'en_preparacion',
      'listo',
      'en_camino',
      'entregado',
      'cancelado'
    ];

    if(!estadosPermitidos.includes(estado)){
      return res.status(400).json({
        error: 'Estado no válido'
      });
    }

    const [resultado] = await db.query(
      `UPDATE pedidos
       SET estado = ?
       WHERE id = ?`,
      [
        estado,
        req.params.id
      ]
    );

    if(resultado.affectedRows === 0){
      return res.status(404).json({
        error: 'Pedido no encontrado'
      });
    }

    res.json({
      ok: true,
      message: 'Estado actualizado correctamente',
      estado
    });

  } catch(error) {

    console.error(
      'Error al actualizar estado:',
      error
    );

    res.status(500).json({
      error: 'No se pudo actualizar el estado del pedido'
    });

  }

});

module.exports = router;
