import express from 'express';
import { authenticateUser, authorizeRole } from '../middleware/auth.js';
import Rider from '../models/Rider.js';

const router = express.Router();

// Register rider profile (admin or rider user)
router.post('/', authenticateUser, authorizeRole('admin','rider'), async (req, res) => {
  try {
    const { userId, licenseNumber, vehicleType, vehicleNumber } = req.body;
    const rider = await Rider.create({ user: userId, licenseNumber, vehicleType, vehicleNumber });
    res.status(201).json({ success: true, data: rider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const riders = await Rider.find().populate('user', 'name email');
    res.status(200).json({ success: true, data: riders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:riderId/status', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const { isVerified, isOnline } = req.body;
    const rider = await Rider.findByIdAndUpdate(req.params.riderId, { isVerified, isOnline }, { new: true });
    res.status(200).json({ success: true, data: rider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
