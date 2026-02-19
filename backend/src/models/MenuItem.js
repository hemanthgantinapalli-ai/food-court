import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    image: String,
    price: {
      type: Number,
      required: true,
    },
    discountPrice: Number,
    category: {
      type: String,
      enum: ['appetizers', 'mains', 'desserts', 'beverages', 'groceries', 'other'],
      default: 'other',
    },
    cuisine: String,
    rating: {
      type: Number,
      default: 4,
      min: 1,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    preparationTime: {
      type: Number,
      default: 15,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isVegetarian: {
      type: Boolean,
      default: false,
    },
    isVegan: {
      type: Boolean,
      default: false,
    },
    spicyLevel: {
      type: Number,
      enum: [0, 1, 2, 3],
      default: 1,
    },
    allergies: [String],
    addOns: [
      {
        name: String,
        price: Number,
      },
    ],
    nutritionInfo: {
      calories: Number,
      protein: String,
      carbs: String,
      fat: String,
    },
    popularityScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
export default MenuItem;
