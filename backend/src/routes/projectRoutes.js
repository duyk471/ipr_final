import express from 'express';
import {
    getAllProjects,
    createProject,
    getProjectById,
    updateProject,
    deleteProject,
    exportProject,
    importProject,
    importImage,
    getHistory,
    restoreHistory
} from '../controllers/projectController.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.get('/', getAllProjects);
router.post('/', createProject);
router.post('/import', upload.single('file'), importProject);
router.post('/import-image', upload.single('image'), importImage);
router.get('/:id/export', exportProject); // Move this up
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

router.get('/:id/history', getHistory);
router.post('/:id/history/restore', restoreHistory);

export default router;
