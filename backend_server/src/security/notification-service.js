import { EventEmitter } from 'events';

/**
 * Security Notification Service
 * Real-time alerts for penetration attempts and security threats
 */
export class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.alertChannels = new Set();
    this.alertHistory = [];
    this.alertThresholds = {
      critical: 0, // Always notify
      high: 5, // Notify every 5 minutes
      medium: 30, // Notify every 30 minutes
      low: 60 // Notify every hour
    };
    this.lastAlerts = new Map();
  }

  /**
   * Register alert channel (WebSocket, email, webhook, etc.)
   */
  registerChannel(channel) {
    this.alertChannels.add(channel);
  }

  /**
   * Unregister alert channel
   */
  unregisterChannel(channel) {
    this.alertChannels.delete(channel);
  }

  /**
   * Notify penetration attempt
   */
  notifyPenetrationAttempt(data) {
    const alert = {
      id: this.generateAlertId(),
      type: 'PENETRATION_ATTEMPT',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      data: {
        ip: data.ip,
        attackId: data.attackId,
        threats: data.threats,
        threatTypes: data.threats.map(t => t.type).join(', ')
      },
      message: `🚨 CRITICAL: Penetration attempt detected from ${data.ip}`,
      actions: [
        'BAN_IP',
        'NOTIFY_ADMIN',
        'TRIGGER_INCIDENT_RESPONSE'
      ]
    };
    
    this.sendAlert(alert);
  }

  /**
   * Notify brute force attack
   */
  notifyBruteForce(ip, attemptCount) {
    const alert = {
      id: this.generateAlertId(),
      type: 'BRUTE_FORCE',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      data: { ip, attemptCount },
      message: `🚨 CRITICAL: Brute force attack detected from ${ip} (${attemptCount} attempts)`,
      actions: ['BAN_IP', 'NOTIFY_ADMIN']
    };
    
    this.sendAlert(alert);
  }

  /**
   * Notify DDoS attack
   */
  notifyDDoS(attackInfo) {
    const alert = {
      id: this.generateAlertId(),
      type: 'DDOS',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      data: attackInfo,
      message: `🚨 CRITICAL: DDoS attack detected (${attackInfo.requestCount} requests from ${attackInfo.affectedIPs.length} IPs)`,
      actions: ['ENABLE_RATE_LIMIT', 'BAN_IPS', 'NOTIFY_ADMIN']
    };
    
    this.sendAlert(alert);
  }

  /**
   * Notify honeypot trap
   */
  notifyHoneypotTrap(ip, path, threatLevel) {
    const severity = threatLevel === 'critical' ? 'critical' : 'high';
    
    const alert = {
      id: this.generateAlertId(),
      type: 'HONEYPOT_TRAP',
      severity: severity,
      timestamp: new Date().toISOString(),
      data: { ip, path, threatLevel },
      message: `🍯 ${severity.toUpperCase()}: Honeypot trap triggered by ${ip} (${path})`,
      actions: threatLevel === 'critical' ? ['BAN_IP', 'NOTIFY_ADMIN'] : ['MONITOR']
    };
    
    this.sendAlert(alert);
  }

  /**
   * Notify unauthorized access
   */
  notifyUnauthorizedAccess(deviceId, ip, resource) {
    const alert = {
      id: this.generateAlertId(),
      type: 'UNAUTHORIZED_ACCESS',
      severity: 'high',
      timestamp: new Date().toISOString(),
      data: { deviceId, ip, resource },
      message: `⚠️ HIGH: Unauthorized access attempt to ${resource} from ${ip}`,
      actions: ['REVOKE_ACCESS', 'NOTIFY_ADMIN']
    };
    
    this.sendAlert(alert);
  }

  /**
   * Notify data exfiltration attempt
   */
  notifyDataExfiltration(deviceId, ip, dataSize) {
    const alert = {
      id: this.generateAlertId(),
      type: 'DATA_EXFILTRATION',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      data: { deviceId, ip, dataSize },
      message: `🚨 CRITICAL: Possible data exfiltration from ${ip} (${this.formatBytes(dataSize)})`,
      actions: ['BLOCK_TRANSFER', 'INVESTIGATE', 'NOTIFY_ADMIN']
    };
    
    this.sendAlert(alert);
  }

  /**
   * Notify suspicious behavior
   */
  notifySuspiciousBehavior(ip, behaviorType, details) {
    const alert = {
      id: this.generateAlertId(),
      type: 'SUSPICIOUS_BEHAVIOR',
      severity: 'medium',
      timestamp: new Date().toISOString(),
      data: { ip, behaviorType, details },
      message: `⚡ MEDIUM: Suspicious behavior detected from ${ip}: ${behaviorType}`,
      actions: ['MONITOR', 'INCREASE_LOGGING']
    };
    
    this.sendAlert(alert);
  }

  /**
   * Notify certificate validation failure
   */
  notifyCertificateFailure(deviceId, ip, reason) {
    const alert = {
      id: this.generateAlertId(),
      type: 'CERTIFICATE_FAILURE',
      severity: 'high',
      timestamp: new Date().toISOString(),
      data: { deviceId, ip, reason },
      message: `⚠️ HIGH: Certificate validation failed for ${deviceId} from ${ip}`,
      actions: ['REJECT_CONNECTION', 'NOTIFY_ADMIN']
    };
    
    this.sendAlert(alert);
  }

  /**
   * Send alert through all channels
   */
  sendAlert(alert) {
    // Check if should throttle
    if (this.shouldThrottle(alert)) {
      return;
    }
    
    // Store in history
    this.alertHistory.push(alert);
    if (this.alertHistory.length > 1000) {
      this.alertHistory.shift();
    }
    
    // Update last alert time
    this.lastAlerts.set(`${alert.type}_${alert.severity}`, Date.now());
    
    // Emit event
    this.emit('alert', alert);
    
    // Send through channels
    this.alertChannels.forEach(channel => {
      try {
        channel.send(alert);
      } catch (error) {
        console.error('Failed to send alert through channel:', error);
      }
    });
    
    // Console output
    this.logAlert(alert);
  }

  /**
   * Check if alert should be throttled
   */
  shouldThrottle(alert) {
    const key = `${alert.type}_${alert.severity}`;
    const lastTime = this.lastAlerts.get(key);
    
    if (!lastTime) {
      return false;
    }
    
    const threshold = this.alertThresholds[alert.severity] * 60 * 1000;
    const elapsed = Date.now() - lastTime;
    
    return elapsed < threshold;
  }

  /**
   * Log alert to console
   */
  logAlert(alert) {
    const colors = {
      critical: '\x1b[41m\x1b[37m', // Red background, white text
      high: '\x1b[31m',              // Red text
      medium: '\x1b[33m',            // Yellow text
      low: '\x1b[36m'                // Cyan text
    };
    
    const reset = '\x1b[0m';
    const color = colors[alert.severity] || '';
    
    console.log(`\n${color}═══════════════════════════════════════════════════════════════${reset}`);
    console.log(`${color}${alert.message}${reset}`);
    console.log(`${color}Time: ${alert.timestamp}${reset}`);
    console.log(`${color}Alert ID: ${alert.id}${reset}`);
    if (alert.data) {
      console.log(`${color}Data: ${JSON.stringify(alert.data, null, 2)}${reset}`);
    }
    if (alert.actions) {
      console.log(`${color}Recommended Actions: ${alert.actions.join(', ')}${reset}`);
    }
    console.log(`${color}═══════════════════════════════════════════════════════════════${reset}\n`);
  }

  /**
   * Generate unique alert ID
   */
  generateAlertId() {
    return `ALT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 100) {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Get alert statistics
   */
  getStatistics() {
    const stats = {
      total: this.alertHistory.length,
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      byType: {},
      last24Hours: 0,
      lastHour: 0
    };
    
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;
    
    this.alertHistory.forEach(alert => {
      stats.bySeverity[alert.severity]++;
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
      
      const alertTime = new Date(alert.timestamp).getTime();
      if (now - alertTime < hour) {
        stats.lastHour++;
      }
      if (now - alertTime < day) {
        stats.last24Hours++;
      }
    });
    
    return stats;
  }

  /**
   * Clear alert history
   */
  clearHistory() {
    this.alertHistory = [];
  }
}



