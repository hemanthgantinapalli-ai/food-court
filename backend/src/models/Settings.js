import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'global_config'
  },
  // Requested Core Fields
  commissionPercentage: {
    type: Number,
    required: true,
    default: 15
  },
  deliveryFee: {
    type: Number,
    required: true,
    default: 30
  },
  taxPercentage: {
    type: Number,
    required: true,
    default: 5
  },
  // Advanced features already present in the system
  baseDeliveryFee: {
    type: Number,
    default: 30
  },
  perKmCharge: {
    type: Number,
    default: 10
  },
  isMaintenanceMode: {
    type: Boolean,
    default: false
  },
  maxDeliveryDistance: {
    type: Number,
    default: 15
  },
  autoRiderAssign: {
    type: Boolean,
    default: true
  },
  liveTrackingToggle: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
