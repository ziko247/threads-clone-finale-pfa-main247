import User from "../models/userModel.js";
import Post from "../models/postModel.js";
import bcrypt from "bcryptjs";
import generateTokenAndSetCookie from "../utils/helpers/generateTokenAndSetCookie.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import sendEmail from "../utils/helpers/sendEmail.js";

const getUserProfile = async (req, res) => {
	// We will fetch user profile either with username or userId
	// query is either username or userId
	const { query } = req.params;

	try {
		let user;

		// query is userId
		if (mongoose.Types.ObjectId.isValid(query)) {
			user = await User.findOne({ _id: query }).select("-password").select("-updatedAt");
		} else {
			// query is username
			user = await User.findOne({ username: query }).select("-password").select("-updatedAt");
		}

		if (!user) return res.status(404).json({ error: "User not found" });

		res.status(200).json(user);
	} catch (err) {
		res.status(500).json({ error: err.message });
		console.log("Error in getUserProfile: ", err.message);
	}
};

// Modified to create temporary user record
const signupUser = async (req, res) => {
	try {
		const { name, email, username, password } = req.body;
		const userExists = await User.findOne({ $or: [{ email }, { username }] });

		if (userExists) {
			return res.status(400).json({ error: "User already exists" });
		}

		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		// Generate a 6-digit verification code
		const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
		
		// Set expiration time for the code (e.g., 10 minutes)
		const expiryMinutes = parseInt(process.env.CODE_EXPIRE_MINUTES) || 10;
		const verificationCodeExpires = new Date();
		verificationCodeExpires.setMinutes(verificationCodeExpires.getMinutes() + expiryMinutes);

		// Create a temporary user with isTemp flag
		const tempUser = new User({
			name,
			email,
			username,
			password: hashedPassword,
			verified: false,
			isTemp: true, // Mark as temporary
			verificationCode,
			verificationCodeExpires
		});
		
		await tempUser.save();

		// Send verification email with code
		const subject = "Complete Your Registration";
		const html = `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
				<h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Welcome to Threads Clone, ${name}!</h2>
				<p>Thank you for signing up. To complete your registration, please verify your email address.</p>
				<div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
					<h3 style="margin-top: 0;">Your verification code:</h3>
					<div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0095f6; margin: 15px 0;">${verificationCode}</div>
					<p>This code will expire in ${expiryMinutes} minutes.</p>
				</div>
				<p>If you did not sign up for an account, please ignore this email.</p>
			</div>
		`;
		
		sendEmail(email, subject, html);

		res.status(200).json({
			tempUserId: tempUser._id, 
			email: tempUser.email,
			message: "Please verify your email to complete registration"
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
		console.log("Error in signupUser: ", err.message);
	}
};

// Modified to complete registration after verification
const verifyEmail = async (req, res) => {
	try {
		const { userId, verificationCode } = req.body;
		
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}
		
		// Check if verification code is expired
		if (new Date() > new Date(user.verificationCodeExpires)) {
			// If temporary user and expired, delete it
			if (user.isTemp) {
				await User.findByIdAndDelete(userId);
				return res.status(400).json({ 
					error: "Verification code has expired. Please sign up again.", 
					registrationExpired: true 
				});
			}
			return res.status(400).json({ error: "Verification code has expired" });
		}
		
		// Check if verification code matches
		if (user.verificationCode !== verificationCode) {
			return res.status(400).json({ error: "Invalid verification code" });
		}
		
		// If this is a temporary user, complete the registration
		if (user.isTemp) {
			user.isTemp = false;
			user.verified = true;
			user.verificationCode = null;
			user.verificationCodeExpires = null;
			await user.save();
			
			// Generate token and set cookie
			generateTokenAndSetCookie(user._id, res);
			
			try {
				// Send welcome email with improved error handling
				const subject = "Welcome to Threads Clone!";
				const html = `
					<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
						<h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Welcome to Threads Clone, ${user.name}!</h2>
						<p>Thank you for verifying your email address. Your account has been successfully created and is now active!</p>
						<p>Your username: <strong>${user.username}</strong></p>
						<div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px;">
							<p>Start exploring and connecting with people around the world.</p>
							<a href="${process.env.CLIENT_URL}" style="display: inline-block; background-color: #0095f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Get Started</a>
						</div>
						<p style="margin-top: 30px; font-size: 0.8rem; color: #666;">If you have any questions, please don't hesitate to contact our support team.</p>
					</div>
				`;
				
				await sendEmail(user.email, subject, html);
				console.log(`Welcome email sent to ${user.email}`);
			} catch (emailError) {
				console.error("Error sending welcome email:", emailError);
				// Continue with the registration process even if email fails
			}
			
			return res.status(200).json({
				_id: user._id,
				name: user.name,
				email: user.email,
				username: user.username,
				bio: user.bio,
				profilePic: user.profilePic,
				verified: user.verified,
				registrationComplete: true
			});
		} 
		// For existing users being verified
		else {
			user.verified = true;
			user.verificationCode = null;
			user.verificationCodeExpires = null;
			await user.save();
			
			// Send welcome email
			const subject = "Email Verification Successful";
			const html = `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
					<h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Email Verified Successfully</h2>
					<p>Your email address has been successfully verified. You can now enjoy all features. Welcome to Threads Clone.</p>
					<div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px;">
						<a href="${process.env.CLIENT_URL}" style="display: inline-block; background-color: #0095f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Threads Clone</a>
					</div>
				</div>
			`;
			sendEmail(user.email, subject, html);
			
			return res.status(200).json({ 
				success: true, 
				message: "Email verified successfully"
			});
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
		console.log("Error in verifyEmail: ", error.message);
	}
};

// Enhanced cleanup task for expired temporary users and verification codes
const cleanupExpiredAccounts = async () => {
	try {
		const now = new Date();
		
		// Find and delete temporary users with expired verification codes
		const expiredTempUsers = await User.find({
			isTemp: true,
			verificationCodeExpires: { $lt: now }
		});
		
		for (const user of expiredTempUsers) {
			console.log(`Deleting expired temporary user: ${user.username} (${user._id})`);
			await User.findByIdAndDelete(user._id);
		}
		
		console.log(`Cleaned up ${expiredTempUsers.length} expired temporary users`);
		
		// Find and delete ALL unverified users with expired verification codes
		const expiredUnverifiedUsers = await User.find({
			verified: false,
			verificationCodeExpires: { $lt: now },
			verificationCode: { $ne: null } // Only those with verification in progress
		});
		
		for (const user of expiredUnverifiedUsers) {
			console.log(`Deleting unverified user with expired code: ${user.username} (${user._id})`);
			await User.findByIdAndDelete(user._id);
		}
		
		console.log(`Cleaned up ${expiredUnverifiedUsers.length} expired unverified users`);
	} catch (error) {
		console.error("Error cleaning up expired accounts:", error);
	}
};

// Run cleanup every 15 minutes (900000 ms)
setInterval(cleanupExpiredAccounts, 900000);

// Also run it once at startup
cleanupExpiredAccounts().catch(err => {
	console.error("Initial cleanup failed:", err);
});

// Add a controller to resend verification code
const resendVerificationCode = async (req, res) => {
	try {
		const { userId } = req.body;
		
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}
		
		if (user.verified) {
			return res.status(400).json({ error: "Email already verified" });
		}
		
		// Generate a new 6-digit verification code
		const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
		
		// Set expiration time for the code
		const expiryMinutes = parseInt(process.env.CODE_EXPIRE_MINUTES) || 2;
		const verificationCodeExpires = new Date();
		verificationCodeExpires.setMinutes(verificationCodeExpires.getMinutes() + expiryMinutes);
		
		user.verificationCode = verificationCode;
		user.verificationCodeExpires = verificationCodeExpires;
		await user.save();
		
		// Send the new verification email
		const subject = "Your New Verification Code";
		const html = `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
				<h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Verify Your Email Address</h2>
				<p>You requested a new verification code. Please use the code below to verify your email address.</p>
				<div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
					<h3 style="margin-top: 0;">Your verification code:</h3>
					<div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0095f6; margin: 15px 0;">${verificationCode}</div>
					<p>This code will expire in ${expiryMinutes} minutes.</p>
				</div>
				<p>If you did not request this code, please ignore this email.</p>
			</div>
		`;
		sendEmail(user.email, subject, html);
		
		res.status(200).json({ success: true, message: "New verification code sent successfully" });
	} catch (error) {
		res.status(500).json({ error: error.message });
		console.log("Error in resendVerificationCode: ", error.message);
	}
};

const loginUser = async (req, res) => {
	try {
		const { username, password } = req.body;
		const user = await User.findOne({ username });
		const isPasswordCorrect = await bcrypt.compare(password, user?.password || "");

		if (!user || !isPasswordCorrect) return res.status(400).json({ error: "Invalid username or password" });

		// Check if account has been verified
		if (!user.verified) {
			return res.status(401).json({
				error: "Please verify your email address before logging in.",
				requiresVerification: true,
				userId: user._id
			});
		}

		if (user.isFrozen) {
			user.isFrozen = false;
			await user.save();
		}

		generateTokenAndSetCookie(user._id, res);

		res.status(200).json({
			_id: user._id,
			name: user.name,
			email: user.email,
			username: user.username,
			bio: user.bio,
			profilePic: user.profilePic,
			verified: user.verified
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
		console.log("Error in loginUser: ", error.message);
	}
};

const logoutUser = (req, res) => {
	try {
		res.cookie("jwt", "", { maxAge: 1 });
		res.status(200).json({ message: "User logged out successfully" });
	} catch (err) {
		res.status(500).json({ error: err.message });
		console.log("Error in signupUser: ", err.message);
	}
};

const followUnFollowUser = async (req, res) => {
	try {
		const { id } = req.params;
		const userToModify = await User.findById(id);
		const currentUser = await User.findById(req.user._id);

		if (id === req.user._id.toString())
			return res.status(400).json({ error: "You cannot follow/unfollow yourself" });

		if (!userToModify || !currentUser) return res.status(400).json({ error: "User not found" });

		const isFollowing = currentUser.following.includes(id);

		if (isFollowing) {
			// Unfollow user
			await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } });
			await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } });
			res.status(200).json({ message: "User unfollowed successfully" });
		} else {
			// Follow user
			await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });
			await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });
			res.status(200).json({ message: "User followed successfully" });
		}
	} catch (err) {
		res.status(500).json({ error: err.message });
		console.log("Error in followUnFollowUser: ", err.message);
	}
};

