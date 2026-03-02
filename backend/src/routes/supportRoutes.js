import express from 'express';
import { createSupportRequest, getSupportRequests, updateSupportStatus } from '../controllers/supportController.js';
import { authenticateUser, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/create', authenticateUser, createSupportRequest);
router.get('/my-requests', authenticateUser, getSupportRequests); // Fetches user's or all for admin
router.put('/:id/status', authenticateUser, authorizeRole('admin'), updateSupportStatus);

export default router;
