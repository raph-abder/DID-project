import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useContract } from '../../hooks/useContract';
import { useNotifications } from '../../contexts/NotificationContext';
import ResultDisplay from '../ResultDisplay/ResultDisplay';
import './VerifyVC.css';

const VerifyVC = ({ web3State }) => {
  const { web3, account, isConnected, isLoading: web3Loading } = web3State;
  const { 
    contract
  } = useContract(web3);
  const { sendVerificationRequest } = useNotifications();
  
  const [activeTab, setActiveTab] = useState('verify');
  const [userDIDs, setUserDIDs] = useState([]);
  const [selectedDID, setSelectedDID] = useState('');
  const [targetDID, setTargetDID] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [verifiedCredentials, setVerifiedCredentials] = useState([]);

  const loadUserDIDs = useCallback(async () => {
    if (!contract || !account) return;

    try {
      const didIds = await contract.methods.getDIDsByController(account).call();
      
      if (didIds && didIds.length > 0) {
        const activeDIDs = [];
        
        for (const didId of didIds) {
          try {
            const didData = await contract.methods.getDIDDocument(didId).call();
            if (didData.isActive) {
              activeDIDs.push({
                id: didId,
                controller: didData.controller,
                publicKey: didData.publicKey
              });
            }
          } catch (error) {
            console.error(`Error loading DID ${didId}:`, error);
          }
        }
        
        setUserDIDs(activeDIDs);
        if (activeDIDs.length > 0 && !selectedDID) {
          setSelectedDID(activeDIDs[0].id);
        }
      } else {
        setUserDIDs([]);
      }
    } catch (error) {
      setError('Error loading your DIDs: ' + error.message);
      console.error('Error loading DIDs:', error);
    }
  }, [contract, account, selectedDID]);

  const loadVerifiedCredentials = useCallback(() => {
    try {
      if (!account) {
        setVerifiedCredentials([]);
        return;
      }
      
      const storageKey = `verifiedCredentials_${account.toLowerCase()}`;
      const stored = localStorage.getItem(storageKey);
      const credentials = stored ? JSON.parse(stored) : [];
      setVerifiedCredentials(credentials.reverse()); // Show newest first
    } catch (error) {
      console.error('Error loading verified credentials:', error);
      setVerifiedCredentials([]);
    }
  }, [account]);

  useEffect(() => {
    if (contract && account) {
      loadUserDIDs();
    }
  }, [contract, account, loadUserDIDs]);

  useEffect(() => {
    loadVerifiedCredentials();
  }, [loadVerifiedCredentials]);

  if (web3Loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">Verify Credentials</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isConnected) {
    return <Navigate to="/" replace />;
  }

  const validateTargetDID = async (didId) => {
    if (!didId || !didId.trim()) {
      return 'Please enter a target DID ID';
    }

    if (didId === selectedDID) {
      return 'You cannot send a verification request to yourself';
    }

    try {
      const didData = await contract.methods.getDIDDocument(didId).call();
      if (!didData.isActive) {
        return 'Target DID is not active';
      }
      return null;
    } catch (error) {
      return 'Target DID does not exist or is not accessible';
    }
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    
    if (!selectedDID || !targetDID.trim()) {
      setResult({
        type: 'error',
        message: 'Please select your DID and enter a target DID'
      });
      return;
    }

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const validationError = await validateTargetDID(targetDID.trim());
      if (validationError) {
        setResult({
          type: 'error',
          message: validationError
        });
        return;
      }

      await sendVerificationRequest(selectedDID, targetDID.trim(), message.trim(), contract);
      
      setResult({
        type: 'success',
        message: `Verification request sent successfully!\nFrom: ${selectedDID}\nTo: ${targetDID.trim()}`
      });

      setTargetDID('');
      setMessage('');
      
    } catch (error) {
      console.error('Error sending verification request:', error);
      setResult({
        type: 'error',
        message: 'Error sending verification request: ' + error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">Verify Credentials</h1>
      
      {error && <ResultDisplay type="error" message={error} />}
      
      {contract && account && (
        <div className="card">
          <div className="tab-header">
            <button 
              className={`tab-btn ${activeTab === 'verify' ? 'active' : ''}`}
              onClick={() => setActiveTab('verify')}
            >
              Verified Credentials
            </button>
            <button 
              className={`tab-btn ${activeTab === 'request' ? 'active' : ''}`}
              onClick={() => setActiveTab('request')}
            >
              Request Verification
            </button>
          </div>

          {activeTab === 'verify' && (
            <div className="tab-content">
              <h3>Verified Credentials</h3>
              <p className="description">
                View all credentials that have been verified through verification requests.
              </p>
              
              {verifiedCredentials.length === 0 ? (
                <div className="empty-verified">
                  <div className="empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="11" cy="11" r="8" stroke="#bdc3c7" strokeWidth="2" fill="none"/>
                      <path d="M21 21l-4.35-4.35" stroke="#bdc3c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h4>No Verified Credentials</h4>
                  <p>You haven't verified any credentials yet. Use the "Request Verification" tab to request credentials from other DIDs, or they will appear here automatically when verification requests are completed.</p>
                </div>
              ) : (
                <div className="verified-credentials-list">
                  {verifiedCredentials.map((verified) => (
                    <div key={verified.id} className="verified-credential-item">
                      <div className="verified-header">
                        <div className="verified-status">
                          <span className={`status-badge ${verified.verificationResult.isValid ? 'valid' : 'invalid'}`}>
                            {verified.verificationResult.isValid ? (
                              <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                                </svg>
                                Valid
                              </>
                            ) : (
                              <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                                  <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Invalid
                              </>
                            )}
                          </span>
                          <span className="verified-date">
                            {new Date(verified.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="verified-parties">
                          <strong>From:</strong> {verified.fromDID} → <strong>To:</strong> {verified.toDID}
                        </div>
                      </div>
                      
                      <div className="verified-details">
                        <div className="vc-info">
                          <h5>Credential Information</h5>
                          <div className="vc-field">
                            <strong>Type:</strong> {verified.originalVC.type?.join(', ') || 'Unknown'}
                          </div>
                          <div className="vc-field">
                            <strong>Issuer:</strong> {verified.originalVC.issuer}
                          </div>
                          <div className="vc-field">
                            <strong>Subject:</strong> {verified.originalVC.credentialSubject?.id || 'N/A'}
                          </div>
                          <div className="vc-field">
                            <strong>Issued:</strong> {new Date(verified.originalVC.issuanceDate).toLocaleDateString()}
                          </div>
                        </div>
                        
                        {verified.originalVC.credentialSubject && (
                          <div className="vc-content">
                            <h5>Credential Content</h5>
                            <div className="vc-attributes">
                              {Object.entries(verified.originalVC.credentialSubject)
                                .filter(([key]) => key !== 'id')
                                .map(([key, value]) => (
                                  <div key={key} className="vc-attribute">
                                    <span className="attr-key">{key}:</span>
                                    <span className="attr-value">{JSON.stringify(value)}</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                        
                        {verified.verificationResult.error && (
                          <div className="verification-error">
                            <strong>Verification Error:</strong> {verified.verificationResult.error}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'request' && (
            <div className="tab-content">
              <h3>Request Verification</h3>
              <p className="description">
                Request verification of credentials from another DID holder. They will receive a notification
                and can choose to accept or decline your request.
              </p>
              
              <form onSubmit={handleSendRequest} className="request-form">
                <div className="form-group">
                  <label htmlFor="selectedDID">Your DID (Requester):</label>
                  <select
                    id="selectedDID"
                    value={selectedDID}
                    onChange={(e) => setSelectedDID(e.target.value)}
                    disabled={isLoading || userDIDs.length === 0}
                    required
                  >
                    <option value="">Select your DID</option>
                    {userDIDs.map((did) => (
                      <option key={did.id} value={did.id}>
                        {did.id}
                      </option>
                    ))}
                  </select>
                  {userDIDs.length === 0 && (
                    <p className="help-text">
                      No active DIDs found. Please create a DID first in the Manage DID section.
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="targetDID">Target DID (Who to verify):</label>
                  <input
                    type="text"
                    id="targetDID"
                    value={targetDID}
                    onChange={(e) => setTargetDID(e.target.value)}
                    placeholder="Enter the DID ID you want to request verification from"
                    disabled={isLoading}
                    required
                  />
                  <p className="help-text">
                    Enter the DID ID of the person you want to request credentials from
                  </p>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message (Optional):</label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter an optional message explaining why you need verification..."
                    disabled={isLoading}
                    rows="3"
                    maxLength="500"
                  />
                  <p className="help-text">
                    {message.length}/500 characters
                  </p>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading || !selectedDID || !targetDID.trim() || userDIDs.length === 0}
                  className="send-request-btn"
                >
                  {isLoading ? 'Sending Request...' : 'Send Verification Request'}
                </button>
              </form>
            </div>
          )}
          
          {result && (
            <ResultDisplay type={result.type} message={result.message} />
          )}
        </div>
      )}
    </div>
  );
};

export default VerifyVC;