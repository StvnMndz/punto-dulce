const insumoDao = require('../daos/insumo.dao');

function permitido(req) { return ['administrador', 'produccion'].includes(req.empleado?.rol); }
function datosValidos(body) {
  const { nombre, cantidad, unidad, stockMinimo, proveedor } = body || {};
  const cantidadNum = Number(cantidad);
  const minimoNum = Number(stockMinimo ?? 0);
  if (!nombre || cantidad === undefined || !unidad) return { error: 'Nombre, cantidad y unidad son obligatorios' };
  if (!Number.isFinite(cantidadNum) || cantidadNum < 0) return { error: 'Cantidad inválida' };
  if (!Number.isFinite(minimoNum) || minimoNum < 0) return { error: 'Stock mínimo inválido' };
  return { item: { nombre: String(nombre).trim(), cantidad: cantidadNum, unidad, stockMinimo: minimoNum, proveedor: proveedor ? String(proveedor).trim() : null } };
}

exports.listar = async (req, res) => {
  if (!permitido(req)) return res.status(403).json({ error: 'No tienes permiso para ver los insumos' });
  try { return res.json(await insumoDao.findAll()); }
  catch (error) { console.error('Error al obtener insumos:', error); return res.status(500).json({ error: 'Error al obtener los insumos' }); }
};
exports.crear = async (req, res) => {
  if (!permitido(req)) return res.status(403).json({ error: 'No tienes permiso para registrar insumos' });
  const parsed = datosValidos(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  try { return res.status(201).json(await insumoDao.create(parsed.item)); }
  catch (error) { console.error('Error al registrar insumo:', error); return res.status(500).json({ error: 'Error al registrar el insumo' }); }
};
exports.actualizar = async (req, res) => {
  if (!permitido(req)) return res.status(403).json({ error: 'No tienes permiso para editar insumos' });
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
  const parsed = datosValidos(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  try {
    const item = await insumoDao.update(id, parsed.item);
    if (!item) return res.status(404).json({ error: 'Insumo no encontrado' });
    return res.json(item);
  } catch (error) { console.error('Error al actualizar insumo:', error); return res.status(500).json({ error: 'Error al actualizar el insumo' }); }
};
exports.eliminar = async (req, res) => {
  if (!permitido(req)) return res.status(403).json({ error: 'No tienes permiso para eliminar insumos' });
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
  try {
    if (!await insumoDao.delete(id)) return res.status(404).json({ error: 'Insumo no encontrado' });
    return res.json({ ok: true });
  } catch (error) { console.error('Error al eliminar insumo:', error); return res.status(500).json({ error: 'Error al eliminar el insumo' }); }
};
