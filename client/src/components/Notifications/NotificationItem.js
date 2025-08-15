import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { useContract } from '../../hooks/useContract';
import { VCEncryption } from '../../utils/vcEncryption';
import { createVerifiableCredential } from '../../utils/vcCreator';
import { createTrustScoring } from '../../utils/trustScoring';
import VCSelectionModal from './VCSelectionModal';
import './NotificationItem.css';

const NotificationItem = ({ notification, isCompact = false, onAction, web3, account }) => {
  const { markAsRead, respondToRequest, deleteNotification } = useNotifications();
  const { contract, getDIDDocument } = useContract(web3);
  const [showVCModal, setShowVCModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [decryptedVC, setDecryptedVC] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [issuerTrustScore, setIssuerTrustScore] = useState(null);

  useEffect(() => {
    const loadTrustScore = async () => {
      if (notification.type === 'credential_offer' && notification.fromDID && contract) {
        try {
          const trustScoring = createTrustScoring(contract);
          const trustScores = await trustScoring.calculateTrustScores();
          const issuerScore = trustScores.get(notification.fromDID);
          setIssuerTrustScore(issuerScore);
        } catch (error) {
          console.warn('Could not load trust score for issuer:', error);
        }
      }
    };
    
    loadTrustScore();
  }, [notification, contract]);

  const formatTrustScore = (score) => {
    return (score / 1000).toFixed(3);
  };

  const getTrustLevel = (score) => {
    const normalizedScore = score / 1000;
    if (normalizedScore >= 2.0) return 'very-high';
    if (normalizedScore >= 1.5) return 'high';
    if (normalizedScore >= 1.0) return 'medium';
    if (normalizedScore >= 0.5) return 'low';
    return 'very-low';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  const getNotificationIcon = () => {
    if (notification.type === 'credential_offer') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="#f39c12" strokeWidth="2" fill="none"/>
          <line x1="8" y1="21" x2="16" y2="21" stroke="#f39c12" strokeWidth="2"/>
          <line x1="12" y1="17" x2="12" y2="21" stroke="#f39c12" strokeWidth="2"/>
          <path d="M7 10l2 2 4-4" stroke="#f39c12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }
    if (notification.type === 'verification_request') {
      if (notification.direction === 'incoming') {
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" fill="none"/>
            <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/>
            <path d="M16 10l6 6M16 16l6-6" stroke="#3498db" strokeWidth="2"/>
          </svg>
        );
      } else {
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" fill="none"/>
            <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 10l6 6M8 16l6-6" stroke="#e67e22" strokeWidth="2"/>
          </svg>
        );
      }
    }
    if (notification.type === 'verification_response') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 12l2 2 4-4" stroke="#27ae60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="10" stroke="#27ae60" strokeWidth="2" fill="none"/>
        </svg>
      );
    }
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  };

  const getNotificationTitle = () => {
    if (notification.type === 'credential_offer') {
      if (notification.direction === 'incoming') {
        return `Credential offer from ${notification.fromDID}`;
      } else {
        return `Credential offer sent to ${notification.toDID}`;
      }
    }
    if (notification.type === 'verification_request') {
      if (notification.direction === 'incoming') {
        return `Verification request from ${notification.fromDID}`;
      } else {
        return `Request sent to ${notification.toDID}`;
      }
    }
    if (notification.type === 'verification_response') {
      return `Verification response received`;
    }
    return 'Notification';
  };

  const getNotificationBody = () => {
    if (notification.type === 'credential_offer') {
      if (notification.direction === 'incoming') {
        const statusText = notification.status === 'pending' ? 'Awaiting your response' : 
                          notification.status === 'accepted' ? 'Accepted' : 'Refused';
        const credData = notification.credentialData;
        return `${statusText} - ${credData?.type || 'Credential'}: ${credData?.subject || 'No subject'}`;
      } else {
        const statusText = notification.status === 'pending' ? 'Awaiting response' :
                          notification.status === 'accepted' ? 'Accepted' : 'Refused';
        return statusText;
      }
    }
    if (notification.type === 'verification_request') {
      if (notification.direction === 'incoming') {
        const statusText = notification.status === 'pending' ? 'Awaiting your response' : 
                          notification.status === 'accepted' ? 'Accepted' : 'Refused';
        return `${statusText}${notification.message ? ` - ${notification.message}` : ''}`;
      } else {
        const statusText = notification.status === 'pending' ? 'Awaiting response' :
                          notification.status === 'accepted' ? 'Accepted' : 'Refused';
        return statusText;
      }
    }
    if (notification.type === 'verification_response') {
      return 'Credentials received and processed';
    }
    return notification.message || '';
  };

  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.type === 'verification_response' && notification.encryptedVC) {
      handleDecryptAndVerify();
    }
  };

  const handleDecryptAndVerify = async () => {
    if (decryptedVC && verificationResult) return;
    
    setIsProcessing(true);
    try {
      // For incoming requests, the user (toDID) needs to decrypt with their own DID
      // For outgoing requests (responses), the user (fromDID) needs to decrypt
      const userDID = notification.direction === 'incoming' ? notification.toDID : notification.fromDID;
      
      if (!userDID) {
        throw new Error('Cannot determine user DID for decryption');
      }
      
      const decrypted = await VCEncryption.decryptVCForDID(
        notification.encryptedVC,
        userDID
      );
      setDecryptedVC(decrypted);
      
      const verification = await verifyVCSignature(decrypted);
      setVerificationResult(verification);
      
      // Store the verified credential for the requester
      const verifiedCredential = {
        id: Date.now() + Math.random(),
        originalVC: decrypted,
        verificationResult: verification,
        fromDID: notification.fromDID,
        toDID: notification.toDID,
        timestamp: Date.now(),
        requestId: notification.originalRequestId || notification.id
      };
      
      const storageKey = `verifiedCredentials_${account.toLowerCase()}`;
      const existingVerified = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existingVerified.push(verifiedCredential);
      localStorage.setItem(storageKey, JSON.stringify(existingVerified));
    } catch (error) {
      console.error('Error processing verification:', error);
      setVerificationResult({
        isValid: false,
        error: error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyVCSignature = async (vc) => {
    try {
      if (!vc.proof || (!vc.proof.jws && !vc.proof.signature)) {
        return { isValid: false, error: 'No signature found in VC' };
      }

      if (vc.proof.signature) {
        console.log('Found direct signature format');
      }

      if (vc.issuer && contract) {
        try {
          const didDoc = await getDIDDocument(vc.issuer);
          if (!didDoc.isActive) {
            return {
              isValid: false,
              error: 'Issuer DID is not active',
              issuer: vc.issuer,
              subject: vc.credentialSubject,
              issuanceDate: vc.issuanceDate,
              signatureVerified: true
            };
          }
        } catch (error) {
          console.warn('Could not verify issuer DID status:', error);
          return {
            isValid: false,
            error: 'Could not verify issuer DID status: ' + error.message,
            issuer: vc.issuer,
            subject: vc.credentialSubject,
            issuanceDate: vc.issuanceDate,
            signatureVerified: true
          };
        }
      }
      
      return {
        isValid: true,
        issuer: vc.issuer,
        subject: vc.credentialSubject,
        issuanceDate: vc.issuanceDate,
        signatureVerified: true
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid signature format'
      };
    }
  };

  const handleAccept = () => {
    if (notification.type === 'verification_request' && notification.direction === 'incoming') {
      setShowVCModal(true);
    }
  };

  const handleAcceptCredentialOffer = async () => {
    if (notification.type === 'credential_offer' && notification.direction === 'incoming') {
      setIsProcessing(true);
      try {
        console.log('Accepting credential offer:', {
          fromDID: notification.fromDID,
          toDID: notification.toDID,
          credentialData: notification.credentialData
        });

        const vcResult = await createVerifiableCredential({
          web3,
          account,
          selectedIssuerDID: notification.fromDID,
          selectedRecipientDID: notification.toDID,
          vcData: notification.credentialData,
          getDIDDocument,
          contract
        });

        console.log('VC created successfully:', vcResult);

        const verificationResult = await verifyVCSignature(vcResult.originalVC);
        console.log('VC verification result:', verificationResult);

        respondToRequest(notification.id, 'accepted', vcResult.encryptedVC, verificationResult, contract, web3, account);
        onAction?.();
      } catch (error) {
        console.error('Error accepting credential offer:', error);
        alert('Error accepting credential: ' + error.message);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleRefuse = () => {
    if ((notification.type === 'verification_request' || notification.type === 'credential_offer') && 
        notification.direction === 'incoming') {
      respondToRequest(notification.id, 'refused', null, null, contract, web3, account);
      onAction?.();
    }
  };

  const handleVCSelected = async (vcData) => {
    setIsProcessing(true);
    try {
      const publicKeyPem = await getPublicKeyForDID(notification.fromDID);
      const publicKey = await VCEncryption.importPublicKey(publicKeyPem);
      
      const encryptedVC = await VCEncryption.encryptVC(vcData, publicKey);
      const verificationResult = await verifyVCSignature(vcData);
      
      
      respondToRequest(notification.id, 'accepted', encryptedVC, verificationResult, contract, web3, account);
      setShowVCModal(false);
      onAction?.();
    } catch (error) {
      console.error('Error sending VC:', error);
      alert('Error sending verification: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getPublicKeyForDID = async (didId) => {
    try {
      if (!contract) {
        throw new Error('Contract not available');
      }
      const didData = await contract.methods.getDIDDocument(didId).call();
      return didData.publicKey;
    } catch (error) {
      throw new Error('Could not retrieve public key for DID: ' + didId);
    }
  };

  const handleDelete = () => {
    deleteNotification(notification.id);
    onAction?.();
  };

  const showActions = ((notification.type === 'verification_request' || notification.type === 'credential_offer') && 
                     notification.direction === 'incoming' && 
                     notification.status === 'pending');

  const showDecryptedData = notification.type === 'verification_response' && 
                           (decryptedVC || verificationResult);

  return (
    <div 
      className={`notification-item ${isCompact ? 'compact' : ''} ${!notification.read ? 'unread' : ''}`}
      onClick={handleClick}
    >
      <div className="notification-icon">
        {getNotificationIcon()}
      </div>
      
      <div className="notification-content">
        <div className="notification-header">
          <h4 className="notification-title">{getNotificationTitle()}</h4>
          <span className="notification-time">{formatTime(notification.timestamp)}</span>
        </div>
        
        <p className="notification-body">{getNotificationBody()}</p>
        
        {notification.type === 'credential_offer' && notification.direction === 'incoming' && issuerTrustScore && (
          <div className="trust-info">
            <div className="trust-score-display">
              <span className="trust-label">Issuer Trust Score: </span>
              <span 
                className={`trust-badge ${getTrustLevel(issuerTrustScore.trustScore)}`}
                title={`Issuer Trust Score: ${formatTrustScore(issuerTrustScore.trustScore)}

Score Interpretation:
• 2.0+ = Very High Trust - Widely accepted by network
• 1.5-2.0 = High Trust - Well-regarded issuer
• 1.0-1.5 = Medium Trust - Some network acceptance
• 0.5-1.0 = Low Trust - Limited acceptance history
• <0.5 = Very Low Trust - Few or no acceptances`}
              >
                {formatTrustScore(issuerTrustScore.trustScore)}
              </span>
              {issuerTrustScore.isTrusted && (
                <span className="trusted-badge">✓ Trusted Issuer</span>
              )}
            </div>
          </div>
        )}
        
        {showDecryptedData && (
          <div className="verification-details">
            <h5>Verification Results:</h5>
            {isProcessing ? (
              <p className="processing">Decrypting and verifying...</p>
            ) : verificationResult ? (
              <div className={`verification-result ${verificationResult.isValid ? 'valid' : 'invalid'}`}>
                <p><strong>Status:</strong> {verificationResult.isValid ? 'Valid' : 'Invalid'}</p>
                {verificationResult.isValid && (
                  <>
                    <p><strong>Issuer:</strong> {verificationResult.issuer}</p>
                    <p><strong>Issued:</strong> {new Date(verificationResult.issuanceDate).toLocaleDateString()}</p>
                  </>
                )}
                {verificationResult.error && (
                  <p className="error">Error: {verificationResult.error}</p>
                )}
              </div>
            ) : null}
          </div>
        )}
        
        {showActions && !isCompact && (
          <div className="notification-actions">
            <button 
              className="accept-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (notification.type === 'credential_offer') {
                  handleAcceptCredentialOffer();
                } else {
                  handleAccept();
                }
              }}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Accept'}
            </button>
            <button 
              className="refuse-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleRefuse();
              }}
              disabled={isProcessing}
            >
              Refuse
            </button>
          </div>
        )}
      </div>
      
      {!isCompact && (
        <button 
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          title="Delete notification"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19,6V20a2,2 0,0 1,-2,2H7a2,2 0,0 1,-2,-2V6M8,6V4a2,2 0,0 1,2,-2h4a2,2 0,0 1,2,2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      
      {!notification.read && <div className="unread-indicator"></div>}
      
      {showVCModal && (
        <VCSelectionModal
          isOpen={showVCModal}
          onClose={() => setShowVCModal(false)}
          onSelect={handleVCSelected}
          targetDID={notification.toDID}
        />
      )}
    </div>
  );
};

export default NotificationItem;