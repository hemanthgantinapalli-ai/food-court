import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

// @desc    Top up user wallet
// @route   POST /api/wallet/topup
export const topUpWallet = async (req, res) => {
    try {
        const { amount, paymentMethod = 'card' } = req.body;

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Update balance
        user.wallet = user.wallet || { balance: 0 };
        user.wallet.balance += Number(amount);
        await user.save();

        // Create transaction record
        await Transaction.create({
            user: req.userId,
            amount: Number(amount),
            type: 'credit',
            paymentMethod,
            status: 'success',
            description: `Wallet Top-up via ${paymentMethod}`,
            transactionId: `TOPUP-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        });

        res.status(200).json({
            success: true,
            message: 'Wallet topped up successfully',
            balance: user.wallet.balance
        });
    } catch (error) {
        console.error('Wallet Top-up Error:', error);
        res.status(500).json({ success: false, message: 'Server error during top-up' });
    }
};

// @desc    Get wallet transactions
// @route   GET /api/wallet/transactions
export const getWalletTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.userId })
            .sort({ createdAt: -1 })
            .populate('order', 'orderId total');

        res.status(200).json({
            success: true,
            data: transactions
        });
    } catch (error) {
        console.error('Get Transactions Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get all transactions (Admin only)
// @route   GET /api/wallet/all-transactions
export const getAllTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .sort({ createdAt: -1 })
            .populate('user', 'name email role')
            .populate('order', 'orderId total');

        res.status(200).json({
            success: true,
            data: transactions
        });
    } catch (error) {
        console.error('All Transactions Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Manual transaction by Admin (Credit/Debit)
// @route   POST /api/wallet/manual
export const adminManualTransaction = async (req, res) => {
    try {
        const { targetUserId, amount, type, description } = req.body;

        if (!targetUserId || !amount || !type || !description) {
            return res.status(400).json({ success: false, message: 'Missing required fields (targetUserId, amount, type, description)' });
        }

        const user = await User.findById(targetUserId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const numAmount = Number(amount);
        if (type === 'debit' && (!user.wallet?.balance || user.wallet.balance < numAmount)) {
            return res.status(400).json({ success: false, message: 'Insufficient user balance for debit' });
        }

        // Update balance
        user.wallet = user.wallet || { balance: 0 };
        if (type === 'credit') {
            user.wallet.balance += numAmount;
        } else {
            user.wallet.balance -= numAmount;
        }
        await user.save();

        // Create transaction record
        await Transaction.create({
            user: targetUserId,
            amount: numAmount,
            type,
            paymentMethod: 'admin_adjustment',
            status: 'success',
            description: `[ADMIN ADJ] ${description}`,
            transactionId: `ADM-ADJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        });

        res.status(200).json({
            success: true,
            message: `Successfully ${type}ed ₹${numAmount} to ${user.name}'s wallet`,
            newBalance: user.wallet.balance
        });
    } catch (error) {
        console.error('Admin Manual Transaction Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
