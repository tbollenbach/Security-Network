import crypto from 'crypto';

/**
 * Distributed Trust Mesh
 * Multi-node validation with quorum-based consensus
 * Removes single point of failure
 */
export class DistributedTrustMesh {
  constructor(blockchainIntegrity, notificationService) {
    this.blockchain = blockchainIntegrity;
    this.notificationService = notificationService;
    
    // Trust ledger (append-only)
    this.trustLedger = [];
    
    // Sharded trust scores across nodes
    this.shardedTrustScores = new Map();
    
    // Peer nodes in the mesh
    this.meshNodes = new Map();
    
    // Quorum settings
    this.quorumSize = 3; // Minimum nodes needed for consensus
    this.consensusThreshold = 0.67; // 67% agreement required
    
    // Pending consensus requests
    this.pendingConsensus = new Map();
  }

  /**
   * Register node in trust mesh
   */
  registerNode(nodeId, nodeInfo) {
    const node = {
      id: nodeId,
      publicKey: nodeInfo.publicKey,
      trustScore: 0.5, // Start neutral
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      validationCount: 0,
      consensusParticipation: 0,
      reputationHistory: []
    };
    
    this.meshNodes.set(nodeId, node);
    
    // Add to trust ledger
    this.appendToTrustLedger({
      type: 'NODE_REGISTERED',
      nodeId,
      timestamp: Date.now(),
      signature: this.signLedgerEntry(nodeId, 'REGISTERED')
    });
    
    console.log(`🌐 Node ${nodeId} joined trust mesh`);
    return node;
  }

  /**
   * Request quorum-based consensus for critical action
   */
  async requestConsensus(action, data) {
    const consensusId = crypto.randomBytes(16).toString('hex');
    
    const request = {
      id: consensusId,
      action: action,
      data: data,
      initiator: data.initiator,
      timestamp: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
      votes: new Map(),
      status: 'pending'
    };
    
    this.pendingConsensus.set(consensusId, request);
    
    // Broadcast to all mesh nodes
    const nodes = this.getActiveNodes();
    
    if (nodes.length < this.quorumSize) {
      return {
        approved: false,
        reason: 'Insufficient nodes for quorum',
        required: this.quorumSize,
        available: nodes.length
      };
    }
    
    // Request votes from nodes
    const votes = await this.collectVotes(consensusId, nodes);
    
    // Analyze consensus
    const result = this.analyzeConsensus(votes);
    
    request.votes = votes;
    request.status = result.approved ? 'approved' : 'rejected';
    request.completedAt = Date.now();
    
    // Add to trust ledger
    this.appendToTrustLedger({
      type: 'CONSENSUS_DECISION',
      consensusId,
      action,
      approved: result.approved,
      votes: votes.size,
      timestamp: Date.now()
    });
    
    // Add to blockchain for immutability
    this.blockchain.addSecurityEvent('CONSENSUS', {
      consensusId,
      action,
      approved: result.approved,
      votes: Array.from(votes.entries())
    });
    
    console.log(`🗳️  Consensus ${consensusId}: ${result.approved ? '✅ APPROVED' : '❌ REJECTED'}`);
    console.log(`   Action: ${action}`);
    console.log(`   Votes: ${result.approveVotes}/${votes.size} (${(result.approveVotes/votes.size*100).toFixed(1)}%)`);
    
    return result;
  }

  /**
   * Collect votes from mesh nodes
   */
  async collectVotes(consensusId, nodes) {
    const votes = new Map();
    
    // In production, this would send actual network requests
    // For now, simulate voting based on node trust scores
    nodes.forEach(node => {
      const vote = {
        nodeId: node.id,
        approved: node.trustScore > 0.6, // Nodes with high trust approve
        trustWeight: node.trustScore,
        timestamp: Date.now(),
        signature: this.signVote(node.id, consensusId)
      };
      
      votes.set(node.id, vote);
      
      // Update node participation
      node.consensusParticipation++;
    });
    
    return votes;
  }

  /**
   * Analyze consensus votes
   */
  analyzeConsensus(votes) {
    let approveVotes = 0;
    let rejectVotes = 0;
    let totalTrustWeight = 0;
    let approveTrustWeight = 0;
    
    votes.forEach(vote => {
      if (vote.approved) {
        approveVotes++;
        approveTrustWeight += vote.trustWeight;
      } else {
        rejectVotes++;
      }
      totalTrustWeight += vote.trustWeight;
    });
    
    const approvalRate = approveVotes / votes.size;
    const trustWeightedRate = approveTrustWeight / totalTrustWeight;
    
    // Require both majority and trust-weighted consensus
    const approved = approvalRate >= this.consensusThreshold && 
                     trustWeightedRate >= this.consensusThreshold;
    
    return {
      approved,
      approveVotes,
      rejectVotes,
      approvalRate,
      trustWeightedRate,
      quorumMet: votes.size >= this.quorumSize
    };
  }

