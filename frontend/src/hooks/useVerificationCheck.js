import { useState, useEffect } from 'react';
import { useDisclosure } from '@chakra-ui/react';
import { useSetRecoilState } from 'recoil';
import userAtom from '../atoms/userAtom';
import useShowToast from './useShowToast';

const useVerificationCheck = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const setUser = useSetRecoilState(userAtom);
  const showToast = useShowToast();

  // Check local storage on component mount
  useEffect(() => {
    const checkUserVerification = async () => {
      const userInfo = JSON.parse(localStorage.getItem("user-threads"));
      
      if (userInfo && !userInfo.verified) {
        // User is logged in but not verified
        setUserId(userInfo._id);
        showToast("Warning", "Please verify your email to continue", "warning");
        onOpen();
      }
      
      setIsLoading(false);
    };
    
    checkUserVerification();
  }, [onOpen, showToast]);

  // Handle API responses that require verification
  const handleApiResponse = (data) => {
    if (data.requiresVerification) {
      setUserId(data.userId);
      showToast("Warning", data.error || "Please verify your email to continue", "warning");
      onOpen();
      return true; // Verification required
    }
    return false; // No verification required
  };

  return {
    isVerificationModalOpen: isOpen,
    openVerificationModal: onOpen,
    closeVerificationModal: onClose,
    handleApiResponse,
    userId,
    setUserId,
    isLoading
  };
};

export default useVerificationCheck;
