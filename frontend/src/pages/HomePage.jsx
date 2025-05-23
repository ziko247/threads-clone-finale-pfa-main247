import { Box, Flex, Spinner, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import useShowToast from "../hooks/useShowToast";
import Post from "../components/Post";
import { useRecoilState, useRecoilValue } from "recoil";
import postsAtom from "../atoms/postsAtom";
import userAtom from "../atoms/userAtom";
import SuggestedUsers from "../components/SuggestedUsers";
import CreatePost from "../components/CreatePost";

const HomePage = () => {
    const [posts, setPosts] = useRecoilState(postsAtom);
    const [loading, setLoading] = useState(true);
    const showToast = useShowToast();
    const user = useRecoilValue(userAtom);

    useEffect(() => {
        const getFeedPosts = async () => {
            setLoading(true);
            setPosts([]);
            try {
                // Check if user is logged in
                const userInfo = JSON.parse(localStorage.getItem("user-threads"));
                if (!userInfo) {
                    console.log("No user found in local storage");
                    setPosts([]);
                    setLoading(false);
                    return;
                }
                
                const res = await fetch("/api/posts/feed", {
                    credentials: "include" // Important: send cookies with request
                });
                
                if (!res.ok) {
                    // Handle different error types
                    if (res.status === 401) {
                        console.log("Not authenticated");
                        setPosts([]);
                    } else {
                        const errorData = await res.json();
                        throw new Error(errorData.error || `API error: ${res.status}`);
                    }
                } else {
                    const data = await res.json();
                    setPosts(data);
                }
            } catch (error) {
                console.error("Failed to fetch feed posts:", error);
                showToast("Error", error.message, "error");
            } finally {
                setLoading(false);
            }
        };
        getFeedPosts();
    }, [showToast, setPosts]);

    return (
        <>
            <Flex gap="10" alignItems="flex-start">
                <Box flex={70}>
                    {loading && (
                        <Flex justify='center'>
                            <Spinner size='xl' />
                        </Flex>
                    )}

                    {!loading && posts.length === 0 && (
                        <>
                            <Text fontSize='20px' textAlign='center'>
                                Your feed is empty. Follow users to see their posts.
                            </Text>

                            <SuggestedUsers />
                        </>
                    )}

                    {posts.map((post) => {
                        // Extract the poster ID correctly
                        const posterId = post.postedBy && typeof post.postedBy === 'object' 
                            ? post.postedBy._id 
                            : post.postedBy;
                        
                        return (
                            <Post key={post._id} post={post} postedBy={posterId} />
                        );
                    })}
                </Box>
                <Box
                    flex={30}
                    display={{ base: "none", md: "block" }}
                >
                    <SuggestedUsers />
                </Box>
            </Flex>
            
            {/* Include CreatePost component directly in HomePage */}
            {user && <CreatePost buttonClassName="home-page-create-button" />}
        </>
    );
};

export default HomePage;
