import mongoose from "mongoose";

const postSchema = mongoose.Schema(
    {
        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: {
            type: String,
            required: true,
        },
        img: {
            type: String,
        },
        likes: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: "User",
            default: [],
        },
        replies: {
            type: Array,
            default: [],
        },
        isRepost: {
            type: Boolean,
            default: false,
        },
        originalPost: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
        },
        originalPostedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

const Post = mongoose.model("Post", postSchema);

export default Post;
