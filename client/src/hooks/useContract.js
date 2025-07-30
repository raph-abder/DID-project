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

  useEffect(() => {
    if (web3 && CONTRACT_ADDRESSES.DID_REGISTRY) {
      setContractInstance(CONTRACT_ADDRESSES.DID_REGISTRY);
    }
  }, [web3, setContractInstance]);

  return {
    contract,
    contractAddress,
    error,
    setContract: setContractInstance
  };
};