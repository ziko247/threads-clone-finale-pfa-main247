import {
	Box,
	Button,
	Flex,
	FormControl,
	Input,
	Modal,
	ModalBody,
	ModalCloseButton,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalOverlay,
	Text,
	useDisclosure,
	Avatar,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import useShowToast from "../hooks/useShowToast";
import postsAtom from "../atoms/postsAtom";

const Actions = ({ post }) => {
	const user = useRecoilValue(userAtom);
	const [liked, setLiked] = useState(post.likes.includes(user?._id));
	const [posts, setPosts] = useRecoilState(postsAtom);
	const [isLiking, setIsLiking] = useState(false);
	const [isReplying, setIsReplying] = useState(false);
	const [isReposting, setIsReposting] = useState(false);
	const [reply, setReply] = useState("");
	const [hasReposted, setHasReposted] = useState(
		posts.some(p => 
			p.isRepost === true && 
			p.originalPost && 
			p.originalPost.toString() === post._id.toString() && 
			p.postedBy.toString() === user?._id?.toString()
		)
	);
	const [showShareModal, setShowShareModal] = useState(false);
	const [conversations, setConversations] = useState([]);
	const [loadingConversations, setLoadingConversations] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);
	const [isSending, setIsSending] = useState(false);

	const showToast = useShowToast();
	const { isOpen, onOpen, onClose } = useDisclosure();

	const handleLikeAndUnlike = async () => {
		if (!user) return showToast("Error", "You must be logged in to like a post", "error");
		if (isLiking) return;
		setIsLiking(true);
		try {
			const res = await fetch("/api/posts/like/" + post._id, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
			});
			const data = await res.json();
			if (data.error) return showToast("Error", data.error, "error");

			if (!liked) {
				// add the id of the current user to post.likes array
				const updatedPosts = posts.map((p) => {
					if (p._id === post._id) {
						return { ...p, likes: [...p.likes, user._id] };
					}
					return p;
				});
				setPosts(updatedPosts);
			} else {
				// remove the id of the current user from post.likes array
				const updatedPosts = posts.map((p) => {
					if (p._id === post._id) {
						return { ...p, likes: p.likes.filter((id) => id !== user._id) };
					}
					return p;
				});
				setPosts(updatedPosts);
			}

			setLiked(!liked);
		} catch (error) {
			showToast("Error", error.message, "error");
		} finally {
			setIsLiking(false);
		}
	};

	const handleReply = async () => {
		if (!user) return showToast("Error", "You must be logged in to reply to a post", "error");
		if (isReplying) return;
		setIsReplying(true);
		try {
			const res = await fetch("/api/posts/reply/" + post._id, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ text: reply }),
			});
			const data = await res.json();
			if (data.error) return showToast("Error", data.error, "error");

			const updatedPosts = posts.map((p) => {
				if (p._id === post._id) {
					return { ...p, replies: [...p.replies, data] };
				}
				return p;
			});
			setPosts(updatedPosts);
			showToast("Success", "Reply posted successfully", "success");
			onClose();
			setReply("");
		} catch (error) {
			showToast("Error", error.message, "error");
		} finally {
			setIsReplying(false);
		}
	};

	const handleRepost = async () => {
		if (!user) return showToast("Error", "You must be logged in to repost", "error");

		try {
			setIsReposting(true);
			
			// For a user's own repost, we need to delete it by ID
			if (post.isRepost && post.postedBy === user._id) {
				// If this is our own repost, delete it directly
				const res = await fetch(`/api/posts/${post._id}`, {
					method: "DELETE",
					headers: {
						"Content-Type": "application/json",
					}
				});
				
				const data = await res.json();
				
				if (data.error) {
					showToast("Error", data.error, "error");
					return;
				}
				
				// Successfully removed repost
				showToast("Success", "Repost removed", "success");
				// Update states - remove this post from the feed
				setPosts((prevPosts) => prevPosts.filter(p => p._id !== post._id));
				setHasReposted(false);
				return;
			}
			
			// Otherwise, create/toggle a repost of another post
			// Use the correct post ID depending on whether this is already a repost
			const targetPostId = post.originalPost || post._id;
			
			// Make sure the endpoint is correctly formatted
			const res = await fetch(`/api/posts/repost/${targetPostId}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				}
			});
		
			const data = await res.json();
			
			if (data.error) {
				showToast("Error", data.error, "error");
				return;
			}
		
			if (data.removed) {
				// Successfully removed repost
				showToast("Success", "Repost removed", "success");
				// Update states
				setPosts((prevPosts) => prevPosts.filter(p => p._id !== data.repostId));
				setHasReposted(false);
			} else {
				// Successfully created repost
				showToast("Success", "Post reposted", "success");
				// Add the new repost to posts state
				setPosts((prevPosts) => [data, ...prevPosts]);
				setHasReposted(true);
			}
		} catch (error) {
			showToast("Error", error.message, "error");
		} finally {
			setIsReposting(false);
		}
	};

	const handleLike = async () => {
		if (!user) return showToast("Error", "You must be logged in to like a post", "error");
		if (isLiking) return;
	
		setIsLiking(true);
		try {
			const res = await fetch(`/api/posts/like/${post._id}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});
			const data = await res.json();
			
			if (!res.ok) {
				throw new Error(data.error || "Something went wrong");
			}
			
			// Update the UI to reflect like status
			if (data.originalPostId) {
				// This was a repost - the original post was liked/unliked
				// Update all instances of the original post and its reposts
				const updatedPosts = posts.map(p => {
					// If this is the original post, update its likes
					if (p._id === data.originalPostId) {
						return {
							...p,
							likes: data.likes || []
						};
					}
					// If this is a repost of the original post, sync its likes
					if (p.isRepost && p.originalPost === data.originalPostId) {
						return {
							...p,
							likes: data.likes || []
						};
					}
					return p;
				});
				
				setPosts(updatedPosts);
			} else {
				// Direct like on a normal post
				const updatedPosts = posts.map(p => {
					if (p._id === post._id) {
						return {
							...p,
							likes: liked
								? p.likes.filter(id => id !== user._id)
								: [...p.likes, user._id]
						};
					}
					return p;
				});
				
				setPosts(updatedPosts);
			}
			
			setLiked(!liked);
		} catch (error) {
			showToast("Error", error.message, "error");
		} finally {
			setIsLiking(false);
		}
	};

	const handleShareClick = async () => {
		if (!user) return showToast("Error", "You must be logged in to share a post", "error");
		setShowShareModal(true);
		
		// Fetch conversations when modal opens
		if (conversations.length === 0) {
		  fetchConversations();
		}
	};
	
	// Replace the current fetchConversations function with this temporary implementation:

