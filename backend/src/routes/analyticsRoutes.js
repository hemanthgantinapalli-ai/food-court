import express from 'express';
import { authenticateUser, authorizeRole } from '../middleware/auth.js';
import { getAdminOverviewAnalytics, getPartnerOverviewAnalytics } from '../controllers/analyticsController.js';

const router = express.Router();

// Admin-specific analytics
router.get('/admin/overview', authenticateUser, authorizeRole('admin'), getAdminOverviewAnalytics);

// Partner-specific analytics
router.get('/partner/overview', authenticateUser, authorizeRole('restaurant'), getPartnerOverviewAnalytics);

export default router;
