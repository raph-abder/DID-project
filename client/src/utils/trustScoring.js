export class TrustScoring {
  constructor(contract) {
    this.contract = contract;
    this.dampingFactor = 0.85;
    this.trustedIssuerBoost = 2.0;
    this.trustedIssuerProbabilityShare = 0.8;
    this.convergenceThreshold = 0.001;
    this.maxIterations = 100;
  }

  async buildCredentialGraph() {
    try {
      const allDIDs = await this.contract.methods.getAllDIDs().call();
      const graph = new Map();
      
      for (const did of allDIDs) {
        graph.set(did, {
          outLinks: [],
          inLinks: [],
          isTrusted: false,
          pageRank: 1.0,
          newPageRank: 0.0
        });
      }

      for (const issuerDID of allDIDs) {
        try {
          const acceptedBy = await this.contract.methods.getAcceptedByList(issuerDID).call();
          const didDoc = await this.contract.methods.getDIDDocument(issuerDID).call();
          
          graph.get(issuerDID).isTrusted = didDoc.isTrustedIssuer;
          
          for (const recipientDID of acceptedBy) {
            if (graph.has(recipientDID)) {

              graph.get(recipientDID).outLinks.push(issuerDID);
              graph.get(issuerDID).inLinks.push(recipientDID);
              
              graph.get(issuerDID).outLinks.push(recipientDID);
              graph.get(recipientDID).inLinks.push(issuerDID);
            }
          }
        } catch (error) {
          console.warn(`Could not process DID ${issuerDID}:`, error);
        }
      }
      return graph;
    } catch (error) {
      throw error;
    }
  }

  calculatePageRankWithTrust(graph) {
    const nodes = Array.from(graph.keys());
    const nodeCount = nodes.length;
    
    if (nodeCount === 0) return graph;

    for (const nodeId of nodes) {
      const node = graph.get(nodeId);
      node.pageRank = node.isTrusted ? this.trustedIssuerBoost : 1.0;
    }

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      let totalChange = 0;

      for (const nodeId of nodes) {
        const node = graph.get(nodeId);
        let incomingScore = 0;

        for (const incomingNodeId of node.inLinks) {
          const incomingNode = graph.get(incomingNodeId);
          const outLinkCount = incomingNode.outLinks.length;
          if (outLinkCount > 0) {
            incomingScore += incomingNode.pageRank / outLinkCount;
          }
        }

        const baseScore = node.isTrusted ? this.trustedIssuerBoost : 1.0;
        node.newPageRank = (1 - this.dampingFactor) * baseScore + 
                           this.dampingFactor * incomingScore;
        
        totalChange += Math.abs(node.newPageRank - node.pageRank);
      }

      for (const nodeId of nodes) {
        graph.get(nodeId).pageRank = graph.get(nodeId).newPageRank;
      }

      if (totalChange < this.convergenceThreshold) {
        break;
      }
    }

    const scores = Array.from(graph.entries()).map(([id, node]) => ({
      id: id.substring(0, 8) + '...',
      rawPageRank: node.pageRank.toFixed(6),
      score: Math.round(node.pageRank * 1000),
      inLinks: node.inLinks.length,
      outLinks: node.outLinks.length,
      isTrusted: node.isTrusted
    }));
    
    scores.sort((a, b) => parseFloat(b.rawPageRank) - parseFloat(a.rawPageRank));
    return graph;
  }

  async calculateTrustScores() {
    try {
      const graph = await this.buildCredentialGraph();
      const rankedGraph = this.calculatePageRankWithTrust(graph);
      
      const trustScores = new Map();
      for (const [nodeId, node] of rankedGraph) {
        const normalizedScore = Math.round(node.pageRank * 1000);
        trustScores.set(nodeId, {
          trustScore: normalizedScore,
          pageRank: node.pageRank,
          isTrusted: node.isTrusted,
          acceptedBy: node.inLinks.length,
          hasAccepted: node.outLinks.length
        });
      }

      return trustScores;
    } catch (error) {
      console.error('Error calculating trust scores:', error);
      throw error;
    }
  }

  async updateOnChainTrustScores(account) {
    try {
      const trustScores = await this.calculateTrustScores();
      const updates = [];
      
      for (const [didId, scoreData] of trustScores) {
        try {
          const currentMetrics = await this.contract.methods.getTrustMetrics(didId).call();
          if (currentMetrics.trustScore !== scoreData.trustScore) {
            updates.push({
              didId,
              oldScore: currentMetrics.trustScore,
              newScore: scoreData.trustScore
            });
          }
        } catch (error) {
          console.warn(`Could not get current metrics for ${didId}:`, error);
          updates.push({
            didId,
            oldScore: 0,
            newScore: scoreData.trustScore
          });
        }
      }

      return { trustScores, updates };
    } catch (error) {
      console.error('Error updating trust scores:', error);
      throw error;
    }
  }

  async getTrustRanking() {
    try {
      const trustScores = await this.calculateTrustScores();
      return Array.from(trustScores.entries())
        .sort(([,a], [,b]) => b.trustScore - a.trustScore)
        .map(([didId, data], index) => ({
          rank: index + 1,
          didId,
          ...data
        }));
    } catch (error) {
      console.error('Error getting trust ranking:', error);
      throw error;
    }
  }

  getGraphStats(graph) {
    const nodes = Array.from(graph.values());
    const totalNodes = nodes.length;
    const totalEdges = nodes.reduce((sum, node) => sum + node.outLinks.length, 0);
    const trustedNodes = nodes.filter(node => node.isTrusted).length;
    const isolatedNodes = nodes.filter(node => 
      node.inLinks.length === 0 && node.outLinks.length === 0
    ).length;

    return {
      totalNodes,
      totalEdges,
      trustedNodes,
      isolatedNodes,
      averageOutDegree: totalNodes > 0 ? totalEdges / totalNodes : 0,
      networkDensity: totalNodes > 1 ? totalEdges / (totalNodes * (totalNodes - 1)) : 0
    };
  }
}

export const createTrustScoring = (contract) => {
  return new TrustScoring(contract);
};