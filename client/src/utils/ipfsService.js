// IPFS Service for storing VCs

class IPFSService {
  constructor() {
    // Change for your own node when in production the keys that are stored on .env
    this.gateway = 'https://ipfs.io/ipfs/';
    this.uploadEndpoint = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
    this.apiKey = process.env.REACT_APP_PINATA_API_KEY;
    this.apiSecret = process.env.REACT_APP_PINATA_SECRET_KEY;
  }

  async storeVC(encryptedVC, metadata = {}) {
    try {
      const data = {
        pinataContent: {
          encryptedVC,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            version: '1.0'
          }
        },
        pinataMetadata: {
          name: `VC-${metadata.recipient || 'unknown'}-${Date.now()}`,
          keyvalues: {
            type: 'verifiable-credential',
            recipient: metadata.recipient,
            issuer: metadata.issuer
          }
        }
      };

      if (!this.apiKey || !this.apiSecret) {
        throw new Error('IPFS storage not configured. Please set REACT_APP_PINATA_API_KEY and REACT_APP_PINATA_SECRET_KEY environment variables to enable real IPFS storage.');
      }

      const response = await fetch(this.uploadEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': this.apiKey,
          'pinata_secret_api_key': this.apiSecret
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Pinata API error:', response.status, errorText);
        throw new Error(`Pinata API error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return {
        success: true,
        ipfsHash: result.IpfsHash,
        url: `${this.gateway}${result.IpfsHash}`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('IPFS storage error:', error);
      return {
        success: false,
        error: error.message || 'Failed to store VC on IPFS'
      };
    }
  }

  async retrieveVC(ipfsHash) {
    try {
      if (!this.isValidIPFSHash(ipfsHash)) {
        throw new Error(`Invalid IPFS hash format: ${ipfsHash}`);
      }

      const response = await fetch(`${this.gateway}${ipfsHash}`);
      
      if (!response.ok) {
        throw new Error(`Failed to retrieve from IPFS: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: data
      };

    } catch (error) {
      console.error('IPFS retrieval error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  isValidIPFSHash(hash) {
    if (!hash || typeof hash !== 'string') {
      return false;
    }

    const cleanHash = hash.replace(/^(ipfs:\/\/|https?:\/\/[^/]+\/ipfs\/)/, '');

    if (cleanHash.startsWith('Qm') && cleanHash.length === 46) {
      return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cleanHash);
    }

    if (cleanHash.startsWith('b') && cleanHash.length > 50) {
      return /^b[a-z2-7]{50,}$/.test(cleanHash);
    }

    return false;
  }



  async storeVCReference(web3, contract, account, didId, ipfsHash, vcType) {
    try {

      const references = this.getVCReferences();
      
      if (!references[didId]) {
        references[didId] = [];
      }
      
      references[didId].push({
        ipfsHash,
        vcType,
        timestamp: new Date().toISOString(),
        issuer: account
      });
      
      localStorage.setItem('vc_references', JSON.stringify(references));
      
      return { success: true };
    } catch (error) {
      console.error('Error storing VC reference:', error);
      return { success: false, error: error.message };
    }
  }

  getVCReferences(didId = null) {
    try {
      const stored = localStorage.getItem('vc_references');
      const references = stored ? JSON.parse(stored) : {};
      
      return didId ? (references[didId] || []) : references;
    } catch (error) {
      console.error('Error getting VC references:', error);
      return didId ? [] : {};
    }
  }

  async getVCsForDID(didId) {
    try {
      const references = this.getVCReferences(didId);
      const vcs = [];

      for (const ref of references) {
        const vcData = await this.retrieveVC(ref.ipfsHash);
        if (vcData.success) {
          vcs.push({
            ...vcData.data,
            ipfsHash: ref.ipfsHash,
            reference: ref
          });
        }
      }

      return vcs;
    } catch (error) {
      console.error('Error getting VCs for DID:', error);
      return [];
    }
  }

  async getVC(ipfsHash) {
    try {
      const result = await this.retrieveVC(ipfsHash);
      if (result.success) {
        return result.data.encryptedVC || result.data;
      }
      throw new Error(result.error);
    } catch (error) {
      console.error('Error getting VC:', error);
      throw error;
    }
  }
}

export const ipfsService = new IPFSService();