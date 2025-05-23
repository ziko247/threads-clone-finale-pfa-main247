import express from "express";
import { sendMessage, getMessages, getConversations } from "../controllers/messageController.js";
import protectRoute from "../middlewares/protectRoute.js";
import Message from "../models/messageModel.js";

const router = express.Router();

// Apply protectRoute middleware to all routes
router.use(protectRoute);

// Get all conversations for the current user
router.get("/conversations", getConversations);

// Debug endpoint to check for duplicate messages
router.get("/debug/:conversationId", async (req, res) => {
    try {
        const messages = await Message.find({ 
            conversationId: req.params.conversationId 
        }).sort({ createdAt: 1 });
        
        res.status(200).json({ 
            count: messages.length,
            messages: messages.map(m => ({
                id: m._id,
                text: m.text,
                sender: m.sender,
                time: m.createdAt
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get messages between current user and another user
router.get("/:otherUserId", getMessages);

// Send a message (regular or with shared post)
router.post("/", sendMessage);

export default router;
