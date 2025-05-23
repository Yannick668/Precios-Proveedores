import { pool } from '../db/connection.js';

export async function syncToRestaurantDepot(fecha) {
  try {
    const datos = await pool.query(`
      SELECT
        h.fecha,
        r.upc,
        h.clave,
        h.descripcion AS nombre,
        h.categoria AS category,
        h.tamaño AS unit_per_case,
        h.cantidad AS quantity,
        h.precio_case AS price,
        r.qty2 AS quantity2,
        h.precio_unit AS unit_price,
        h.tamaño AS package_size,
        h.unidad AS uom
      FROM bd_precios_historicos h
      JOIN precios_raw_restaurantdepot r ON h.fecha = r.fecha AND h.clave = r.clave
      WHERE h.proveedor = 'RestaurantDEPOT' AND h.fecha = $1
    `, [fecha]);

    if (datos.rowCount === 0) {
      console.log('⚠️ No se encontraron datos para sincronizar.');
      return;
    }

    let insertadas = 0;

    for (const row of datos.rows) {
      await pool.query(
        `INSERT INTO precios_proveedores_restaurantdepot
        (fecha, upc, clave, nombre, category, unit_per_case, quantity, price, quantity2, unit_price, package_size, uom)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (fecha, clave) DO NOTHING`,
        [
          row.fecha,
          row.upc,
          row.clave,
          row.nombre,
          row.category,
          row.unit_per_case,
          row.quantity,
          row.price,
          row.quantity2,
          row.unit_price,
          row.package_size,
          row.uom
        ]
      );
      insertadas++;
    }

    console.log(`✅ Sincronización exitosa: ${insertadas} filas insertadas en precios_proveedores_restaurantdepot`);
  } catch (error) {
    console.error('❌ Error al sincronizar con precios_proveedores_restaurantdepot:', error);
  }
}
