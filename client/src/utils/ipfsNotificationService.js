import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';

class IPFSNotificationService {
  constructor() {
    this.helia = null;
    this.fs = null;
    this.isInitialized = false;
    this.initPromise = null;
  }

  async initialize() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  async _doInitialize() {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`[IPFS] Initializing Helia node... (attempt ${retryCount + 1}/${maxRetries})`);
        
        const heliaConfig = {
          libp2p: {
            addresses: {
              listen: []
            },
            transports: [],
            connectionEncryption: [],
            streamMuxers: [],
            peerDiscovery: [],
            connectionManager: {
              maxConnections: 100,
              minConnections: 5,
              pollInterval: 2000,
              autoDialInterval: 10000,
              maxDialsPerPeer: 2
            },
            services: {
              webRTC: {
                rtcConfiguration: {
                  iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' }
                  ],
                  iceCandidatePoolSize: 10
                }
              }
            }
          },
          config: {
            Bootstrap: [
              '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
              '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
              '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
              '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
            ],
            Swarm: {
              ConnMgr: {
                LowWater: 50,
                HighWater: 200
              },
              DisableNatPortMap: false
            }
          }
        };

        this.helia = await createHelia(heliaConfig);
        this.fs = unixfs(this.helia);
        this.isInitialized = true;
        
        console.log('[IPFS] Helia node initialized successfully');
        console.log('[IPFS] Peer ID:', this.helia.libp2p.peerId.toString());
        
        this.helia.libp2p.addEventListener('peer:connect', (evt) => {
          console.log('[IPFS] Connected to peer:', evt.detail.toString());
        });
        
        this.helia.libp2p.addEventListener('peer:disconnect', (evt) => {
          console.log('[IPFS] Disconnected from peer:', evt.detail.toString());
        });
        
        return true;
      } catch (error) {
        retryCount++;
        console.warn(`[IPFS] Initialization attempt ${retryCount} failed:`, error.message);
        
        if (retryCount >= maxRetries) {
          console.error('[IPFS] Failed to initialize after', maxRetries, 'attempts:', error);
          this.isInitialized = false;
          throw new Error(`IPFS initialization failed: ${error.message}`);
        }
        
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`[IPFS] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  generateNotificationPath(didId, direction = 'incoming') {
    const hash = didId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return `notifications/${hash}/${direction}`;
  }

  async storeNotification(recipientDID, notification) {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        await this.ensureInitialized();
        
        const notificationData = {
          ...notification,
          id: notification.id || Date.now() + Math.random(),
          timestamp: Date.now(),
          stored: true
        };

        console.log('[IPFS] Storing notification for DID:', recipientDID);
        
        const jsonData = JSON.stringify(notificationData);
        const encoder = new TextEncoder();
        const bytes = encoder.encode(jsonData);

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Store operation timeout')), 10000)
        );
        
        const cid = await Promise.race([
          this.fs.addBytes(bytes),
          timeoutPromise
        ]);
        
        console.log('[IPFS] Notification stored with CID:', cid.toString());

        await this.storeCIDMapping(recipientDID, notificationData.id, cid.toString());
        
        return {
          success: true,
          cid: cid.toString(),
          notificationId: notificationData.id
        };

      } catch (error) {
        retryCount++;
        console.warn(`[IPFS] Store attempt ${retryCount} failed:`, error.message);
        
        if (retryCount >= maxRetries) {
          console.error('[IPFS] Failed to store notification after', maxRetries, 'attempts:', error);
          return this.storeNotificationFallback(recipientDID, notification);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }

  storeNotificationFallback(recipientDID, notification) {
    try {
      console.log('[IPFS] Using localStorage fallback for notification storage');
      const notificationData = {
        ...notification,
        id: notification.id || Date.now() + Math.random(),
        timestamp: Date.now(),
        stored: true,
        fallback: true
      };
      
      const storageKey = `ipfs_fallback_${recipientDID.replace(/[^a-zA-Z0-9]/g, '')}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.push(notificationData);
      
      if (existing.length > 50) {
        existing.splice(0, existing.length - 50);
      }
      
      localStorage.setItem(storageKey, JSON.stringify(existing));
      
      return {
        success: true,
        fallback: true,
        notificationId: notificationData.id
      };
    } catch (error) {
      console.error('[IPFS] Fallback storage also failed:', error);
      return { success: false, error: error.message };
    }
  }

  async storeCIDMapping(didId, notificationId, cid) {
    try {
      const storageKey = `ipfs_notifications_${didId.replace(/[^a-zA-Z0-9]/g, '')}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      existing.push({
        notificationId,
        cid,
        timestamp: Date.now()
      });

      if (existing.length > 100) {
        existing.splice(0, existing.length - 100);
      }

      localStorage.setItem(storageKey, JSON.stringify(existing));
    } catch (error) {
      console.error('[IPFS] Error storing CID mapping:', error);
    }
  }

  async retrieveNotifications(didId) {
    try {
      let notifications = [];
      try {
        await this.ensureInitialized();
        console.log('[IPFS] Retrieving notifications for DID:', didId);
        const storageKey = `ipfs_notifications_${didId.replace(/[^a-zA-Z0-9]/g, '')}`;
        const cidMappings = JSON.parse(localStorage.getItem(storageKey) || '[]');
        for (const mapping of cidMappings) {
          try {
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Retrieve timeout')), 5000)
            );
            
            const bytesPromise = this.fs.cat(mapping.cid);
            const bytes = await Promise.race([bytesPromise, timeoutPromise]);
            
            const decoder = new TextDecoder();
            let jsonData = '';
            
            for await (const chunk of bytes) {
              jsonData += decoder.decode(chunk, { stream: true });
            }
            
            const notification = JSON.parse(jsonData);
            notifications.push(notification);
            
          } catch (error) {
            console.warn('[IPFS] Failed to retrieve notification:', mapping.cid, error.message);
          }
        }
      } catch (error) {
        console.warn('[IPFS] IPFS retrieval failed, using fallback:', error.message);
      }
      try {
        const fallbackKey = `ipfs_fallback_${didId.replace(/[^a-zA-Z0-9]/g, '')}`;
        const fallbackNotifications = JSON.parse(localStorage.getItem(fallbackKey) || '[]');
        notifications = notifications.concat(fallbackNotifications);
      } catch (error) {
        console.warn('[IPFS] Failed to retrieve fallback notifications:', error);
      }

      console.log('[IPFS] Retrieved', notifications.length, 'total notifications for', didId);
      return notifications.sort((a, b) => b.timestamp - a.timestamp);

    } catch (error) {
      console.error('[IPFS] Error retrieving notifications:', error);
      return [];
    }
  }

  async getConnectionStatus() {
    try {
      if (!this.isInitialized) {
        return { connected: false, peers: 0 };
      }

      const connections = this.helia.libp2p.getConnections();
      return {
        connected: this.isInitialized,
        peers: connections.length,
        peerId: this.helia.libp2p.peerId.toString()
      };
    } catch (error) {
      return { connected: false, peers: 0, error: error.message };
    }
  }

  async cleanup() {
    try {
      if (this.helia) {
        await this.helia.stop();
        console.log('[IPFS] Helia node stopped');
      }
    } catch (error) {
      console.error('[IPFS] Error during cleanup:', error);
    }
  }
}

export const ipfsNotificationService = new IPFSNotificationService();

ipfsNotificationService.initialize().catch(error => {
  console.warn('[IPFS] Auto-initialization failed, will retry on first use:', error.message);
});