import { useEffect, useState } from "react";
import { 
    Modal, 
    ModalOverlay, 
    ModalContent, 
    ModalHeader, 
    ModalCloseButton, 
    ModalBody,
    Flex,
    Avatar,
    Text,
    Button,
    Spinner,
    Box,
    VStack,
    Alert,
    AlertIcon
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import useShowToast from "../hooks/useShowToast";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import useFollowUnfollow from "../hooks/useFollowUnfollow";

const FollowersModal = ({ isOpen, onClose, userId, username }) => {
    const [followers, setFollowers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const showToast = useShowToast();

    useEffect(() => {
        const getFollowers = async () => {
            if (!isOpen || !userId) return;
            
            setLoading(true);
            setError(null);
            
            try {
                // Get user profile data which includes followers
                const res = await fetch(`/api/users/profile/${userId}`);
                
                if (!res.ok) {
                    throw new Error(`Failed to fetch user data: ${res.status}`);
                }
                
                const userData = await res.json();
                
                if (!userData || !Array.isArray(userData.followers)) {
                    setFollowers([]);
                    return;
                }
                
                // Now fetch details for each follower ID
                if (userData.followers.length > 0) {
                    const followerPromises = userData.followers.map(followerId => 
                        fetch(`/api/users/profile/${followerId}`)
                        .then(res => res.ok ? res.json() : null)
                    );
                    
                    const followerResults = await Promise.all(followerPromises);
                    const validFollowers = followerResults.filter(f => f && f._id);
                    setFollowers(validFollowers);
                } else {
                    setFollowers([]);
                }
            } catch (error) {
                setError(error.message);
                console.error("Error fetching followers:", error);
                showToast("Error", error.message, "error");
            } finally {
                setLoading(false);
            }
        };
        
        getFollowers();
    }, [userId, isOpen, showToast]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} motionPreset="slideInBottom">
            <ModalOverlay />
            <ModalContent bg="gray.dark" color="white">
                <ModalHeader>Followers of {username}</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    {loading ? (
                        <Flex justify="center" my={8}>
                            <Spinner size="xl" />
                        </Flex>
                    ) : error ? (
                        <Alert status="error" bg="gray.800" color="red.300" variant="subtle">
                            <AlertIcon />
                            {error}
                        </Alert>
                    ) : followers.length === 0 ? (
                        <Text textAlign="center" my={8}>No followers yet</Text>
                    ) : (
                        <VStack spacing={4} align="stretch" maxH="60vh" overflowY="auto">
                            {followers.map(follower => (
                                <UserCard key={follower._id} user={follower} onClose={onClose} />
                            ))}
                        </VStack>
                    )}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

const UserCard = ({ user, onClose }) => {
    const currentUser = useRecoilValue(userAtom);
    const { handleFollowUnfollow, following, updating } = useFollowUnfollow(user);
    
    return (
        <Flex justifyContent="space-between" alignItems="center">
            <Flex as={RouterLink} to={`/${user.username}`} onClick={onClose} gap={2} alignItems="center">
                <Avatar src={user.profilePic} size="sm" />
                <Box>
                    <Text fontWeight="bold">{user.username}</Text>
                    <Text fontSize="sm" color="gray.light">{user.name}</Text>
                </Box>
            </Flex>
            {currentUser && currentUser._id !== user._id && (
                <Button 
                    size="sm" 
                    colorScheme={following ? "gray" : "blue"} 
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleFollowUnfollow();
                    }}
                    isLoading={updating}
                    variant={following ? "outline" : "solid"}
                >
                    {following ? "Unfollow" : "Follow"}
                </Button>
            )}
        </Flex>
    );
};

export default FollowersModal;