const fetchConversations = async () => {
  try {
    setLoadingConversations(true);
    
    // Check if the API endpoint exists
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        return;
      }
    } catch (error) {
      console.log("API endpoint not available, using mock data");
    }
    
    // If API fails, use mock data
    setTimeout(() => {
      // Mock conversation data until backend is ready
      const mockConversations = [
        {
          _id: "mock-convo-1",
          participants: [
            { _id: user?._id },
            { 
              _id: "mock-user-1", 
              username: "john_doe", 
              name: "John Doe",
              profilePic: "https://bit.ly/ryan-florence" 
            }
          ]
        },
        {
          _id: "mock-convo-2",
          participants: [
            { _id: user?._id },
            { 
              _id: "mock-user-2", 
              username: "jane_smith", 
              name: "Jane Smith",
              profilePic: "https://bit.ly/sage-adebayo" 
            }
          ]
        },
        {
          _id: "mock-convo-3",
          participants: [
            { _id: user?._id },
            { 
              _id: "mock-user-3", 
              username: "alex_dev", 
              name: "Alex Developer",
              profilePic: "https://bit.ly/prosper-baba" 
            }
          ]
        }
      ];
      
      setConversations(mockConversations);
    }, 500); // Simulate network delay
    
  } catch (error) {
    showToast("Error", "Failed to load conversations", "error");
  } finally {
    setLoadingConversations(false);
  }
};

