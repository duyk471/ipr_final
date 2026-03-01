import express from 'express';
import {
    getAllProjects,
    createProject,
    getProjectById,
    updateProject,
    deleteProject,
    exportProject
} from '../controllers/projectController.js';

const router = express.Router();

router.get('/', getAllProjects);
router.post('/', createProject);
router.get('/:id/export', exportProject); // Move this up
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

export default router;
