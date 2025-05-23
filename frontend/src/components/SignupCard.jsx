import {
	Flex,
	Box,
	FormControl,
	FormLabel,
	Input,
	InputGroup,
	HStack,
	InputRightElement,
	Stack,
	Button,
	Heading,
	Text,
	useColorModeValue,
	Link,
	PinInput,
	PinInputField,
	Modal,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalBody,
	ModalCloseButton,
	useDisclosure,
} from "@chakra-ui/react";
import { useState } from "react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { useSetRecoilState } from "recoil";
import authScreenAtom from "../atoms/authAtom";
import useShowToast from "../hooks/useShowToast";
import userAtom from "../atoms/userAtom";

export default function SignupCard() {
	const [showPassword, setShowPassword] = useState(false);
	const setAuthScreen = useSetRecoilState(authScreenAtom);
	const [inputs, setInputs] = useState({
		name: "",
		username: "",
		email: "",
		password: "",
	});
	const [verificationCode, setVerificationCode] = useState("");
	const [isVerifying, setIsVerifying] = useState(false);
	const [userId, setUserId] = useState(null);
	const { isOpen, onOpen, onClose } = useDisclosure();

	const showToast = useShowToast();
	const setUser = useSetRecoilState(userAtom);

	const handleSignup = async () => {
		try {
			const res = await fetch("/api/users/signup", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(inputs),
			});
			const data = await res.json();

			if (data.error) {
				showToast("Error", data.error, "error");
				return;
			}

			console.log("Signup response:", data); // Debug response
			showToast("Success", "Verification code sent to your email", "success");
			
			// Use tempUserId from the API response, not _id
			setUserId(data.tempUserId); 
			onOpen(); // Open verification modal
		} catch (error) {
			showToast("Error", error.message, "error");
		}
	};

	const handleVerifyEmail = async () => {
		if (verificationCode.length !== 6) {
			showToast("Error", "Please enter a valid 6-digit code", "error");
			return;
		}

		setIsVerifying(true);
		try {
			console.log("Sending verification request:", { userId, verificationCode });
			
			const res = await fetch("/api/users/verify-email", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ userId, verificationCode }),
				credentials: 'include' // Important: send cookies with request
			});
			
			console.log("Verification response status:", res.status);
			
			const data = await res.json();
			console.log("Verification response data:", data);

			if (data.error) {
				showToast("Error", data.error, "error");
				setIsVerifying(false);
				return;
			}

			showToast("Success", "Email verified successfully", "success");
			
			// Now get the user info
			const userRes = await fetch(`/api/users/profile/${userId}`, {
				credentials: 'include'
			});
			const userData = await userRes.json();
			
			if (userData.error) {
				showToast("Error", userData.error, "error");
				setIsVerifying(false);
				return;
			}
			
			localStorage.setItem("user-threads", JSON.stringify(userData));
			setUser(userData);
			onClose();
		} catch (error) {
			console.error("Verification error:", error);
			showToast("Error", error.message, "error");
			setIsVerifying(false);
		}
	};

	const handleResendCode = async () => {
		try {
			const res = await fetch("/api/users/resend-verification", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ userId }),
			});
			const data = await res.json();

			if (data.error) {
				showToast("Error", data.error, "error");
				return;
			}

			showToast("Success", "New verification code sent", "success");
		} catch (error) {
			showToast("Error", error.message, "error");
		}
	};

	return (
		<>
			<Flex align={"center"} justify={"center"}>
				<Stack spacing={8} mx={"auto"} maxW={"lg"} py={12} px={6}>
					<Stack align={"center"}>
						<Heading fontSize={"4xl"} textAlign={"center"}>
							Sign up
						</Heading>
					</Stack>
					<Box rounded={"lg"} bg={useColorModeValue("white", "gray.dark")} boxShadow={"lg"} p={8}>
						<Stack spacing={4}>
							<HStack>
								<Box>
									<FormControl isRequired>
										<FormLabel>Full name</FormLabel>
										<Input
											type='text'
											onChange={(e) => setInputs({ ...inputs, name: e.target.value })}
											value={inputs.name}
										/>
									</FormControl>
								</Box>
								<Box>
									<FormControl isRequired>
										<FormLabel>Username</FormLabel>
										<Input
											type='text'
											onChange={(e) => setInputs({ ...inputs, username: e.target.value })}
											value={inputs.username}
										/>
									</FormControl>
								</Box>
							</HStack>
							<FormControl isRequired>
								<FormLabel>Email address</FormLabel>
								<Input
									type='email'
									onChange={(e) => setInputs({ ...inputs, email: e.target.value })}
									value={inputs.email}
								/>
							</FormControl>
							<FormControl isRequired>
								<FormLabel>Password</FormLabel>
								<InputGroup>
									<Input
										type={showPassword ? "text" : "password"}
										onChange={(e) => setInputs({ ...inputs, password: e.target.value })}
										value={inputs.password}
									/>
									<InputRightElement h={"full"}>
										<Button
											variant={"ghost"}
											onClick={() => setShowPassword((showPassword) => !showPassword)}
										>
											{showPassword ? <ViewIcon /> : <ViewOffIcon />}
										</Button>
									</InputRightElement>
								</InputGroup>
							</FormControl>
							<Stack spacing={10} pt={2}>
								<Button
									loadingText='Submitting'
									size='lg'
									bg={useColorModeValue("gray.600", "gray.700")}
									color={"white"}
									_hover={{
										bg: useColorModeValue("gray.700", "gray.800"),
									}}
									onClick={handleSignup}
								>
									Sign up
								</Button>
							</Stack>
							<Stack pt={6}>
								<Text align={"center"}>
									Already a user?{" "}
									<Link color={"blue.400"} onClick={() => setAuthScreen("login")}>
										Login
									</Link>
								</Text>
							</Stack>
						</Stack>
					</Box>
				</Stack>
			</Flex>

			{/* Email Verification Modal */}
			<Modal isOpen={isOpen} onClose={onClose} isCentered motionPreset='scale'>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>Verify Your Email</ModalHeader>
					<ModalCloseButton />
					<ModalBody pb={6}>
						<Flex direction='column' align='center'>
							<Text mb={4}>
								We've sent a verification code to your email. Please enter it below to verify your account.
							</Text>
							
							<HStack spacing={4} my={4}>
								<PinInput otp size='lg' value={verificationCode} onChange={setVerificationCode}>
									<PinInputField />
									<PinInputField />
									<PinInputField />
									<PinInputField />
									<PinInputField />
									<PinInputField />
								</PinInput>
							</HStack>
							
							<Button 
								colorScheme='blue' 
								width='full' 
								onClick={handleVerifyEmail}
								isLoading={isVerifying}
								mb={4}
							>
								Verify
							</Button>
							
							<Text fontSize='sm'>
								Didn't receive a code?{" "}
								<Link color="blue.500" onClick={handleResendCode}>
									Resend
								</Link>
							</Text>
						</Flex>
					</ModalBody>
				</ModalContent>
			</Modal>
		</>
	);
}
