import express from "express";
import {
	createPost,
	deletePost,
	getPost,
	likeUnlikePost,
	replyToPost,
	getFeedPosts,
	getUserPosts,
	repostPost,
	unrepostPost,
	getUserReplies
} from "../controllers/postController.js";
import protectRoute from "../middlewares/protectRoute.js";

const router = express.Router();

// Feed posts (requires authentication)
router.get("/feed", protectRoute, getFeedPosts);

// Define routes in order of specificity (most specific first)
router.get("/user/:username", getUserPosts);
router.get("/replies/:username", getUserReplies);  // Keep this before /:id

router.post("/create", protectRoute, createPost);
router.post("/repost/:id", protectRoute, repostPost);

router.put("/like/:id", protectRoute, likeUnlikePost);
router.put("/reply/:id", protectRoute, replyToPost);

router.delete("/repost/:id", protectRoute, unrepostPost);
router.delete("/:id", protectRoute, deletePost);

// Most generic route should be last
router.get("/:id", getPost);

export default router;
