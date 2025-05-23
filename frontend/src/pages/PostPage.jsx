import { Avatar, Box, Button, Divider, Flex, Image, Spinner, Text } from "@chakra-ui/react";
import Actions from "../components/Actions";
import { useEffect, useState } from "react";
import Comment from "../components/Comment";
import useGetUserProfile from "../hooks/useGetUserProfile";
import useShowToast from "../hooks/useShowToast";
import { useNavigate, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useRecoilState, useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import { DeleteIcon } from "@chakra-ui/icons";
import postsAtom from "../atoms/postsAtom";
import {
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
    useDisclosure
} from "@chakra-ui/react";
import { useRef } from "react";

const PostPage = () => {
    const { user, loading } = useGetUserProfile();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const cancelRef = useRef();
    const [posts, setPosts] = useRecoilState(postsAtom);
    const [originalUser, setOriginalUser] = useState(null);
    const [originalPost, setOriginalPost] = useState(null);
    const showToast = useShowToast();
    const { pid } = useParams();
    const currentUser = useRecoilValue(userAtom);
    const navigate = useNavigate();

    const currentPost = posts[0];
    const isRepostedPost = currentPost?.isRepost === true;

    useEffect(() => {
        const getPost = async () => {
            setPosts([]);
            try {
                const res = await fetch(`/api/posts/${pid}`);
                const data = await res.json();
                if (data.error) {
                    showToast("Error", data.error, "error");
                    return;
                }
                setPosts([data]);
                
                // If this is a repost, fetch the original poster info
                if (data.isRepost && data.originalPostedBy) {
                    const originalUserRes = await fetch(`/api/users/profile/${data.originalPostedBy}`);
                    const originalUserData = await originalUserRes.json();
                    if (!originalUserRes.ok) {
                        showToast("Error", "Failed to load original user", "error");
                        return;
                    }
                    setOriginalUser(originalUserData);
                }
            } catch (error) {
                showToast("Error", error.message, "error");
            }
        };
        getPost();
    }, [showToast, pid, setPosts]);

    const handleDeletePost = async () => {
        try {
            const res = await fetch(`/api/posts/${currentPost._id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (data.error) {
                showToast("Error", data.error, "error");
                return;
            }
            showToast("Success", "Post deleted", "success");
            navigate(`/${user.username}`);
        } catch (error) {
            showToast("Error", error.message, "error");
        } finally {
            onClose();
        }
    };

    if (!user && loading) {
        return (
            <Flex justifyContent={"center"}>
                <Spinner size={"xl"} />
            </Flex>
        );
    }

    if (!currentPost) return null;

    // For reposts, we'll show both the reposter info and the original post
    const displayPost = isRepostedPost && originalPost ? originalPost : currentPost;
    const displayUser = isRepostedPost && originalUser ? originalUser : user;

    return (
        <>
            {isRepostedPost && (
                <Flex alignItems="center" gap={2} mb={4} color="gray.500" fontSize="sm">
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
                    <Text fontWeight="bold">{user.username} reposted</Text>
                </Flex>
            )}

            <Flex>
                <Flex w={"full"} alignItems={"center"} gap={3}>
                    <Avatar 
                        src={displayUser?.profilePic}
                        size={"md"}
                        name={displayUser?.name || "User"}
                        cursor="pointer"
                        onClick={() => navigate(`/${displayUser?.username}`)}
                    />
                    <Flex>
                        <Text 
                            fontSize={"sm"} 
                            fontWeight={"bold"}
                            cursor="pointer"
                            onClick={() => navigate(`/${displayUser?.username}`)}
                        >
                            {displayUser?.username}
                        </Text>
                        
                    </Flex>
                </Flex>
                <Flex gap={4} alignItems={"center"}>
                    <Text fontSize={"xs"} width={36} textAlign={"right"} color={"gray.light"}>
                        {formatDistanceToNow(new Date(displayPost.createdAt))} ago
                    </Text>

                    {currentUser?._id === user._id && (
                        <DeleteIcon size={20} cursor={"pointer"} onClick={onOpen} />
                    )}
                </Flex>
            </Flex>

            <Text my={3}>{displayPost.text}</Text>

            {displayPost.img && (
                <Box borderRadius={6} overflow={"hidden"} border={"1px solid"} borderColor={"gray.light"}>
                    <Image src={displayPost.img} w={"full"} />
                </Box>
            )}

            {/* Add post stats here - before Actions component */}
            <Flex gap={4} my={2} alignItems="center" color="gray.500" fontSize="sm">
               
                
                {isRepostedPost && (
                    <>
                        <Box w={1} h={1} bg="gray.500" borderRadius="full"></Box>
                        <Flex alignItems="center" gap={1}>
                            <svg
                                aria-label="Repost"
                                color="gray.500"
                                fill="gray.500"
                                height="14"
                                role="img"
                                viewBox="0 0 24 24"
                                width="14"
                            >
                                <path d="M19.998 9.497a1 1 0 0 0-1 1v4.228a3.274 3.274 0 0 1-3.27 3.27h-5.313l1.791-1.787a1 1 0 0 0-1.412-1.416L7.29 18.287a1.004 1.004 0 0 0-.294.707v.001c0 .023.012.042.013.065a.923.923 0 0 0 .281.643l3.502 3.504a1 1 0 0 0 1.414-1.414l-1.797-1.798h5.318a5.276 5.276 0 0 0 5.27-5.27v-4.228a1 1 0 0 0-1-1Zm-6.41-3.496-1.795 1.795a1 1 0 1 0 1.414 1.414l3.5-3.5a1.003 1.003 0 0 0 0-1.417l-3.5-3.5a1 1 0 0 0-1.414 1.414l1.794 1.794H8.27A5.277 5.277 0 0 0 3 9.271V13.5a1 1 0 0 0 2 0V9.271a3.275 3.275 0 0 1 3.271-3.27Z"></path>
                            </svg>
                            <Text>Repost</Text>
                        </Flex>
                    </>
                )}
            </Flex>

            <Flex gap={3} my={3}>
                <Actions post={displayPost} />
            </Flex>

            <Divider my={4} />

            {displayPost.replies.map((reply) => (
                <Comment
                    key={reply._id}
                    reply={reply}
                    lastReply={
                        reply._id === displayPost.replies[displayPost.replies.length - 1]._id
                    }
                />
            ))}

            <AlertDialog
                isOpen={isOpen}
                leastDestructiveRef={cancelRef}
                onClose={onClose}
                isCentered
            >
                <AlertDialogOverlay>
                    <AlertDialogContent bg="gray.dark" color="white">
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Delete Post
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            Are you sure you want to delete this post? This action cannot be undone.
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={onClose} variant="outline">
                                Cancel
                            </Button>
                            <Button colorScheme="red" onClick={handleDeletePost} ml={3}>
                                Delete
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </>
    );
};

export default PostPage;
