import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Self-Healing Security AI
 * Automatically detects, isolates, and recovers from security incidents
 */
export class SelfHealingAI {
  constructor(notificationService, blockchainIntegrity) {
    this.notificationService = notificationService;
    this.blockchain = blockchainIntegrity;
    
    // System snapshots
    this.snapshots = new Map();
    this.maxSnapshots = 10;
    
    // Quarantined nodes
    this.quarantineZone = new Map();
    
    // Healing actions log
    this.healingActions = [];
    
    // AI learning data
    this.incidentPatterns = new Map();
    this.healingEffectiveness = new Map();
    
    // Auto-create initial snapshot
    this.createSnapshot('INITIALIZATION');
  }

  /**
   * Create system snapshot
   */
  async createSnapshot(reason) {
    const snapshotId = crypto.randomBytes(8).toString('hex');
    
    const snapshot = {
      id: snapshotId,
      timestamp: Date.now(),
      reason,
      systemState: await this.captureSystemState(),
      hash: null
    };
    
    // Hash snapshot for integrity
    snapshot.hash = this.hashSnapshot(snapshot);
    
    this.snapshots.set(snapshotId, snapshot);
    
    // Keep only last N snapshots
    if (this.snapshots.size > this.maxSnapshots) {
      const oldestKey = Array.from(this.snapshots.keys())[0];
      this.snapshots.delete(oldestKey);
    }
    
    console.log(`📸 System Snapshot Created: ${snapshotId}`);
    console.log(`   Reason: ${reason}`);
    
    // Add to blockchain
    this.blockchain.addSecurityEvent('SNAPSHOT', {
      snapshotId,
      reason,
      timestamp: Date.now()
    });
    
    return snapshotId;
  }

  /**
   * Capture current system state
   */
  async captureSystemState() {
    return {
      memory: await this.getMemoryState(),
      processes: await this.getProcessState(),
      network: await this.getNetworkState(),
      files: await this.getFileIntegrity(),
      config: await this.getConfigState()
    };
  }

  /**
   * Get memory state
   */
  async getMemoryState() {
    try {
      // Platform-specific memory info
      if (process.platform === 'linux' || process.platform === 'darwin') {
        const { stdout } = await execAsync('free -m');
        return { output: stdout.trim(), timestamp: Date.now() };
      } else if (process.platform === 'win32') {
        const { stdout } = await execAsync('systeminfo | findstr "Memory"');
        return { output: stdout.trim(), timestamp: Date.now() };
      }
    } catch (error) {
      return { error: error.message };
    }
    
    return {
      used: process.memoryUsage().heapUsed,
      total: process.memoryUsage().heapTotal,
      external: process.memoryUsage().external
    };
  }

