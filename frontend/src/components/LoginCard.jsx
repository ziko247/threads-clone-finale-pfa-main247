import {
	Flex,
	Box,
	FormControl,
	FormLabel,
	Input,
	InputGroup,
	InputRightElement,
	Stack,
	Button,
	Heading,
	Text,
	useColorModeValue,
	Link,
	HStack,
	PinInput,
	PinInputField,
	Modal,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalBody,
	useDisclosure,
} from "@chakra-ui/react";
import { useState } from "react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { useSetRecoilState } from "recoil";
import authScreenAtom from "../atoms/authAtom";
import userAtom from "../atoms/userAtom";
import useShowToast from "../hooks/useShowToast";

export default function LoginCard() {
	const [showPassword, setShowPassword] = useState(false);
	const setAuthScreen = useSetRecoilState(authScreenAtom);
	const setUser = useSetRecoilState(userAtom);
	const [loading, setLoading] = useState(false);
	const [inputs, setInputs] = useState({
		username: "",
		password: "",
	});
	const [verificationCode, setVerificationCode] = useState("");
	const [isVerifying, setIsVerifying] = useState(false);
	const [userId, setUserId] = useState(null);
	const { isOpen, onOpen, onClose } = useDisclosure();
	const showToast = useShowToast();

	const handleLogin = async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/users/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(inputs),
			});
			const data = await res.json();

			if (data.error) {
				showToast("Error", data.error, "error");
				
				// Check if verification is required
				if (data.requiresVerification && data.userId) {
					setUserId(data.userId);
					onOpen(); // Open verification modal
					showToast("Info", "Please verify your email to log in", "info");
				}
				setLoading(false);
				return;
			}

			localStorage.setItem("user-threads", JSON.stringify(data));
			setUser(data);
		} catch (error) {
			showToast("Error", error.message, "error");
		} finally {
			setLoading(false);
		}
	};

	const handleVerifyEmail = async () => {
		if (verificationCode.length !== 6) {
			showToast("Error", "Please enter a valid 6-digit code", "error");
			return;
		}

		setIsVerifying(true);
		try {
			const res = await fetch("/api/users/verify-email", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ userId, verificationCode }),
			});
			const data = await res.json();

			if (data.error) {
				showToast("Error", data.error, "error");
				setIsVerifying(false);
				return;
			}

			showToast("Success", "Email verified successfully", "success");
			
			// Now get the user info and log them in
			const userRes = await fetch(`/api/users/profile/${userId}`);
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
				<Stack spacing={8} mx={"auto"} maxW={"lg"} py={12} px={6} w={"md"}>
					<Stack align={"center"}>
						<Heading fontSize={"4xl"} textAlign={"center"}>
							Login
						</Heading>
					</Stack>
					<Box
						rounded={"lg"}
						bg={useColorModeValue("white", "gray.dark")}
						boxShadow={"lg"}
						p={8}
						w={"full"}
					>
						<Stack spacing={4}>
							<FormControl isRequired>
								<FormLabel>Username</FormLabel>
								<Input
									type='text'
									value={inputs.username}
									onChange={(e) => setInputs({ ...inputs, username: e.target.value })}
								/>
							</FormControl>
							<FormControl isRequired>
								<FormLabel>Password</FormLabel>
								<InputGroup>
									<Input
										type={showPassword ? "text" : "password"}
										value={inputs.password}
										onChange={(e) => setInputs({ ...inputs, password: e.target.value })}
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
									loadingText='Logging in'
									size='lg'
									bg={useColorModeValue("gray.600", "gray.700")}
									color={"white"}
									_hover={{
										bg: useColorModeValue("gray.700", "gray.800"),
									}}
									onClick={handleLogin}
									isLoading={loading}
								>
									Login
								</Button>
							</Stack>
							<Stack pt={6}>
								<Text align={"center"}>
									Don't have an account?{" "}
									<Link color={"blue.400"} onClick={() => setAuthScreen("signup")}>
										Sign up
									</Link>
								</Text>
							</Stack>
						</Stack>
					</Box>
				</Stack>
			</Flex>

			{/* Email Verification Modal - Not dismissible with close button or escape key */}
			<Modal 
				isOpen={isOpen} 
				onClose={() => {}} // Empty function prevents closing
				closeOnOverlayClick={false}
				closeOnEsc={false}
				isCentered 
				motionPreset='scale'
			>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>Verify Your Email</ModalHeader>
					<ModalBody pb={6}>
						<Flex direction='column' align='center'>
							<Text mb={4}>
								We've sent a verification code to your email. You need to verify your email before you can log in.
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
