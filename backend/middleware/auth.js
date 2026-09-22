const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'cambia_esta_clave';

// Verifica que venga un token válido en el header Authorization: Bearer <token>
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No has iniciado sesión' });

  try {
    req.empleado = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Tu sesión expiró o no es válida, ingresa de nuevo' });
  }
}

// Restringe una ruta a ciertos roles. Ej: requireRole('administrador')
function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.empleado) return res.status(401).json({ error: 'No has iniciado sesión' });
    if (!rolesPermitidos.includes(req.empleado.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para realizar esta acción' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, JWT_SECRET };
