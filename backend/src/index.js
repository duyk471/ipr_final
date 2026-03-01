import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import projectRoutes from './routes/projectRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to frontend over localhost
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '50mb' })); // Allow large requests for base64

// Serve storage directory statically to access preview images and assets directly
app.use('/storage', express.static(path.join(__dirname, '../../storage')));

app.use('/api/projects', projectRoutes);
app.use('/api/projects/:id/assets', assetRoutes);
app.use('/api/ai', aiRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
