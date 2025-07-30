export const validateDIDId = (didId) => {
  if (!didId || didId.trim() === '') {
    return 'DID ID is required';
  }
  return null;
};

export const validatePublicKey = (publicKey) => {
  if (!publicKey || publicKey.trim() === '') {
    return 'Public key is required';
  }
  return null;
};

export const validateEthereumAddress = (address) => {
  if (!address || address.trim() === '') {
    return 'Address is required';
  }
  
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!ethAddressRegex.test(address)) {
    return 'Please enter a valid Ethereum address';
  }
  
  return null;
};

export const validateMessage = (message) => {
  if (!message || message.trim() === '') {
    return 'Message is required';
  }
  return null;
};

export const validateSignature = (signature) => {
  if (!signature || signature.trim() === '') {
    return 'Signature is required';
  }
  return null;
};