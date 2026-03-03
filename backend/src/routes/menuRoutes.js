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

// Admin & Restaurant Partner protected routes
router.post('/', authenticateUser, authorizeRole('admin', 'restaurant'), createMenuItem);
router.put('/:id', authenticateUser, authorizeRole('admin', 'restaurant'), updateMenuItem);
router.delete('/:id', authenticateUser, authorizeRole('admin', 'restaurant'), deleteMenuItem);

export default router;
