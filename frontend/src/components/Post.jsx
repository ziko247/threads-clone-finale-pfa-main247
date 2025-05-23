import { Avatar } from "@chakra-ui/avatar";
import { Image } from "@chakra-ui/image";
import { Box, Flex, Text } from "@chakra-ui/layout";
import { Link, useNavigate } from "react-router-dom";
import Actions from "./Actions";
import { useEffect, useState } from "react";
import useShowToast from "../hooks/useShowToast";
import { formatDistanceToNow } from "date-fns";
import { DeleteIcon } from "@chakra-ui/icons";
import { useRecoilState, useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import postsAtom from "../atoms/postsAtom";

const Post = ({ post, postedBy }) => {
    const [user, setUser] = useState(null);
    const [originalUser, setOriginalUser] = useState(null);
    const showToast = useShowToast();
    const currentUser = useRecoilValue(userAtom);
    const [posts, setPosts] = useRecoilState(postsAtom);
    const navigate = useNavigate();
    const isRepostedPost = post.isRepost === true;

    useEffect(() => {
        const getUser = async () => {
            try {
                // Check if postedBy is an object or ID string
                const posterUserId = typeof postedBy === 'object' ? postedBy._id : postedBy;
                
                if (!posterUserId) {
                    console.error("Invalid postedBy data:", postedBy);
                    return;
                }
                
                console.log("Fetching user with ID:", posterUserId);
                
                // Always fetch the poster (who reposted)
                const res = await fetch(`/api/users/profile/${posterUserId}`);
                const data = await res.json();
                
                if (data.error) {
                    showToast("Error", data.error, "error");
                    return;
                }
                
                setUser(data);

                // If it's a repost, also fetch the original poster
                if (isRepostedPost && post.originalPostedBy) {
                    const originalUserId = typeof post.originalPostedBy === 'object' 
                        ? post.originalPostedBy._id 
                        : post.originalPostedBy;
                    
                    if (originalUserId) {
                        const originalRes = await fetch(`/api/users/profile/${originalUserId}`);
                        const originalData = await originalRes.json();
                        
                        if (originalData.error) {
                            console.error("Error fetching original user:", originalData.error);
                            return;
                        }
                        
                        setOriginalUser(originalData);
                    }
                }
            } catch (error) {
                console.error("Error fetching user:", error);
                showToast("Error", "Failed to load user information", "error");
                setUser(null);
            }
        };

        if (postedBy) {
            getUser();
        }
    }, [postedBy, showToast, isRepostedPost, post.originalPostedBy]);

    const handleDeletePost = async (e) => {
        try {
            e.preventDefault();
            if (!window.confirm("Are you sure you want to delete this post?")) return;

            const res = await fetch(`/api/posts/${post._id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (data.error) {
                showToast("Error", data.error, "error");
                return;
            }
            showToast("Success", "Post deleted", "success");
            setPosts(posts.filter((p) => p._id !== post._id));
        } catch (error) {
            showToast("Error", error.message, "error");
        }
    };

    if (!user) return null;

    // For a repost, we always show the original content
    // but maintain separate likes and comments
    const displayUser = isRepostedPost && originalUser ? originalUser : user;
    const reposter = isRepostedPost ? user : null;

    // Change this logic to show the person who reposted when clicking a repost
    // Don't modify displayUser yet - we'll use it differently
    return (
        <Box>
            {isRepostedPost && (
                <Flex alignItems="center" gap={2} mb={2} color="gray.500" fontSize="sm">
                    <svg
                        aria-label="Repost"
                        color="rgb(0, 186, 124)"
                        fill="rgb(0, 186, 124)"
                        height="16"
                        role="img"
                        viewBox="0 0 24 24"
                        width="16"
                    >
                        <path d="M19.998 9.497a1 1 0 0 0-1 1v4.228a3.274 3.274 0 0 1-3.27 3.27h-5.313l1.791-1.787a1 1 0 0 0-1.412-1.416L7.29 18.287a1.004 1.004 0 0 0-.294.707v.001c0 .023.012.042.013.065a.923.923 0 0 0 .281.643l3.502 3.504a1 1 0 0 0 1.414-1.414l-1.797-1.798h5.318a5.276 5.276 0 0 0 5.27-5.27v-4.228a1 1 0 0 0-1-1Zm-6.41-3.496-1.795 1.795a1 1 0 1 0 1.414 1.414l3.5-3.5a1.003 1.003 0 0 0 0-1.417l-3.5-3.5a1 1 0 0 0-1.414 1.414l1.794 1.794H8.27A5.277 5.277 0 0 0 3 9.271V13.5a1 1 0 0 0 2 0V9.271a3.275 3.275 0 0 1 3.271-3.27Z"></path>
                    </svg>
                    <Text>{reposter.username} reposted</Text>
                </Flex>
            )}
            <Link to={`/${user.username}/post/${post._id}`}>
                <Flex gap={3} mb={4} py={5}>
                    <Flex flexDirection={"column"} alignItems={"center"}>
                        <Avatar
                            size='md'
                            name={displayUser.name}
                            src={displayUser.profilePic}
                            onClick={(e) => {
                                e.preventDefault();
                                navigate(`/${displayUser.username}`);
                            }}
                        />
                        <Box w='1px' h={"full"} bg='gray.light' my={2}></Box>
                        <Box position={"relative"} w={"full"}>
                            {/* Always use this specific post's replies */}
                            {post.replies.length === 0 && <Text>🥱</Text>}
                            {post.replies.length > 0 && (
                                <>
                                    {post.replies.slice(0, 2).map((reply, i) => (
                                        <Avatar
                                            key={i}
                                            size='xs'
                                            name={reply.username}
                                            src={reply.userProfilePic}
                                            position={"absolute"}
                                            top={i * 5}
                                            left={i * 5}
                                            padding={"2px"}
                                        />
                                    ))}
                                </>
                            )}
                        </Box>
                    </Flex>
                    <Flex flex={1} flexDirection={"column"} gap={2}>
                        <Flex justifyContent={"space-between"} w={"full"}>
                            <Flex w={"full"} alignItems={"center"}>
                                <Text
                                    fontSize={"sm"}
                                    fontWeight={"bold"}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        navigate(`/${displayUser.username}`);
                                    }}
                                >
                                    {displayUser.username}
                                </Text>
                                <Image src='/verified.png' w={4} h={4} ml={1} />
                            </Flex>
                            <Flex gap={4} alignItems={"center"}>
                                <Text fontSize={"xs"} width={36} textAlign={"right"} color={"gray.light"}>
                                    {formatDistanceToNow(new Date(post.createdAt))} ago
                                </Text>

                                {currentUser?._id === user._id && <DeleteIcon size={20} onClick={handleDeletePost} />}
                            </Flex>
                        </Flex>

                        <Text fontSize={"sm"}>{post.text}</Text>
                        {post.img && (
                            <Box borderRadius={6} overflow={"hidden"} border={"1px solid"} borderColor={"gray.light"}>
                                <Image src={post.img} w={"full"} />
                            </Box>
                        )}

                        <Flex gap={3} my={1}>
                            <Actions post={post} />
                        </Flex>
                    </Flex>
                </Flex>
            </Link>
        </Box>
    );
};

export default Post;
