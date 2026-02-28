import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["customer", "admin", "restaurant", "rider"],
      default: "customer",
    },
    phone: { type: String, default: "" },
    addresses: [
      {
        label: { type: String },
        street: { type: String },
        city: { type: String },
        zipCode: { type: String },
      },
    ],
    wallet: {
      balance: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// hash password
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model("User", userSchema);
