import mongoose from "mongoose";
import User from "./src/models/User.js";
import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/foodcourt";

async function run() {
    try {
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB");

        const name = "honey";
        const email = "honey@gmail.com";
        const password = "honey123";

        // 1. Create user
        const user = await User.create({
            name: name,
            email: email,
            password: password,
            role: "customer"
        });
        console.log("User honeycomb created successfully with ID:", user._id);
        process.exit(0);
    } catch (err) {
        console.error("Error creating user honey:", err);
        process.exit(1);
    }
}

run();
