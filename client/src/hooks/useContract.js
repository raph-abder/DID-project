import { useState, useCallback, useEffect } from 'react';
import DIDRegistryArtifact from '../artifacts/DIDRegistry.json';
import { CONTRACT_ADDRESSES } from '../constants/contracts';

export const useContract = (web3) => {
  const [contract, setContract] = useState(null);
  const [contractAddress, setContractAddress] = useState('');
  const [error, setError] = useState(null);

  const setContractInstance = useCallback(async (address) => {
    if (!address) {
      setError("Please enter a contract address");
      return;
    }

    if (!web3) {
      setError("Please connect to MetaMask first");
      return;
    }

    try {
      const contractABI = DIDRegistryArtifact.abi;
      
      const contractInstance = new web3.eth.Contract(contractABI, address);
      setContract(contractInstance);
      setContractAddress(address);
      setError(null);
      return contractInstance;
    } catch (error) {
      setError("Error setting contract: " + error.message);
      return null;
    }
  }, [web3]);

  const checkIsTrustedIssuer = useCallback(async (didId) => {
    if (!contract) return false;
    try {
      return await contract.methods.isTrustedIssuer(didId).call();
    } catch (error) {
      console.error("Error checking trusted issuer status:", error);
      return false;
    }
  }, [contract]);

  const checkIsAdmin = useCallback(async (didId) => {
    if (!contract) return false;
    try {
      return await contract.methods.isAdminDID(didId).call();
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
  }, [contract]);

  const getAdminDID = useCallback(async () => {
    if (!contract) return null;
    try {
      return await contract.methods.adminDID().call();
    } catch (error) {
      console.error("Error getting admin DID:", error);
      return null;
    }
  }, [contract]);

  const addTrustedIssuer = useCallback(async (issuerDID, fromAccount) => {
    if (!contract) return null;
    try {
      return await contract.methods.addTrustedIssuer(issuerDID).send({ from: fromAccount });
    } catch (error) {
      console.error("Error adding trusted issuer:", error);
      throw error;
    }
  }, [contract]);

  const removeTrustedIssuer = useCallback(async (issuerDID, fromAccount) => {
    if (!contract) return null;
    try {
      return await contract.methods.removeTrustedIssuer(issuerDID).send({ from: fromAccount });
    } catch (error) {
      console.error("Error removing trusted issuer:", error);
      throw error;
    }
  }, [contract]);

  const getAllDIDs = useCallback(async () => {
    if (!contract) return [];
    try {
      return await contract.methods.getAllDIDs().call();
    } catch (error) {
      console.error("Error getting all DIDs:", error);
      return [];
    }
  }, [contract]);

  const getDIDDocument = useCallback(async (didId) => {
    if (!contract) return null;
    try {
      return await contract.methods.getDIDDocument(didId).call();
    } catch (error) {
      console.error("Error getting DID document:", error);
      return null;
    }
  }, [contract]);

  useEffect(() => {
    if (web3 && CONTRACT_ADDRESSES.DID_REGISTRY) {
      setContractInstance(CONTRACT_ADDRESSES.DID_REGISTRY);
    }
  }, [web3, setContractInstance]);

  return {
    contract,
    contractAddress,
    error,
    setContract: setContractInstance,
    checkIsTrustedIssuer,
    checkIsAdmin,
    getAdminDID,
    addTrustedIssuer,
    removeTrustedIssuer,
    getAllDIDs,
    getDIDDocument
  };
};