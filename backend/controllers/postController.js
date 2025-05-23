import Post from "../models/postModel.js";
import User from "../models/userModel.js";
import { v2 as cloudinary } from "cloudinary";

// Assuming you have a function that handles image uploads

// Add this to your image upload function
const uploadImage = async (imageFile) => {
  try {
    const uploadResult = await cloudinary.uploader.upload(imageFile, {
      folder: "thread_clone_images", // Create a specific folder
      resource_type: "auto",
      // Important: Setting these options makes the upload permanent
      public_id: `thread_img_${Date.now()}`, // Unique ID
      overwrite: false, // Prevent overwriting
    });
    
    return uploadResult.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw new Error("Image upload failed");
  }
};

const createPost = async (req, res) => {
  try {
    const { text, img } = req.body;
    const userId = req.user._id;
    
    if (!text && !img) {
      return res.status(400).json({ error: "Text or image is required" });
    }
    
    const newPost = new Post({
      postedBy: userId,
      text,
      img
    });
    
    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error in createPost: ", error.message);
  }
};

const getPost = async (req, res) => {
	try {
		const post = await Post.findById(req.params.id);

		if (!post) {
			return res.status(404).json({ error: "Post not found" });
		}

		res.status(200).json(post);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

const deletePost = async (req, res) => {
	try {
		const post = await Post.findById(req.params.id);
		if (!post) {
			return res.status(404).json({ error: "Post not found" });
		}

		if (post.postedBy.toString() !== req.user._id.toString()) {
			return res.status(401).json({ error: "Unauthorized to delete post" });
		}

		if (post.img) {
			const imgId = post.img.split("/").pop().split(".")[0];
			await cloudinary.uploader.destroy(imgId);
		}

		await Post.findByIdAndDelete(req.params.id);

		res.status(200).json({ message: "Post deleted successfully" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

const likeUnlikePost = async (req, res) => {
    try {
        const { id: postId } = req.params;
        const userId = req.user._id;

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }
        
        // Unlike previous implementation, we always like THIS post directly,
        // regardless of whether it's a repost or original
        const userLikedPost = post.likes.includes(userId);

        if (userLikedPost) {
            // Unlike post (on this specific post instance)
            await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
            res.status(200).json({ 
                message: "Post unliked successfully", 
                likes: post.likes.filter(id => id.toString() !== userId.toString())
            });
        } else {
            // Like post (on this specific post instance)
            post.likes.push(userId);
            await post.save();
            res.status(200).json({ 
                message: "Post liked successfully", 
                likes: post.likes
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const replyToPost = async (req, res) => {
    try {
        const { text } = req.body;
        const postId = req.params.id;
        const userId = req.user._id;
        const userProfilePic = req.user.profilePic;
        const username = req.user.username;

        if (!text) {
            return res.status(400).json({ error: "Text field is required" });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }
        
        // Always add the reply to THIS post directly, regardless of 
        // whether it's a repost or original
        const reply = { userId, text, userProfilePic, username };
        
        post.replies.push(reply);
        await post.save();

        res.status(200).json({ reply });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get posts for user feed - explicitly exclude current user's posts
const getFeedPosts = async (req, res) => {
  try {
    console.log("getFeedPosts endpoint hit");
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Get users the current user is following
    const following = user.following;
    
    // If user isn't following anyone, return empty array
    if (following.length === 0) {
      console.log("User is not following anyone, returning empty feed");
      return res.status(200).json([]);
    }
    
    // Get posts ONLY from followed users (exclude current user's posts)
    const feedPosts = await Post.find({
      postedBy: { 
        $in: following,     // Only posts from followed users
        $ne: userId         // Explicitly exclude the current user's posts
      }
    })
    .populate("postedBy", "_id username name profilePic")
    .sort({ createdAt: -1 })
    .populate("replies.userId", "_id username name profilePic");
    
    console.log(`Returning ${feedPosts.length} feed posts (excluding current user's posts)`);
    res.status(200).json(feedPosts);
  } catch (error) {
    console.error("Error in getFeedPosts:", error);
    res.status(500).json({ error: error.message });
  }
};

const getUserPosts = async (req, res) => {
	const { username } = req.params;
	try {
		const user = await User.findOne({ username });
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		const posts = await Post.find({ postedBy: user._id }).sort({ createdAt: -1 });

		res.status(200).json(posts);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

const repostPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user._id;
        const { repostId } = req.body;

        // Check if post exists
        const originalPost = await Post.findById(postId);
        if (!originalPost) {
            return res.status(404).json({ error: "Post not found" });
        }

        // Check if user has already reposted this post
        let existingRepost = null;
        
        if (repostId) {
            existingRepost = await Post.findOne({
                _id: repostId,
                postedBy: userId,
                isRepost: true
            });
        } else {
            existingRepost = await Post.findOne({
                originalPost: postId,
                postedBy: userId,
                isRepost: true
            });
        }

        if (existingRepost) {
            // Toggle off - delete the repost
            await Post.findByIdAndDelete(existingRepost._id);
            return res.status(200).json({
                message: "Repost removed successfully",
                repostId: existingRepost._id,
                removed: true
            });
        } else {
            // Toggle on - create a new repost
            const newRepost = new Post({
                text: originalPost.text,
                img: originalPost.img,
                postedBy: userId,
                originalPost: originalPost._id,
                originalPostedBy: originalPost.postedBy,
                isRepost: true,
                // Start with empty likes and replies for this repost
                likes: [],
                replies: []
            });

            await newRepost.save();
            return res.status(201).json(newRepost);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const unrepostPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user._id;

        // Find the repost
        const repost = await Post.findOne({
            originalPost: postId,
            postedBy: userId,
            isRepost: true
        });

        if (!repost) {
            return res.status(404).json({ error: "Repost not found" });
        }

        // Check if the user is authorized to delete this repost
        if (repost.postedBy.toString() !== userId.toString()) {
            return res.status(401).json({ error: "Unauthorized to delete this repost" });
        }

        // Delete the repost
        await Post.findByIdAndDelete(repost._id);

        res.status(200).json({ message: "Repost removed successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getUserReplies = async (req, res) => {
    try {
        const { username } = req.params;

        console.log(`Getting replies for user: ${username}`);
        
        // Find the user
        const user = await User.findOne({ username });
        if (!user) {
            console.log(`User not found: ${username}`);
            return res.status(404).json({ error: "User not found" });
        }

        const userId = user._id;
        console.log(`Found user ID: ${userId}`);

        // Find all posts that contain replies from this user
        const posts = await Post.find({
            "replies.userId": userId
        }).populate("postedBy", "username name profilePic");
        
        console.log(`Found ${posts.length} posts with replies from this user`);

        // Extract just the replies from this user
        const userReplies = [];
        
        posts.forEach(post => {
            const repliesByUser = post.replies.filter(reply => 
                reply.userId.toString() === userId.toString()
            );
            
            repliesByUser.forEach(reply => {
                userReplies.push({
                    _id: reply._id,
                    text: reply.text,
                    createdAt: new Date(reply.createdAt || Date.now()).toISOString(),  // Ensure ISO format
                    postId: post._id,
                    userProfilePic: reply.userProfilePic,
                    username: reply.username,
                    originalPostText: post.text.substring(0, 50) + (post.text.length > 50 ? "..." : ""),
                    originalPoster: post.postedBy
                });
            });
        });

        console.log(`Extracted ${userReplies.length} replies`);
        res.status(200).json(userReplies);
    } catch (error) {
        console.error("Error in getUserReplies:", error);
        res.status(500).json({ error: error.message });
    }
};

// Add to the exports
export { 
    createPost, 
    getPost, 
    deletePost, 
    likeUnlikePost, 
    replyToPost, 
    getFeedPosts, 
    getUserPosts, 
    repostPost,
    unrepostPost,
    getUserReplies 
};
