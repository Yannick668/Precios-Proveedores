import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import fs from 'fs';
import { pool } from '../db/connection.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

function extractFecha(filename) {
  const parts = filename.replace('.xlsx', '').split('_');
  if (parts.length >= 4) {
    const [_, mes, dia, anio] = parts;
    return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }
  return null;
}

router.post('/upload-sysco', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;
  const filename = req.file.originalname;
  const fecha = extractFecha(filename);
  const proveedor = 'Sysco';

  if (!fecha) {
    return res.status(400).json({ error: '❌ No se pudo extraer la fecha del nombre del archivo' });
  }

  try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    let filasCrudas = 0;
    let filasNormalizadas = 0;

    for (const row of data) {
      // Insertar en precios_raw_sysco
      await pool.query(
        `INSERT INTO precios_raw_sysco 
         (fecha, supc, pack, size, unit, brand, descripcion, cat, case_price, split, net_weight, stock)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
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
          row['Split $'] || null,
          row['Net Wt'] || null,
          row['Stock'] || null
        ]
      );
      filasCrudas++;

      // Normalizar datos y guardar en bd_precios_historicos
      const clave = row['SUPC'];
      const catalogo = await pool.query(
        `SELECT * FROM catalogo_pp WHERE proveedor = $1 AND clave = $2 LIMIT 1`,
        [proveedor, clave]
      );

      if (catalogo.rowCount > 0) {
        const prod = catalogo.rows[0];
        const totalUnidades = (prod.qty || 1) * (prod.pack || 1);
        const precioUnitario = parseFloat(row['Case $']) && totalUnidades > 0
          ? parseFloat(row['Case $']) / totalUnidades
          : null;

        await pool.query(
          `INSERT INTO bd_precios_historicos
           (fecha, proveedor, clave, precio_case, precio_unit, cantidad, nombre_comun, descripcion, categoria, marca, tamaño, unidad, size_unidad)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            fecha,
            proveedor,
            clave,
            parseFloat(row['Case $']) || null,
            precioUnitario,
            prod.qty,
            prod.nombre_estandar,
            row['Desc'],
            row['Cat'],
            row['Brand'],
            prod.size,
            prod.unidad,
            `${prod.size} - ${prod.unidad}`
          ]
        );
        filasNormalizadas++;
      }
    }

    fs.unlinkSync(filePath);

    res.status(200).json({
      message: '✅ Archivo Sysco procesado con éxito',
      fecha,
      filas_crudas: filasCrudas,
      filas_normalizadas: filasNormalizadas
    });

  } catch (error) {
    console.error('❌ Error al procesar archivo Sysco:', error);
    res.status(500).json({ error: 'Error interno al procesar archivo Sysco' });
  }
});

export default router;
