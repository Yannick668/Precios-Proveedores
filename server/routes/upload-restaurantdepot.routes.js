import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import fs from 'fs';
import { pool } from '../db/connection.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
const proveedor = 'RestaurantDEPOT';

// Función para extraer fecha del nombre de archivo, ej: Rest_Depot_04_08_2025.xlsx → 2025-04-08
function extractFecha(filename) {
  const parts = filename.replace('.xlsx', '').split('_');
  if (parts.length >= 4) {
    const [_, mes, dia, anio] = parts;
    return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }
  return null;
}

router.post('/upload-restaurantdepot', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;
  const filename = req.file.originalname;
  const fecha = extractFecha(filename);

  if (!fecha) {
    return res.status(400).json({ error: '❌ No se pudo extraer la fecha del nombre del archivo' });
  }

  try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // Empezamos desde la fila 10, donde están los encabezados
    const data = xlsx.utils.sheet_to_json(sheet, { defval: '', range: 9 });

    let filasInsertadas = 0;

    for (const row of data) {
      const clave = row['Item'];
      let nombre_comun = null;
      let unidad = null;
      let cantidad = null;
      let size = null;
      let pack = null;
      let precioUnitario = null;

      // Buscar datos en catálogo
      const catalogo = await pool.query(
        `SELECT * FROM catalogo_pp WHERE proveedor = $1 AND clave = $2 LIMIT 1`,
        [proveedor, clave]
      );

      if (catalogo.rowCount > 0) {
        const producto = catalogo.rows[0];
        nombre_comun = producto.nombre_estandar;
        unidad = producto.unidad;
        cantidad = producto.qty;
        size = producto.size;
        pack = producto.pack;

        const precioCase = parseFloat(row['Est.Price']) || null;
        const totalUnidades = (cantidad || 1) * (pack || 1);
        precioUnitario = precioCase && totalUnidades > 0 ? precioCase / totalUnidades : null;

        await pool.query(
          `INSERT INTO bd_precios_historicos 
          (fecha, proveedor, clave, precio_case, precio_unit, cantidad, nombre_común, descripcion, categoria, marca, tamaño, unidad, size_unidad)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            fecha,
            proveedor,
            clave,
            precioCase,
            precioUnitario,
            cantidad,
            nombre_comun,
            row['Description'],
            row['Category'],
            null, // Marca no disponible directamente
            row['Unit/Case'],
            row['UM'],
            `${row['Unit/Case']} - ${row['UM']}`
          ]
        );

        filasInsertadas++;
      }
    }

    fs.unlinkSync(filePath);

    res.status(200).json({
      message: '✅ Archivo Restaurant Depot procesado correctamente',
      fecha,
      filas_insertadas: filasInsertadas
    });

  } catch (error) {
    console.error('❌ Error al procesar archivo Restaurant Depot:', error);
    res.status(500).json({ error: 'Error interno al procesar archivo Restaurant Depot' });
  }
});

export default router;
