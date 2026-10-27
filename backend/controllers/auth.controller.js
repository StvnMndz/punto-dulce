const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const empleadoDao = require('../daos/empleado.dao');
const { JWT_SECRET } = require('../middleware/auth');

function crearToken(empleado) {
  return jwt.sign(empleado, JWT_SECRET, { expiresIn: '8h' });
}

exports.registro = async (req, res) => {
  try {
    const { nombre_completo, telefono, usuario, password } = req.body || {};
    if (!nombre_completo || !usuario || !password) {
      return res.status(400).json({ error: 'Completa nombre, usuario y contraseña' });
    }
    if (String(password).length < 4) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
    }
    if (await empleadoDao.findByUsername(usuario)) {
      return res.status(409).json({ error: 'Ese usuario ya existe, elige otro' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = await empleadoDao.create({ nombre: nombre_completo, telefono, usuario, passwordHash });
    const empleado = { id, nombre: nombre_completo, usuario, rol: 'pendiente' };
    return res.status(201).json({ token: crearToken(empleado), empleado });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ese usuario ya existe, elige otro' });
    console.error('Error al registrar empleado:', error);
    return res.status(500).json({ error: 'Error del servidor al registrar la cuenta' });
  }
};

exports.login = async (req, res) => {
  try {
    const { usuario, password } = req.body || {};
    if (!usuario || !password) return res.status(400).json({ error: 'Ingresa usuario y contraseña' });
    const row = await empleadoDao.findByUsername(usuario);
    if (!row) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    if (!row.activo) return res.status(403).json({ error: 'Esta cuenta está deshabilitada, contacta a un administrador' });
    if (!await bcrypt.compare(password, row.password_hash)) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const empleado = { id: row.id, nombre: row.nombre_completo, usuario: row.usuario, rol: row.rol };
    return res.json({ token: crearToken(empleado), empleado });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    return res.status(500).json({ error: 'Error del servidor al iniciar sesión' });
  }
};

exports.me = async (req, res) => {
  try {
    const empleado = await empleadoDao.findById(req.empleado.id);
    if (!empleado) return res.status(404).json({ error: 'Cuenta no encontrada' });
    return res.json(empleado);
  } catch (error) {
    console.error('Error al consultar la cuenta:', error);
    return res.status(500).json({ error: 'No se pudieron consultar los datos de la cuenta' });
  }
};
