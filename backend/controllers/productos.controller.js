const productoDao = require('../daos/producto.dao');

function toView(row) {
  return {
    id: row.id, cat: row.cat, name: row.nombre, desc: row.descripcion || '',
    price: Number(row.precio), icon: row.icono || '🍰',
    customizable: Boolean(row.personalizable), disponible: Boolean(row.disponible),
    media: row.media || `media-${row.cat}`
  };
}

function normalize(body, id) {
  const { cat, name, desc, price, icon, customizable, disponible, media } = body || {};
  if (!name || !cat || price === undefined || !Number.isFinite(Number(price)) || Number(price) <= 0) return null;
  return {
    id: id || body.id || `prod-${Date.now()}`, cat, nombre: String(name).trim(),
    descripcion: desc || '', precio: Number(price), icono: icon || '🍰',
    personalizable: customizable ? 1 : 0, disponible: disponible === false ? 0 : 1,
    media: media || `media-${cat}`
  };
}

exports.listar = async (_req, res) => {
  try { return res.json((await productoDao.findAll()).map(toView)); }
  catch (error) { console.error('Error al obtener productos:', error); return res.status(500).json({ error: 'Error al obtener productos' }); }
};

exports.obtener = async (req, res) => {
  try {
    const row = await productoDao.findById(req.params.id);
    if (!row) return res.status(404).json({ error: 'Producto no encontrado' });
    return res.json(toView(row));
  } catch (error) { console.error('Error al obtener producto:', error); return res.status(500).json({ error: 'Error al obtener producto' }); }
};

exports.crear = async (req, res) => {
  const producto = normalize(req.body);
  if (!producto) return res.status(400).json({ error: 'Nombre, categoría y precio válido son obligatorios' });
  try { return res.status(201).json(toView(await productoDao.create(producto))); }
  catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un producto con ese ID' });
    console.error('Error al crear producto:', error); return res.status(500).json({ error: 'Error al crear producto' });
  }
};

exports.actualizar = async (req, res) => {
  const producto = normalize(req.body, req.params.id);
  if (!producto) return res.status(400).json({ error: 'Nombre, categoría y precio válido son obligatorios' });
  try {
    const row = await productoDao.update(req.params.id, producto);
    if (!row) return res.status(404).json({ error: 'Producto no encontrado' });
    return res.json(toView(row));
  } catch (error) { console.error('Error al actualizar producto:', error); return res.status(500).json({ error: 'Error al actualizar producto' }); }
};

exports.eliminar = async (req, res) => {
  try {
    if (!await productoDao.delete(req.params.id)) return res.status(404).json({ error: 'Producto no encontrado' });
    return res.json({ ok: true, mensaje: 'Producto eliminado correctamente' });
  } catch (error) { console.error('Error al eliminar producto:', error); return res.status(500).json({ error: 'Error al eliminar producto' }); }
};
