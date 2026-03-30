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
    fullName: String,
    profilePhoto: String,
    aadhaarDetails: {
      aadhaarNumber: String,
      frontImage: String,
      backImage: String,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'BLOCKED', 'REJECTED'],
      default: 'PENDING'
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [80.6475, 16.2367] // [longitude, latitude] — Tenali Police Statue
      },
      heading: { type: Number, default: 0 },
      speed: { type: Number, default: 0 },
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

riderSchema.index({ currentLocation: '2dsphere' });

const Rider = mongoose.model('Rider', riderSchema);
export default Rider;
