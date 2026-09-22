const express = require('express');
const pool = require('../db');

const router = express.Router();

/* Convierte una fila de MySQL al formato que usa el frontend */
function mapProduct(row) {
  return {
    id: row.id,
    cat: row.cat,
    name: row.nombre,
    desc: row.descripcion || '',
    price: Number(row.precio),
    icon: row.icono || '🍰',
    customizable: Boolean(row.personalizable),
    disponible: Boolean(row.disponible),
    media: row.media || `media-${row.cat}`
  };
}

/* =========================
   OBTENER TODOS
========================= */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        cat,
        nombre,
        descripcion,
        precio,
        icono,
        personalizable,
        disponible,
        media
      FROM productos
      ORDER BY nombre ASC
    `);

    res.json(rows.map(mapProduct));

  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({
      error: 'Error al obtener productos'
    });
  }
});

/* =========================
   OBTENER UNO
========================= */
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        id,
        cat,
        nombre,
        descripcion,
        precio,
        icono,
        personalizable,
        disponible,
        media
      FROM productos
      WHERE id = ?
      `,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Producto no encontrado'
      });
    }

    res.json(mapProduct(rows[0]));

  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({
      error: 'Error al obtener producto'
    });
  }
});

/* =========================
   CREAR PRODUCTO
========================= */
router.post('/', async (req, res) => {
  try {
    const {
      id,
      cat,
      name,
      desc,
      price,
      icon,
      customizable,
      disponible,
      media
    } = req.body;

    if (!name || !cat || price === undefined || Number(price) <= 0) {
      return res.status(400).json({
        error: 'Nombre, categoría y precio válido son obligatorios'
      });
    }

    const productId = id || `prod-${Date.now()}`;
    const productMedia = media || `media-${cat}`;

    await pool.query(
      `
      INSERT INTO productos
      (
        id,
        cat,
        nombre,
        descripcion,
        precio,
        icono,
        personalizable,
        disponible,
        media
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        productId,
        cat,
        name,
        desc || '',
        Number(price),
        icon || '🍰',
        customizable ? 1 : 0,
        disponible === false ? 0 : 1,
        productMedia
      ]
    );

    const [rows] = await pool.query(
      `
      SELECT
        id,
        cat,
        nombre,
        descripcion,
        precio,
        icono,
        personalizable,
        disponible,
        media
      FROM productos
      WHERE id = ?
      `,
      [productId]
    );

    res.status(201).json(mapProduct(rows[0]));

  } catch (error) {
    console.error('Error al crear producto:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Ya existe un producto con ese ID'
      });
    }

    res.status(500).json({
      error: 'Error al crear producto'
    });
  }
});

/* =========================
   ACTUALIZAR PRODUCTO
========================= */
router.put('/:id', async (req, res) => {
  try {
    const {
      cat,
      name,
      desc,
      price,
      icon,
      customizable,
      disponible,
      media
    } = req.body;

    if (!name || !cat || price === undefined || Number(price) <= 0) {
      return res.status(400).json({
        error: 'Nombre, categoría y precio válido son obligatorios'
      });
    }

    const productMedia = media || `media-${cat}`;

    const [result] = await pool.query(
      `
      UPDATE productos
      SET
        cat = ?,
        nombre = ?,
        descripcion = ?,
        precio = ?,
        icono = ?,
        personalizable = ?,
        disponible = ?,
        media = ?
      WHERE id = ?
      `,
      [
        cat,
        name,
        desc || '',
        Number(price),
        icon || '🍰',
        customizable ? 1 : 0,
        disponible === false ? 0 : 1,
        productMedia,
        req.params.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Producto no encontrado'
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        id,
        cat,
        nombre,
        descripcion,
        precio,
        icono,
        personalizable,
        disponible,
        media
      FROM productos
      WHERE id = ?
      `,
      [req.params.id]
    );

    res.json(mapProduct(rows[0]));

  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({
      error: 'Error al actualizar producto'
    });
  }
});

/* =========================
   ELIMINAR PRODUCTO
========================= */
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM productos WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Producto no encontrado'
      });
    }

    res.json({
      ok: true,
      mensaje: 'Producto eliminado correctamente'
    });

  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({
      error: 'Error al eliminar producto'
    });
  }
});

module.exports = router;
