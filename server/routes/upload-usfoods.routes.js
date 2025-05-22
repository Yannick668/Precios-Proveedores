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

router.post('/upload-usfoods', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;
  const filename = req.file.originalname;
  const fecha = extractFecha(filename);
  const proveedor = 'USFoods';

  if (!fecha) {
    return res.status(400).json({ error: '❌ No se pudo extraer la fecha del nombre del archivo' });
  }

  try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: '', range: 1 }); // Saltar encabezado visual

    let filasInsertadas = 0;

    for (const row of data) {
      const clave = row['Product Number'];
      let nombre_común = null;
      let unidad = null;
      let cantidad = null;
      let size = null;
      let pack = null;
      let precioUnitario = null;

      // Buscar en el catálogo
      const catalogo = await pool.query(
        `SELECT * FROM catalogo_pp WHERE proveedor = $1 AND clave = $2 LIMIT 1`,
        [proveedor, clave]
      );

      if (catalogo.rowCount > 0) {
        const producto = catalogo.rows[0];
        nombre_común = producto.nombre_estandar;
        unidad = producto.unidad;
        cantidad = producto.qty;
        size = producto.size;
        pack = producto.pack;

        const precioCaja = parseFloat(row['Product Price']) || null;
        const totalUnidades = (cantidad || 1) * (pack || 1);
        precioUnitario = precioCaja && totalUnidades > 0 ? precioCaja / totalUnidades : null;
      }

      await pool.query(
        `INSERT INTO bd_precios_historicos
        (fecha, proveedor, clave, precio_case, precio_unit, cantidad, nombre_común, descripcion, categoria, marca, tamaño, unidad, size_unidad)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          fecha,
          proveedor,
          clave,
          parseFloat(row['Product Price']) || null,
          precioUnitario,
          parseInt(row['Qty']) || null,
          nombre_común,
          row['Product Description'],
          row['Group Name'],
          row['Product Brand'],
          row['Product Package Size'],
          row['Product UOM'],
          `${row['Product Package Size']} - ${row['Product UOM']}`
        ]
      );

      filasInsertadas++;
    }

    fs.unlinkSync(filePath);

    res.status(200).json({
      message: '✅ Archivo USFoods procesado correctamente',
      fecha,
      filas_insertadas: filasInsertadas
    });

  } catch (error) {
    console.error('❌ Error al procesar archivo USFoods:', error);
    res.status(500).json({ error: 'Error interno al procesar archivo USFoods' });
  }
});

export default router;
