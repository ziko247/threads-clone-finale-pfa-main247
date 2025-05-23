import path from "path";
import express from "express";
import dotenv from "dotenv";
import connectDB from "./db/connectDB.js";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import { v2 as cloudinary } from "cloudinary";
import { app, server } from "./socket/socket.js";
import job from "./cron/cron.js";
import cors from "cors";

dotenv.config();

connectDB();
job.start();

const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Middlewares
app.use(express.json({ limit: "50mb" })); // To parse JSON data in the req.body
app.use(express.urlencoded({ extended: true })); // To parse form data in the req.body
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/messages", messageRoutes);

// Make sure to also add this endpoint for conversations
app.use("/api/conversations", (req, res) => {
  // This is a temporary redirect to messageRoutes
  res.redirect("/api/messages/conversations");
});

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working!" });
});

// Add a debug endpoint
app.get('/api/test', (req, res) => {
    console.log('Test endpoint hit!');
    res.json({ message: 'API server is running!' });
});

// Log routes for debugging
app._router.stack.forEach(function(r){
    if (r.route && r.route.path){
        console.log("Route registered:", r.route.path, r.route.methods);
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!", details: err.message });
});

// http://localhost:5000 => backend,frontend

if (process.env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "/frontend/dist")));

	// react app
	app.get("*", (req, res) => {
		res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
	});
}

server.listen(PORT, "0.0.0.0", () => {
	console.log(`Server started at http://localhost:${PORT}`);
  });

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Log the email configuration status
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ WARNING: Email credentials not configured in .env file!");
    console.warn("Emails will not be sent. Please set EMAIL_USER and EMAIL_PASSWORD");
  } else {
    console.log("📧 Email configuration detected");
  }
  
  // Check critical env variables
  if (!process.env.CODE_EXPIRE_MINUTES) {
    console.log("ℹ️ CODE_EXPIRE_MINUTES not set, using default of 10 minutes");
  }
  
  console.log(`⏱️ Account cleanup service active - unverified accounts will be automatically deleted after ${process.env.CODE_EXPIRE_MINUTES || 10} minutes`);
  
  console.log(`
    -------------------------------------
    🚀 Server running on port ${PORT}
    📁 API routes available at http://localhost:${PORT}/api
    -------------------------------------
    `);
});
