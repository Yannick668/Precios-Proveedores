import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productosRoutes from './routes/productos.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import uploadSyscoRoutes from './routes/upload-sysco.routes.js';
import uploadUSFoodsRoutes from './routes/upload-usfoods.routes.js';
import uploadRDDepotRoutes from './routes/upload-restaurantdepot.routes.js';

// Configuración
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/productos', productosRoutes);
app.use('/api', uploadRoutes);
app.use('/api', uploadSyscoRoutes);
app.use('/api', uploadUSFoodsRoutes);
app.use('/api', uploadRDDepotRoutes);





// Inicio
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
