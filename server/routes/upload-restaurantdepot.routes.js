import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import fs from 'fs';
import { pool } from '../db/connection.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // Carpeta temporal

router.post('/upload-restaurantdepot', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;

    // Leer Excel (primera hoja)
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: ''
    });

    let filasInsertadas = 0;

    for (const row of data) {
      // Conversión de fecha (Excel serial o string)
      let fecha;
      if (typeof row['fecha'] === 'number') {
        fecha = xlsx.SSF.format('yyyy-mm-dd', row['fecha']);
      } else if (typeof row['fecha'] === 'string') {
        fecha = new Date(row['fecha']).toISOString().split('T')[0];
      } else {
        fecha = null;
      }

      await pool.query(
        `INSERT INTO precios_proveedores_restaurantdepot
        (fecha, upc, clave, nombre, category, unit_case, qty, estimated_price, qty2, unit_price, package_size, um)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          fecha,
          row['UPC'],
          row['clave'],
          row['Description'],
          row['Category'],
          row['Unit/Case'],
          parseInt(row['Qty']) || null,
          parseFloat(row['Est.Price']) || null,
          parseInt(row['Qty2']) || null,
          parseFloat(row['Unit Price']) || null,
          row['package'],
          row['UM']
        ]
      );

      filasInsertadas++;
    }

    fs.unlinkSync(filePath); // Eliminar temporal

    res.status(200).json({
      message: '✅ Archivo Restaurant Depot procesado con éxito',
      filas_insertadas: filasInsertadas
    });

  } catch (error) {
    console.error('❌ Error al procesar archivo Restaurant Depot:', error);
    res.status(500).json({ error: 'Error al procesar archivo Excel de Restaurant Depot' });
  }
});

export default router;
