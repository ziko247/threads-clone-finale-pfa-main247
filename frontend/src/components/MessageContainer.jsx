import { Avatar, Divider, Flex, Image, Skeleton, SkeletonCircle, Text, useColorModeValue } from "@chakra-ui/react";
import Message from "./Message";
import MessageInput from "./MessageInput";
import { useEffect, useRef, useState } from "react";
import useShowToast from "../hooks/useShowToast";
import { conversationsAtom, selectedConversationAtom } from "../atoms/messagesAtom";
import { useRecoilValue, useSetRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import { useSocket } from "../context/SocketContext.jsx";
import messageSound from "../assets/sounds/message.mp3";

// Keep track of processed message IDs to prevent duplicates
const processedMessageIds = new Set();

const MessageContainer = () => {
	const showToast = useShowToast();
	const selectedConversation = useRecoilValue(selectedConversationAtom);
	const [loadingMessages, setLoadingMessages] = useState(true);
	const [messages, setMessages] = useState([]);
	const currentUser = useRecoilValue(userAtom);
	const { socket } = useSocket();
	const setConversations = useSetRecoilState(conversationsAtom);
	const messageEndRef = useRef(null);

	// Handle new messages - consolidated event handler
	useEffect(() => {
		// Clean function to remove listeners when component unmounts
		const handleNewMessage = (message) => {
			// Check if message has already been processed
			if (message._id && processedMessageIds.has(message._id)) {
				console.log("Preventing duplicate message:", message._id);
				return;
			}
			
			// Add message ID to processed set to prevent duplicates
			if (message._id) {
				processedMessageIds.add(message._id);
				
				// Clean up old message IDs after 10 seconds to prevent memory leaks
				setTimeout(() => {
					processedMessageIds.delete(message._id);
				}, 10000);
			}
			
			// Only add message if it belongs to the current conversation
			if (selectedConversation && selectedConversation._id === message.conversationId) {
				console.log("Adding new message to UI:", message._id);
				setMessages(prev => [...prev, message]);
				
				// Play sound if window is not focused
				if (!document.hasFocus()) {
					const sound = new Audio(messageSound);
					sound.play();
				}
			}

			// Update conversations list with latest message
			setConversations(prev => {
				return prev.map(conversation => {
					if (conversation._id === message.conversationId) {
						return {
							...conversation,
							lastMessage: {
								text: message.text,
								sender: message.sender._id,
								seen: false
							},
						};
					}
					return conversation;
				});
			});
		};

		// Handle messages seen event
		const handleMessagesSeen = ({ conversationId }) => {
			if (selectedConversation?._id === conversationId) {
				setMessages(prev => 
					prev.map(message => 
						message.sender._id === currentUser._id && !message.seen
							? { ...message, seen: true }
							: message
					)
				);
			}
		};

		// Add event listeners
		if (socket) {
			// Remove any existing listeners to prevent duplicates
			socket.off("newMessage");
			socket.off("messagesSeen");
			
			// Add fresh listeners
			socket.on("newMessage", handleNewMessage);
			socket.on("messagesSeen", handleMessagesSeen);
		}

		// Cleanup function
		return () => {
			if (socket) {
				socket.off("newMessage", handleNewMessage);
				socket.off("messagesSeen", handleMessagesSeen);
			}
		};
	}, [socket, selectedConversation, currentUser._id, setConversations]);

	// Mark messages as seen when conversation is opened
	useEffect(() => {
		if (!selectedConversation?._id || !messages.length) return;
		
		const lastMessageIsFromOtherUser = 
			messages.length && 
			messages[messages.length - 1].sender._id !== currentUser._id;
			
		if (lastMessageIsFromOtherUser && socket) {
			socket.emit("markMessagesAsSeen", {
				conversationId: selectedConversation._id,
				userId: selectedConversation.userId,
			});
		}
	}, [selectedConversation, messages, currentUser._id, socket]);

	// Scroll to bottom when messages change
	useEffect(() => {
		messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	// Fetch messages when conversation changes
	useEffect(() => {
		const getMessages = async () => {
			setLoadingMessages(true);
			setMessages([]);
			try {
				if (selectedConversation.mock) return;
				const res = await fetch(`/api/messages/${selectedConversation.userId}`);
				const data = await res.json();
				if (data.error) {
					showToast("Error", data.error, "error");
					return;
				}
				setMessages(data);
			} catch (error) {
				showToast("Error", error.message, "error");
			} finally {
				setLoadingMessages(false);
			}
		};

		if (selectedConversation?._id) {
			getMessages();
		}
	}, [showToast, selectedConversation?.userId, selectedConversation?.mock, selectedConversation?._id]);

	// Remove duplicate effect - we only need one set of socket listeners

	return (
		<Flex
			flex='70'
			bg={useColorModeValue("gray.200", "gray.dark")}
			borderRadius={"md"}
			p={2}
			flexDirection={"column"}
		>
			{/* Message header */}
			<Flex w={"full"} h={12} alignItems={"center"} gap={2}>
				<Avatar src={selectedConversation.userProfilePic} size={"sm"} />
				<Text display={"flex"} alignItems={"center"}>
					{selectedConversation.username} <Image src='/verified.png' w={4} h={4} ml={1} />
				</Text>
			</Flex>

			<Divider />

			<Flex flexDir={"column"} gap={4} my={4} p={2} height={"400px"} overflowY={"auto"}>
				{loadingMessages &&
					[...Array(5)].map((_, i) => (
						<Flex
							key={i}
							gap={2}
							alignItems={"center"}
							p={1}
							borderRadius={"md"}
							alignSelf={i % 2 === 0 ? "flex-start" : "flex-end"}
						>
							{i % 2 === 0 && <SkeletonCircle size={7} />}
							<Flex flexDir={"column"} gap={2}>
								<Skeleton h='8px' w='250px' />
								<Skeleton h='8px' w='250px' />
								<Skeleton h='8px' w='250px' />
							</Flex>
							{i % 2 !== 0 && <SkeletonCircle size={7} />}
						</Flex>
					))}

				{!loadingMessages &&
					messages.map((message) => (
						<Flex
							key={message._id}
							direction={"column"}
							ref={messages.length - 1 === messages.indexOf(message) ? messageEndRef : null}
						>
							<Message message={message} ownMessage={currentUser._id === message.sender._id} />
						</Flex>
					))}
			</Flex>

			<MessageInput setMessages={setMessages} />
		</Flex>
	);
};

export default MessageContainer;
