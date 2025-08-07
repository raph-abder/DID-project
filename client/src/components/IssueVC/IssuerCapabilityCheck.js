import React from 'react';

const IssuerCapabilityCheck = ({ userDIDs, canIssue }) => {
  if (canIssue) return null;

  return (
    <div className="card">
      <div className="no-issuing-capability">
        <h3>Cannot Issue Credentials</h3>
        <p>
          You need to have a <strong>Trusted Issuer</strong> DID to issue Verifiable Credentials.
        </p>
        <div className="your-dids">
          <h4>Your DIDs:</h4>
          {userDIDs.length === 0 ? (
            <p>No DIDs found. Please create a DID first.</p>
          ) : (
            <ul>
              {userDIDs.map(did => (
                <li key={did.id} className={`did-status ${did.canIssue ? 'can-issue' : 'cannot-issue'}`}>
                  <code>{did.id}</code>
                  <span className={`status ${did.isTrustedIssuer ? 'trusted' : 'not-trusted'}`}>
                    {did.isTrustedIssuer ? 'Trusted Issuer' : 'Not Trusted'}
                  </span>
                  {!did.isActive && <span className="inactive">(Inactive)</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="help-text">
          Contact the system administrator to get trusted issuer status for your DID.
        </p>
      </div>
    </div>
  );
};

export default IssuerCapabilityCheck;