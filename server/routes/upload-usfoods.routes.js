import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import fs from 'fs';
import { pool } from '../db/connection.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Extrae fecha del nombre: USFoods_04_05_2025.xlsx → 2025-04-05
function extractFecha(filename) {
  const parts = filename.replace('.xlsx', '').split('_');
  if (parts.length === 4) {
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
    const data = xlsx.utils.sheet_to_json(sheet, { defval: '', range: 1 }); // Saltamos encabezado visual

    let filasCrudas = 0;
    let filasNormalizadas = 0;

    for (const row of data) {
      // 1️⃣ Insertar datos crudos
      await pool.query(
        `INSERT INTO precios_raw_usfoods (
          fecha, group_name, clave, nombre, product_brand, package_size, product_price,
          uom, storage_description, quantity, unit_price
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
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
      filasCrudas++;

      // 2️⃣ Normalizar y guardar en bd_precios_historicos
      const clave = row['Product Number'];
      const catalogo = await pool.query(
        `SELECT * FROM catalogo_pp WHERE proveedor = $1 AND clave = $2 LIMIT 1`,
        [proveedor, clave]
      );

      if (catalogo.rowCount > 0) {
        const producto = catalogo.rows[0];
        const totalUnidades = (producto.qty || 1) * (producto.pack || 1);
        const precioUnitario = parseFloat(row['Product Price']) && totalUnidades > 0
          ? parseFloat(row['Product Price']) / totalUnidades
          : null;

        await pool.query(
          `INSERT INTO bd_precios_historicos (
            fecha, proveedor, clave, precio_case, precio_unit, cantidad,
            nombre_comun, descripcion, categoria, marca, tamaño, unidad, size_unidad
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            fecha,
            proveedor,
            clave,
            parseFloat(row['Product Price']) || null,
            precioUnitario,
            producto.qty,
            producto.nombre_estandar,
            row['Product Description'],
            row['Group Name'],
            row['Product Brand'],
            producto.size,
            producto.unidad,
            `${producto.size} - ${producto.unidad}`
          ]
        );
        filasNormalizadas++;
      }
    }

    fs.unlinkSync(filePath);

    res.status(200).json({
      message: '✅ Archivo USFoods procesado con éxito',
      fecha,
      filas_crudas: filasCrudas,
      filas_normalizadas: filasNormalizadas
    });

  } catch (error) {
    console.error('❌ Error al procesar archivo USFoods:', error);
    res.status(500).json({ error: 'Error al procesar archivo USFoods' });
  }
});

export default router;
