import crypto from 'crypto';
import { EventEmitter } from 'events';

/**
 * Threat Broadcast Network
 * Hive mind system where nodes share threat intelligence in real-time
 */
export class ThreatBroadcastNetwork extends EventEmitter {
  constructor() {
    super();
    
    // Threat intelligence database
    this.threatIntel = new Map();
    
    // Subscribed nodes
    this.subscribedNodes = new Map();
    
    // Broadcast channels
    this.channels = {
      aptIndicators: new Set(),
      badIPs: new Set(),
      suspiciousSignatures: new Set(),
      reputationScores: new Map(),
      emergencyAlerts: []
    };
    
    // Reputation consensus
    this.reputationVotes = new Map();
  }

  /**
   * Subscribe node to threat intelligence feed
   */
  subscribeNode(nodeId, nodeInfo) {
    const subscription = {
      nodeId,
      publicKey: nodeInfo.publicKey,
      subscribedAt: Date.now(),
      lastUpdate: Date.now(),
      contributions: 0,
      reputation: 0.5 // Start neutral
    };
    
    this.subscribedNodes.set(nodeId, subscription);
    
    // Send current threat intel to new node
    this.sendThreatIntelToNode(nodeId);
    
    console.log(`📡 Node subscribed to Threat Broadcast: ${nodeId}`);
    
    return subscription;
  }

  /**
   * Broadcast threat to all nodes
   */
  broadcastThreat(threat) {
    const broadcastId = crypto.randomBytes(8).toString('hex');
    
    const broadcast = {
      id: broadcastId,
      type: threat.type,
      data: threat.data,
      source: threat.source,
      timestamp: Date.now(),
      signature: this.signBroadcast(threat)
    };
    
    // Store in threat intel
    this.threatIntel.set(broadcastId, broadcast);
    
    // Add to appropriate channel
    this.addToChannel(broadcast);
    
    // Emit to all subscribed nodes
    this.emit('threat-broadcast', broadcast);
    
    // Notify each subscribed node
    this.subscribedNodes.forEach((subscription, nodeId) => {
      this.sendThreatToNode(nodeId, broadcast);
    });
    
    console.log(`📢 THREAT BROADCAST: ${broadcast.type}`);
    console.log(`   ID: ${broadcastId}`);
    console.log(`   Source: ${threat.source}`);
    console.log(`   Nodes Notified: ${this.subscribedNodes.size}`);
    
    return broadcastId;
  }

  /**
   * Share APT indicator
   */
  shareAPTIndicator(indicator) {
    return this.broadcastThreat({
      type: 'APT_INDICATOR',
      data: indicator,
      source: indicator.sourceNode || 'system'
    });
  }

  /**
   * Share bad IP
   */
  shareBadIP(ipAddress, reason, evidence) {
    return this.broadcastThreat({
      type: 'BAD_IP',
      data: {
        ip: ipAddress,
        reason,
        evidence,
        action: 'AUTO_BAN'
      },
      source: evidence.sourceNode || 'system'
    });
  }

  /**
   * Share suspicious signature
   */
  shareSuspiciousSignature(signature) {
    return this.broadcastThreat({
      type: 'SUSPICIOUS_SIGNATURE',
      data: signature,
      source: signature.sourceNode || 'system'
    });
  }

  /**
   * Share reputation score
   */
  shareReputationScore(targetId, score, evidence) {
    // Multi-node reputation consensus
    if (!this.reputationVotes.has(targetId)) {
      this.reputationVotes.set(targetId, []);
    }
    
    const votes = this.reputationVotes.get(targetId);
    votes.push({
      score,
      evidence,
      voter: evidence.sourceNode,
      timestamp: Date.now()
    });
    
    // Calculate consensus score
    const consensusScore = this.calculateConsensusScore(votes);
    
    return this.broadcastThreat({
      type: 'REPUTATION_SCORE',
      data: {
        target: targetId,
        score: consensusScore,
        votes: votes.length,
        confidence: this.calculateConfidence(votes)
      },
      source: 'consensus'
    });
  }

  /**
   * Emit emergency alert
   */
  emitEmergencyAlert(alert) {
    const emergencyBroadcast = {
      type: 'EMERGENCY_ALERT',
      severity: 'CRITICAL',
      data: alert,
      timestamp: Date.now(),
      requiresImmediateAction: true
    };
    
    this.channels.emergencyAlerts.push(emergencyBroadcast);
    
    // Broadcast with high priority
    this.emit('emergency-alert', emergencyBroadcast);
    
    this.subscribedNodes.forEach((subscription, nodeId) => {
      this.sendEmergencyAlert(nodeId, emergencyBroadcast);
    });
    
    console.log(`🚨 EMERGENCY ALERT BROADCAST`);
    console.log(`   Type: ${alert.type}`);
    console.log(`   All nodes alerted immediately`);
    
    return emergencyBroadcast;
  }

  /**
   * Add broadcast to appropriate channel
   */
  addToChannel(broadcast) {
    switch (broadcast.type) {
      case 'APT_INDICATOR':
        this.channels.aptIndicators.add(broadcast.id);
        break;
      
      case 'BAD_IP':
        this.channels.badIPs.add(broadcast.data.ip);
        break;
      
      case 'SUSPICIOUS_SIGNATURE':
        this.channels.suspiciousSignatures.add(broadcast.data.signature);
        break;
      
      case 'REPUTATION_SCORE':
        this.channels.reputationScores.set(broadcast.data.target, broadcast.data.score);
        break;
    }
  }

