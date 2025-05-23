import { Box, Flex, Spinner, Text, Avatar, Link as ChakraLink, Code } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useShowToast from "../hooks/useShowToast";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";

const UserReplies = ({ username }) => {
  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState([]);
  const [error, setError] = useState(null);
  const showToast = useShowToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserReplies = async () => {
      if (!username) {
        console.error("No username provided to UserReplies component");
        setError("Missing username");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        console.log("Fetching replies for", username);
        const res = await fetch(`/api/posts/replies/${username}`);
        const contentType = res.headers.get("content-type");
        
        if (!res.ok) {
          let errorMessage = `Server returned error ${res.status}`;
          
          try {
            if (contentType && contentType.includes("application/json")) {
              const errorData = await res.json();
              errorMessage = errorData.error || errorMessage;
            } else {
              errorMessage = await res.text() || errorMessage;
            }
          } catch (e) {
            console.error("Error parsing error response:", e);
          }
          
          throw new Error(errorMessage);
        }
        
        // Check if response is JSON
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error(`Expected JSON response but got ${contentType}`);
        }
        
        const data = await res.json();
        console.log("Replies data received:", data);
        
        if (!Array.isArray(data)) {
          console.warn("Expected array of replies but got:", typeof data, data);
          setReplies([]);
        } else {
          setReplies(data);
        }
      } catch (error) {
        console.error("Error fetching replies:", error);
        setError(error.message);
        showToast("Error", error.message, "error");
      } finally {
        setLoading(false);
      }
    };

    fetchUserReplies();
  }, [username, showToast]);

  // ...existing code for loading and error states...

  const formatTime = (createdAt) => {
    if (!createdAt) return "Recently";
    
    try {
      const replyDate = new Date(createdAt);
      
      // Check if date is valid
      if (isNaN(replyDate.getTime())) {
        console.warn("Invalid date:", createdAt);
        return "Recently";
      }
      
      const minutesAgo = differenceInMinutes(new Date(), replyDate);
      if (minutesAgo < 60) return "Recently";
      return formatDistanceToNow(replyDate) + " ago";
    } catch (error) {
      console.error("Error formatting time:", error, createdAt);
      return "Recently";
    }
  };
  
  return (
    <Box>
      {loading ? (
        <Flex justifyContent="center" my={12}>
          <Spinner size="xl" />
        </Flex>
      ) : error ? (
        <Box textAlign="center" color="red.300" p={5} borderRadius="md">
          <Text fontSize="lg" mb={3}>Error loading replies</Text>
          <Code colorScheme="red" p={2}>{error}</Code>
        </Box>
      ) : !replies || replies.length === 0 ? (
        <Text textAlign="center" fontSize="md" color="gray.500" my={10}>
          No replies yet
        </Text>
      ) : (
        <>
          <Text mb={4} fontSize="sm" color="gray.500" textAlign="center">
            Showing {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </Text>
          
          {replies.map((reply, index) => (
            <Box 
              key={reply._id || `reply-${index}-${Date.now()}`}
              borderWidth="1px" 
              borderColor="gray.700" 
              bg="black" 
              borderRadius="md" 
              p={4} 
              mb={4}
              onClick={() => {
                if (reply.postId) {
                  console.log("Navigating to post:", reply.postId);
                  navigate(`/${reply.originalPoster.username}/post/${reply.postId}`);
                } else {
                  console.warn("Reply missing postId:", reply);
                }
              }}
              cursor={reply.postId ? "pointer" : "default"}
              _hover={reply.postId ? { borderColor: "gray.500" } : {}}
              transition="all 0.2s"
            >
              <Flex gap={3}>
                <Avatar 
                  src={reply.userProfilePic} 
                  size="sm" 
                  onClick={(e) => e.stopPropagation()}
                />
                <Box flex="1">
                  <Flex justifyContent="space-between">
                    <Text fontWeight="bold" fontSize="sm">
                      {reply.originalPostText ? 
                        `Reply to: ${reply.originalPostText}` : 
                        "Reply to post"}
                    </Text>
                    <Text fontSize="xs" color="gray.400">
                      {formatTime(reply.createdAt)}
                    </Text>
                  </Flex>
                  
                  {/* Original poster info */}
                  {reply.originalPoster && (
                    <Flex 
                      gap={1} 
                      alignItems="center" 
                      mt={1} 
                      mb={2} 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (reply.originalPoster.username) {
                          navigate(`/${reply.originalPoster.username}`);
                        }
                      }}
                      cursor={reply.originalPoster.username ? "pointer" : "default"}
                      width="fit-content"
                    >
                      <Text fontSize="xs" color="gray.500">
                        Original post by
                      </Text>
                      <Flex alignItems="center" gap={1}>
                        <Avatar size="2xs" src={reply.originalPoster.profilePic} />
                        <Text fontSize="xs" fontWeight="medium" color="gray.400">
                          @{reply.originalPoster.username}
                        </Text>
                      </Flex>
                    </Flex>
                  )}
                  
                  {/* Reply text */}
                  <Text my={2}>{reply.text}</Text>
                  
                  {/* Reply time (bottom) */}
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    {formatTime(reply.createdAt)}
                  </Text>
                </Box>
              </Flex>
            </Box>
          ))}
        </>
      )}
    </Box>
  );
};

export default UserReplies;