const updateUser = async (req, res) => {
	const { name, email, username, password, bio } = req.body;
	let { profilePic } = req.body;

	const userId = req.user._id;
	try {
		let user = await User.findById(userId);
		if (!user) return res.status(400).json({ error: "User not found" });

		if (req.params.id !== userId.toString())
			return res.status(400).json({ error: "You cannot update other user's profile" });

		if (password) {
			const salt = await bcrypt.genSalt(10);
			const hashedPassword = await bcrypt.hash(password, salt);
			user.password = hashedPassword;
		}

		if (profilePic) {
			if (user.profilePic) {
				await cloudinary.uploader.destroy(user.profilePic.split("/").pop().split(".")[0]);
			}

			const uploadedResponse = await cloudinary.uploader.upload(profilePic);
			profilePic = uploadedResponse.secure_url;
		}

		user.name = name || user.name;
		user.email = email || user.email;
		user.username = username || user.username;
		user.profilePic = profilePic || user.profilePic;
		user.bio = bio || user.bio;

		user = await user.save();

		// Find all posts that this user replied and update username and userProfilePic fields
		await Post.updateMany(
			{ "replies.userId": userId },
			{
				$set: {
					"replies.$[reply].username": user.username,
					"replies.$[reply].userProfilePic": user.profilePic,
				},
			},
			{ arrayFilters: [{ "reply.userId": userId }] }
		);

		// password should be null in response
		user.password = null;

		res.status(200).json(user);
	} catch (err) {
		res.status(500).json({ error: err.message });
		console.log("Error in updateUser: ", err.message);
	}
};

