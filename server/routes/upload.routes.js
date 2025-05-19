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

    const workbook = xlsx.readFile(filePath);
    const sheetName = 'Catalogo productos proveedor';

    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: '',
      raw: false
    });

    let filasInsertadas = 0;
    let filasOmitidas = 0;
    const filasRechazadas = [];

    for (const row of data) {
      // Validación segura
      if (
        !row.clave ||
        isNaN(parseInt(row.cantidad)) ||
        !row.size?.toString().trim() ||
        isNaN(parseInt(row.PACK)) ||
        !row.unidad?.toString().trim()
      ) {
        filasRechazadas.push(row);
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

    fs.unlinkSync(filePath); // Elimina el archivo temporal

    res.status(200).json({
      message: '✅ Archivo Excel procesado con éxito',
      filas_insertadas: filasInsertadas,
      filas_omitidas: filasOmitidas,
      filas_rechazadas: filasRechazadas // ← aquí está el reporte detallado
    });
  } catch (error) {
    console.error('❌ Error al procesar Excel:', error);
    res.status(500).json({ error: 'Error al procesar archivo Excel' });
  }
});

export default router;
