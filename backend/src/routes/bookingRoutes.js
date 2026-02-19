import express from 'express';
import { authenticateUser, authorizeRole } from '../middleware/auth.js';
import * as bookingController from '../controllers/bookingController.js';

const router = express.Router();

router.post('/create', authenticateUser, bookingController.createBooking);
router.get('/my', authenticateUser, bookingController.getBookingsForUser);
router.get('/restaurant/:restaurantId', authenticateUser, authorizeRole('restaurant','admin'), bookingController.getBookingsForRestaurant);
router.put('/:bookingId/status', authenticateUser, authorizeRole('restaurant','admin'), bookingController.updateBookingStatus);
router.post('/:bookingId/cancel', authenticateUser, bookingController.cancelBooking);

export default router;
