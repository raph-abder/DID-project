// Used the Web Crypto API for the encryption and decryption of VCs.

export class VCEncryption {

  static async generateKeyPair() {
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
      );
      
      return keyPair;
    } catch (error) {
      console.error('Error generating key pair:', error);
      throw error;
    }
  }

  // Using PEM format for the key management
  static async exportPublicKey(publicKey) {
    try {
      const exported = await window.crypto.subtle.exportKey('spki', publicKey);
      const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
      const exportedAsBase64 = window.btoa(exportedAsString);
      
      return `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
    } catch (error) {
      console.error('Error exporting public key:', error);
      throw error;
    }
  }

  // Using PEM format for the key management
  static async exportPrivateKey(privateKey) {
    try {
      const exported = await window.crypto.subtle.exportKey('pkcs8', privateKey);
      const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
      const exportedAsBase64 = window.btoa(exportedAsString);
      
      return `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64}\n-----END PRIVATE KEY-----`;
    } catch (error) {
      console.error('Error exporting private key:', error);
      throw error;
    }
  }

  // Using PEM format for the key management
  static async importPublicKey(keyData) {
    try {
      const cleanedKey = this.cleanAndValidatePublicKey(keyData);
      
      if (!cleanedKey) {
        throw new Error('Invalid or incompatible public key format. Expected RSA public key in PEM format.');
      }
      
      const pemHeader = '-----BEGIN PUBLIC KEY-----';
      const pemFooter = '-----END PUBLIC KEY-----';
      const pemContents = cleanedKey.substring(pemHeader.length, cleanedKey.length - pemFooter.length);
      const binaryDerString = window.atob(pemContents);
      const binaryDer = new Uint8Array(binaryDerString.length);
      
      for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
      }
      
      const publicKey = await window.crypto.subtle.importKey(
        'spki',
        binaryDer.buffer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true,
        ['encrypt']
      );
      
      return publicKey;
    } catch (error) {
      console.error('Error importing public key:', error);
      throw new Error(`Failed to import public key: ${error.message}. This DID may have an incompatible key format.`);
    }
  }

  // verify the format of the PEM public key
  static cleanAndValidatePublicKey(keyData) {
    if (!keyData || typeof keyData !== 'string') {
      return null;
    }
    let cleanKey = keyData.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (cleanKey.includes('-----BEGIN PUBLIC KEY-----') && cleanKey.includes('-----END PUBLIC KEY-----')) {
      const pemHeader = '-----BEGIN PUBLIC KEY-----';
      const pemFooter = '-----END PUBLIC KEY-----';
      
      const startIndex = cleanKey.indexOf(pemHeader);
      const endIndex = cleanKey.indexOf(pemFooter);
      
      if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
        return null;
      }
      
      const base64Content = cleanKey.substring(startIndex + pemHeader.length, endIndex)
        .replace(/\s/g, '');
      
      try {
        window.atob(base64Content);
      } catch (e) {
        return null;
      }
      
      return `${pemHeader}\n${base64Content}\n${pemFooter}`;
    }
    return null;
  }

  static async importPrivateKey(pemKey) {
    try {
      const pemHeader = '-----BEGIN PRIVATE KEY-----';
      const pemFooter = '-----END PRIVATE KEY-----';
      const pemContents = pemKey.substring(pemHeader.length, pemKey.length - pemFooter.length);
      const binaryDerString = window.atob(pemContents);
      const binaryDer = new Uint8Array(binaryDerString.length);
      
      for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
      }
      
      const privateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        binaryDer.buffer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true,
        ['decrypt']
      );
      
      return privateKey;
    } catch (error) {
      console.error('Error importing private key:', error);
      throw error;
    }
  }


  static async encryptVC(vc, recipientPublicKey) {
    try {
      const vcString = JSON.stringify(vc);
      const encoder = new TextEncoder();
      const data = encoder.encode(vcString);
      
      const aesKey = await window.crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256,
        },
        true,
        ['encrypt', 'decrypt']
      );
      
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encryptedData = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        aesKey,
        data
      );

      const exportedKey = await window.crypto.subtle.exportKey('raw', aesKey);
      const encryptedKey = await window.crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP',
        },
        recipientPublicKey,
        exportedKey
      );
      
      return {
        encryptedData: Array.from(new Uint8Array(encryptedData)),
        encryptedKey: Array.from(new Uint8Array(encryptedKey)),
        iv: Array.from(iv),
        algorithm: 'AES-GCM-RSA-OAEP'
      };
      
    } catch (error) {
      console.error('Error encrypting VC:', error);
      return {
        encryptedData: btoa(JSON.stringify(vc)),
        algorithm: 'base64',
        fallback: true
      };
    }
  }

  static async decryptVC(encryptedPackage, privateKey) {
    try {
      if (encryptedPackage.algorithm === 'base64') {
        return JSON.parse(atob(encryptedPackage.encryptedData));
      }
      
      const encryptedKey = new Uint8Array(encryptedPackage.encryptedKey);
      const decryptedKeyBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'RSA-OAEP',
        },
        privateKey,
        encryptedKey
      );
      
      const aesKey = await window.crypto.subtle.importKey(
        'raw',
        decryptedKeyBuffer,
        'AES-GCM',
        false,
        ['decrypt']
      );
      
      const iv = new Uint8Array(encryptedPackage.iv);
      const encryptedData = new Uint8Array(encryptedPackage.encryptedData);
      
      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        aesKey,
        encryptedData
      );
      
      const decoder = new TextDecoder();
      const vcString = decoder.decode(decryptedData);
      return JSON.parse(vcString);
      
    } catch (error) {
      console.error('Error decrypting VC:', error);
      throw error;
    }
  }


  static getPrivateKeyForDID(didId) {
    try {
      const storedKeys = JSON.parse(localStorage.getItem('didPrivateKeys') || '{}');
      console.log('[VCEncryption] Looking for private key for DID:', didId);
      console.log('[VCEncryption] Available DID keys:', Object.keys(storedKeys));
      
      if (storedKeys[didId]?.privateKey) {
        console.log('[VCEncryption] Found exact match for DID:', didId);
        return storedKeys[didId].privateKey;
      }
      
      const lowerDid = didId.toLowerCase();
      for (const [storedDid, keyData] of Object.entries(storedKeys)) {
        if (storedDid.toLowerCase() === lowerDid) {
          console.log('[VCEncryption] Found case-insensitive match:', storedDid, 'for', didId);
          return keyData.privateKey;
        }
      }
      
      console.warn('[VCEncryption] No private key found for DID:', didId);
      return null;
    } catch (error) {
      console.error('Error retrieving private key for DID:', error);
      return null;
    }
  }

  static async decryptVCForDID(encryptedPackage, didId) {
    try {
      const privateKeyPem = this.getPrivateKeyForDID(didId);
      if (!privateKeyPem) {
        // Try to fallback to base64 decryption if it's an old format
        if (encryptedPackage.algorithm === 'base64' || encryptedPackage.fallback) {
          console.log('[VCEncryption] Attempting base64 fallback decryption for legacy VC');
          try {
            return JSON.parse(atob(encryptedPackage.encryptedData || encryptedPackage));
          } catch (base64Error) {
            console.warn('[VCEncryption] Base64 fallback failed:', base64Error);
          }
        }
        
        throw new Error(`No private key found for DID: ${didId}. Please ensure this DID was created with the current system. Available DIDs: ${Object.keys(JSON.parse(localStorage.getItem('didPrivateKeys') || '{}')).join(', ') || 'none'}`);
      }

      const privateKey = await this.importPrivateKey(privateKeyPem);
      return await this.decryptVC(encryptedPackage, privateKey);
    } catch (error) {
      console.error('Error decrypting VC for DID:', error);
      throw error;
    }
  }
}