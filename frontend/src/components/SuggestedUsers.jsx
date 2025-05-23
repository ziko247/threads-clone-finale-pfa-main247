import { Box, Flex, Skeleton, SkeletonCircle, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import SuggestedUser from "./SuggestedUser";
import useShowToast from "../hooks/useShowToast";

const SuggestedUsers = () => {
	const [loading, setLoading] = useState(true);
	const [suggestedUsers, setSuggestedUsers] = useState([]);
	const showToast = useShowToast();

	useEffect(() => {
		const getSuggestedUsers = async () => {
			setLoading(true);
			try {
				// Check if user is logged in first
				const userInfo = JSON.parse(localStorage.getItem("user-threads"));
				if (!userInfo) {
					console.log("No user found in local storage");
					setSuggestedUsers([]);
					setLoading(false);
					return;
				}
				
				const res = await fetch("/api/users/suggested", {
					credentials: "include" // Important: send cookies with request
				});
				
				if (!res.ok) {
					if (res.status === 401) {
						console.log("Not authenticated");
						setSuggestedUsers([]);
					} else {
						const errorData = await res.json();
						throw new Error(errorData.error || `API error: ${res.status}`);
					}
				} else {
					const data = await res.json();
					
					// Filter out any frozen accounts
					const filteredUsers = Array.isArray(data) 
						? data.filter(user => !user.isFrozen) 
						: [];
					
					setSuggestedUsers(filteredUsers);
				}
			} catch (error) {
				console.error("Failed to fetch suggested users:", error);
				showToast("Error", error.message, "error");
				setSuggestedUsers([]);
			} finally {
				setLoading(false);
			}
		};

		getSuggestedUsers();
	}, [showToast]);

	return (
		<>
			<Text mb={4} fontWeight={"bold"}>
				Suggested Users
			</Text>
			<Flex direction={"column"} gap={4}>
				{!loading && suggestedUsers.map((user) => <SuggestedUser key={user._id} user={user} />)}
				{loading &&
					[0, 1, 2, 3, 4].map((_, idx) => (
						<Flex key={idx} gap={2} alignItems={"center"} p={"1"} borderRadius={"md"}>
							{/* avatar skeleton */}
							<Box>
								<SkeletonCircle size={"10"} />
							</Box>
							{/* username and fullname skeleton */}
							<Flex w={"full"} flexDirection={"column"} gap={2}>
								<Skeleton h={"8px"} w={"80px"} />
								<Skeleton h={"8px"} w={"90px"} />
							</Flex>
							{/* follow button skeleton */}
							<Flex>
								<Skeleton h={"20px"} w={"60px"} />
							</Flex>
						</Flex>
					))}
			</Flex>
		</>
	);
};

export default SuggestedUsers;

// Loading skeletons for suggested users, if u want to copy and paste as shown in the tutorial

// <Flex key={idx} gap={2} alignItems={"center"} p={"1"} borderRadius={"md"}>
// 							{/* avatar skeleton */}
// 							<Box>
// 								<SkeletonCircle size={"10"} />
// 							</Box>
// 							{/* username and fullname skeleton */}
// 							<Flex w={"full"} flexDirection={"column"} gap={2}>
// 								<Skeleton h={"8px"} w={"80px"} />
// 								<Skeleton h={"8px"} w={"90px"} />
// 							</Flex>
// 							{/* follow button skeleton */}
// 							<Flex>
// 								<Skeleton h={"20px"} w={"60px"} />
// 							</Flex>
// 						</Flex>
