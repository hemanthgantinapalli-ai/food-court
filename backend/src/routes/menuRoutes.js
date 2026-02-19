import express from 'express';
import {
  createMenuItem,
  getMenuItems,
  getMenuItemById,
  updateMenuItem,
  deleteMenuItem,
} from '../controllers/menuController.js';
import { authenticateUser, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getMenuItems);
router.get('/:id', getMenuItemById);

// Admin protected routes
router.post('/', authenticateUser, authorizeRole('admin'), createMenuItem);
router.put('/:id', authenticateUser, authorizeRole('admin'), updateMenuItem);
router.delete('/:id', authenticateUser, authorizeRole('admin'), deleteMenuItem);

export default router;
