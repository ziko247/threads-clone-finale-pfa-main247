import { Avatar } from "@chakra-ui/avatar";
import { Box, Flex, Link, Text, VStack } from "@chakra-ui/layout";
import { Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/menu";
import { Portal } from "@chakra-ui/portal";
import { Button, useToast, useDisclosure } from "@chakra-ui/react";
import { BsInstagram } from "react-icons/bs";
import { CgMoreO } from "react-icons/cg";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import { Link as RouterLink } from "react-router-dom";
import useFollowUnfollow from "../hooks/useFollowUnfollow";
import { useState } from "react";
import FollowersModal from "./FollowersModal";
import FollowingModal from "./FollowingModal";

const UserHeader = ({ user, onTabChange }) => {
	const toast = useToast();
	const currentUser = useRecoilValue(userAtom); // logged in user
	const { handleFollowUnfollow, following, updating } = useFollowUnfollow(user);
	const [activeTab, setActiveTab] = useState("posts");
	const followersDisclosure = useDisclosure();
	const followingDisclosure = useDisclosure();

	const copyURL = () => {
		const currentURL = window.location.href;
		navigator.clipboard.writeText(currentURL).then(() => {
			toast({
				title: "Success.",
				status: "success",
				description: "Profile link copied.",
				duration: 3000,
				isClosable: true,
			});
		});
	};
	
	const handleTabChange = (tab) => {
		setActiveTab(tab);
		if (onTabChange) {
			onTabChange(tab);
		}
	};

	// Only proceed if we have a valid user object
	if (!user || !user._id) {
		return null;
	}

	return (
		<VStack gap={4} alignItems={"start"}>
			<Flex justifyContent={"space-between"} w={"full"}>
				<Box>
					<Text fontSize={"2xl"} fontWeight={"bold"}>
						{user.name}
					</Text>
					<Flex gap={2} alignItems={"center"}>
						<Text fontSize={"sm"}>{user.username}</Text>
						
					</Flex>
				</Box>
				<Box>
					{user.profilePic && (
						<Avatar
							name={user.name}
							src={user.profilePic}
							size={{
								base: "md",
								md: "2xl",
							}}
						/>
					)}
					{!user.profilePic && (
						<Avatar
							name={user.name}
							src='https://bit.ly/broken-link'
							size={{
								base: "md",
								md: "xl",
							}}
						/>
					)}
				</Box>
			</Flex>

			<Text>{user.bio}</Text>

			{currentUser?._id === user._id && (
				<Link as={RouterLink} to='/update'>
					<Button size={"sm"}>Update Profile</Button>
				</Link>
			)}
			{currentUser?._id !== user._id && (
				<Button size={"sm"} onClick={handleFollowUnfollow} isLoading={updating}>
					{following ? "Unfollow" : "Follow"}
				</Button>
			)}
			<Flex w={"full"} justifyContent={"space-between"}>
				<Flex gap={2} alignItems={"center"} wrap="wrap">
					<Button 
						variant="link" 
						fontSize="sm"
						onClick={followersDisclosure.onOpen}
						color={"gray.light"}
						fontWeight="normal"
					>
						{user.followers?.length || 0} followers
					</Button>
					<Box w='1' h='1' bg={"gray.light"} borderRadius={"full"}></Box>
					<Button
						variant="link"
						fontSize="sm"
						onClick={followingDisclosure.onOpen}
						color={"gray.light"}
						fontWeight="normal"
					>
						{user.following?.length || 0} following
					</Button>
					
					
				</Flex>
				<Flex>
					
					<Box className='icon-container'>
						<Menu>
							<MenuButton>
								<CgMoreO size={24} cursor={"pointer"} />
							</MenuButton>
							<Portal>
								<MenuList bg={"gray.dark"}>
									<MenuItem bg={"gray.dark"} onClick={copyURL}>
										Copy link
									</MenuItem>
								</MenuList>
							</Portal>
						</Menu>
					</Box>
				</Flex>
			</Flex>

			<Flex w={"full"}>
				<Flex 
					flex={1} 
					borderBottom={activeTab === "posts" ? "1.5px solid white" : "1px solid gray"}
					justifyContent={"center"} 
					pb='3' 
					cursor={"pointer"}
					color={activeTab === "posts" ? "white" : "gray.light"}
					onClick={() => handleTabChange("posts")}
				>
					<Text fontWeight={"bold"}> Posts</Text>
				</Flex>
				<Flex
					flex={1}
					borderBottom={activeTab === "replies" ? "1.5px solid white" : "1px solid gray"}
					justifyContent={"center"}
					color={activeTab === "replies" ? "white" : "gray.light"}
					pb='3'
					cursor={"pointer"}
					onClick={() => handleTabChange("replies")}
				>
					<Text fontWeight={"bold"}> Replies</Text>
				</Flex>
			</Flex>

			{/* Followers Modal */}
			<FollowersModal 
				isOpen={followersDisclosure.isOpen}
				onClose={followersDisclosure.onClose}
				userId={user._id}
				username={user.username}
			/>

			{/* Following Modal */}
			<FollowingModal
				isOpen={followingDisclosure.isOpen}
				onClose={followingDisclosure.onClose}
				userId={user._id}
				username={user.username}
			/>
		</VStack>
	);
};

export default UserHeader;
