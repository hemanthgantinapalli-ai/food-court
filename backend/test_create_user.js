import mongoose from "mongoose";
import User from "./src/models/User.js";
import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/foodcourt";

async function run() {
    try {
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB");

        const email = "temp" + Date.now() + "@gmail.com";
        const user = await User.create({
            name: "Test User",
            email: email,
            password: "password123",
            role: "customer"
        });

        console.log("User created:", user._id);
        process.exit(0);
    } catch (err) {
        console.error("Error creating user:", err);
        process.exit(1);
    }
}

run();