  /**
   * Sign broadcast for authenticity
   */
  signBroadcast(threat) {
    return crypto.createHash('sha512')
      .update(JSON.stringify(threat))
      .digest('hex');
  }

  /**
   * Send threat intel to specific node
   */
  sendThreatToNode(nodeId, threat) {
    const subscription = this.subscribedNodes.get(nodeId);
    if (!subscription) return;
    
    subscription.lastUpdate = Date.now();
    
    // In production, send via WebSocket or P2P
    // For now, emit event
    this.emit(`threat-to-${nodeId}`, threat);
  }

  /**
   * Send all threat intel to node
   */
  sendThreatIntelToNode(nodeId) {
    const intel = {
      aptIndicators: Array.from(this.channels.aptIndicators),
      badIPs: Array.from(this.channels.badIPs),
      suspiciousSignatures: Array.from(this.channels.suspiciousSignatures),
      reputationScores: Object.fromEntries(this.channels.reputationScores),
      totalThreats: this.threatIntel.size,
      timestamp: Date.now()
    };
    
    this.emit(`intel-sync-${nodeId}`, intel);
  }

  /**
   * Send emergency alert to node
   */
  sendEmergencyAlert(nodeId, alert) {
    // High priority delivery
    this.emit(`emergency-${nodeId}`, alert);
  }

  /**
   * Calculate consensus score from multiple votes
   */
  calculateConsensusScore(votes) {
    if (votes.length === 0) return 0.5;
    
    // Weighted average based on voter reputation
    let totalWeight = 0;
    let weightedSum = 0;
    
    votes.forEach(vote => {
      const voterReputation = this.getNodeReputation(vote.voter) || 0.5;
      totalWeight += voterReputation;
      weightedSum += vote.score * voterReputation;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  /**
   * Calculate confidence in consensus
   */
  calculateConfidence(votes) {
    if (votes.length < 3) return 0.5;
    
    const scores = votes.map(v => v.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation = higher confidence
    return Math.max(0, 1 - stdDev);
  }

  /**
   * Get node reputation
   */
  getNodeReputation(nodeId) {
    const subscription = this.subscribedNodes.get(nodeId);
    return subscription ? subscription.reputation : 0.5;
  }

  /**
   * Update node reputation based on contribution
   */
  updateNodeReputation(nodeId, contributionQuality) {
    const subscription = this.subscribedNodes.get(nodeId);
    if (!subscription) return;
    
    subscription.contributions++;
    
    // Update reputation based on contribution quality
    const delta = (contributionQuality - 0.5) * 0.1; // Small adjustments
    subscription.reputation = Math.max(0, Math.min(1, subscription.reputation + delta));
  }

  /**
   * Query threat intelligence
   */
  queryThreatIntel(query) {
    const results = [];
    
    this.threatIntel.forEach((threat, id) => {
      if (this.matchesQuery(threat, query)) {
        results.push(threat);
      }
    });
    
    return results;
  }

  /**
   * Check if threat matches query
   */
  matchesQuery(threat, query) {
    if (query.type && threat.type !== query.type) return false;
    if (query.source && threat.source !== query.source) return false;
    if (query.since && threat.timestamp < query.since) return false;
    
    return true;
  }

  /**
   * Check if IP is in bad IP list
   */
  isBadIP(ipAddress) {
    return this.channels.badIPs.has(ipAddress);
  }

  /**
   * Get reputation score for target
   */
  getReputationScore(targetId) {
    return this.channels.reputationScores.get(targetId) || 0.5;
  }

  /**
   * Get network statistics
   */
  getStatistics() {
    return {
      subscribedNodes: this.subscribedNodes.size,
      totalThreats: this.threatIntel.size,
      channels: {
        aptIndicators: this.channels.aptIndicators.size,
        badIPs: this.channels.badIPs.size,
        suspiciousSignatures: this.channels.suspiciousSignatures.size,
        reputationScores: this.channels.reputationScores.size,
        emergencyAlerts: this.channels.emergencyAlerts.length
      },
      recentThreats: Array.from(this.threatIntel.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10)
    };
  }

  /**
   * Export threat intelligence
   */
  exportThreatIntel() {
    return {
      threats: Array.from(this.threatIntel.values()),
      channels: {
        aptIndicators: Array.from(this.channels.aptIndicators),
        badIPs: Array.from(this.channels.badIPs),
        suspiciousSignatures: Array.from(this.channels.suspiciousSignatures),
        reputationScores: Object.fromEntries(this.channels.reputationScores)
      },
      exportTime: Date.now()
    };
  }

  /**
   * Import threat intelligence from another network
   */
  importThreatIntel(intel) {
    let imported = 0;
    
    if (intel.threats) {
      intel.threats.forEach(threat => {
        if (!this.threatIntel.has(threat.id)) {
          this.threatIntel.set(threat.id, threat);
          this.addToChannel(threat);
          imported++;
        }
      });
    }
    
    console.log(`📥 Imported ${imported} threat intelligence records`);
    
    return { imported, total: intel.threats?.length || 0 };
  }
}