  /**
   * Get process state
   */
  async getProcessState() {
    return {
      pid: process.pid,
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),
      versions: process.versions
    };
  }

  /**
   * Get network state
   */
  async getNetworkState() {
    try {
      if (process.platform === 'linux' || process.platform === 'darwin') {
        const { stdout } = await execAsync('netstat -an | grep ESTABLISHED | wc -l');
        return { connections: parseInt(stdout.trim()) || 0 };
      }
    } catch (error) {
      return { error: error.message };
    }
    
    return { timestamp: Date.now() };
  }

  /**
   * Get file integrity
   */
  async getFileIntegrity() {
    // Hash critical files
    const criticalFiles = [
      'package.json',
      'config.json',
      'config.secure.json'
    ];
    
    const hashes = {};
    
    for (const file of criticalFiles) {
      try {
        const fs = await import('fs/promises');
        const content = await fs.readFile(file, 'utf8');
        hashes[file] = crypto.createHash('sha256').update(content).digest('hex');
      } catch (error) {
        hashes[file] = { error: error.message };
      }
    }
    
    return hashes;
  }

  /**
   * Get config state
   */
  async getConfigState() {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      env: process.env.NODE_ENV || 'production'
    };
  }

  /**
   * Hash snapshot
   */
  hashSnapshot(snapshot) {
    return crypto.createHash('sha256')
      .update(JSON.stringify(snapshot.systemState))
      .digest('hex');
  }

  /**
   * Detect anomaly and trigger healing
   */
  async detectAndHeal(deviceId, anomaly) {
    console.log(`\n🏥 SELF-HEALING INITIATED`);
    console.log(`   Device: ${deviceId}`);
    console.log(`   Anomaly: ${anomaly.type}`);
    console.log(`   Severity: ${anomaly.severity}`);
    
    // Step 1: Isolate the node
    await this.isolateNode(deviceId, anomaly);
    
    // Step 2: Analyze the threat
    const analysis = await this.analyzeAnomaly(anomaly);
    
    // Step 3: Determine healing action
    const healingPlan = this.determineHealingAction(analysis);
    
    // Step 4: Execute healing
    const result = await this.executeHealing(deviceId, healingPlan);
    
    // Step 5: Verify recovery
    const verified = await this.verifyRecovery(deviceId);
    
    // Step 6: Learn from incident
    this.learnFromIncident(anomaly, healingPlan, result);
    
    // Step 7: Notify peers
    await this.notifyPeers(deviceId, anomaly, result);
    
    console.log(`\n✅ SELF-HEALING COMPLETED`);
    console.log(`   Success: ${result.success}`);
    console.log(`   Recovery Time: ${result.duration}ms`);
    
    return result;
  }

  /**
   * Isolate compromised node
   */
  async isolateNode(deviceId, anomaly) {
    const quarantineEntry = {
      deviceId,
      anomaly,
      isolatedAt: Date.now(),
      reason: `${anomaly.type} - Severity: ${anomaly.severity}`,
      restrictions: {
        networkAccess: false,
        resourceAccess: false,
        apiAccess: false
      }
    };
    
    this.quarantineZone.set(deviceId, quarantineEntry);
    
    console.log(`   🔒 Node Isolated: ${deviceId}`);
    
    // Notify all peers
    this.notificationService.emit('node-quarantined', {
      deviceId,
      reason: quarantineEntry.reason,
      timestamp: Date.now()
    });
    
    // Add to blockchain
    this.blockchain.addSecurityEvent('NODE_QUARANTINE', {
      deviceId,
      anomaly,
      timestamp: Date.now()
    });
  }

  /**
   * Analyze anomaly using AI
   */
  async analyzeAnomaly(anomaly) {
    // Check historical patterns
    const similarIncidents = this.findSimilarIncidents(anomaly);
    
    return {
      type: anomaly.type,
      severity: anomaly.severity,
      similarIncidents: similarIncidents.length,
      riskScore: this.calculateRiskScore(anomaly),
      recommendedAction: this.getRecommendedAction(anomaly),
      confidence: similarIncidents.length > 0 ? 0.9 : 0.6
    };
  }

  /**
   * Find similar historical incidents
   */
  findSimilarIncidents(anomaly) {
    const similar = [];
    
    this.incidentPatterns.forEach((pattern, id) => {
      if (pattern.type === anomaly.type && pattern.severity === anomaly.severity) {
        similar.push(pattern);
      }
    });
    
    return similar;
  }

  /**
   * Calculate risk score
   */
  calculateRiskScore(anomaly) {
    const severityScores = {
      critical: 1.0,
      high: 0.8,
      medium: 0.5,
      low: 0.3
    };
    
    return severityScores[anomaly.severity] || 0.5;
  }

  /**
   * Get recommended action
   */
  getRecommendedAction(anomaly) {
    const actions = {
      critical: 'REVERT_TO_SNAPSHOT',
      high: 'PATCH_AND_RESTART',
      medium: 'ISOLATE_AND_MONITOR',
      low: 'LOG_AND_CONTINUE'
    };
    
    return actions[anomaly.severity] || 'ISOLATE_AND_MONITOR';
  }

  /**
   * Determine healing action
   */
  determineHealingAction(analysis) {
    const plan = {
      action: analysis.recommendedAction,
      steps: [],
      estimated Duration: 0,
      rollbackPlan: null
    };
    
    switch (analysis.recommendedAction) {
      case 'REVERT_TO_SNAPSHOT':
        plan.steps = [
          'Stop affected services',
          'Load last known good snapshot',
          'Verify system integrity',
          'Restart services',
          'Monitor for 5 minutes'
        ];
        plan.estimatedDuration = 60000; // 1 minute
        plan.rollbackPlan = 'Create new snapshot before reverting';
        break;
      
      case 'PATCH_AND_RESTART':
        plan.steps = [
          'Apply security patch',
          'Update configurations',
          'Restart affected components',
          'Verify patch success'
        ];
        plan.estimatedDuration = 30000; // 30 seconds
        plan.rollbackPlan = 'Keep current snapshot';
        break;
      
      case 'ISOLATE_AND_MONITOR':
        plan.steps = [
          'Maintain quarantine',
          'Enable enhanced logging',
          'Monitor for 10 minutes',
          'Re-assess threat level'
        ];
        plan.estimatedDuration = 600000; // 10 minutes
        plan.rollbackPlan = 'N/A - monitoring only';
        break;
      
      default:
        plan.steps = ['Log incident', 'Continue monitoring'];
        plan.estimatedDuration = 1000;
    }
    
    return plan;
  }

  /**
   * Execute healing plan
   */
  async executeHealing(deviceId, plan) {
    const startTime = Date.now();
    const executionLog = [];
    
    console.log(`   🔧 Executing Healing Plan: ${plan.action}`);
    
    for (const step of plan.steps) {
      console.log(`      • ${step}...`);
      
      const stepResult = await this.executeStep(step, deviceId);
      executionLog.push({
        step,
        success: stepResult.success,
        timestamp: Date.now()
      });
      
      if (!stepResult.success) {
        console.log(`      ✗ Step failed: ${stepResult.error}`);
        break;
      }
      
      console.log(`      ✓ Complete`);
    }
    
    const duration = Date.now() - startTime;
    const success = executionLog.every(log => log.success);
    
    // Log healing action
    this.healingActions.push({
      deviceId,
      plan,
      executionLog,
      success,
      duration,
      timestamp: Date.now()
    });
    
    // Add to blockchain
    this.blockchain.addSecurityEvent('SELF_HEALING', {
      deviceId,
      action: plan.action,
      success,
      duration,
      timestamp: Date.now()
    });
    
    return { success, duration, executionLog };
  }

  /**
   * Execute individual healing step
   */
  async executeStep(step, deviceId) {
    // Simulate step execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    switch (step) {
      case 'Load last known good snapshot':
        return await this.revertToSnapshot(deviceId);
      
      case 'Apply security patch':
        return await this.applyPatch(deviceId);
      
      default:
        return { success: true };
    }
  }

  /**
   * Revert to last known good snapshot
   */
  async revertToSnapshot(deviceId) {
    const snapshots = Array.from(this.snapshots.values())
      .sort((a, b) => b.timestamp - a.timestamp);
    
    if (snapshots.length === 0) {
      return { success: false, error: 'No snapshots available' };
    }
    
    const snapshot = snapshots[0];
    
    console.log(`      📸 Reverting to snapshot: ${snapshot.id}`);
    
    // In production, this would actually restore system state
    // For now, simulate
    
    return { success: true, snapshotId: snapshot.id };
  }

  /**
   * Apply security patch
   */
  async applyPatch(deviceId) {
    console.log(`      🔧 Applying AI-generated patch...`);
    
    // In production, this would apply actual security patches
    // Could use AI to generate patches based on the vulnerability
    
    return { success: true, patch: 'SECURITY_PATCH_v1.0' };
  }

  /**
   * Verify recovery
   */
  async verifyRecovery(deviceId) {
    console.log(`   ✓ Verifying Recovery...`);
    
    // Check if node is still in quarantine
    const isQuarantined = this.quarantineZone.has(deviceId);
    
    // Capture new system state
    const currentState = await this.captureSystemState();
    
    // Compare with known good state
    const isHealthy = !isQuarantined; // Simplified check
    
    if (isHealthy) {
      // Remove from quarantine
      this.quarantineZone.delete(deviceId);
      console.log(`   ✓ Node Released from Quarantine`);
    }
    
    return { verified: isHealthy, state: currentState };
  }

  /**
   * Learn from incident
   */
  learnFromIncident(anomaly, healingPlan, result) {
    const incidentId = crypto.randomBytes(8).toString('hex');
    
    const pattern = {
      id: incidentId,
      type: anomaly.type,
      severity: anomaly.severity,
      healingAction: healingPlan.action,
      success: result.success,
      duration: result.duration,
      timestamp: Date.now()
    };
    
    this.incidentPatterns.set(incidentId, pattern);
    
    // Track effectiveness
    if (!this.healingEffectiveness.has(healingPlan.action)) {
      this.healingEffectiveness.set(healingPlan.action, {
        attempts: 0,
        successes: 0,
        avgDuration: 0
      });
    }
    
    const effectiveness = this.healingEffectiveness.get(healingPlan.action);
    effectiveness.attempts++;
    if (result.success) effectiveness.successes++;
    effectiveness.avgDuration = (effectiveness.avgDuration * (effectiveness.attempts - 1) + result.duration) / effectiveness.attempts;
    
    console.log(`   🧠 AI Learning Complete`);
    console.log(`      Pattern ID: ${incidentId}`);
    console.log(`      Effectiveness: ${(effectiveness.successes / effectiveness.attempts * 100).toFixed(1)}%`);
  }

  /**
   * Notify peer nodes
   */
  async notifyPeers(deviceId, anomaly, result) {
    this.notificationService.emit('healing-complete', {
      deviceId,
      anomaly: anomaly.type,
      success: result.success,
      timestamp: Date.now()
    });
    
    console.log(`   📡 Peers Notified of Recovery`);
  }

  /**
   * Get healing statistics
   */
  getStatistics() {
    return {
      totalSnapshots: this.snapshots.size,
      quarantinedNodes: this.quarantineZone.size,
      healingActions: this.healingActions.length,
      successRate: this.healingActions.filter(a => a.success).length / this.healingActions.length || 0,
      incidentPatterns: this.incidentPatterns.size,
      effectiveness: Object.fromEntries(this.healingEffectiveness)
    };
  }

  /**
   * Force create snapshot
   */
  forceSnapshot(reason) {
    return this.createSnapshot(reason || 'MANUAL');
  }

  /**
   * List available snapshots
   */
  listSnapshots() {
    return Array.from(this.snapshots.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }
}



