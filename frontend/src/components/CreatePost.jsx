import { AddIcon } from "@chakra-ui/icons";
import {
	Button,
	CloseButton,
	Flex,
	FormControl,
	Image,
	Input,
	Modal,
	ModalBody,
	ModalCloseButton,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalOverlay,
	Text,
	Textarea,
	useColorModeValue,
	useDisclosure,
	Box,
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import usePreviewImg from "../hooks/usePreviewImg";
import { BsFillImageFill } from "react-icons/bs";
import { useRecoilState, useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import useShowToast from "../hooks/useShowToast";
import postsAtom from "../atoms/postsAtom";
import { useParams } from "react-router-dom";

const MAX_CHAR = 500;

// Add buttonClassName to component parameters
const CreatePost = ({ buttonClassName }) => {
	const { isOpen, onOpen, onClose } = useDisclosure();
	const [postText, setPostText] = useState("");
	const { handleImageChange, imgUrl, setImgUrl } = usePreviewImg();
	const imageRef = useRef(null);
	const [remainingChar, setRemainingChar] = useState(MAX_CHAR);
	const user = useRecoilValue(userAtom);
	const showToast = useShowToast();
	const [loading, setLoading] = useState(false);
	const [posts, setPosts] = useRecoilState(postsAtom);
	const { username } = useParams();

	const handleTextChange = (e) => {
		const inputText = e.target.value;

		if (inputText.length > MAX_CHAR) {
			const truncatedText = inputText.slice(0, MAX_CHAR);
			setPostText(truncatedText);
			setRemainingChar(0);
		} else {
			setPostText(inputText);
			setRemainingChar(MAX_CHAR - inputText.length);
		}
	};

	const handleCreatePost = async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/posts/create", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ postedBy: user._id, text: postText, img: imgUrl }),
			});

			const data = await res.json();
			if (data.error) {
				showToast("Error", data.error, "error");
				return;
			}
			showToast("Success", "Post created successfully", "success");
			if (username === user.username) {
				setPosts([data, ...posts]);
			}
			onClose();
			setPostText("");
			setImgUrl("");
		} catch (error) {
			showToast("Error", error, "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			{/* Enhanced floating create post button with className support */}
			<Button
				className={buttonClassName || ''}
				position={"fixed"}
				bottom={10}
				right={5}
				bg="blue.500"
				color="white"
				onClick={onOpen}
				size={{ base: "md", sm: "lg" }}
				borderRadius="full"
				w={{ base: "50px", sm: "60px" }}
				h={{ base: "50px", sm: "60px" }}
				boxShadow="0 4px 12px rgba(0, 0, 0, 0.3)"
				_hover={{ 
					bg: "blue.600",
					transform: "translateY(-2px)",
					boxShadow: "0 6px 16px rgba(0, 0, 0, 0.4)"
				}}
				_active={{ 
					bg: "blue.700",
					transform: "translateY(0)",
					boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)"
				}}
				transition="all 0.2s ease"
				zIndex={3}
			>
				<Box 
					position="relative" 
					display="flex" 
					alignItems="center" 
					justifyContent="center"
				>
					<svg
						aria-label="Create"
						color="currentColor"
						fill="currentColor"
						height="24"
						role="img"
						viewBox="0 0 24 24"
						width="24"
					>
						<title>Create a post</title>
						<path d="M2 12v3.45c0 2.849.698 4.005 1.606 4.944.94.909 2.098 1.608 4.946 1.608h6.896c2.848 0 4.006-.7 4.946-1.608C21.302 19.455 22 18.3 22 15.45V8.552c0-2.849-.698-4.006-1.606-4.945C19.454 2.7 18.296 2 15.448 2H8.552c-2.848 0-4.006.699-4.946 1.607C2.698 4.547 2 5.703 2 8.552Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
						<line fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="6.545" x2="17.455" y1="12.001" y2="12.001"></line>
						<line fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="12.003" x2="12.003" y1="6.545" y2="17.455"></line>
					</svg>
				</Box>
			</Button>

			<Modal isOpen={isOpen} onClose={onClose}>
				<ModalOverlay bg="blackAlpha.700" backdropFilter="blur(5px)" />
				<ModalContent 
					bg="black" 
					color="white" 
					borderRadius="xl" 
					mx={3}
				>
					<ModalHeader 
						borderBottom="1px solid" 
						borderColor="gray.700" 
						pb={3}
					>
						Create new thread
					</ModalHeader>
					<ModalCloseButton color="gray.400" />
					<ModalBody pb={6} pt={4}>
						<FormControl>
							<Textarea
								placeholder='Start a thread...'
								onChange={handleTextChange}
								value={postText}
								variant="unstyled"
								size="md"
								minH="150px"
								resize="none"
								fontSize="sm"
							/>
							
							<Flex mt={4} gap={4} color="gray.400" alignItems="center" justifyContent="space-between">
								<Flex gap={4}>
									{/* Image icon */}
									<Box 
										cursor="pointer" 
										_hover={{ color: "gray.300" }}
										onClick={() => imageRef.current.click()}
									>
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
									</Box>
									
									{/* Emoji icon */}
									<Box cursor="pointer" _hover={{ color: "gray.300" }}>
										<svg
											aria-label="Emoji"
											color="currentColor"
											fill="currentColor"
											height="20"
											role="img"
											viewBox="0 0 24 24"
											width="20"
										>
											<title>Emoji</title>
											<path
												d="M15.83 10.997a1.167 1.167 0 1 0 1.167 1.167 1.167 1.167 0 0 0-1.167-1.167Zm-6.5 1.167a1.167 1.167 0 1 0-1.166 1.167 1.167 1.167 0 0 0 1.166-1.167Zm5.163 3.24a3.406 3.406 0 0 1-4.982.007 1 1 0 1 0-1.557 1.256 5.397 5.397 0 0 0 8.09 0 1 1 0 0 0-1.55-1.263ZM12 .503a11.5 11.5 0 1 0 11.5 11.5A11.513 11.513 0 0 0 12 .503Zm0 21a9.5 9.5 0 1 1 9.5-9.5 9.51 9.51 0 0 1-9.5 9.5Z"
											></path>
										</svg>
									</Box>
									
									{/* Location icon */}
									
								</Flex>
								
								<Text 
									fontSize='xs' 
									color={remainingChar === 0 ? "red.500" : "gray.400"}
								>
									{remainingChar} remaining
								</Text>
							</Flex>

							<Input type='file' hidden ref={imageRef} onChange={handleImageChange} />
						</FormControl>

						{imgUrl && (
							<Flex mt={5} w={"full"} position={"relative"}>
								<Image src={imgUrl} alt='Selected img' borderRadius="md" />
								<CloseButton
									onClick={() => {
										setImgUrl("");
									}}
									bg={"blackAlpha.700"}
									position={"absolute"}
									top={2}
									right={2}
									color="white"
									_hover={{
										bg: "blackAlpha.800"
									}}
								/>
							</Flex>
						)}
					</ModalBody>

					<ModalFooter 
						borderTop="1px solid" 
						borderColor="gray.700"
						pt={3}
					>
						<Flex w="full" justifyContent="space-between" alignItems="center">
							<Text fontSize="xs" color="gray.500">
								Anyone can reply
							</Text>
							<Button 
								colorScheme='blue' 
								onClick={handleCreatePost} 
								isLoading={loading}
								size="sm" 
								borderRadius="full" 
								isDisabled={!postText.trim() && !imgUrl}
								px={4}
							>
								Post
							</Button>
						</Flex>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</>
	);
};

export default CreatePost;
