import React, { useState } from "react";
import { useWeb3 } from "../../hooks/useWeb3";
import { useContract } from "../../hooks/useContract";
import { validateDIDId, validatePublicKey } from "../../utils/validation";
import WalletConnection from "../WalletConnection/WalletConnection";
import ContractSetup from "../ContractSetup/ContractSetup";
import ResultDisplay from "../ResultDisplay/ResultDisplay";

const CreateDID = () => {
  const {
    web3,
    account,
    isConnected,
    error: web3Error,
    connectWallet,
  } = useWeb3();
  const {
    contract,
    contractAddress,
    error: contractError,
    setContract,
  } = useContract(web3);

  const [didId, setDidId] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const checkExistingDID = async () => {
    if (!contract || !account) return;
    
    try {
      const existingDIDs = await contract.methods.getDIDsByController(account).call();
      if (existingDIDs && existingDIDs.length > 0) {
        const activeDIDs = [];
        for (const didId of existingDIDs) {
          const isActive = await contract.methods.isDIDActive(didId).call();
          if (isActive) {
            activeDIDs.push(didId);
          }
        }
        
        if (activeDIDs.length > 0) {
          setResult({
            type: "info",
            message: `This address already owns ${activeDIDs.length} active DID(s): ${activeDIDs.join(', ')}. You can create additional DIDs.`
          });
        }
      }
    } catch (error) {
      console.error("Error checking existing DIDs:", error);
    }
  };

  React.useEffect(() => {
    if (contract && account) {
      checkExistingDID();
    }
  }, [contract, account]);

  const handleCreateDID = async (e) => {
    e.preventDefault();

    const didError = validateDIDId(didId);
    const keyError = validatePublicKey(publicKey);

    if (didError || keyError) {
      setResult({
        type: "error",
        message: didError || keyError,
      });
      return;
    }

    if (!contract || !account) {
      setResult({
        type: "error",
        message: "Please connect wallet and set contract first",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const tx = await contract.methods
        .createDID(didId, publicKey)
        .send({ from: account });

      setResult({
        type: "success",
        message: `DID created successfully!\nTransaction hash: ${tx.transactionHash}\nusername (DID ID): ${didId}`,
      });

      setDidId("");
      setPublicKey("");
      } catch (err) {
      console.error("Full RPC error creating DID:", err);

      let reason = "Unknown error";
      
      if (err?.data?.message) {
        reason = err.data.message;
      } else if (err?.message) {
        reason = err.message;
      } else if (err?.reason) {
        reason = err.reason;
      } else if (err?.error?.message) {
        reason = err.error.message;
      }

      reason = reason
        .replace(/^.*VM Exception while processing transaction: revert\s*/, "")
        .replace(/^execution reverted:\s*/, "")
        .replace(/^.*revert\s*/, "");
      setResult({
        type: "error",
        message: `Error creating DID: ${reason}. Please check that you have enough gas and that the DID ID is unique.`,
      });
    }

    finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">Create DID</h1>

      <WalletConnection
        isConnected={isConnected}
        account={account}
        error={web3Error}
        onConnect={connectWallet}
      />

      <ContractSetup
        contractAddress={contractAddress}
        error={contractError}
        onSetContract={setContract}
        disabled={!isConnected}
      />

      <div className="card">
        <h3>Create New DID</h3>
        
        <button 
          type="button" 
          onClick={checkExistingDID}
          disabled={!contract || !account}
          style={{ marginBottom: '10px' }}
        >
          Check for Existing DIDs
        </button>
        
        <form onSubmit={handleCreateDID}>
          <div className="form-group">
            <label htmlFor="didId">Username (DID ID):</label>
            <input
              type="text"
              id="didId"
              value={didId}
              onChange={(e) => setDidId(e.target.value)}
              placeholder="Enter unique DID identifier (e.g., did:example:123)"
              disabled={!contract || isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="publicKey">Public Key:</label>
            <input
              type="text"
              id="publicKey"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder="Enter public key"
              disabled={!contract || isLoading}
            />
          </div>

          <button type="submit" disabled={!contract || isLoading}>
            {isLoading ? "Creating DID..." : "Create DID"}
          </button>
        </form>

        {result && (
          <ResultDisplay type={result.type} message={result.message} />
        )}
      </div>
    </div>
  );
};

export default CreateDID;

