const pool = require('../db');

module.exports = {
  async create(pedido) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [pedidoResult] = await connection.query(
        `INSERT INTO pedidos (codigo, cliente_nombre, cliente_telefono, tipo, direccion, fecha_entrega, notas, items, total, anticipo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [pedido.codigo, pedido.nombre, pedido.telefono, pedido.tipo, pedido.direccion || null,
          pedido.fechaEntrega || null, pedido.notas || null, JSON.stringify(pedido.items), pedido.total, pedido.anticipo ?? null]
      );
      await connection.query(
        `INSERT INTO ventas (id, tipo, nombre, telefono, notas, total, estado, detalle, fecha_iso, pedido_id)
         VALUES (?, 'venta', ?, ?, ?, ?, 'Completada', ?, ?, ?)`,
        [pedido.codigo, pedido.nombre, pedido.telefono || '', pedido.metodoPago || 'Pendiente', pedido.total,
          JSON.stringify({ items: pedido.items, metodoPago: pedido.metodoPago || 'Pendiente' }), new Date().toISOString(), pedidoResult.insertId]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
  async findByCode(codigo) {
    const [rows] = await pool.query('SELECT codigo, cliente_nombre, cliente_telefono, tipo, items, total FROM pedidos WHERE codigo = ?', [codigo]);
    return rows[0] || null;
  },
  async findForTracking(codigo, telefono) {
    const [rows] = await pool.query(
      `SELECT codigo, tipo, estado, total, items, fecha_entrega, created_at, updated_at
       FROM pedidos WHERE codigo = ? AND cliente_telefono = ?`, [codigo, telefono]
    );
    return rows[0] || null;
  },
  async findMany({ where, params, limit, offset, soloSemana }) {
    const weekClause = soloSemana ? `${where ? ' AND' : 'WHERE'} YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)` : '';
    const scopedWhere = `${where}${weekClause}`;
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM pedidos ${scopedWhere}`, params);
    const [rows] = await pool.query(
      `SELECT * FROM pedidos ${scopedWhere} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return { rows, total: Number(countRows[0].total) };
  },
  async updateStatus(id, estado, soloSemana = false) {
    const scope = soloSemana ? ' AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)' : '';
    const [result] = await pool.query(`UPDATE pedidos SET estado = ? WHERE id = ?${scope}`, [estado, id]);
    return result.affectedRows > 0;
  }
};
