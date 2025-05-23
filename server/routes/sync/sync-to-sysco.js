import express from 'express';
import { pool } from '../../db/connection.js';

const router = express.Router();

router.post('/sync-to-sysco', async (req, res) => {
  try {
    const result = await pool.query(`
      INSERT INTO precios_proveedores_sysco (
        fecha, clave, pack, size, unit, brand, nombre,
        category, case_price, split, net_weight, stock,
        quantity, unit_price
      )
      SELECT
        ph.fecha,
        ph.clave,
        ph.pack,
        ph.tamaño AS size,
        ph.unidad AS unit,
        ph.marca AS brand,
        ph.descripcion AS nombre,
        ph.categoria AS category,
        ph.precio_case AS case_price,
        raw.split,
        raw.net_weight,
        raw.stock,
        ph.cantidad AS quantity,
        ph.precio_unit AS unit_price
      FROM bd_precios_historicos ph
      JOIN precios_raw_sysco raw
        ON ph.fecha = raw.fecha AND ph.clave = raw.supc
      WHERE ph.proveedor = 'Sysco'
        AND NOT EXISTS (
          SELECT 1 FROM precios_proveedores_sysco p
          WHERE p.fecha = ph.fecha AND p.clave = ph.clave
        )
    `);

    res.status(200).json({
      message: '✅ Sincronización a precios_proveedores_sysco completada',
      registros_insertados: result.rowCount
    });

  } catch (error) {
    console.error('❌ Error al sincronizar Sysco:', error);
    res.status(500).json({ error: 'Error al sincronizar Sysco' });
  }
});

export default router;
