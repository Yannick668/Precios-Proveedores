import express from 'express';
import { pool } from '../../db/connection.js';

const router = express.Router();

router.post('/sync-to-usfoods', async (req, res) => {
  try {
    const result = await pool.query(`
      INSERT INTO precios_proveedores_usfoods (
        fecha, group_name, clave, nombre, product_brand,
        package_size, product_price, uom, storage_description,
        quantity, unit_price
      )
      SELECT
        ph.fecha,
        ph.categoria AS group_name,
        ph.clave,
        ph.descripcion AS nombre,
        ph.marca,
        ph.tamaño,
        ph.precio_case,
        ph.unidad,
        raw.storage_description,
        ph.cantidad,
        ph.precio_unit
      FROM bd_precios_historicos ph
      JOIN precios_raw_usfoods raw
        ON ph.fecha = raw.fecha AND ph.clave = raw.clave
      WHERE ph.proveedor = 'USFoods'
        AND NOT EXISTS (
          SELECT 1 FROM precios_proveedores_usfoods p
          WHERE p.fecha = ph.fecha AND p.clave = ph.clave
        )
    `);

    res.status(200).json({
      message: '✅ Sincronización a precios_proveedores_usfoods completada',
      registros_insertados: result.rowCount
    });

  } catch (error) {
    console.error('❌ Error al sincronizar USFoods:', error);
    res.status(500).json({ error: 'Error al sincronizar USFoods' });
  }
});

export default router;
