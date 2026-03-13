import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: false,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Restaurant ID is required for partner notifications'],
    },
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    items: [
      {
        menuItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'MenuItem',
        },
        name: String,
        quantity: Number,
        price: Number,
        addOns: Array,
      },
    ],
    deliveryAddress: {
      street: String,
      area: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      latitude: Number,
      longitude: Number,
      label: String,
    },
    subtotal: Number,
    tax: Number,
    deliveryFee: Number,
    discount: {
      type: Number,
      default: 0,
    },
    discountCode: String,
    total: Number,
    paymentMethod: {
      type: String,
      enum: ['card', 'upi', 'wallet', 'cash'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentId: String,
    invoiceId: String,
    orderStatus: {
      type: String,
      enum: [
        'placed',
        'confirmed',
        'preparing',
        'ready',
        'picked_up',
        'on_the_way',
        'delivered',
        'cancelled',
      ],
      default: 'placed',
    },
    statusHistory: [
      {
        status: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: String,
      },
    ],
    estimatedDeliveryTime: Date,
    actualDeliveryTime: Date,
    specialInstructions: String,
    rating: {
      score: {
        type: Number,
        min: 1,
        max: 5,
      },
      review: String,
      timestamp: Date,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundStatus: {
      type: String,
      enum: ['none', 'pending', 'completed'],
      default: 'none',
    },
    refundReason: {
      type: String,
      default: '',
    },
    // Revenue sharing & Logistics
    partnerEarnings: {
      type: Number,
      default: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    riderEarnings: {
      type: Number,
      default: 0,
    },
    platformCommission: {
      type: Number,
      default: 0,
    },
    distance: {
      type: Number,
      default: 0,
    },
    liveTracking: {
      lastLatitude: Number,
      lastLongitude: Number,
      currentSpeed: Number,
      etaMinutes: Number,
      bearing: Number
    }
  },
  {
    timestamps: true,
  }
);

// Generate unique order ID
orderSchema.pre('save', async function (next) {
  if (!this.orderId) {
    const count = await mongoose.model('Order').countDocuments();
    const timestamp = Date.now().toString().slice(-8);
    this.orderId = `FC${timestamp}${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
