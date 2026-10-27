const pool = require('../db');

module.exports = {
  async findAll() {
    const [rows] = await pool.query(
      `SELECT oc.id, d.id AS detalle_id, COALESCE(d.insumo_id, oc.insumo_id) AS insumo_id,
              COALESCE(d.insumo_nombre, oc.insumo_nombre) AS insumo_nombre,
              COALESCE(d.cantidad, oc.cantidad) AS cantidad,
              COALESCE(d.unidad, oc.unidad) AS unidad,
              COALESCE(d.costo, oc.costo) AS costo,
              oc.tienda, oc.fecha, oc.fecha_iso, oc.registrado_por
       FROM ordenes_compra oc
       LEFT JOIN detalle_orden_compra d ON d.orden_id = oc.id
       ORDER BY oc.fecha DESC, oc.id DESC, d.id ASC`
    );
    return rows;
  },

  async createOrder({ id, items, tienda, fecha, fechaISO, registradoPor }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const orderId = id || `OC-${Date.now()}`;
      const processed = [];
      for (const item of items) {
        let insumoId = item.insumoId ? Number(item.insumoId) : null;
        if (insumoId) {
          const [result] = await connection.query(
            'UPDATE insumos SET cantidad = cantidad + ?, actualizado_at = CURRENT_TIMESTAMP WHERE id = ?',
            [Number(item.cantidad), insumoId]
          );
          if (!result.affectedRows) throw Object.assign(new Error('INSUMO_NOT_FOUND'), { code: 'INSUMO_NOT_FOUND' });
        } else {
          const [result] = await connection.query(
            'INSERT INTO insumos (nombre, cantidad, unidad, stock_minimo, proveedor) VALUES (?, ?, ?, 0, ?)',
            [item.insumoNombre, Number(item.cantidad), item.unidad || 'unidades', tienda || null]
          );
          insumoId = result.insertId;
        }
        processed.push({ insumoId, insumoNombre: item.insumoNombre, cantidad: Number(item.cantidad),
          unidad: item.unidad || 'unidades', costo: Number(item.costo) || 0 });
      }

      const first = processed[0];
      await connection.query(
        `INSERT INTO ordenes_compra (id, insumo_id, insumo_nombre, cantidad, unidad, costo, tienda, fecha, fecha_iso, registrado_por)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, first.insumoId, first.insumoNombre, first.cantidad, first.unidad, first.costo,
          tienda || null, fecha || new Date().toISOString().slice(0, 10), fechaISO || new Date(), registradoPor || '-']
      );
      for (const item of processed) {
        await connection.query(
          `INSERT INTO detalle_orden_compra (orden_id, insumo_id, insumo_nombre, cantidad, unidad, costo)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orderId, item.insumoId, item.insumoNombre, item.cantidad, item.unidad, item.costo]
        );
      }
      await connection.commit();
      return { orderId, itemsSaved: processed.length };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
  async updateItem(detalleId, { cantidad, costo, tienda, fecha, fechaISO }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query(
        `SELECT d.id, d.orden_id, d.insumo_id, d.cantidad AS cantidad_anterior
         FROM detalle_orden_compra d WHERE d.id = ? FOR UPDATE`, [detalleId]
      );
      const item = rows[0];
      if (!item) { const error = new Error('COMPRA_NOT_FOUND'); error.code = 'COMPRA_NOT_FOUND'; throw error; }
      if (item.insumo_id) {
        const delta = Number(cantidad) - Number(item.cantidad_anterior);
        if (delta !== 0) {
          const [stockResult] = await connection.query(
            'UPDATE insumos SET cantidad = cantidad + ?, actualizado_at = CURRENT_TIMESTAMP WHERE id = ? AND cantidad + ? >= 0',
            [delta, item.insumo_id, delta]
          );
          if (!stockResult.affectedRows) { const error = new Error('STOCK_INSUFFICIENT'); error.code = 'STOCK_INSUFFICIENT'; throw error; }
        }
      }
      await connection.query('UPDATE detalle_orden_compra SET cantidad = ?, costo = ? WHERE id = ?', [cantidad, costo, detalleId]);
      await connection.query('UPDATE ordenes_compra SET tienda = ?, fecha = ?, fecha_iso = ? WHERE id = ?', [tienda || null, fecha, fechaISO, item.orden_id]);
      await connection.commit();
      return true;
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  },
  async deleteItem(detalleId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query(
        `SELECT d.id, d.orden_id, d.insumo_id, d.cantidad FROM detalle_orden_compra d WHERE d.id = ? FOR UPDATE`, [detalleId]
      );
      const item = rows[0];
      if (!item) { const error = new Error('COMPRA_NOT_FOUND'); error.code = 'COMPRA_NOT_FOUND'; throw error; }
      if (item.insumo_id) {
        const [stockResult] = await connection.query(
          'UPDATE insumos SET cantidad = cantidad - ?, actualizado_at = CURRENT_TIMESTAMP WHERE id = ? AND cantidad >= ?',
          [item.cantidad, item.insumo_id, item.cantidad]
        );
        if (!stockResult.affectedRows) { const error = new Error('STOCK_INSUFFICIENT'); error.code = 'STOCK_INSUFFICIENT'; throw error; }
      }
      await connection.query('DELETE FROM detalle_orden_compra WHERE id = ?', [detalleId]);
      const [[remaining]] = await connection.query('SELECT COUNT(*) AS total FROM detalle_orden_compra WHERE orden_id = ?', [item.orden_id]);
      if (!Number(remaining.total)) await connection.query('DELETE FROM ordenes_compra WHERE id = ?', [item.orden_id]);
      await connection.commit();
      return true;
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }
};
