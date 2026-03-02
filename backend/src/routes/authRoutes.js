import express from "express";
import { register, login, getProfile, updateProfile, toggleFavorite, toggleFavoriteFood } from "../controllers/authController.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", authenticateUser, getProfile);
router.put("/profile", authenticateUser, updateProfile);
router.post("/favorites/toggle", authenticateUser, toggleFavorite);
router.post("/favorites/food/toggle", authenticateUser, toggleFavoriteFood);

export default router;
