import { Avatar, Box, Flex, Image, Text, useColorModeValue } from "@chakra-ui/react";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import { Link } from "react-router-dom";

const Message = ({ message }) => {
    const currentUser = useRecoilValue(userAtom);
    const ownMessage = message.sender._id === currentUser._id;
    
    const bgColor = useColorModeValue(
        ownMessage ? "blue.500" : "gray.100",
        ownMessage ? "blue.500" : "gray.700"
    );
    const textColor = useColorModeValue(
        ownMessage ? "white" : "black",
        ownMessage ? "white" : "white"
    );

    // WhatsApp-style read receipts
    const getReadReceipt = () => {
        if (!ownMessage) return null;
        
        return (
            <Box fontSize="0.7rem" ml={1} color={message.seen ? "blue.400" : "gray.300"}>
                <Flex alignItems="center">
                    {/* Double check mark SVG */}
                    <svg 
                        width="16" 
                        height="11" 
                        viewBox="0 0 16 11" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path 
                            d="M9.86 1.18667L8.84 0.166672L3.5 5.50667L1.16667 3.17334L0.166668 4.17334L3.5 7.50667L9.86 1.18667Z" 
                            fill="currentColor"
                        />
                        <path 
                            d="M15.5 1.18667L14.48 0.166672L9.14001 5.50667L8.32001 4.68667L7.32001 5.68667L9.14001 7.50667L15.5 1.18667Z" 
                            fill="currentColor"
                        />
                    </svg>
                    <Text ml={1} fontSize="xs">
                        {message.seen ? "Seen" : "Sent"
                        }
                    </Text>
                </Flex>
            </Box>
        );
    };

    return (
        <Flex
            gap={2}
            alignSelf={ownMessage ? "flex-end" : "flex-start"}
            flexDirection={ownMessage ? "row-reverse" : "row"}
            mb={2}
        >
            <Avatar size="xs" src={ownMessage ? currentUser.profilePic : message.sender.profilePic} />
            <Flex
                maxW="350px"
                p={2}
                borderRadius="md"
                bg={bgColor}
                color={textColor}
                flexDirection="column"
                position="relative"
            >
                <Text fontSize="sm">{message.text}</Text>
                
                {/* Post Preview Card */}
                {message.sharedPost && (
                    <Link to={`/${message.sharedPost.postedBy?.username || "user"}/post/${message.sharedPost._id}`}>
                        <Box 
                            mt={2}
                            borderWidth="1px"
                            borderRadius="md"
                            overflow="hidden"
                            bg={useColorModeValue("white", "gray.800")}
                            color={useColorModeValue("black", "white")}
                            _hover={{ opacity: 0.9 }}
                        >
                            <Flex p={2} alignItems="center" gap={2}>
                                <Avatar 
                                    size="xs" 
                                    src={message.sharedPost.postedBy?.profilePic} 
                                    name={message.sharedPost.postedBy?.username || "User"}
                                />
                                <Text fontSize="xs" fontWeight="bold">
                                    {message.sharedPost.postedBy?.username || "user"}
                                </Text>
                            </Flex>
                            
                            {message.sharedPost.img && (
                                <Image 
                                    src={message.sharedPost.img}
                                    alt="Post image"
                                    objectFit="cover"
                                    w="full"
                                    maxH="150px"
                                />
                            )}
                            
                            <Box p={2}>
                                <Text fontSize="xs" noOfLines={2}>
                                    {message.sharedPost.text}
                                </Text>
                            </Box>
                        </Box>
                    </Link>
                )}
                
                {/* Message Image */}
                {message.img && <Image src={message.img} maxH="200px" mt={2} borderRadius="md" />}
                
                {/* Message info: time and read status */}
                <Flex 
                    justifyContent="flex-end" 
                    alignItems="center" 
                    mt={1}
                    fontSize="xs"
                    color={useColorModeValue("gray.500", "gray.400")}
                >
                    <Text fontSize="0.7rem">
                        {new Date(message.createdAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true 
                        })}
                    </Text>
                    {getReadReceipt()}
                </Flex>
            </Flex>
        </Flex>
    );
};

export default Message;
