import { pool } from '../db/connection.js';

export const obtenerProductos = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM catalogo_pp');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};
