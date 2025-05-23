import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: ["http://localhost:3000", "http://localhost:5000"],
		methods: ["GET", "POST"],
		credentials: true
	},
	pingTimeout: 60000,
});

// Track recently emitted messages to prevent duplicates (messageId -> timestamp)
const recentlyEmittedMessages = new Map();

// Clean up old entries every minute
setInterval(() => {
	const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
	const deletedCount = Array.from(recentlyEmittedMessages.entries())
		.filter(([_, timestamp]) => timestamp < fiveMinutesAgo)
		.map(([key]) => {
			recentlyEmittedMessages.delete(key);
			return key;
		}).length;
		
	if (deletedCount > 0) {
		console.log(`Cleaned message cache. Removed ${deletedCount} old messages. Current size: ${recentlyEmittedMessages.size}`);
	}
}, 60 * 1000);

// Single socket per user enforcement
const userSocketMap = {}; // userId: socketId
const socketUserMap = {}; // socketId: userId

export const getRecipientSocketId = (recipientId) => {
	return userSocketMap[recipientId];
};

io.on("connection", (socket) => {
	console.log("User connected:", socket.id);
	const userId = socket.handshake.query.userId;

	if (userId && userId !== "undefined") {
		// Track relationships between users and sockets
		socketUserMap[socket.id] = userId;
		
		// If user already has a socket connection, disconnect previous one
		const existingSocketId = userSocketMap[userId];
		if (existingSocketId && existingSocketId !== socket.id) {
			console.log(`User ${userId} reconnected. Previous socket: ${existingSocketId}`);
			
			// Force disconnect the old socket to prevent duplicate connections
			const existingSocket = io.sockets.sockets.get(existingSocketId);
			if (existingSocket) {
				console.log(`Disconnecting previous socket: ${existingSocketId}`);
				existingSocket.disconnect();
				
				// Clean up the old socket entry
				delete socketUserMap[existingSocketId];
			}
		}
		
		// Update the user's socket ID
		userSocketMap[userId] = socket.id;
		
		// Send the updated online users to all connected clients
		io.emit("getOnlineUsers", Object.keys(userSocketMap));
	}

	// Handle marking messages as seen
	socket.on("markMessagesAsSeen", async ({ conversationId, userId }) => {
		try {
			console.log(`Marking messages as seen in conversation ${conversationId} for user ${userId}`);
			
			const updateResult = await Message.updateMany(
				{ conversationId: conversationId, seen: false }, 
				{ $set: { seen: true } }
			);
			
			if (updateResult.modifiedCount > 0) {
				await Conversation.updateOne(
					{ _id: conversationId }, 
					{ $set: { "lastMessage.seen": true } }
				);
				
				const recipientSocketId = getRecipientSocketId(userId);
				if (recipientSocketId) {
					io.to(recipientSocketId).emit("messagesSeen", { conversationId });
				}
			}
		} catch (error) {
			console.log("Error marking messages as seen:", error);
		}
	});

	socket.on("disconnect", () => {
		console.log("User disconnected:", socket.id);
		
		// Get the userId associated with this socket
		const userId = socketUserMap[socket.id];
		
		// Clean up maps
		if (userId) {
			// Only remove from userSocketMap if this is the current socket for that user
			if (userSocketMap[userId] === socket.id) {
				delete userSocketMap[userId];
			}
		}
		
		delete socketUserMap[socket.id];
		
		// Update online users list
		io.emit("getOnlineUsers", Object.keys(userSocketMap));
	});
});

// Custom middleware to prevent duplicate emissions
export const emitNewMessage = (recipientId, message) => {
	// Get the message ID from the populated message
	const messageId = message._id?.toString() || message.messageId;
	
	if (!messageId) {
		console.log("Warning: Message has no ID, cannot prevent duplicates");
		return;
	}
	
	// Check if this message was recently emitted
	if (recentlyEmittedMessages.has(messageId)) {
		console.log(`Preventing duplicate message emission for ID: ${messageId}`);
		return;
	}
	
	// Mark this message as recently emitted
	recentlyEmittedMessages.set(messageId, Date.now());
	
	// Get the recipient's socket ID
	const recipientSocketId = getRecipientSocketId(recipientId);
	if (recipientSocketId) {
		console.log(`Sending message ${messageId} to user ${recipientId} via socket ${recipientSocketId}`);
		io.to(recipientSocketId).emit("newMessage", message);
	} else {
		console.log(`Recipient ${recipientId} is not online, message queued in DB`);
	}
};

export { io, server, app };
