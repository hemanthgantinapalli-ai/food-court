import express from 'express';
import { getMyNotifications, markAsRead, clearAllNotifications } from '../controllers/notificationController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateUser, getMyNotifications);
router.put('/:id/read', authenticateUser, markAsRead);
router.delete('/clear', authenticateUser, clearAllNotifications);

export default router;
