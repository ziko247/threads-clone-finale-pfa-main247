import mongoose from "mongoose";

const userSchema = mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		username: {
			type: String,
			required: true,
			unique: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
		},
		password: {
			type: String,
			minLength: 6,
			required: true,
		},
		profilePic: {
			type: String,
			default: "",
		},
		followers: {
			type: [String],
			default: [],
		},
		following: {
			type: [String],
			default: [],
		},
		bio: {
			type: String,
			default: "",
		},
		isFrozen: {
			type: Boolean,
			default: false,
		},
		verified: {
			type: Boolean,
			default: false,
		},
		isTemp: {
			type: Boolean,
			default: false, // Flag for temporary users (not fully registered)
		},
		verificationCode: {
			type: String,
			default: null,
		},
		verificationCodeExpires: {
			type: Date,
			default: null,
		}
	},
	{
		timestamps: true,
	}
);

const User = mongoose.model("User", userSchema);

export default User;
