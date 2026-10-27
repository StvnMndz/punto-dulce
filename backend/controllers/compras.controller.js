const compraDao = require('../daos/compra.dao');

exports.listar = async (_req, res) => {
  try { return res.json(await compraDao.findAll()); }
  catch (error) { console.error('Error al obtener órdenes de compra:', error); return res.status(500).json({ error: 'No se pudieron obtener las órdenes de compra' }); }
};

exports.registrar = async (req, res) => {
  const body = req.body || {};
  const items = Array.isArray(body.items) && body.items.length
    ? body.items
    : [{ insumoId: body.insumoId, insumoNombre: body.insumoNombre, cantidad: body.cantidad, unidad: body.unidad, costo: body.costo }];
  if (!items.length) return res.status(400).json({ error: 'Debes agregar al menos un artículo' });
  if (items.some(item => !item.insumoNombre || !Number.isFinite(Number(item.cantidad)) || Number(item.cantidad) <= 0)) {
    return res.status(400).json({ error: 'Todos los artículos deben tener nombre y cantidad válida' });
  }
  try {
    const result = await compraDao.createOrder({ id: body.id, items, tienda: body.tienda,
      fecha: body.fecha, fechaISO: body.fechaISO, registradoPor: body.registradoPor || req.empleado?.nombre });
    return res.status(201).json({ ok: true, message: 'Orden de compra registrada correctamente', ...result });
  } catch (error) {
    if (error.code === 'INSUMO_NOT_FOUND') return res.status(404).json({ error: 'No se encontró uno de los insumos indicados' });
    console.error('Error al registrar orden de compra:', error);
    return res.status(500).json({ error: 'No se pudo registrar la orden de compra' });
  }
};

exports.actualizarArticulo = async (req, res) => {
  const { cantidad, costo, tienda, fecha, fechaISO } = req.body || {};
  const qty = Number(cantidad);
  const cost = Number(costo);
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Artículo de compra inválido' });
  if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(cost) || cost < 0 || !fecha) {
    return res.status(400).json({ error: 'Revisa la cantidad, costo y fecha de compra' });
  }
  try {
    await compraDao.updateItem(id, { cantidad: qty, costo: cost, tienda, fecha, fechaISO: fechaISO || new Date(`${fecha}T12:00:00`).toISOString() });
    return res.json({ ok: true });
  } catch (error) {
    if (error.code === 'COMPRA_NOT_FOUND') return res.status(404).json({ error: 'Artículo de compra no encontrado' });
    if (error.code === 'STOCK_INSUFFICIENT') return res.status(409).json({ error: 'No se puede reducir la compra: el stock ya fue utilizado' });
    console.error('Error al actualizar compra:', error);
    return res.status(500).json({ error: 'No se pudo actualizar la compra' });
  }
};

exports.eliminarArticulo = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Artículo de compra inválido' });
  try {
    await compraDao.deleteItem(id);
    return res.json({ ok: true });
  } catch (error) {
    if (error.code === 'COMPRA_NOT_FOUND') return res.status(404).json({ error: 'Artículo de compra no encontrado' });
    if (error.code === 'STOCK_INSUFFICIENT') return res.status(409).json({ error: 'No se puede eliminar: parte de ese stock ya fue utilizado' });
    console.error('Error al eliminar compra:', error);
    return res.status(500).json({ error: 'No se pudo eliminar el artículo de compra' });
  }
};
