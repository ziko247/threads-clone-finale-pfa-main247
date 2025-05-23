import express from "express";
import {
	followUnFollowUser,
	getUserProfile,
	loginUser,
	logoutUser,
	signupUser,
	updateUser,
	getSuggestedUsers,
	freezeAccount,
	unfreezeAccount,
	getUserReplies,
	verifyEmail,
	resendVerificationCode
} from "../controllers/userController.js";
import protectRoute from "../middlewares/protectRoute.js";

const router = express.Router();

// Test route to check if API is accessible
router.get("/test", (req, res) => {
    console.log("Test route hit!");
    res.json({ message: "API is working" });
});

// Routes related to authentication
router.post("/signup", signupUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationCode);

// Routes for user operations
router.get("/profile/:query", getUserProfile);
router.post("/follow/:id", protectRoute, followUnFollowUser);
router.put("/update/:id", protectRoute, updateUser);
router.get("/suggested", protectRoute, getSuggestedUsers);
router.get("/replies/:username", getUserReplies);

// Account status routes
router.post("/freeze", protectRoute, freezeAccount);
router.post("/unfreeze", protectRoute, unfreezeAccount);

export default router;
