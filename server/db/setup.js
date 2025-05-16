import { pool } from './connection.js';

async function crearTablas() {
  try {
    // Tabla: catalogo_pp
    await pool.query(`
      CREATE TABLE IF NOT EXISTS catalogo_pp (
        id SERIAL PRIMARY KEY,
        proveedor VARCHAR(100),
        clave VARCHAR(50),
        nombre_estandar VARCHAR(150),
        unidad VARCHAR(50),
        qty INT,
        size VARCHAR(50),
        pack INT
      );
    `);

    // Tabla: bd_precios_historicos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bd_precios_historicos (
        id SERIAL PRIMARY KEY,
        fecha DATE,
        proveedor VARCHAR(100),
        clave VARCHAR(50),
        precio_case DECIMAL(10,2),
        precio_unit DECIMAL(10,4),
        cantidad INT
      );
    `);

    // Tabla: precios_proveedores_sysco
    await pool.query(`
      CREATE TABLE IF NOT EXISTS precios_proveedores_sysco (
        id SERIAL PRIMARY KEY,
        fecha DATE,
        clave VARCHAR(50),
        pack VARCHAR(50),
        size VARCHAR(50),
        unit VARCHAR(20),
        brand VARCHAR(100),
        nombre TEXT,
        category VARCHAR(100),
        case_price DECIMAL(10,2),
        split VARCHAR(50),
        net_weight VARCHAR(50),
        stock VARCHAR(20),
        quantity INT,
        unit_price DECIMAL(10,4)
      );
    `);

    // Tabla: precios_proveedores_usfoods
    await pool.query(`
      CREATE TABLE IF NOT EXISTS precios_proveedores_usfoods (
        id SERIAL PRIMARY KEY,
        fecha DATE,
        group_name VARCHAR(50),
        clave VARCHAR(50),
        nombre TEXT,
        product_brand VARCHAR(100),
        package_size VARCHAR(100),
        product_price DECIMAL(10,2),
        uom VARCHAR(20),
        storage_description VARCHAR(100),
        quantity INT,
        unit_price DECIMAL(10,4)
      );
    `);

    // Tabla: precios_proveedores_restaurantdepot
    await pool.query(`
      CREATE TABLE IF NOT EXISTS precios_proveedores_restaurantdepot (
        id SERIAL PRIMARY KEY,
        fecha DATE,
        upc VARCHAR(50),
        clave VARCHAR(50),
        nombre TEXT,
        category VARCHAR(100),
        unit_per_case VARCHAR(50),
        quantity INT,
        price DECIMAL(10,2),
        quantity2 INT,
        unit_price DECIMAL(10,4),
        package_size VARCHAR(100),
        uom VARCHAR(20)
      );
    `);

    // Tabla: usuarios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre_usuario VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        empresa VARCHAR(100),
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Todas las tablas fueron creadas correctamente.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error al crear las tablas:", err);
    process.exit(1);
  }
}

crearTablas();
