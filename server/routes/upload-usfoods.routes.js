import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import fs from 'fs';
import { pool } from '../db/connection.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // Carpeta temporal

router.post('/upload-usfoods', upload.single('file'), async (req, res) => {
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
      // Conversión de fecha
      let fecha;
      if (typeof row['fecha'] === 'number') {
        fecha = xlsx.SSF.format('yyyy-mm-dd', row['fecha']);
      } else if (typeof row['fecha'] === 'string') {
        fecha = new Date(row['fecha']).toISOString().split('T')[0];
      } else {
        fecha = null;
      }

      await pool.query(
        `INSERT INTO precios_proveedores_usfoods 
        (fecha, group_name, clave, nombre, product_brand, package_size, product_price, uom, storage_description, quantity, unit_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          fecha,
          row['Group Name'],
          row['clave'],
          row['nombre'],
          row['Product Brand'],
          row['Product Package Size'],           // Ahora va a package_size en BD
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
      filas_insertadas: filasInsertadas
    });

  } catch (error) {
    console.error('❌ Error al procesar archivo USFoods:', error);
    res.status(500).json({ error: 'Error al procesar archivo Excel de USFoods' });
  }
});

export default router;
