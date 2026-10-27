const crypto = require('crypto');
const pedidoDao = require('../daos/pedido.dao');

const ESTADOS = ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'entregado', 'cancelado'];
const TIPOS = ['delivery', 'encargo'];
const generarCodigo = () => `PD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

exports.crear = async (req, res) => {
  try {
    const { nombre, telefono, tipo, direccion, fechaEntrega, notas, items } = req.body || {};
    const anticipo = Number(req.body?.anticipo || 0);
    if (!nombre || !telefono) return res.status(400).json({ error: 'Nombre y teléfono son obligatorios.' });
    if (!TIPOS.includes(tipo)) return res.status(400).json({ error: 'Tipo de pedido inválido.' });
    if (tipo === 'delivery' && !direccion) return res.status(400).json({ error: 'La dirección es obligatoria para delivery.' });
    if (!Array.isArray(items) || !items.length || items.length > 50) return res.status(400).json({ error: 'El pedido no tiene productos.' });
    const cleanItems = items.map(item => ({
      nombre: String(item.nombre || '').slice(0, 120), detalle: String(item.detalle || '').slice(0, 300),
      precio: Math.max(0, Number(item.precio) || 0), cantidad: Math.min(99, Math.max(1, parseInt(item.cantidad, 10) || 1))
    }));
    if (cleanItems.some(item => !item.nombre)) return res.status(400).json({ error: 'Cada producto debe tener nombre.' });
    const total = cleanItems.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    if (!Number.isFinite(anticipo) || anticipo < 0 || anticipo > total) return res.status(400).json({ error: 'El anticipo debe estar entre S/ 0 y el total del pedido.' });
    if (tipo === 'encargo' && anticipo <= 0) return res.status(400).json({ error: 'Registra un anticipo mayor a cero para los pedidos por encargo.' });
    const pedido = { nombre: String(nombre).slice(0, 120), telefono: String(telefono).slice(0, 30), tipo,
      direccion, fechaEntrega, notas, items: cleanItems,
      total, anticipo };
    for (let attempt = 0; attempt < 5; attempt++) {
      pedido.codigo = generarCodigo();
      try {
        await pedidoDao.create(pedido);
        return res.status(201).json({ ok: true, codigo: pedido.codigo, total: pedido.total });
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') throw error;
      }
    }
    return res.status(500).json({ error: 'No se pudo generar el código del pedido.' });
  } catch (error) { console.error('Error al registrar pedido:', error); return res.status(500).json({ error: 'Error al registrar el pedido.' }); }
};

exports.seguimiento = async (req, res) => {
  const telefono = req.query.telefono;
  if (!telefono) return res.status(400).json({ error: 'Falta el teléfono.' });
  try {
    const pedido = await pedidoDao.findForTracking(String(req.params.codigo).toUpperCase(), telefono);
    if (!pedido) return res.status(404).json({ error: 'No encontramos ese pedido.' });
    return res.json(pedido);
  } catch (error) { console.error('Error al consultar pedido:', error); return res.status(500).json({ error: 'Error al consultar el pedido.' }); }
};

exports.listar = async (req, res) => {
  try {
    const { q, estado, tipo, desde, hasta } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const clauses = [];
    const params = [];
    if (q) { clauses.push('(codigo LIKE ? OR cliente_nombre LIKE ? OR cliente_telefono LIKE ?)'); const like = `%${String(q).trim()}%`; params.push(like, like, like); }
    if (estado && ESTADOS.includes(estado)) { clauses.push('estado = ?'); params.push(estado); }
    if (tipo && TIPOS.includes(tipo)) { clauses.push('tipo = ?'); params.push(tipo); }
    if (desde) { clauses.push('created_at >= ?'); params.push(`${desde} 00:00:00`); }
    if (hasta) { clauses.push('created_at <= ?'); params.push(`${hasta} 23:59:59`); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await pedidoDao.findMany({ where, params, limit, offset: (page - 1) * limit, soloSemana: req.empleado?.rol === 'ventas' });
    return res.json({ pedidos: result.rows, total: result.total, page, pages: Math.max(1, Math.ceil(result.total / limit)) });
  } catch (error) { console.error('Error al listar pedidos:', error); return res.status(500).json({ error: 'Error al listar pedidos.' }); }
};

exports.actualizarEstado = async (req, res) => {
  const { estado } = req.body || {};
  if (!ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });
  try {
    if (!await pedidoDao.updateStatus(req.params.id, estado, req.empleado?.rol === 'ventas')) return res.status(404).json({ error: 'Pedido no encontrado.' });
    return res.json({ ok: true, estado });
  } catch (error) { console.error('Error al actualizar pedido:', error); return res.status(500).json({ error: 'Error al actualizar el estado.' }); }
};
