const pool = require('../db');
const SELECT = `SELECT id, nombre, cantidad, unidad, stock_minimo, proveedor, actualizado_at FROM insumos`;

module.exports = {
  async findAll() { const [rows] = await pool.query(`${SELECT} ORDER BY nombre ASC`); return rows; },
  async findById(id) { const [rows] = await pool.query(`${SELECT} WHERE id = ?`, [id]); return rows[0] || null; },
  async create(item) {
    const [result] = await pool.query(
      'INSERT INTO insumos (nombre, cantidad, unidad, stock_minimo, proveedor) VALUES (?, ?, ?, ?, ?)',
      [item.nombre, item.cantidad, item.unidad, item.stockMinimo, item.proveedor]
    );
    return this.findById(result.insertId);
  },
  async update(id, item) {
    const [result] = await pool.query(
      'UPDATE insumos SET nombre = ?, cantidad = ?, unidad = ?, stock_minimo = ?, proveedor = ? WHERE id = ?',
      [item.nombre, item.cantidad, item.unidad, item.stockMinimo, item.proveedor, id]
    );
    return result.affectedRows ? this.findById(id) : null;
  },
  async delete(id) { const [result] = await pool.query('DELETE FROM insumos WHERE id = ?', [id]); return result.affectedRows > 0; }
};
