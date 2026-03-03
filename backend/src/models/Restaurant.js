import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema(
  {
    address: String,
    city: String,
    state: String,
    zipCode: String,
    latitude: Number,
    longitude: Number,
  },
  { _id: false }
);

const restaurantSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: String,
    image: String,
    cuisines: [String],
    rating: { type: Number, default: 4 },
    reviewCount: { type: Number, default: 0 },

    // Business Documents & Compliance
    fssaiLicense: String,
    gstin: String,
    panNumber: String,

    // Bank Details (for settlements)
    bankDetails: {
      accountName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
    },
    location: locationSchema,
    isOpen: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false },
    approvalDate: { type: Date },
    tables: [
      {
        tableNumber: Number,
        seats: Number,
        isAvailable: { type: Boolean, default: true },
      },
    ],
    menu: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }
    ],
    metadata: {
      delivery: { type: Boolean, default: true },
      dineIn: { type: Boolean, default: true },
    },
    deliveryTime: { type: Number, default: 30 },       // minutes
    deliveryFee: { type: Number, default: 49 },        // ₹
    commissionPercentage: { type: Number, default: 10 }, // Admin set commission
  },
  { timestamps: true }
);

const Restaurant = mongoose.model('Restaurant', restaurantSchema);
export default Restaurant;