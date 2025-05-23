import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import { Box, Flex, Spinner, Text } from "@chakra-ui/react";
import Post from "../components/Post";
import UserHeader from "../components/UserHeader";
import UserReplies from "../components/UserReplies";
import useShowToast from "../hooks/useShowToast";

const UserPage = () => {
	const { username } = useParams();
	const [user, setUser] = useState(null);
	const [posts, setPosts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [currentUser] = useRecoilState(userAtom);
	const [activeTab, setActiveTab] = useState("posts");
	const showToast = useShowToast();

	useEffect(() => {
		const getUser = async () => {
			try {
				const res = await fetch(`/api/users/profile/${username}`);
				const data = await res.json();
				if (data.error) {
					showToast("Error", data.error, "error");
					return;
				}
				setUser(data);
				
				// When user changes, reset to posts tab
				setActiveTab("posts");
			} catch (error) {
				showToast("Error", error.message, "error");
			} finally {
				setLoading(false);
			}
		};

		const getPosts = async () => {
			try {
				const res = await fetch(`/api/posts/user/${username}`);
				const data = await res.json();
				setPosts(data);
			} catch (error) {
				showToast("Error", error.message, "error");
				setPosts([]);
			}
		};

		getUser();
		getPosts();
	}, [username, showToast]);

	const handleTabChange = (tab) => {
		setActiveTab(tab);
	};

	if (loading) {
		return (
			<Flex justifyContent={"center"}>
				<Spinner size={"xl"} />
			</Flex>
		);
	}

	return (
		<>
			{user && <UserHeader user={user} onTabChange={handleTabChange} />}

			{activeTab === "posts" ? (
				<>
					{posts.length === 0 && (
						<Text textAlign={"center"} my={10}>
							No posts yet.
						</Text>
					)}

					{posts.map((post) => (
						<Post key={post._id} post={post} postedBy={post.postedBy} />
					))}
				</>
			) : (
				<UserReplies username={username} />
			)}
		</>
	);
};

export default UserPage;
