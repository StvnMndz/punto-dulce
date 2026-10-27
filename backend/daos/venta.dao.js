const pool = require('../db');

module.exports = {
  async create(venta) {
    await pool.query(
      `INSERT INTO ventas (id, tipo, nombre, telefono, notas, total, estado, detalle, fecha_iso, pedido_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [venta.id, 'venta', venta.nombre, venta.telefono || '', venta.metodoPago || null,
        venta.total, 'Completada', venta.detalle, venta.fechaIso, venta.pedidoId || null]
    );
  },
  async update(id, venta) {
    const [result] = await pool.query(
      `UPDATE ventas SET nombre = ?, telefono = ?, notas = ?, total = ?, detalle = ?, pedido_id = ? WHERE id = ?`,
      [venta.nombre, venta.telefono || '', venta.metodoPago || 'Pendiente', venta.total,
        venta.detalle, venta.pedidoId || null, id]
    );
    return result.affectedRows > 0 || !!(await this.findById(id));
  },
  async delete(id, soloSemana = false) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const scope = soloSemana ? ' AND YEARWEEK(fecha, 1) = YEARWEEK(CURDATE(), 1)' : '';
      const [matches] = await connection.query(`SELECT id FROM ventas WHERE id = ?${scope} FOR UPDATE`, [id]);
      if (!matches.length) { await connection.rollback(); return false; }
      await connection.query('DELETE FROM detalle_ventas WHERE venta_id = ?', [id]);
      const [result] = await connection.query('DELETE FROM ventas WHERE id = ?', [id]);
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  },
  async findAll({ q, desde, hasta, metodoPago, soloSemana } = {}) {
    const conditions = [];
    const params = [];
    if (q) {
      conditions.push('(id LIKE ? OR nombre LIKE ? OR telefono LIKE ?)');
      const term = `%${q}%`;
      params.push(term, term, term);
    }
    if (desde) { conditions.push('fecha >= ?'); params.push(`${desde} 00:00:00`); }
    if (hasta) { conditions.push('fecha <= ?'); params.push(`${hasta} 23:59:59`); }
    if (metodoPago) { conditions.push('LOWER(notas) = ?'); params.push(metodoPago.toLowerCase()); }
    if (soloSemana) conditions.push('YEARWEEK(fecha, 1) = YEARWEEK(CURDATE(), 1)');
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(`SELECT * FROM ventas ${where} ORDER BY fecha DESC`, params);
    return rows;
  },
  async findOrdersWithoutSales({ q, desde, hasta, metodoPago, soloSemana } = {}) {
    if (metodoPago && metodoPago.toLowerCase() !== 'pendiente') return [];
    const conditions = ['NOT EXISTS (SELECT 1 FROM ventas v WHERE v.pedido_id = p.codigo OR v.id = p.codigo)'];
    const params = [];
    if (q) {
      conditions.push('(p.codigo LIKE ? OR p.cliente_nombre LIKE ? OR p.cliente_telefono LIKE ?)');
      const term = `%${q}%`;
      params.push(term, term, term);
    }
    if (desde) { conditions.push('p.created_at >= ?'); params.push(`${desde} 00:00:00`); }
    if (hasta) { conditions.push('p.created_at <= ?'); params.push(`${hasta} 23:59:59`); }
    if (soloSemana) conditions.push('YEARWEEK(p.created_at, 1) = YEARWEEK(CURDATE(), 1)');
    const [rows] = await pool.query(
      `SELECT p.codigo, p.cliente_nombre, p.cliente_telefono, p.items, p.total, p.created_at
       FROM pedidos p WHERE ${conditions.join(' AND ')} ORDER BY p.created_at DESC`, params
    );
    return rows.map(order => ({
      id: order.codigo, pedido_id: order.codigo, nombre: order.cliente_nombre,
      telefono: order.cliente_telefono, total: order.total, fecha: order.created_at,
      fecha_iso: order.created_at, notas: 'Pendiente', estado: 'Pedido',
      detalle: JSON.stringify({ items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items, metodoPago: 'Pendiente' }),
      desde_pedido: true
    }));
  },
  async findById(id, soloSemana = false) {
    const scope = soloSemana ? ' AND YEARWEEK(fecha, 1) = YEARWEEK(CURDATE(), 1)' : '';
    const [rows] = await pool.query(`SELECT * FROM ventas WHERE id = ?${scope}`, [id]);
    return rows[0] || null;
  }
};
