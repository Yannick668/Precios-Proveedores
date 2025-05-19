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

    // Leer el archivo Excel
    const workbook = xlsx.readFile(filePath);
    const sheetName = 'Catalogo productos proveedor';
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    for (const row of data) {
      await pool.query(
        `INSERT INTO catalogo_pp (proveedor, clave, nombre_estandar, unidad, qty, size, pack)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          row.proveedor,               // $1
          row.clave,                   // $2
          row.nombre_producto,         // $3
          row.unidad,                  // $4
          parseInt(row.cantidad),      // $5
          row.size,                    // $6
          parseInt(row.PACK)           // $7
        ]
      );
    }

    fs.unlinkSync(filePath); // Elimina el archivo después de usarlo
    res.status(200).json({ message: '✅ Archivo Excel procesado con éxito' });
  } catch (error) {
    console.error('❌ Error al procesar Excel:', error);
    res.status(500).json({ error: 'Error al procesar archivo Excel' });
  }
});

export default router;
