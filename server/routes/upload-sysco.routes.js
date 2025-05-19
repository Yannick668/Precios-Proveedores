import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import fs from 'fs';
import { pool } from '../db/connection.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // Carpeta temporal

router.post('/upload-sysco', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;

    // Leer archivo Excel (primera hoja)
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: ''
    });

    let filasInsertadas = 0;

    for (const row of data) {
      await pool.query(
        `INSERT INTO precios_proveedores_sysco 
        (fecha, clave, pack, size, unit, brand, nombre, category, case_price, split, net_weight, stock, quantity, unit_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          row['fecha'],
          row['clave'],
          row['Pack'],
          row['Size'],
          row['Unit'],
          row['Brand'],
          row['nombre'],
          row['Cat'],
          parseFloat(row['Case $']) || null,
          parseFloat(row['Split $']) || null,
          parseFloat(row['Net Wt']) || null,
          row['Stock'],
          parseInt(row['Qty']) || null,
          parseFloat(row['Unit $']) || null
        ]
      );

      filasInsertadas++;
    }

    fs.unlinkSync(filePath);

    res.status(200).json({
      message: '✅ Archivo Sysco procesado con éxito',
      filas_insertadas: filasInsertadas
    });

  } catch (error) {
    console.error('❌ Error al procesar archivo Sysco:', error);
    res.status(500).json({ error: 'Error al procesar archivo Excel de Sysco' });
  }
});

export default router;
