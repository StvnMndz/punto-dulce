const pool = require('../db');

const camposPublicos = `id, nombre_completo, usuario, telefono, rol, activo, fecha_registro`;

module.exports = {
  async findByUsername(usuario) {
    const [rows] = await pool.query('SELECT * FROM empleados WHERE usuario = ? LIMIT 1', [usuario]);
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT ${camposPublicos} FROM empleados WHERE id = ? LIMIT 1`, [id]
    );
    return rows[0] || null;
  },

  async create({ nombre, telefono, usuario, passwordHash }) {
    const [result] = await pool.query(
      `INSERT INTO empleados (nombre_completo, telefono, usuario, password_hash, rol, activo)
       VALUES (?, ?, ?, ?, 'pendiente', 1)`,
      [nombre, telefono || null, usuario, passwordHash]
    );
    return result.insertId;
  },

  async findAll() {
    const [rows] = await pool.query(
      `SELECT ${camposPublicos} FROM empleados ORDER BY fecha_registro DESC`
    );
    return rows;
  },

  async updateRole(id, rol) {
    const [result] = await pool.query('UPDATE empleados SET rol = ? WHERE id = ?', [rol, id]);
    return result.affectedRows > 0;
  },

  async updateActive(id, activo) {
    const [result] = await pool.query('UPDATE empleados SET activo = ? WHERE id = ?', [activo, id]);
    return result.affectedRows > 0;
  }
};
