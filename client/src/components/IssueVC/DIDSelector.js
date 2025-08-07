import React from 'react';

const DIDSelector = ({ 
  userDIDs, 
  allDIDs, 
  selectedIssuerDID, 
  selectedRecipientDID, 
  onIssuerChange, 
  onRecipientChange, 
  loading 
}) => {
  return (
    <>
      <div className="form-section">
        <div className="form-group">
          <label htmlFor="issuerDID">Select your Issuer DID:</label>
          <select
            id="issuerDID"
            value={selectedIssuerDID}
            onChange={(e) => onIssuerChange(e.target.value)}
            disabled={loading}
          >
            <option value="">Select an issuer DID</option>
            {userDIDs.filter(did => did.canIssue).map(did => (
              <option key={did.id} value={did.id}>
                {did.id} (Trusted Issuer)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-section">
        <div className="form-group">
          <label htmlFor="recipientDID">Select recipient DID:</label>
          <select
            id="recipientDID"
            value={selectedRecipientDID}
            onChange={(e) => onRecipientChange(e.target.value)}
            disabled={loading}
          >
            <option value="">Select a recipient DID</option>
            {allDIDs.filter(did => did.id !== selectedIssuerDID).map(did => (
              <option key={did.id} value={did.id}>
                {did.id}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
};

export default DIDSelector;