import { pool } from '../db/connection.js';

// 1. Obtener productos únicos
export const obtenerProductos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT nombre_comun
      FROM bd_precios_historicos
      WHERE nombre_comun IS NOT NULL
      ORDER BY nombre_comun ASC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

// 2. Consulta de precios históricos con filtros
export const consultarPreciosHistoricos = async (req, res) => {
  const { proveedor, clave, nombre_comun, fecha_inicio, fecha_fin } = req.query;

  const condiciones = [];
  const valores = [];
  let index = 1;

  if (proveedor) {
    condiciones.push(`proveedor = $${index++}`);
    valores.push(proveedor);
  }
  if (clave) {
    condiciones.push(`clave = $${index++}`);
    valores.push(clave);
  }
  if (nombre_comun) {
    condiciones.push(`nombre_comun ILIKE $${index++}`);
    valores.push(`%${nombre_comun}%`);
  }
  if (fecha_inicio && fecha_fin) {
    condiciones.push(`fecha BETWEEN $${index++} AND $${index++}`);
    valores.push(fecha_inicio, fecha_fin);
  }

  const whereClause = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  try {
    const result = await pool.query(`
      SELECT *
      FROM bd_precios_historicos
      ${whereClause}
      ORDER BY fecha DESC
      LIMIT 500
    `, valores);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Error al consultar precios históricos:', error);
    res.status(500).json({ error: 'Error al consultar precios históricos' });
  }
};

// 3. Variación de precios para gráfica
export const consultarVariacionPrecios = async (req, res) => {
  const { nombre_comun, proveedor } = req.query;

  if (!nombre_comun) {
    return res.status(400).json({ error: 'El parámetro nombre_comun es requerido' });
  }

  const condiciones = [`nombre_comun ILIKE $1`];
  const valores = [`%${nombre_comun}%`];
  let index = 2;

  if (proveedor) {
    condiciones.push(`proveedor = $${index++}`);
    valores.push(proveedor);
  }

  const whereClause = `WHERE ${condiciones.join(' AND ')}`;

  try {
    const result = await pool.query(`
      SELECT fecha, proveedor, precio_unit
      FROM bd_precios_historicos
      ${whereClause}
      ORDER BY fecha ASC
    `, valores);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Error al consultar variación de precios:', error);
    res.status(500).json({ error: 'Error al consultar variación de precios' });
  }
};

// 4. Consulta por proveedor (Sysco, USFoods, RestaurantDepot)
export const consultarPreciosPorProveedor = async (req, res) => {
  const nombre = req.params.nombre?.toLowerCase();
  const fecha = req.query.fecha;

  let tabla = '';
  if (nombre === 'sysco') tabla = 'precios_proveedores_sysco';
  else if (nombre === 'usfoods') tabla = 'precios_proveedores_usfoods';
  else if (nombre === 'restaurantdepot') tabla = 'precios_proveedores_restaurantdepot';
  else return res.status(400).json({ error: 'Proveedor no válido' });

  try {
    const result = await pool.query(`
      SELECT * FROM ${tabla}
      ${fecha ? 'WHERE fecha = $1' : ''}
      ORDER BY fecha DESC
    `, fecha ? [fecha] : []);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Error al consultar precios por proveedor:', error);
    res.status(500).json({ error: 'Error al consultar precios por proveedor' });
  }
};
