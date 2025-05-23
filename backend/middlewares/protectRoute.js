import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const protectRoute = async (req, res, next) => {
	try {
		const token = req.cookies.jwt;

		if (!token) {
			console.log("No token found in cookies");
			return res.status(401).json({ error: "Unauthorized - No Token Provided" });
		}

		// Verify the token
		let decoded;
		try {
			decoded = jwt.verify(token, process.env.JWT_SECRET);
		} catch (error) {
			console.log("Invalid token:", error.message);
			return res.status(401).json({ error: "Unauthorized - Invalid Token" });
		}

		// Find the user
		const user = await User.findById(decoded.userId).select("-password");

		if (!user) {
			console.log("User not found for token:", decoded.userId);
			return res.status(404).json({ error: "User not found" });
		}
		
		// Check if temporary or unverified
		if (user.isTemp || !user.verified) {
			console.log("User needs verification:", user._id);
			return res.status(401).json({ 
				error: "Email verification required",
				requiresVerification: true,
				userId: user._id
			});
		}

		// Attach the user to the request object
		req.user = user;
		next();
	} catch (err) {
		console.log("Error in protectRoute middleware: ", err.message);
		res.status(500).json({ error: "Internal server error", details: err.message });
	}
};

export default protectRoute;
