import express from 'express';
import { obtenerProductos } from '../controllers/productos.controller.js';

const router = express.Router();

router.get('/', obtenerProductos);

export default router;
