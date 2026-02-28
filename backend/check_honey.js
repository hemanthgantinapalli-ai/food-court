import mongoose from "mongoose";
import User from "./src/models/User.js";
import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/foodcourt";

async function run() {
    try {
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB");

        const users = await User.find({ email: "honey@gmail.com" });
        if (users.length > 0) {
            console.log("User honeycomb found:", JSON.stringify(users[0]));
        } else {
            console.log("User honeycomb NOT found.");
        }
        process.exit(0);
    } catch (err) {
        console.error("Error checking user:", err);
        process.exit(1);
    }
}

run();
