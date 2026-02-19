import Booking from '../models/Booking.js';

export const createBooking = async (req, res) => {
  try {
    const { restaurantId, guests, date, timeSlot, tableNumber, notes } = req.body;
    if (!restaurantId || !date) return res.status(400).json({ success: false, message: 'restaurantId and date required' });

    const booking = await Booking.create({
      customer: req.userId,
      restaurant: restaurantId,
      guests,
      date,
      timeSlot,
      tableNumber,
      notes,
    });

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBookingsForUser = async (req, res) => {
  try {
    const bookings = await Booking.find({ customer: req.userId }).populate('restaurant');
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBookingsForRestaurant = async (req, res) => {
  try {
    const bookings = await Booking.find({ restaurant: req.params.restaurantId }).populate('customer', 'name email');
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(req.params.bookingId, { status }, { new: true });
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.bookingId, { status: 'cancelled' }, { new: true });
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
