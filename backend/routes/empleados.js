const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const ROLES_VALIDOS = ['pendiente', 'administrador', 'ventas', 'produccion'];

/**
 * GET /api/empleados
 * Solo un administrador puede ver la lista completa del personal,
 * para poder asignarles rol desde el panel.
 */
router.get('/', requireAuth, requireRole('administrador'), async (req, res) => {
  const [filas] = await pool.query(
    `SELECT id, nombre_completo, usuario, telefono, rol, activo, fecha_registro
     FROM empleados ORDER BY fecha_registro DESC`
  );
  res.json(filas);
});

/**
 * PUT /api/empleados/:id/rol
 * Solo un administrador puede cambiar el rol de otra cuenta
 * (de 'pendiente' a 'administrador', 'ventas' o 'produccion', o entre estos).
 */
router.put('/:id/rol', requireAuth, requireRole('administrador'), async (req, res) => {
  const { rol } = req.body;
  const id = Number(req.params.id);

  if (!ROLES_VALIDOS.includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  if (id === req.empleado.id && rol !== 'administrador') {
    return res.status(400).json({ error: 'No puedes quitarte tu propio rol de administrador desde aquí' });
  }

  const [resultado] = await pool.query('UPDATE empleados SET rol = ? WHERE id = ?', [rol, id]);
  if (resultado.affectedRows === 0) return res.status(404).json({ error: 'Empleado no encontrado' });

  res.json({ ok: true });
});

/**
 * PUT /api/empleados/:id/estado
 * Habilita o deshabilita una cuenta de empleado (solo administrador).
 */
router.put('/:id/estado', requireAuth, requireRole('administrador'), async (req, res) => {
  const { activo } = req.body;
  const id = Number(req.params.id);

  if (id === req.empleado.id) {
    return res.status(400).json({ error: 'No puedes deshabilitar tu propia cuenta' });
  }

  const [resultado] = await pool.query('UPDATE empleados SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
  if (resultado.affectedRows === 0) return res.status(404).json({ error: 'Empleado no encontrado' });

  res.json({ ok: true });
});

module.exports = router;
