import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import fs from 'fs';
import { pool } from '../db/connection.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // Carpeta temporal

// Función para extraer la fecha del nombre del archivo en formato MM/DD/YYYY
function extractFechaFromFilename(filename) {
  const name = filename.replace('.xlsx', '');
  const parts = name.split('_');
  if (parts.length >= 4) {
    const month = parts[1];
    const day = parts[2];
    const year = parts[3];
return `${year}-${month}-${day}`;
  }
  return null;
}

router.post('/upload-sysco', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;
  const filename = req.file.originalname;

  const fecha = extractFechaFromFilename(filename);
  if (!fecha) {
    return res.status(400).json({ error: '❌ No se pudo extraer la fecha del nombre del archivo' });
  }

  try {
    // Verificar si ya existe información para esa fecha
    const result = await pool.query('SELECT 1 FROM precios_proveedores_sysco WHERE fecha = $1 LIMIT 1', [fecha]);
    if (result.rowCount > 0) {
      fs.unlinkSync(filePath);
      return res.status(200).json({
        message: `⚠️ Ya existen registros para la fecha ${fecha}. El archivo fue ignorado.`,
        fecha: fecha
      });
    }

    // Leer Excel
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    let filasInsertadas = 0;

    for (const row of data) {
      await pool.query(
        `INSERT INTO precios_proveedores_sysco 
        (fecha, clave, pack, size, unit, brand, nombre, category, case_price, split, net_weight, stock, quantity, unit_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          fecha,
          row['SUPC'],
          row['Pack'],
          row['Size'],
          row['Unit'],
          row['Brand'],
          row['Desc'],
          row['Cat'],
          parseFloat(row['Case $']) || null,
          parseFloat(row['Split $']) || null,
          parseFloat(row['Net Wt']) || null,
          row['Stock'],
          parseInt(row['Qty']) || null,
          parseFloat(row['Unit Price']) || null
        ]
      );
      filasInsertadas++;
    }

    fs.unlinkSync(filePath);

    res.status(200).json({
      message: '✅ Archivo procesado exitosamente',
      fecha: fecha,
      filas_insertadas: filasInsertadas
    });

  } catch (error) {
    console.error('❌ Error al procesar archivo Sysco:', error);
    res.status(500).json({ error: 'Error interno al procesar el archivo' });
  }
});

export default router;
