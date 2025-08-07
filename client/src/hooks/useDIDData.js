import { useState, useCallback } from 'react';

export const useDIDData = (contract, account, getDIDDocument, checkIsTrustedIssuer, getAllDIDs) => {
  const [userDIDs, setUserDIDs] = useState([]);
  const [allDIDs, setAllDIDs] = useState([]);
  const [canIssue, setCanIssue] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadUserDIDs = useCallback(async () => {
    if (!contract || !account) return;

    try {
      setLoading(true);
      const didIds = await contract.methods.getDIDsByController(account).call();
      
      if (didIds && didIds.length > 0) {
        const didDetails = await Promise.all(
          didIds.map(async (didId) => {
            try {
              const didDoc = await getDIDDocument(didId);
              const isTrusted = await checkIsTrustedIssuer(didId);
              
              return {
                id: didId,
                controller: didDoc.controller,
                isActive: didDoc.isActive,
                isTrustedIssuer: isTrusted,
                canIssue: didDoc.isActive && isTrusted
              };
            } catch (error) {
              console.error(`Error loading DID ${didId}:`, error);
              return null;
            }
          })
        );
        
        const validDIDs = didDetails.filter(did => did !== null);
        setUserDIDs(validDIDs);
        
        const hasIssuingCapability = validDIDs.some(did => did.canIssue);
        setCanIssue(hasIssuingCapability);
      } else {
        setUserDIDs([]);
        setCanIssue(false);
      }
    } catch (error) {
      console.error('Error loading user DIDs:', error);
      setCanIssue(false);
    } finally {
      setLoading(false);
    }
  }, [contract, account, getDIDDocument, checkIsTrustedIssuer]);

  const loadAllDIDs = useCallback(async () => {
    if (!contract) return;

    try {
      const didIds = await getAllDIDs();
      
      const didDetails = await Promise.all(
        didIds.map(async (didId) => {
          try {
            const didDoc = await getDIDDocument(didId);
            
            return {
              id: didId,
              controller: didDoc.controller,
              isActive: didDoc.isActive
            };
          } catch (error) {
            console.error(`Error loading DID ${didId}:`, error);
            return null;
          }
        })
      );
      
      const validDIDs = didDetails.filter(did => did !== null && did.isActive);
      setAllDIDs(validDIDs);
    } catch (error) {
      console.error('Error loading all DIDs:', error);
    }
  }, [contract, getAllDIDs, getDIDDocument]);

  return {
    userDIDs,
    allDIDs,
    canIssue,
    loading,
    loadUserDIDs,
    loadAllDIDs
  };
};