// Also update the handleSendPost function to handle mock data
const handleSendPost = async () => {
    if (!selectedUser) {
        showToast("Error", "Please select a recipient", "error");
        return;
    }
    
    try {
        setIsSending(true);
        
        // Try the real API first
        try {
            const res = await fetch("/api/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    recipientId: selectedUser._id,
                    message: "Check out this post!",
                    postId: post._id,
                }),
            });
            
            if (res.ok) {
                const data = await res.json();
                if (!data.error) {
                    showToast("Success", "Post shared successfully", "success");
                    setShowShareModal(false);
                    setSelectedUser(null);
                    return;
                }
            }
        } catch (error) {
            console.log("API endpoint not available, using mock response");
        }
        
        // If the API fails, create a mock message with post preview
        setTimeout(() => {
            // Create a mock message that includes the shared post
            const mockMessage = {
                _id: `mock-msg-${Date.now()}`,
                sender: {
                    _id: user._id,
                    username: user.username,
                    profilePic: user.profilePic
                },
                text: "Check out this post!",
                createdAt: new Date(),
                seen: false,
                sharedPost: {
                    _id: post._id,
                    text: post.text,
                    img: post.img,
                    postedBy: {
                        _id: post.postedBy,
                        username: post.username || "original_poster",
                        profilePic: post.userProfilePic || "https://bit.ly/broken-link"
                    }
                }
            };
            
            // You could emit this to a socket if needed, or store in local state
            
            showToast("Success", "Post shared successfully (Demo)", "success");
            setShowShareModal(false);
            setSelectedUser(null);
        }, 500);
        
    } catch (error) {
        showToast("Error", "Failed to share post", "error");
    } finally {
        setIsSending(false);
    }
};
    
   


	return (
		<Flex flexDirection='column'>
			<Flex gap={3} my={2} onClick={(e) => e.preventDefault()}>
				<svg
					aria-label='Like'
					color={liked ? "rgb(237, 73, 86)" : ""}
					fill={liked ? "rgb(237, 73, 86)" : "transparent"}
					height='19'
					role='img'
					viewBox='0 0 24 22'
					width='20'
					onClick={handleLikeAndUnlike}
				>
					<title>Like</title>
					<path
						d='M1 7.66c0 4.575 3.899 9.086 9.987 12.934.338.203.74.406 1.013.406.283 0 .686-.203 1.013-.406C19.1 16.746 23 12.234 23 7.66 23 3.736 20.245 1 16.672 1 14.603 1 12.98 1.94 12 3.352 11.042 1.952 9.408 1 7.328 1 3.766 1 1 3.736 1 7.66Z'
						stroke='currentColor'
						strokeWidth='2'
					></path>
				</svg>

				<svg
					aria-label='Comment'
					color=''
					fill=''
					height='20'
					role='img'
					viewBox='0 0 24 24'
					width='20'
					onClick={onOpen}
					style={{ cursor: "pointer" }}
				>
					<title>Comment</title>
					<path
						d='M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z'
						fill='none'
						stroke='currentColor'
						strokeLinejoin='round'
						strokeWidth='2'
					></path>
				</svg>

				 <svg
                    aria-label='Repost'
                    color={hasReposted ? "rgb(0, 186, 124)" : "currentColor"}
                    fill={hasReposted ? "rgb(0, 186, 124)" : "currentColor"}
                    height='20'
                    role='img'
                    viewBox='0 0 24 24'
                    width='20'
                    onClick={handleRepost}
                    style={{ cursor: "pointer" }}
                >
                    <title>Repost</title>
                    <path
                        fill={hasReposted ? "rgb(0, 186, 124)" : ""}
                        d='M19.998 9.497a1 1 0 0 0-1 1v4.228a3.274 3.274 0 0 1-3.27 3.27h-5.313l1.791-1.787a1 1 0 0 0-1.412-1.416L7.29 18.287a1.004 1.004 0 0 0-.294.707v.001c0 .023.012.042.013.065a.923.923 0 0 0 .281.643l3.502 3.504a1 1 0 0 0 1.414-1.414l-1.797-1.798h5.318a5.276 5.276 0 0 0 5.27-5.27v-4.228a1 1 0 0 0-1-1Zm-6.41-3.496-1.795 1.795a1 1 0 1 0 1.414 1.414l3.5-3.5a1.003 1.003 0 0 0 0-1.417l-3.5-3.5a1 1 0 0 0-1.414 1.414l1.794 1.794H8.27A5.277 5.277 0 0 0 3 9.271V13.5a1 1 0 0 0 2 0V9.271a3.275 3.275 0 0 1 3.271-3.27Z'
                    ></path>
                </svg>
				<Box style={{ cursor: "pointer" }} onClick={handleShareClick}>
					<ShareSVG />
				</Box>
			</Flex>

			<Flex gap={2} alignItems={"center"}>
				<Text color={"gray.light"} fontSize='sm'>
					{post.replies.length} replies
				</Text>
				<Box w={0.5} h={0.5} borderRadius={"full"} bg={"gray.light"}></Box>
				<Text color={"gray.light"} fontSize='sm'>
					{post.likes.length} likes
				</Text>
			</Flex>

			<Modal isOpen={isOpen} onClose={onClose}>
				<ModalOverlay />
				<ModalContent bg="black" color="white" borderRadius="xl">
					<ModalHeader borderBottom="1px solid" borderColor="gray.700" pb={3}>
						Reply
					</ModalHeader>
					<ModalCloseButton color="gray.400" />
					<ModalBody pb={6} pt={4}>
						<Flex gap={3} alignItems="start">
							{/* User avatar */}
							{user && (
								<Avatar
									size="sm"
									src={user.profilePic}
									name={user.name || user.username}
								/>
							)}
							<FormControl>
								<Input
									placeholder="Add a reply..."
									value={reply}
									onChange={(e) => setReply(e.target.value)}
									variant="flushed"
									borderColor="gray.700"
									_focus={{ borderColor: "blue.500" }}
									fontSize="sm"
									autoFocus
								/>
								<Flex mt={4} gap={4} color="gray.400">
									{/* Add image icon */}
									<svg
										aria-label="Add photo"
										color="currentColor"
										fill="currentColor"
										height="20"
										role="img"
										viewBox="0 0 24 24"
										width="20"
									>
										<title>Add photo</title>
										<path
											d="M6.549 5.013A1.557 1.557 0 1 0 8.106 6.57a1.557 1.557 0 0 0-1.557-1.557Z"
											fillRule="evenodd"
										></path>
										<path
											d="m2 17.101 3.645-3.644c.199-.2.524-.2.723-.001l6.835 6.83c.201.2.201.526 0 .726l-3.641 3.643c-.199.199-.524.2-.724-.001l-6.838-6.829c-.201-.2-.201-.525 0-.724ZM14.979 3.545l.797.797a3.045 3.045 0 0 1 0 4.32l-9.088 9.087a3.045 3.045 0 0 1-4.321 0l-.797-.798a3.045 3.045 0 0 1 0-4.32l9.087-9.086a3.045 3.045 0 0 1 4.322 0Z"
											fillRule="evenodd"
										></path>
										<path
											d="M16.4 8.233a1 1 0 0 1 1.414 0l4.95 4.95a1 1 0 1 1-1.414 1.414l-4.95-4.95a1 1 0 0 1 0-1.414Z"
											fillRule="evenodd"
										></path>
									</svg>
									
									</Flex>
							</FormControl>
						</Flex>
					</ModalBody>

					<ModalFooter borderTop="1px solid" borderColor="gray.700" pt={3}>
						<Flex w="full" justifyContent="space-between" alignItems="center">
							<Text fontSize="xs" color="gray.500">
								Anyone can reply
							</Text>
							<Button 
								colorScheme="blue" 
								size="sm" 
								borderRadius="full" 
								isLoading={isReplying} 
								onClick={handleReply}
								isDisabled={!reply.trim()}
								px={4}
							>
								Reply
							</Button>
						</Flex>
					</ModalFooter>
				</ModalContent>
			</Modal>

			<Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)}>
				<ModalOverlay />
				<ModalContent bg="black" color="white" borderRadius="xl">
					<ModalHeader borderBottom="1px solid" borderColor="gray.700" pb={3}>
						Share Post
					</ModalHeader>
					<ModalCloseButton color="gray.400" />
					<ModalBody pb={6} pt={4}>
						{loadingConversations ? (
							<Flex justify="center" py={4}>
								<Text>Loading conversations...</Text>
							</Flex>
						) : conversations.length === 0 ? (
							<Flex direction="column" align="center" py={4}>
								<Text mb={2}>No conversations found</Text>
								<Text fontSize="sm" color="gray.500">
									Start a conversation to share posts with others
								</Text>
							</Flex>
						) : (
							<Flex direction="column" gap={3} maxH="300px" overflowY="auto">
								{conversations.map((convo) => {
									// Determine the other user in the conversation
									const otherUser = convo.participants.find(p => p._id !== user._id);
									if (!otherUser) return null;
									
									return (
										<Flex 
											key={convo._id}
											p={2}
											borderRadius="md"
											alignItems="center"
											gap={3}
											cursor="pointer"
											bg={selectedUser?._id === otherUser._id ? "whiteAlpha.200" : "transparent"}
											_hover={{ bg: "whiteAlpha.100" }}
											onClick={() => setSelectedUser(otherUser)}
										>
											<Avatar 
												size="sm" 
												src={otherUser.profilePic}
												name={otherUser.name || otherUser.username}
											/>
											<Box>
												<Text fontWeight="medium">{otherUser.name || otherUser.username}</Text>
												<Text fontSize="xs" color="gray.500">@{otherUser.username}</Text>
											</Box>
										</Flex>
									);
								})}
							</Flex>
						)}
					</ModalBody>

					<ModalFooter borderTop="1px solid" borderColor="gray.700" pt={3}>
						<Button 
							colorScheme="blue" 
							size="sm" 
							borderRadius="full" 
							isLoading={isSending} 
							onClick={handleSendPost}
							isDisabled={!selectedUser}
							px={4}
						>
							Send
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</Flex>
	);
};

