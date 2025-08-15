import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ipfsNotificationService } from '../utils/ipfsNotificationService';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentWallet, setCurrentWallet] = useState(null);
  const [ipfsStatus, setIpfsStatus] = useState({ connected: false, peers: 0 });

  const getStorageKey = useCallback((wallet) => {
    return wallet ? `didNotifications_${wallet.toLowerCase()}` : null;
  }, []);

  useEffect(() => {
    const checkIPFSStatus = async () => {
      try {
        const status = await ipfsNotificationService.getConnectionStatus();
        setIpfsStatus(status);
      } catch (error) {
        setIpfsStatus({ connected: false, peers: 0, error: error.message });
      }
    };

    checkIPFSStatus();
    const interval = setInterval(checkIPFSStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = useCallback(async (wallet) => {
    try {
      if (!wallet) {
        setNotifications([]);
        setUnreadCount(0);
        setCurrentWallet(null);
        return;
      }

      setCurrentWallet(wallet);
      let notificationList = [];

      if (ipfsStatus.connected) {
        try {
          console.log('[Notifications] Loading from IPFS for wallet:', wallet);
          const ipfsNotifications = await ipfsNotificationService.retrieveNotifications(wallet);
          notificationList = ipfsNotifications;
        } catch (error) {
          console.warn('[Notifications] IPFS load failed, falling back to localStorage:', error);
        }
      }

      if (notificationList.length === 0) {
        const storageKey = getStorageKey(wallet);
        const stored = localStorage.getItem(storageKey);
        notificationList = stored ? JSON.parse(stored) : [];
        console.log('[Notifications] Loaded from localStorage:', notificationList.length);
      }

      setNotifications(notificationList);
      const unread = notificationList.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [getStorageKey, ipfsStatus.connected]);

  useEffect(() => {
    if (!currentWallet || !ipfsStatus.connected) {
      return;
    }

    const pollForNotifications = async () => {
      try {
        console.log('[Notifications] Polling for new IPFS notifications...');
        await loadNotifications(currentWallet);
      } catch (error) {
        console.error('[Notifications] Error polling for notifications:', error);
      }
    };

    const pollInterval = setInterval(pollForNotifications, 10000);
    return () => clearInterval(pollInterval);
  }, [currentWallet, ipfsStatus.connected, loadNotifications]);

  const saveNotifications = useCallback((notificationList, wallet = currentWallet) => {
    try {
      if (!wallet) {
        console.warn('No wallet specified for saving notifications');
        return;
      }

      const storageKey = getStorageKey(wallet);
      localStorage.setItem(storageKey, JSON.stringify(notificationList));
      setNotifications(notificationList);
      
      const unread = notificationList.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }, [currentWallet, getStorageKey]);

  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: Date.now(),
      read: false,
      ...notification
    };
    
    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  const deleteNotification = useCallback((notificationId) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== notificationId);
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    saveNotifications([], currentWallet);
  }, [saveNotifications, currentWallet]);

  const sendCredentialOffer = useCallback(async (fromDID, toDID, credentialData, contract) => {
    addNotification({
      type: 'credential_offer',
      status: 'pending',
      fromDID: fromDID,
      toDID: toDID,
      credentialData: credentialData,
      direction: 'outgoing'
    });

    try {
      const targetDIDData = await contract.methods.getDIDDocument(toDID).call();
      const targetWallet = targetDIDData.controller;

      const incomingNotification = {
        id: Date.now() + Math.random(),
        timestamp: Date.now(),
        read: false,
        type: 'credential_offer',
        status: 'pending', 
        fromDID: fromDID,
        toDID: toDID,
        credentialData: credentialData,
        direction: 'incoming'
      };

      if (ipfsStatus.connected) {
        try {
          console.log('[Notifications] Sending credential offer via IPFS to:', targetWallet);
          const result = await ipfsNotificationService.storeNotification(targetWallet, incomingNotification);
          
          if (result.success) {
            console.log('[Notifications] Credential offer sent via IPFS:', result.cid);
            return;
          } else {
            console.warn('[Notifications] IPFS send failed, falling back to localStorage:', result.error);
          }
        } catch (error) {
          console.warn('[Notifications] IPFS send error, falling back to localStorage:', error);
        }
      }

      const targetStorageKey = getStorageKey(targetWallet);
      const targetStored = localStorage.getItem(targetStorageKey);
      const targetNotifications = targetStored ? JSON.parse(targetStored) : [];
      const updatedTargetNotifications = [incomingNotification, ...targetNotifications];
      localStorage.setItem(targetStorageKey, JSON.stringify(updatedTargetNotifications));
      console.log('[Notifications] Credential offer sent via localStorage');

    } catch (error) {
      console.error('Error sending credential offer to target wallet:', error);
      throw new Error('Could not send credential offer to target wallet');
    }
  }, [addNotification, getStorageKey, ipfsStatus.connected]);

  const sendVerificationRequest = useCallback(async (fromDID, toDID, message = '', contract) => {
    addNotification({
      type: 'verification_request',
      status: 'pending',
      fromDID: fromDID,
      toDID: toDID,
      message: message,
      direction: 'outgoing'
    });

    try {
      const targetDIDData = await contract.methods.getDIDDocument(toDID).call();
      const targetWallet = targetDIDData.controller;
      const targetStorageKey = getStorageKey(targetWallet);
      const targetStored = localStorage.getItem(targetStorageKey);
      const targetNotifications = targetStored ? JSON.parse(targetStored) : [];

      const incomingNotification = {
        id: Date.now() + Math.random(),
        timestamp: Date.now(),
        read: false,
        type: 'verification_request',
        status: 'pending', 
        fromDID: fromDID,
        toDID: toDID,
        message: message,
        direction: 'incoming'
      };

      const updatedTargetNotifications = [incomingNotification, ...targetNotifications];
      localStorage.setItem(targetStorageKey, JSON.stringify(updatedTargetNotifications));

    } catch (error) {
      console.error('Error sending notification to target wallet:', error);
      throw new Error('Could not send notification to target wallet');
    }
  }, [addNotification, getStorageKey]);

  const respondToRequest = useCallback(async (requestId, response, encryptedVC = null, verificationResult = null, contract, web3, account) => {
    setNotifications(prev => {
      const updated = prev.map(n => {
        if (n.id === requestId) {
          return {
            ...n,
            status: response === 'accepted' ? 'accepted' : 'refused',
            response: response,
            encryptedVC: encryptedVC,
            verificationResult: verificationResult,
            respondedAt: Date.now()
          };
        }
        return n;
      });
      saveNotifications(updated);
      return updated;
    });

    if (response === 'accepted' && encryptedVC && contract) {
      try {
        const currentNotifications = JSON.parse(localStorage.getItem(getStorageKey(currentWallet)) || '[]');
        const originalRequest = currentNotifications.find(n => n.id === requestId);
        
        if (originalRequest && originalRequest.fromDID && originalRequest.toDID) {
          if (originalRequest.type === 'credential_offer') {
            const vcString = JSON.stringify(encryptedVC);
            const vcHash = web3.utils.keccak256(vcString);
            
            await contract.methods.recordCredentialOfferAcceptance(
              originalRequest.fromDID, 
              originalRequest.toDID, 
              vcHash
            ).send({ from: account });
          } else {
            await contract.methods.recordCredentialAcceptance(originalRequest.fromDID, originalRequest.toDID)
              .send({ from: account });
          }

            
          const requesterDIDData = await contract.methods.getDIDDocument(originalRequest.fromDID).call();
          const requesterWallet = requesterDIDData.controller;

          const requesterStorageKey = getStorageKey(requesterWallet);
          const requesterStored = localStorage.getItem(requesterStorageKey);
          const requesterNotifications = requesterStored ? JSON.parse(requesterStored) : [];

          const responseNotification = {
            id: Date.now() + Math.random(),
            timestamp: Date.now(),
            read: false,
            type: 'verification_response',
            status: 'completed',
            originalRequestId: requestId,
            fromDID: originalRequest.toDID,
            toDID: originalRequest.fromDID, 
            encryptedVC: encryptedVC,
            verificationResult: verificationResult,
            direction: 'incoming'
          };

          const updatedRequesterNotifications = [responseNotification, ...requesterNotifications];
          localStorage.setItem(requesterStorageKey, JSON.stringify(updatedRequesterNotifications));
        }
      } catch (error) {
        console.error('Error sending verification response to requester:', error);
      }
    }
  }, [saveNotifications, getStorageKey, currentWallet]);

  const value = {
    notifications,
    unreadCount,
    currentWallet,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    sendCredentialOffer,
    sendVerificationRequest,
    respondToRequest,
    loadNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};