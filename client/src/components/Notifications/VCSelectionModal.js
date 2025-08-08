import React, { useState, useEffect, useCallback } from 'react';
import { ipfsService } from '../../utils/ipfsService';
import { VCEncryption } from '../../utils/vcEncryption';
import './VCSelectionModal.css';

const VCSelectionModal = ({ isOpen, onClose, onSelect, targetDID }) => {
  const [availableVCs, setAvailableVCs] = useState([]);
  const [selectedVC, setSelectedVC] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedVC, setExpandedVC] = useState(null);

  const loadVCs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const vcRefs = ipfsService.getVCReferences(targetDID);
      
      if (vcRefs.length === 0) {
        setAvailableVCs([]);
        return;
      }
      
      const vcData = await Promise.all(
        vcRefs.map(async (ref) => {
          try {
            const retrievedData = await ipfsService.getVC(ref.ipfsHash);
            let vc = retrievedData;
            
            if (retrievedData.encryptedData && retrievedData.algorithm) {
              try {
                vc = await VCEncryption.decryptVCForDID(retrievedData, targetDID);
              } catch (decryptError) {
                console.warn(`Could not decrypt VC ${ref.ipfsHash}, trying as plain VC:`, decryptError);
                vc = retrievedData.encryptedVC || retrievedData;
              }
            } else if (retrievedData.encryptedVC) {
              vc = retrievedData.encryptedVC;
            }
            
            const generateVCTitle = (vc) => {
              const subject = vc.credentialSubject || {};
              
              // try things for the title 
              if (subject.name) return subject.name;
              if (subject.title) return subject.title;
              if (subject.degree?.name) return subject.degree.name;
              if (subject.course) return subject.course;
              if (subject.achievement) return subject.achievement;
              if (subject.skill) return subject.skill;
              if (subject.certification) return subject.certification;
              if (subject.license) return subject.license;
              
              const vcType = vc.type?.[1] || vc.type;
              if (Array.isArray(vcType)) {
                const meaningfulType = vcType.find(t => t !== 'VerifiableCredential');
                if (meaningfulType) return meaningfulType.replace(/([A-Z])/g, ' $1').trim();
              } else if (typeof vcType === 'string' && vcType !== 'VerifiableCredential') {
                return vcType.replace(/([A-Z])/g, ' $1').trim();
              }
              
              const descriptiveFields = Object.entries(subject)
                .filter(([key, value]) => 
                  key !== 'id' && 
                  typeof value === 'string' && 
                  value.length < 100 && 
                  !key.includes('Id') && 
                  !key.includes('Hash')
                );
              
              if (descriptiveFields.length > 0) {
                const [key, value] = descriptiveFields[0];
                return `${key}: ${value}`;
              }
              
              const issuerName = vc.issuer?.replace(/^did:.*:/, '') || 'Unknown Issuer';
              return `Credential from ${issuerName}`;
            };

            return {
              ...ref,
              hash: ref.ipfsHash,
              vc: vc,
              title: generateVCTitle(vc),
              type: (() => {
                const vcType = vc.type?.[1] || vc.type || 'VerifiableCredential';
                if (Array.isArray(vcType)) {
                  const meaningfulType = vcType.find(t => t !== 'VerifiableCredential');
                  return meaningfulType ? meaningfulType.replace(/([A-Z])/g, ' $1').trim() : 'Verifiable Credential';
                }
                if (typeof vcType === 'string') {
                  if (vcType === 'VerifiableCredential') return 'Verifiable Credential';
                  return vcType.replace(/([A-Z])/g, ' $1').trim();
                }
                return 'Verifiable Credential';
              })(),
              issuer: vc.issuer,
              issuanceDate: vc.issuanceDate ? new Date(vc.issuanceDate).toLocaleDateString() : 'Unknown'
            };
          } catch (error) {
            console.error(`Error loading VC ${ref.ipfsHash}:`, error);
            return {
              ...ref,
              hash: ref.ipfsHash,
              vc: null,
              title: 'Error loading VC',
              type: 'Unknown',
              issuer: 'Unknown',
              issuanceDate: 'Unknown',
              error: true
            };
          }
        })
      );
      
      setAvailableVCs(vcData.filter(vc => !vc.error));
    } catch (error) {
      console.error('Error loading VCs:', error);
      setError('Error loading verifiable credentials: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [targetDID]);

  useEffect(() => {
    if (isOpen && targetDID) {
      loadVCs();
    }
  }, [isOpen, targetDID, loadVCs]);

  const handleVCSelect = (vc) => {
    setSelectedVC(vc);
  };

  const handleConfirm = () => {
    if (selectedVC && selectedVC.vc) {
      onSelect(selectedVC.vc);
    }
  };

  const handleCancel = () => {
    setSelectedVC(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content vc-selection-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Select Verifiable Credential</h3>
          <button className="close-btn" onClick={handleCancel}>×</button>
        </div>
        
        <div className="modal-body">
          <p className="modal-description">
            Choose which verifiable credential you want to share for verification:
          </p>
          
          {isLoading ? (
            <div className="loading-state">
              <p>Loading your verifiable credentials...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p className="error-message">{error}</p>
              <button className="retry-btn" onClick={loadVCs}>
                Retry
              </button>
            </div>
          ) : availableVCs.length === 0 ? (
            <div className="empty-state">
              <p>No verifiable credentials found for this DID.</p>
              <p className="help-text">
                You need to have issued VCs to share them for verification.
              </p>
            </div>
          ) : (
            <div className="vc-list">
              {availableVCs.map((vcData) => (
                <div
                  key={vcData.hash}
                  className={`vc-item ${selectedVC?.hash === vcData.hash ? 'selected' : ''}`}
                  onClick={() => handleVCSelect(vcData)}
                >
                  <div className="vc-header">
                    <h4 className="vc-title">{vcData.title}</h4>
                    <span className="vc-type">{vcData.type}</span>
                  </div>
                  
                  <div className="vc-details">
                    <div className="vc-detail">
                      <strong>Issuer:</strong> {vcData.issuer}
                    </div>
                    <div className="vc-detail">
                      <strong>Issued:</strong> {vcData.issuanceDate}
                    </div>
                    <div className="vc-detail">
                      <strong>Subject:</strong> {targetDID}
                    </div>
                  </div>
                  
                  {vcData.vc?.credentialSubject && (
                    <div className="vc-content">
                      <div className="vc-content-header">
                        <strong>Credential Content:</strong>
                        <button
                          className="expand-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedVC(expandedVC === vcData.hash ? null : vcData.hash);
                          }}
                        >
                          {expandedVC === vcData.hash ? 'Show Less' : 'Show More'}
                        </button>
                      </div>
                      
                      <div className="vc-subject">
                        {Object.entries(vcData.vc.credentialSubject)
                          .filter(([key, value]) => key !== 'id')
                          .slice(0, expandedVC === vcData.hash ? undefined : 3)
                          .map(([key, value]) => (
                            <div key={key} className="vc-attribute">
                              <span className="attribute-key">{key}:</span>
                              <span className="attribute-value">
                                {typeof value === 'object' ? 
                                  JSON.stringify(value, null, 2) : 
                                  String(value)}
                              </span>
                            </div>
                          ))}
                        
                        {expandedVC === vcData.hash && vcData.vc.proof && (
                          <div className="vc-attribute">
                            <span className="attribute-key">Proof Type:</span>
                            <span className="attribute-value">{vcData.vc.proof.type}</span>
                          </div>
                        )}
                        
                        {expandedVC !== vcData.hash && Object.keys(vcData.vc.credentialSubject).filter(k => k !== 'id').length > 3 && (
                          <div className="more-attributes">
                            ... and {Object.keys(vcData.vc.credentialSubject).filter(k => k !== 'id').length - 3} more attributes
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="vc-selection-indicator">
                    {selectedVC?.hash === vcData.hash && (
                      <span className="selected-indicator">✓ Selected</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button className="cancel-btn" onClick={handleCancel}>
            Cancel
          </button>
          <button 
            className="confirm-btn"
            onClick={handleConfirm}
            disabled={!selectedVC || isLoading}
          >
            Send Selected VC
          </button>
        </div>
      </div>
    </div>
  );
};

export default VCSelectionModal;