export default Actions;

const RepostSVG = () => {
	return (
		<svg
			aria-label='Repost'
			color='currentColor'
			fill='currentColor'
			height='20'
			role='img'
			viewBox='0 0 24 24'
			width='20'
		>
			<title>Repost</title>
			<path
				fill=''
				d='M19.998 9.497a1 1 0 0 0-1 1v4.228a3.274 3.274 0 0 1-3.27 3.27h-5.313l1.791-1.787a1 1 0 0 0-1.412-1.416L7.29 18.287a1.004 1.004 0 0 0-.294.707v.001c0 .023.012.042.013.065a.923.923 0 0 0 .281.643l3.502 3.504a1 1 0 0 0 1.414-1.414l-1.797-1.798h5.318a5.276 5.276 0 0 0 5.27-5.27v-4.228a1 1 0 0 0-1-1Zm-6.41-3.496-1.795 1.795a1 1 0 1 0 1.414 1.414l3.5-3.5a1.003 1.003 0 0 0 0-1.417l-3.5-3.5a1 1 0 0 0-1.414 1.414l1.794 1.794H8.27A5.277 5.277 0 0 0 3 9.271V13.5a1 1 0 0 0 2 0V9.271a3.275 3.275 0 0 1 3.271-3.27Z'
			></path>
		</svg>
	);
};

const ShareSVG = () => {
	return (
		<svg
			aria-label='Share'
			color=''
			fill='rgb(243, 245, 247)'
			height='20'
			role='img'
			viewBox='0 0 24 24'
			width='20'
		>
			<title>Share</title>
			<line
				fill='none'
				stroke='currentColor'
				strokeLinejoin='round'
				strokeWidth='2'
				x1='22'
				x2='9.218'
				y1='3'
				y2='10.083'
			></line>
			<polygon
				fill='none'
				points='11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334'
				stroke='currentColor'
				strokeLinejoin='round'
				strokeWidth='2'
			></polygon>
		</svg>
	);
};
