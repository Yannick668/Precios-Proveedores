import express from 'express';
import {
  obtenerProductos,
  consultarPreciosHistoricos,
  consultarVariacionPrecios,
  consultarPreciosPorProveedor
} from '../controllers/productos.controller.js';

const router = express.Router();

// Lista de productos únicos
router.get('/', obtenerProductos);

// Consulta general con filtros
router.get('/precios-historicos', consultarPreciosHistoricos);

// Datos para gráfica de variación de precios
router.get('/variacion-precios', consultarVariacionPrecios);

// Consulta por proveedor específico
router.get('/precios-proveedor/:nombre', consultarPreciosPorProveedor);

export default router;
