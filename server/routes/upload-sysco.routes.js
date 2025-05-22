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

    let filasInsertadas = 0;

    for (const row of data) {
      const clave = row['SUPC'];
      const descripcion = row['Desc'];
      const categoria = row['Cat'];
      const marca = row['Brand'];
      const precio_case = parseFloat(row['Case $']) || null;

      let nombre_com = null;
      let unidad = null;
      let cantidad = null;
      let tamaño = null;
      let precio_unit = null;

      const catalogo = await pool.query(
        `SELECT * FROM catalogo_pp WHERE proveedor = $1 AND clave = $2 LIMIT 1`,
        [proveedor, clave]
      );

      if (catalogo.rowCount > 0) {
        const producto = catalogo.rows[0];
        nombre_com = producto.nombre_estandar;
        unidad = producto.unidad;
        cantidad = producto.qty;
        tamaño = producto.size;

        const totalUnidades = (cantidad || 1) * (producto.pack || 1);
        precio_unit = precio_case && totalUnidades > 0 ? precio_case / totalUnidades : null;
      }

      await pool.query(
        `INSERT INTO bd_precios_historicos 
        (fecha, proveedor, clave, precio_case, precio_unit, cantidad, nombre_com, descripcion, categoria, marca, tamaño, unidad, size_unidad)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          fecha,
          proveedor,
          clave,
          precio_case,
          precio_unit,
          cantidad,
          nombre_com,
          descripcion,
          categoria,
          marca,
          tamaño,
          unidad,
          tamaño && unidad ? `${tamaño} ${unidad}` : null
        ]
      );

      filasInsertadas++;
    }

    fs.unlinkSync(filePath);

    res.status(200).json({
      message: '✅ Archivo Sysco procesado y normalizado correctamente',
      fecha,
      filas_insertadas: filasInsertadas
    });

  } catch (error) {
    console.error('❌ Error al procesar archivo Sysco:', error);
    res.status(500).json({ error: 'Error interno al procesar y normalizar archivo Sysco' });
  }
});

export default router;