  /**
   * Update sharded trust score
   */
  updateShardedTrust(nodeId, score, evidence) {
    if (!this.shardedTrustScores.has(nodeId)) {
      this.shardedTrustScores.set(nodeId, []);
    }
    
    const shards = this.shardedTrustScores.get(nodeId);
    
    // Add shard with evidence
    shards.push({
      score,
      evidence,
      timestamp: Date.now(),
      hash: this.hashShard(nodeId, score, evidence)
    });
    
    // Keep last 100 shards
    if (shards.length > 100) {
      shards.shift();
    }
    
    // Calculate aggregated trust score
    const aggregatedScore = this.calculateAggregatedTrust(shards);
    
    // Update node trust
    const node = this.meshNodes.get(nodeId);
    if (node) {
      node.trustScore = aggregatedScore;
      node.reputationHistory.push({
        score: aggregatedScore,
        timestamp: Date.now()
      });
    }
    
    // Add to trust ledger
    this.appendToTrustLedger({
      type: 'TRUST_UPDATE',
      nodeId,
      score: aggregatedScore,
      evidence,
      timestamp: Date.now()
    });
    
    return aggregatedScore;
  }

  /**
   * Calculate aggregated trust from shards
   */
  calculateAggregatedTrust(shards) {
    if (shards.length === 0) return 0.5;
    
    // Recent shards have more weight
    const now = Date.now();
    let totalWeight = 0;
    let weightedSum = 0;
    
    shards.forEach(shard => {
      const age = now - shard.timestamp;
      const weight = Math.exp(-age / (7 * 24 * 60 * 60 * 1000)); // Exponential decay over 7 days
      
      totalWeight += weight;
      weightedSum += shard.score * weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  /**
   * Hash shard for integrity
   */
  hashShard(nodeId, score, evidence) {
    return crypto.createHash('sha256')
      .update(JSON.stringify({ nodeId, score, evidence, timestamp: Date.now() }))
      .digest('hex');
  }

  /**
   * Append to trust ledger (append-only)
   */
  appendToTrustLedger(entry) {
    entry.index = this.trustLedger.length;
    entry.previousHash = this.trustLedger.length > 0 
      ? this.trustLedger[this.trustLedger.length - 1].hash 
      : '0';
    entry.hash = this.hashLedgerEntry(entry);
    
    this.trustLedger.push(entry);
    
    // Also add to blockchain for extra immutability
    this.blockchain.addSecurityEvent('TRUST_LEDGER', entry);
  }

  /**
   * Hash ledger entry
   */
  hashLedgerEntry(entry) {
    return crypto.createHash('sha256')
      .update(JSON.stringify(entry))
      .digest('hex');
  }

  /**
   * Sign ledger entry
   */
  signLedgerEntry(nodeId, action) {
    return crypto.createHash('sha512')
      .update(`${nodeId}:${action}:${Date.now()}`)
      .digest('hex');
  }

  /**
   * Sign vote
   */
  signVote(nodeId, consensusId) {
    return crypto.createHash('sha512')
      .update(`${nodeId}:${consensusId}:${Date.now()}`)
      .digest('hex');
  }

  /**
   * Verify trust ledger integrity
   */
  verifyLedgerIntegrity() {
    for (let i = 1; i < this.trustLedger.length; i++) {
      const entry = this.trustLedger[i];
      const previousEntry = this.trustLedger[i - 1];
      
      // Verify hash chain
      if (entry.previousHash !== previousEntry.hash) {
        return {
          valid: false,
          error: 'Hash chain broken',
          index: i
        };
      }
      
      // Verify entry hash
      const calculatedHash = this.hashLedgerEntry(entry);
      if (entry.hash !== calculatedHash) {
        return {
          valid: false,
          error: 'Entry hash mismatch',
          index: i
        };
      }
    }
    
    return { valid: true, entries: this.trustLedger.length };
  }

  /**
   * Get active nodes
   */
  getActiveNodes() {
    const now = Date.now();
    const activeTimeout = 5 * 60 * 1000; // 5 minutes
    
    return Array.from(this.meshNodes.values())
      .filter(node => now - node.lastSeen < activeTimeout);
  }

  /**
   * Get node trust score
   */
  getNodeTrust(nodeId) {
    const node = this.meshNodes.get(nodeId);
    return node ? node.trustScore : 0;
  }

  /**
   * Challenge node (verify it's still legitimate)
   */
  async challengeNode(nodeId) {
    const challenge = crypto.randomBytes(32).toString('hex');
    const challengeId = crypto.randomBytes(8).toString('hex');
    
    // Node must sign challenge with private key
    // In production, send actual network request
    
    const node = this.meshNodes.get(nodeId);
    if (!node) return { verified: false, reason: 'Node not found' };
    
    // Simulate verification
    const verified = Math.random() > 0.1; // 90% success rate
    
    if (verified) {
      node.lastSeen = Date.now();
      node.validationCount++;
      this.updateShardedTrust(nodeId, 0.1, 'CHALLENGE_PASSED');
    } else {
      this.updateShardedTrust(nodeId, -0.2, 'CHALLENGE_FAILED');
      this.notificationService.emit('node-challenge-failed', {
        nodeId,
        challengeId
      });
    }
    
    return { verified, challengeId };
  }

  /**
   * Get mesh statistics
   */
  getStatistics() {
    const nodes = Array.from(this.meshNodes.values());
    
    return {
      totalNodes: nodes.length,
      activeNodes: this.getActiveNodes().length,
      averageTrust: nodes.reduce((sum, n) => sum + n.trustScore, 0) / nodes.length || 0,
      ledgerEntries: this.trustLedger.length,
      consensusRequests: this.pendingConsensus.size,
      ledgerIntegrity: this.verifyLedgerIntegrity()
    };
  }

  /**
   * Export trust ledger
   */
  exportLedger() {
    return {
      ledger: this.trustLedger,
      integrity: this.verifyLedgerIntegrity(),
      exportTime: Date.now()
    };
  }
}



