const pool = require('../db');
const SELECT = `SELECT id, cat, nombre, descripcion, precio, icono, personalizable, disponible, media FROM productos`;

module.exports = {
  async findAll() {
    const [rows] = await pool.query(`${SELECT} ORDER BY nombre ASC`);
    return rows;
  },
  async findById(id) {
    const [rows] = await pool.query(`${SELECT} WHERE id = ?`, [id]);
    return rows[0] || null;
  },
  async create(producto) {
    await pool.query(
      `INSERT INTO productos (id, cat, nombre, descripcion, precio, icono, personalizable, disponible, media)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [producto.id, producto.cat, producto.nombre, producto.descripcion, producto.precio,
        producto.icono, producto.personalizable, producto.disponible, producto.media]
    );
    return this.findById(producto.id);
  },
  async update(id, producto) {
    const [result] = await pool.query(
      `UPDATE productos SET cat = ?, nombre = ?, descripcion = ?, precio = ?, icono = ?,
       personalizable = ?, disponible = ?, media = ? WHERE id = ?`,
      [producto.cat, producto.nombre, producto.descripcion, producto.precio, producto.icono,
        producto.personalizable, producto.disponible, producto.media, id]
    );
    return result.affectedRows ? this.findById(id) : null;
  },
  async delete(id) {
    const [result] = await pool.query('DELETE FROM productos WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};
