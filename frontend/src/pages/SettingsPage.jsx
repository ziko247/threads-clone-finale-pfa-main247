import { 
  Box, 
  Button, 
  FormControl, 
  FormLabel, 
  Input, 
  Text, 
  VStack,
  Divider,
  useColorModeValue,
  Heading,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Alert,
  AlertIcon,
  HStack,
  Flex,
  PinInput,
  PinInputField,
  Link
} from "@chakra-ui/react";
import { useState } from "react";
import useShowToast from "../hooks/useShowToast";
import userAtom from "../atoms/userAtom";
import { useRecoilState } from "recoil";
import useLogout from "../hooks/useLogout";

export const SettingsPage = () => {
  const [user, setUser] = useRecoilState(userAtom);
  const [updating, setUpdating] = useState(false);
  const [freezing, setFreezing] = useState(false);
  const showToast = useShowToast();
  const logout = useLogout();
  const [verificationCode, setVerificationCode] = useState("");
	const [isVerifying, setIsVerifying] = useState(false);
	const { isOpen, onClose } = useDisclosure();
  const [inputs, setInputs] = useState({
    email: user.email || "",
    password: "",
    confirmPassword: ""
  });

  const [updateSuccess, setUpdateSuccess] = useState(false);
  
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();

  const handleInputChange = (e) => {
    setInputs({
      ...inputs,
      [e.target.name]: e.target.value
    });
    
    // Reset success message when user starts typing again
    if (updateSuccess) {
      setUpdateSuccess(false);
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
			
			// Now get the user info
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

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    if (updating) return;
    
    // Password validation
    if (inputs.password && inputs.password !== inputs.confirmPassword) {
      showToast("Error", "Passwords don't match", "error");
      return;
    }
    
    const updatedFields = {};
    if (inputs.email) updatedFields.email = inputs.email;
    if (inputs.password) updatedFields.password = inputs.password ;
    
    // Don't make API call if nothing changed
    if (Object.keys(updatedFields).length === 0) {
      showToast("Info", "No changes to update", "info");
      return;
    }
    
    setUpdating(true);
    try {
      const res = await fetch(`/api/users/update/${user._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedFields),
      });
      
      const data = await res.json();
      
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }
      
      showToast("Success", "Account settings updated", "success");
      setUpdateSuccess(true);
      
      // Update user state with new email
      if (inputs.email) {
        setUser({
          ...user,
          email: inputs.email
        });
        localStorage.setItem("user-threads", JSON.stringify({
          ...user,
          email: inputs.email
        }));
      }
      
      // Reset password fields
      setInputs({
        ...inputs,
        password: "",
        confirmPassword: ""
      });
      
    } catch (error) {
      showToast("Error", error.message, "error");
    } finally {
      setUpdating(false);
    }
  };

  const freezeAccount = async () => {
    onConfirmClose();
    
    if (!window.confirm("Are you sure you want to freeze your account?")) return;

    try {
      setFreezing(true);
      const res = await fetch("/api/users/freeze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (data.error) {
        return showToast("Error", data.error, "error");
      }
      if (data.success) {
        await logout();
        showToast("Success", "Your account has been frozen", "success");
      }
    } catch (error) {
      showToast("Error", error.message, "error");
    } finally {
      setFreezing(false);
    }
  };

  return (
    <Box pt={4} maxW="600px" mx="auto">
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="md" mb={4}>Account Settings</Heading>
          <VStack 
            spacing={4}
            p={6}
            bg={useColorModeValue("white", "gray.dark")}
            rounded="xl"
            boxShadow="md"
            align="start"
          >
            {updateSuccess && (
              <Alert status="success" rounded="md">
                <AlertIcon />
                Account settings updated successfully
              </Alert>
            )}
            
            <FormControl id="email">
              <FormLabel>Email address</FormLabel>
              <Input 
                name="email"
                type="email"
                value={inputs.email}
                onChange={handleInputChange}
                placeholder="your-email@example.com"
                bg={useColorModeValue("gray.50", "gray.800")}
              />
            </FormControl>
            
            <FormControl id="password">
              <FormLabel>New Password</FormLabel>
              <Input 
                name="password"
                type="password"
                value={inputs.password}
                onChange={handleInputChange}
                placeholder="Leave blank to keep current password"
                bg={useColorModeValue("gray.50", "gray.800")}
              />
            </FormControl>
            
            {inputs.password && (
              <FormControl id="confirmPassword">
                <FormLabel>Confirm New Password</FormLabel>
                <Input 
                  name="confirmPassword"
                  type="password"
                  value={inputs.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your new password"
                  bg={useColorModeValue("gray.50", "gray.800")}
                />
              </FormControl>
              
            )}
            
            <Button
              colorScheme="blue"
              onClick={handleUpdateAccount}
              isLoading={updating}
              alignSelf="end"
              mt={2}
            >
              Update Account
            </Button>
           
          </VStack>
        </Box>
        
        <Divider />
        
        <Box>
          <Heading size="md" mb={4} color="red.500">Danger Zone</Heading>
          <Box
            p={6}
            bg={useColorModeValue("red.50", "red.900")}
            rounded="xl"
            boxShadow="md"
          >
            <Text mb={4}>
              Freezing your account will temporarily hide your profile and content from other users.
              You can unfreeze your account at any time by logging back in.
            </Text>
            <Button 
              colorScheme="red" 
              onClick={freezeAccount}
              isLoading={freezing}
            >
              Freeze Account
            </Button>
          </Box>
        </Box>
      </VStack>
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
      
      {/* Confirmation Modal */}
      <Modal isOpen={isConfirmOpen} onClose={onConfirmClose}>
        <ModalOverlay />
        <ModalContent bg={useColorModeValue("white", "gray.dark")}>
          <ModalHeader>Confirm Account Freeze</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            Are you sure you want to freeze your account? Your profile and content will be hidden until you unfreeze it.
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onConfirmClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={freezeAccount} isLoading={freezing}>
              Freeze Account
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>

    



  );
};

export default SettingsPage;
