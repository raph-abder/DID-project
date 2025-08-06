import { useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';

export const useWeb3 = () => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const disconnectWallet = useCallback(() => {
    console.log('Disconnecting wallet');
    setWeb3(null);
    setAccount(null);
    setIsConnected(false);
    setError(null);
  }, []);

  const handleAccountsChanged = useCallback((accounts) => {
    console.log('Accounts changed:', accounts);
    if (accounts.length > 0) {
      setAccount(accounts[0]);
    } else {
      disconnectWallet();
    }
  }, [disconnectWallet]);

  const handleChainChanged = useCallback(() => {
    window.location.reload();
  }, []);

  const connectWallet = useCallback(async () => {
    console.log('connectWallet called');
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        console.log('MetaMask returned accounts:', accounts);
        
        const web3Instance = new Web3(window.ethereum);
        const finalAccounts = await web3Instance.eth.getAccounts();
        
        console.log('Final accounts from web3:', finalAccounts);
        console.log('Setting connected state, account:', finalAccounts[0]);
        
        setWeb3(web3Instance);
        setAccount(finalAccounts[0]);
        setIsConnected(true);
        setError(null);
        
        console.log('State should be updated now');
        
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", handleChainChanged);
        
        console.log('Event listeners added');
      } catch (error) {
        console.log('Connection error:', error);
        setError("Error connecting to MetaMask: " + error.message);
      }
    } else {
      setError("MetaMask is not installed. Please install MetaMask to use this dApp.");
    }
  }, [handleAccountsChanged, handleChainChanged]);


  useEffect(() => {
    const checkConnection = async () => {
      setIsLoading(true);
      if (typeof window.ethereum !== "undefined") {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (error) {
          console.error("Error checking existing connection:", error);
        }
      }
      setIsLoading(false);
    };

    checkConnection();
  }, [connectWallet]);

  return {
    web3,
    account,
    isConnected,
    isLoading,
    error,
    connectWallet,
    disconnectWallet
  };
};