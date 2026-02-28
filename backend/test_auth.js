import mongoose from "mongoose";
import User from "./src/models/User.js";
import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/foodcourt";

async function run() {
    try {
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB");

        const email = "auth_test" + Date.now() + "@gmail.com";
        const password = "mypassword";

        // 1. Create user
        const user = await User.create({
            name: "Auth Test User",
            email: email,
            password: password,
            role: "customer"
        });
        console.log("User created:", user._id);

        // 2. Fetch user
        const foundUser = await User.findOne({ email });
        console.log("User found:", !!foundUser);

        // 3. Test password
        const isMatch = await foundUser.comparePassword(password);
        console.log("Password match:", isMatch);

        if (isMatch) {
            console.log("Auth works correctly!");
            process.exit(0);
        } else {
            console.error("Auth FAILED!");
            process.exit(1);
        }
    } catch (err) {
        console.error("Error during auth test:", err);
        process.exit(1);
    }
}

run();
