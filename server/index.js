import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productosRoutes from './routes/productos.routes.js';

// Configuración
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/productos', productosRoutes);
import uploadRoutes from './routes/upload.routes.js';
app.use('/api', uploadRoutes);


// Inicio
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
