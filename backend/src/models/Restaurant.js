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
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    name: { type: String, required: true },
    description: String,
    image: String,
    cuisines: [String],
    rating: { type: Number, default: 4 },
    reviewCount: { type: Number, default: 0 },
    location: locationSchema,
    isOpen: { type: Boolean, default: true },
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
  },
  { timestamps: true }
);

const Restaurant = mongoose.model('Restaurant', restaurantSchema);
export default Restaurant;