const getSuggestedUsers = async (req, res) => {
	try {
		console.log("getSuggestedUsers endpoint hit");
		const userId = req.user ? req.user._id : null;
		
		if (!userId) {
			return res.status(401).json({ error: "Not authenticated" });
		}
		
		// Find users that the current user is not following
		// and who are not frozen or temporary
		const suggestedUsers = await User.aggregate([
			{
				$match: {
					_id: { $ne: userId },
					isFrozen: { $ne: true },
					isTemp: { $ne: true },
					verified: true
				}
			},
			{
				$sample: { size: 10 }
			},
			{
				$project: {
					username: 1,
					name: 1,
					profilePic: 1,
					followers: 1
				}
			}
		]);
		
		// Filter out users that the current user is already following
		const user = await User.findById(userId);
		const filteredUsers = suggestedUsers.filter(
			(suggestedUser) => !user.following.includes(suggestedUser._id)
		);
		
		console.log(`Returning ${filteredUsers.length} suggested users`);
		res.status(200).json(filteredUsers);
	} catch (error) {
		console.error("Error in getSuggestedUsers:", error);
		res.status(500).json({ error: error.message });
	}
};

const freezeAccount = async (req, res) => {
	try {
		const user = await User.findById(req.user._id);
		if (!user) {
			return res.status(400).json({ error: "User not found" });
		}

		user.isFrozen = true;
		await user.save();

		res.status(200).json({ success: true });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

const unfreezeAccount = async (req, res) => {
	try {
		const userId = req.user._id;
		
		if (!userId) {
			return res.status(400).json({ error: "You must be logged in to unfreeze your account" });
		}
		
		const user = await User.findById(userId);
		
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}
		
		// Update the user's status
		user.isFrozen = false;
		await user.save();
		
		res.status(200).json({ success: true, message: "Account unfrozen successfully" });
	} catch (error) {
		console.error("Error in unfreezeAccount:", error);
		res.status(500).json({ error: error.message });
	}
};

const getUserReplies = async (req, res) => {
	try {
		const { username } = req.params;
		
		// Find the user by username
		const user = await User.findOne({ username });
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}
		
		// Find all posts where this user has replied
		const postsWithReplies = await Post.find({
			"replies.userId": user._id
		}).populate("postedBy", "name username profilePic")
		  .sort({ createdAt: -1 });
		
		// Extract the replies and organize them with post context
		const userReplies = [];
		
		postsWithReplies.forEach(post => {
			// Filter just this user's replies for each post
			const userRepliesForPost = post.replies.filter(
				reply => reply.userId.toString() === user._id.toString()
			);
			
			// Add post context to each reply
			userRepliesForPost.forEach(reply => {
				userReplies.push({
					replyId: reply._id,
					text: reply.text,
					createdAt: reply.createdAt,
					postId: post._id,
					postText: post.text,
					postImage: post.img,
					postedBy: post.postedBy,
					originalPostId: post.originalPost || null
				});
			});
		});
		
		res.status(200).json(userReplies);
	} catch (error) {
		res.status(500).json({ error: error.message });
		console.log("Error in getUserReplies: ", error.message);
	}
};

export {
	signupUser,
	loginUser,
	logoutUser,
	followUnFollowUser,
	updateUser,
	getUserProfile,
	getSuggestedUsers, // Make sure this is included in the export
	freezeAccount,
	getUserReplies,
	unfreezeAccount,
	verifyEmail,
	resendVerificationCode
};
