import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import fs from 'fs';
import { pool } from '../db/connection.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // Carpeta temporal

// Extrae fecha del nombre: busca los últimos 3 fragmentos como MM_DD_YYYY → YYYY-MM-DD
function extractFechaSQL(filename) {
  const name = filename.replace('.xlsx', '');
  const parts = name.split('_');

  if (parts.length >= 3) {
    const [mes, dia, anio] = parts.slice(-3);
    return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }

  return null;
}

router.post('/upload-usfoods', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;
  const filename = req.file.originalname;

  const fecha = extractFechaSQL(filename);
  if (!fecha) {
    return res.status(400).json({ error: '❌ No se pudo extraer la fecha del nombre del archivo' });
  }

  try {
    // Verificar duplicado
    const result = await pool.query(
      'SELECT 1 FROM precios_proveedores_usfoods WHERE fecha = $1 LIMIT 1',
      [fecha]
    );
    if (result.rowCount > 0) {
      fs.unlinkSync(filePath);
      return res.status(200).json({
        message: `⚠️ Ya existen registros para la fecha ${fecha}. El archivo fue ignorado.`,
        fecha: fecha
      });
    }

    // Leer Excel (primera hoja con encabezados en la fila 2)
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: '', range: 1 });

    let filasInsertadas = 0;

    for (const row of data) {
      await pool.query(
        `INSERT INTO precios_proveedores_usfoods
        (fecha, group_name, clave, nombre, product_brand, package_size, product_price, uom, storage_description, quantity, unit_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          fecha,
          row['Group Name'],
          row['Product Number'],
          row['Product Description'],
          row['Product Brand'],
          row['Product Package Size'],
          parseFloat(row['Product Price']) || null,
          row['Product UOM'],
          row['Storage Description'],
          parseInt(row['Qty']) || null,
          parseFloat(row['Unit Price']) || null
        ]
      );
      filasInsertadas++;
    }

    fs.unlinkSync(filePath);

    res.status(200).json({
      message: '✅ Archivo USFoods procesado con éxito',
      fecha: fecha,
      filas_insertadas: filasInsertadas
    });
  } catch (error) {
    console.error('❌ Error al procesar archivo USFoods:', error);
    res.status(500).json({ error: 'Error al procesar archivo Excel de USFoods' });
  }
});

export default router;
