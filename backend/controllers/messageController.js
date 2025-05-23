import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";
import { emitNewMessage, getRecipientSocketId, io } from "../socket/socket.js";
import { v2 as cloudinary } from "cloudinary";

async function sendMessage(req, res) {
    try {
        const { recipientId, message, postId } = req.body;
        let { img } = req.body;
        const senderId = req.user._id;

        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, recipientId] },
        });

        if (!conversation) {
            conversation = new Conversation({
                participants: [senderId, recipientId],
                lastMessage: {
                    text: postId ? "Shared a post" : message,
                    sender: senderId,
                    seen: false, // Make sure to initialize seen status
                },
            });
            await conversation.save();
        }

        if (img) {
            const uploadedResponse = await cloudinary.uploader.upload(img);
            img = uploadedResponse.secure_url;
        }

        const newMessage = new Message({
            conversationId: conversation._id,
            sender: senderId,
            text: message || (postId ? "Check out this post!" : ""),
            img: img || "",
            sharedPost: postId || null,
            seen: false, // Explicitly set seen to false
        });

        await Promise.all([
            newMessage.save(),
            conversation.updateOne({
                lastMessage: {
                    text: postId ? "Shared a post" : message,
                    sender: senderId,
                    seen: false, // Explicitly set seen to false
                },
            }),
        ]);

        // Populate sender information for the response
        const populatedMessage = await Message.findById(newMessage._id)
            .populate("sender", "name username profilePic")
            .populate({
                path: "sharedPost",
                populate: {
                    path: "postedBy",
                    select: "name username profilePic"
                }
            });

        // Use the new emitNewMessage function to prevent duplicates
        emitNewMessage(recipientId, populatedMessage.toObject());

        res.status(201).json(populatedMessage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Update the getMessages function to mark messages as seen

async function getMessages(req, res) {
    const { otherUserId } = req.params;
    const userId = req.user._id;
    try {
        const conversation = await Conversation.findOne({
            participants: { $all: [userId, otherUserId] },
        });

        if (!conversation) {
            return res.status(200).json([]);
        }

        const messages = await Message.find({ conversationId: conversation._id })
            .populate("sender", "name username profilePic")
            .populate({
                path: "sharedPost",
                populate: {
                    path: "postedBy",
                    select: "name username profilePic"
                }
            });

        // Update unseen messages to seen when the recipient views them
        const messagesUpdated = await Message.updateMany(
            {
                conversationId: conversation._id,
                sender: otherUserId,  // Only mark other user's messages as seen
                seen: false,
            },
            { seen: true }
        );

        // If any messages were updated to seen, emit socket event
        if (messagesUpdated.modifiedCount > 0) {
            // Get the socket ID of the other user
            const otherUserSocketId = getRecipientSocketId(otherUserId);
            
            if (otherUserSocketId) {
                // Emit event to notify the sender that their messages have been seen
                io.to(otherUserSocketId).emit("messagesSeen", {
                    conversationId: conversation._id,
                    userId: userId
                });
            }
        }

        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getConversations(req, res) {
	const userId = req.user._id;
	try {
		const conversations = await Conversation.find({ participants: userId }).populate({
			path: "participants",
			select: "username profilePic",
		});

		// remove the current user from the participants array
		conversations.forEach((conversation) => {
			conversation.participants = conversation.participants.filter(
				(participant) => participant._id.toString() !== userId.toString()
			);
		});
		res.status(200).json(conversations);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
}

export { sendMessage, getMessages, getConversations };
