import Booking from '../models/Booking.js';

export const createBooking = async (req, res) => {
  try {
    console.log(`📅 [Create Booking API] Request from user: ${req.userId}`);
    const { restaurantId, guests, date, timeSlot, tableNumber, notes } = req.body;
    console.log(`📥 [Create Booking API] Payload received for restaurant: ${restaurantId} on date: ${date}`);

    if (!restaurantId || !date) {
      console.log(`❌ [Create Booking API] Missing restaurantId or date`);
      return res.status(400).json({ success: false, message: 'restaurantId and date required' });
    }

    console.log(`✨ [Create Booking API] Creating new booking...`);
    const booking = await Booking.create({
      customer: req.userId,
      restaurant: restaurantId,
      guests,
      date,
      timeSlot,
      tableNumber,
      notes,
    });

    console.log(`✅ [Create Booking API] Booking created successfully. ID: ${booking._id}`);
    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    console.error(`🔥 [Create Booking API] Error creating booking: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBookingsForUser = async (req, res) => {
  try {
    console.log(`👤 [Get User Bookings API] Fetching bookings for user: ${req.userId}`);
    const bookings = await Booking.find({ customer: req.userId }).populate('restaurant');

    console.log(`✅ [Get User Bookings API] Found ${bookings.length} bookings for user.`);
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    console.error(`🔥 [Get User Bookings API] Error fetching user bookings: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBookingsForRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    console.log(`🏪 [Get Restaurant Bookings API] Fetching bookings for restaurant: ${restaurantId}`);

    const bookings = await Booking.find({ restaurant: restaurantId }).populate('customer', 'name email');

    console.log(`✅ [Get Restaurant Bookings API] Found ${bookings.length} bookings for restaurant.`);
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    console.error(`🔥 [Get Restaurant Bookings API] Error fetching restaurant bookings: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    console.log(`📝 [Update Booking API] Updating status for booking: ${bookingId} to status: ${status}`);

    const booking = await Booking.findByIdAndUpdate(bookingId, { status }, { new: true });

    if (!booking) {
      console.log(`⚠️ [Update Booking API] Booking not found: ${bookingId}`);
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    console.log(`✅ [Update Booking API] Booking status updated successfully.`);
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.error(`🔥 [Update Booking API] Error updating booking status: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    console.log(`🚫 [Cancel Booking API] Cancelling booking: ${bookingId}`);

    const booking = await Booking.findByIdAndUpdate(bookingId, { status: 'cancelled' }, { new: true });

    if (!booking) {
      console.log(`⚠️ [Cancel Booking API] Booking not found: ${bookingId}`);
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    console.log(`✅ [Cancel Booking API] Booking cancelled successfully.`);
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.error(`🔥 [Cancel Booking API] Error cancelling booking: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
