// DAO de consultas: guarda mensajes y devuelve la bandeja para el personal.
const pool = require('../db');

module.exports = {
  async create(consulta) {
    const [result] = await pool.query(
      'INSERT INTO consultas (nombre, contacto, tema, mensaje) VALUES (?, ?, ?, ?)',
      [consulta.nombre, consulta.contacto, consulta.tema, consulta.mensaje]
    );
    return result.insertId;
  },

  async findMany() {
    const [rows] = await pool.query(
      'SELECT id, nombre, contacto, tema, mensaje, created_at FROM consultas ORDER BY created_at DESC, id DESC'
    );
    return rows;
  }
};
