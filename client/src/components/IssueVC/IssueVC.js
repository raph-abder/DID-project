import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useContract } from '../../hooks/useContract';
import { useDIDData } from '../../hooks/useDIDData';
import { useNotifications } from '../../contexts/NotificationContext';
import ResultDisplay from '../ResultDisplay/ResultDisplay';
import DIDSelector from './DIDSelector';
import VCForm from './VCForm';
import './IssueVC.css';

const IssueVC = ({ web3State }) => {
  const { web3, account, isConnected, isLoading: web3Loading} = web3State;
  const { 
    contract, 
    checkIsTrustedIssuer,
    getAllDIDs,
    getDIDDocument
  } = useContract(web3);

  const { userDIDs, allDIDs, loading, loadUserDIDs, loadAllDIDs } = useDIDData(
    contract, account, getDIDDocument, checkIsTrustedIssuer, getAllDIDs
  );

  const { sendCredentialOffer } = useNotifications();

  const [selectedIssuerDID, setSelectedIssuerDID] = useState('');
  const [selectedRecipientDID, setSelectedRecipientDID] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState(null);
  
  const [vcData, setVcData] = useState({
    type: 'EducationCredential',
    subject: '',
    achievement: '',
    issueDate: new Date().toISOString().split('T')[0],
    description: ''
  });

  useEffect(() => {
    if (contract && account) {
      loadUserDIDs();
      loadAllDIDs();
    }
  }, [contract, account, loadUserDIDs, loadAllDIDs]);

  useEffect(() => {
    if (userDIDs.length > 0 && !selectedIssuerDID) {
      setSelectedIssuerDID(userDIDs[0].id);
    }
  }, [userDIDs, selectedIssuerDID]);

  const handleVcDataChange = (field, value) => {
    setVcData(prev => ({ ...prev, [field]: value }));
  };

  const handleSendOffer = async () => {
    try {
      setIsCreating(true);
      setResult(null);

      await sendCredentialOffer(selectedIssuerDID, selectedRecipientDID, vcData, contract);

      setResult({
        type: 'success',
        message: `Credential offer sent successfully!\n\nRecipient: ${selectedRecipientDID}\nCredential Type: ${vcData.type}\nSubject: ${vcData.subject}\n\nThe recipient will receive a notification and can choose to accept or reject the credential offer.`
      });

      setVcData({
        type: 'EducationCredential',
        subject: '',
        achievement: '',
        issueDate: new Date().toISOString().split('T')[0],
        description: ''
      });
      setSelectedRecipientDID('');

    } catch (error) {
      setResult({
        type: 'error',
        message: `Error sending credential offer: ${error.message}`
      });
    } finally {
      setIsCreating(false);
    }
  };


  if (web3Loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">Issue Verifiable Credential</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isConnected) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Issue Verifiable Credential</h1>

      {contract && account && (
        <>
          {userDIDs.length > 0 && (
            <div className="card">
              <h3>Send Credential Offer</h3>
              <p>Anyone can send credential offers. Recipients can choose to accept or reject them.</p>
              
              <div className="vc-form">
                <DIDSelector
                  userDIDs={userDIDs}
                  allDIDs={allDIDs}
                  selectedIssuerDID={selectedIssuerDID}
                  selectedRecipientDID={selectedRecipientDID}
                  onIssuerChange={setSelectedIssuerDID}
                  onRecipientChange={setSelectedRecipientDID}
                  loading={loading || isCreating}
                />

                <VCForm
                  vcData={vcData}
                  onDataChange={handleVcDataChange}
                  loading={loading || isCreating}
                />

                <button 
                  onClick={handleSendOffer}
                  disabled={isCreating || !selectedIssuerDID || !selectedRecipientDID || !vcData.subject}
                  className="issue-btn"
                >
                  {isCreating ? 'Sending Offer...' : 'Send Credential Offer'}
                </button>
              </div>
            </div>
          )}

          {result && (
            <ResultDisplay type={result.type} message={result.message} />
          )}
        </>
      )}
    </div>
  );
};

export default IssueVC;