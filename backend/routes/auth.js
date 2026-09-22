const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/registro
 * Cualquier persona puede crear su cuenta de empleado, pero SIEMPRE
 * queda con rol = 'pendiente'. No puede elegir "administrador" ni
 * "ventas" al registrarse: eso lo asigna después un administrador
 * desde el panel (pestaña "Personal").
 */
router.post('/registro', async (req, res) => {
  try {
    const { nombre_completo, telefono, usuario, password } = req.body;

    if (!nombre_completo || !usuario || !password) {
      return res.status(400).json({ error: 'Completa nombre, usuario y contraseña' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
    }

    const [existentes] = await pool.query('SELECT id FROM empleados WHERE usuario = ?', [usuario]);
    if (existentes.length > 0) {
      return res.status(409).json({ error: 'Ese usuario ya existe, elige otro' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const [resultado] = await pool.query(
      `INSERT INTO empleados (nombre_completo, telefono, usuario, password_hash, rol, activo)
       VALUES (?, ?, ?, ?, 'pendiente', 1)`,
      [nombre_completo, telefono || null, usuario, password_hash]
    );

    // Se le entrega token igual, así puede entrar al panel y ver el
    // aviso de "cuenta pendiente de asignación de rol".
    const payload = { id: resultado.insertId, nombre: nombre_completo, usuario, rol: 'pendiente' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    res.status(201).json({ token, empleado: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor al registrar la cuenta' });
  }
});

/** POST /api/auth/login */
router.post('/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;
    if (!usuario || !password) {
      return res.status(400).json({ error: 'Ingresa usuario y contraseña' });
    }

    const [filas] = await pool.query('SELECT * FROM empleados WHERE usuario = ?', [usuario]);
    const emp = filas[0];
    if (!emp) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    if (!emp.activo) return res.status(403).json({ error: 'Esta cuenta está deshabilitada, contacta a un administrador' });

    const claveOk = await bcrypt.compare(password, emp.password_hash);
    if (!claveOk) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const payload = { id: emp.id, nombre: emp.nombre_completo, usuario: emp.usuario, rol: emp.rol };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    res.json({ token, empleado: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor al iniciar sesión' });
  }
});

/** GET /api/auth/me — datos actuales de la sesión (para refrescar el rol) */
router.get('/me', requireAuth, async (req, res) => {
  const [filas] = await pool.query(
    'SELECT id, nombre_completo, usuario, telefono, rol, activo FROM empleados WHERE id = ?',
    [req.empleado.id]
  );
  if (!filas[0]) return res.status(404).json({ error: 'Cuenta no encontrada' });
  res.json(filas[0]);
});

module.exports = router;
