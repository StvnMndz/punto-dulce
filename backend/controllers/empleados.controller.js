const empleadoDao = require('../daos/empleado.dao');

const ROLES_VALIDOS = ['pendiente', 'administrador', 'ventas', 'produccion'];

exports.listar = async (_req, res) => {
  try {
    return res.json(await empleadoDao.findAll());
  } catch (error) {
    console.error('Error al listar empleados:', error);
    return res.status(500).json({ error: 'No se pudo obtener la lista de empleados' });
  }
};

exports.cambiarRol = async (req, res) => {
  const { rol } = req.body || {};
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
  if (!ROLES_VALIDOS.includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
  if (id === req.empleado.id && rol !== 'administrador') {
    return res.status(400).json({ error: 'No puedes quitarte tu propio rol de administrador desde aquí' });
  }
  try {
    if (!await empleadoDao.updateRole(id, rol)) return res.status(404).json({ error: 'Empleado no encontrado' });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Error al cambiar el rol:', error);
    return res.status(500).json({ error: 'No se pudo actualizar el rol' });
  }
};

exports.cambiarEstado = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
  if (id === req.empleado.id) return res.status(400).json({ error: 'No puedes deshabilitar tu propia cuenta' });
  try {
    if (!await empleadoDao.updateActive(id, req.body?.activo ? 1 : 0)) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    return res.json({ ok: true });
  } catch (error) {
    console.error('Error al cambiar estado del empleado:', error);
    return res.status(500).json({ error: 'No se pudo actualizar el estado del empleado' });
  }
};
