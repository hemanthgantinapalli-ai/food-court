import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'global_config'
  },
  baseDeliveryFee: {
    type: Number,
    default: 30
  },
  perKmCharge: {
    type: Number,
    default: 10
  },
  platformCommission: {
    type: Number,
    default: 20
  },
  minOrderForFreeDelivery: {
    type: Number,
    default: 500
  },
  isMaintenanceMode: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
