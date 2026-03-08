import express from 'express';
import { topUpWallet, getWalletTransactions, getAllTransactions, adminManualTransaction } from '../controllers/walletController.js';
import { authenticateUser, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(authenticateUser);

router.post('/topup', topUpWallet);
router.get('/transactions', getWalletTransactions);
router.get('/all-transactions', authorizeRole('admin'), getAllTransactions);
router.post('/manual', authorizeRole('admin'), adminManualTransaction);

export default router;
