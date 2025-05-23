import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import fs from 'fs';
import { pool } from '../db/connection.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Extraer fecha del nombre: Rest_Depot_04_08_2025.xlsx → 2025-04-08
function extractFecha(filename) {
  const parts = filename.replace('.xlsx', '').split('_');
  if (parts.length === 4) {
    const [_, mes, dia, anio] = parts;
    return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }
  return null;
}

router.post('/upload-restaurantdepot', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;
  const filename = req.file.originalname;
  const fecha = extractFecha(filename);
  const proveedor = 'RestaurantDepot';

  if (!fecha) {
    return res.status(400).json({ error: '❌ No se pudo extraer la fecha del nombre del archivo' });
  }

  try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: '', range: 9 }); // Inicia en la fila 10 (índice 9)

    let filasCrudas = 0;
    let filasNormalizadas = 0;

    for (const row of data) {
      // 1️⃣ Insertar datos crudos en precios_raw_restaurantdepot
      await pool.query(
        `INSERT INTO precios_raw_restaurantdepot (
          fecha, upc, clave, descripcion, categoria, ubicacion, unit_case,
          qty, est_price, qty2, unit_price, tamano, um
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          fecha,
          row['UPC'],
          row['Item'],
          row['Description'],
          row['Category'],
          row['Location/Bin'],
          row['Unit/Case'],
          parseInt(row['Qty']) || null,
          parseFloat(row['Est.Price']) || null,
          parseInt(row['Qty2']) || null,
          parseFloat(row['Unit Price']) || null,
          row['Package'],
          row['UM']
        ]
      );
      filasCrudas++;

      // 2️⃣ Buscar en catálogo
      const clave = row['Item'];
      const catalogo = await pool.query(
        `SELECT * FROM catalogo_pp WHERE proveedor = $1 AND clave = $2 LIMIT 1`,
        [proveedor, clave]
      );

      if (catalogo.rowCount > 0) {
        const producto = catalogo.rows[0];
        const totalUnidades = (producto.qty || 1) * (producto.pack || 1);
        const precioUnitario = parseFloat(row['Est.Price']) && totalUnidades > 0
          ? parseFloat(row['Est.Price']) / totalUnidades
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
            parseFloat(row['Est.Price']) || null,
            precioUnitario,
            producto.qty,
            producto.nombre_estandar,
            row['Description'],
            row['Category'],
            null, // Marca no proporcionada por RD
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
      message: '✅ Archivo Restaurant Depot procesado con éxito',
      fecha,
      filas_crudas: filasCrudas,
      filas_normalizadas: filasNormalizadas
    });

  } catch (error) {
    console.error('❌ Error al procesar archivo Restaurant Depot:', error);
    res.status(500).json({ error: 'Error al procesar archivo Restaurant Depot' });
  }
});

export default router;
