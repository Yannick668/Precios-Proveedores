import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import fs from 'fs';
import { pool } from '../db/connection.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // Carpeta temporal

router.post('/upload-catalogo', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;

    // Leer el archivo Excel y convertir la hoja a JSON
    const workbook = xlsx.readFile(filePath);
    const sheetName = 'Catalogo productos proveedor';

    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: '', // evita que falten campos
      raw: false  // fuerza los valores como strings si es necesario
    });

    let filasInsertadas = 0;
    let filasOmitidas = 0;

    for (const row of data) {
      // Validar campos obligatorios con más precisión
      if (
        !row.clave ||
        isNaN(parseInt(row.cantidad)) ||
        !row.size?.toString().trim() ||
        isNaN(parseInt(row.PACK)) ||
        !row.unidad?.toString().trim()
      ) {
        console.warn('⏭️ Fila omitida por datos incompletos:', row);
        filasOmitidas++;
        continue;
      }

      await pool.query(
        `INSERT INTO catalogo_pp (proveedor, clave, nombre_estandar, unidad, qty, size, pack)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          row.proveedor,
          row.clave,
          row.nombre_producto,
          row.unidad,
          parseInt(row.cantidad),
          row.size,
          parseInt(row.PACK)
        ]
      );

      filasInsertadas++;
    }

    fs.unlinkSync(filePath); // Elimina el archivo después de usarlo

    res.status(200).json({
      message: '✅ Archivo Excel procesado con éxito',
      filas_insertadas: filasInsertadas,
      filas_omitidas: filasOmitidas
    });
  } catch (error) {
    console.error('❌ Error al procesar Excel:', error);
    res.status(500).json({ error: 'Error al procesar archivo Excel' });
  }
});

export default router;
