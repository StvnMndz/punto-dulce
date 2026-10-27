const crypto = require('crypto');
const ventaDao = require('../daos/venta.dao');

exports.registrar = async (req, res) => {
  const { pedidoId, nombre, telefono, metodoPago, items, total } = req.body || {};
  if (!nombre || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Faltan datos para registrar la venta' });
  }
  const id = `V-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const cleanItems = items.map(item => ({
    ...item,
    cantidad: Math.max(1, Number(item.cantidad || item.qty) || 1),
    precio: Math.max(0, Number(item.precio || item.price) || 0)
  }));
  const totalCalculado = cleanItems.reduce((sum, item) => sum + item.cantidad * item.precio, 0);
  const totalFinal = totalCalculado || (Number(total) > 0 ? Number(total) : 0);
  try {
    await ventaDao.create({ id, nombre, telefono, metodoPago, total: totalFinal,
      detalle: JSON.stringify({ items: cleanItems, metodoPago: metodoPago || 'Pendiente' }),
      fechaIso: new Date().toISOString(), pedidoId });
    return res.status(201).json({ ok: true, message: 'Venta registrada correctamente', ventaId: id, total: totalFinal });
  } catch (error) { console.error('Error al registrar venta:', error); return res.status(500).json({ error: 'No se pudo registrar la venta' }); }
};

exports.actualizar = async (req, res) => {
  const { nombre, telefono, metodoPago, items, pedidoId } = req.body || {};
  if (!nombre || !Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Completa el cliente y agrega al menos un producto' });
  const cleanItems = items.map(item => ({ ...item,
    cantidad: Math.max(1, Number(item.cantidad || item.qty) || 1),
    precio: Math.max(0, Number(item.precio || item.price) || 0)
  }));
  const total = cleanItems.reduce((sum, item) => sum + item.cantidad * item.precio, 0);
  try {
    if (!await ventaDao.findById(req.params.id, req.empleado?.rol === 'ventas')) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    if (!await ventaDao.update(req.params.id, { nombre, telefono, metodoPago, pedidoId, total,
      detalle: JSON.stringify({ items: cleanItems, metodoPago: metodoPago || 'Pendiente' }) })) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    return res.json({ ok: true, total });
  } catch (error) { console.error('Error al actualizar venta:', error); return res.status(500).json({ error: 'No se pudo actualizar la venta' }); }
};

exports.eliminar = async (req, res) => {
  try {
    if (!await ventaDao.delete(req.params.id, req.empleado?.rol === 'ventas')) return res.status(404).json({ error: 'Venta no encontrada' });
    return res.json({ ok: true });
  } catch (error) { console.error('Error al eliminar venta:', error); return res.status(500).json({ error: 'No se pudo eliminar la venta' }); }
};

exports.listar = async (req, res) => {
  try {
    const { q, desde, hasta, metodoPago } = req.query;
    const filters = { q: String(q || '').trim(), desde, hasta, metodoPago, soloSemana: req.empleado?.rol === 'ventas' };
    const [sales, legacyOrders] = await Promise.all([
      ventaDao.findAll(filters),
      ventaDao.findOrdersWithoutSales(filters)
    ]);
    return res.json([...sales, ...legacyOrders].sort((a, b) => new Date(b.fecha || b.fecha_iso || 0) - new Date(a.fecha || a.fecha_iso || 0)));
  }
  catch (error) { console.error('Error al listar ventas:', error); return res.status(500).json({ error: 'No se pudieron obtener las ventas' }); }
};

exports.obtener = async (req, res) => {
  try {
    const venta = await ventaDao.findById(req.params.id, req.empleado?.rol === 'ventas');
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
    return res.json(venta);
  } catch (error) { console.error('Error al obtener venta:', error); return res.status(500).json({ error: 'No se pudo obtener la venta' }); }
};
