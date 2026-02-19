import mongoose from 'mongoose';

const riderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    licenseNumber: String,
    vehicleType: {
      type: String,
      enum: ['bike', 'scooter', 'bicycle'],
      default: 'bike',
    },
    vehicleNumber: String,
    insuranceExpiry: Date,
    documentExpiry: Date,
    isVerified: {
      type: Boolean,
      default: false,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    currentLocation: {
      latitude: Number,
      longitude: Number,
    },
    rating: {
      type: Number,
      default: 4.5,
      min: 1,
      max: 5,
    },
    completedDeliveries: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    bankAccount: {
      accountHolder: String,
      accountNumber: String,
      bankName: String,
      ifscCode: String,
    },
    rejectCount: {
      type: Number,
      default: 0,
    },
    suspensionReason: String,
  },
  {
    timestamps: true,
  }
);

const Rider = mongoose.model('Rider', riderSchema);
export default Rider;
