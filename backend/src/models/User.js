import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["customer", "admin", "rider", "restaurant"],
      default: "customer",
    },
    phone: { type: String, default: "" },
    addresses: [
      {
        label: { type: String },
        street: { type: String },
        area: { type: String },
        city: { type: String },
        zipCode: { type: String },
        lat: { type: Number },
        lng: { type: Number },
      },
    ],
    wallet: {
      balance: { type: Number, default: 0 },
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurant",
      },
    ],
    favoriteFoods: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MenuItem",
      },
    ],
    resetPasswordOtp: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

// Passwords will be hashed explicitly in controllers
export default mongoose.model("User", userSchema);
