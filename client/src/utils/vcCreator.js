import { ipfsService } from './ipfsService';
import { VCEncryption } from './vcEncryption';

export const createVerifiableCredential = async ({
  web3,
  account,
  selectedIssuerDID,
  selectedRecipientDID,
  vcData,
  getDIDDocument
}) => {
  if (!selectedIssuerDID || !selectedRecipientDID || !vcData.subject) {
    throw new Error('Please fill in all required fields and select both issuer and recipient DIDs.');
  }

  if (selectedIssuerDID === selectedRecipientDID) {
    throw new Error('Issuer and recipient DIDs must be different.');
  }

  const recipientDoc = await getDIDDocument(selectedRecipientDID);
  if (!recipientDoc || !recipientDoc.publicKey) {
    throw new Error('Could not retrieve recipient DID public key for encryption');
  }
  
  const verifiableCredential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: `vc:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
    type: ['VerifiableCredential', vcData.type],
    issuer: selectedIssuerDID,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: selectedRecipientDID,
      subject: vcData.subject,
      achievement: vcData.achievement,
      description: vcData.description
    }
  };

  const vcString = JSON.stringify(verifiableCredential, null, 2);
  const signature = await web3.eth.personal.sign(vcString, account, '');
  
  verifiableCredential.proof = {
    type: 'EcdsaSecp256k1Signature2019',
    created: new Date().toISOString(),
    verificationMethod: selectedIssuerDID,
    proofPurpose: 'assertionMethod',
    signature: signature
  };

  let encryptedVC;
  try {
    const recipientPublicKey = await VCEncryption.importPublicKey(recipientDoc.publicKey);
    encryptedVC = await VCEncryption.encryptVC(verifiableCredential, recipientPublicKey);
  } catch (keyError) {
    throw new Error(`Cannot encrypt VC for recipient ${selectedRecipientDID}: ${keyError.message}. The recipient DID may have been created with an old system and needs to be recreated with RSA keys.`);
  }
  
  const ipfsResult = await ipfsService.storeVC(encryptedVC, {
    issuer: selectedIssuerDID,
    recipient: selectedRecipientDID,
    vcType: vcData.type,
    subject: vcData.subject
  });

  if (!ipfsResult.success) {
    throw new Error('Failed to store VC on IPFS: ' + (ipfsResult.error || 'Unknown error'));
  }

  await ipfsService.storeVCReference(
    web3,
    null,
    account,
    selectedRecipientDID,
    ipfsResult.ipfsHash,
    vcData.type
  );

  return {
    success: true,
    ipfsHash: ipfsResult.ipfsHash,
    ipfsUrl: ipfsResult.url,
    encryptedVC: encryptedVC,
    originalVC: verifiableCredential,
    recipient: selectedRecipientDID,
    issuer: selectedIssuerDID,
    timestamp: ipfsResult.timestamp
  };
};