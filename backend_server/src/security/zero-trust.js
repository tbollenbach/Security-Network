import crypto from 'crypto';

/**
 * Zero-Trust Security Architecture
 * Never trust, always verify - continuous authentication and authorization
 */
export class ZeroTrustSecurity {
  constructor(authService, auditLogger) {
    this.authService = authService;
    this.auditLogger = auditLogger;
    
    // Trust scores
    this.trustScores = new Map();
    this.contextFactors = new Map();
    
    // Continuous verification
    this.verificationInterval = 5 * 60 * 1000; // 5 minutes
    this.trustThreshold = 0.7; // 70% minimum trust score
    
    // Microsegmentation zones
    this.securityZones = {
      public: { level: 0, resources: ['/', '/api/status'] },
      authenticated: { level: 1, resources: ['/api/devices', '/api/resources'] },
      privileged: { level: 2, resources: ['/api/security', '/api/admin'] },
      critical: { level: 3, resources: ['/api/security/keys', '/api/config'] }
    };
  }

  /**
   * Calculate trust score for a device/user
   * NOW CONTEXT-AWARE - Adjusts weights based on operation criticality!
   */
  calculateTrustScore(deviceId, context) {
    const factors = {
      authentication: this.scoreAuthentication(deviceId),
      device: this.scoreDevice(deviceId, context),
      behavior: this.scoreBehavior(deviceId),
      location: this.scoreLocation(context),
      time: this.scoreTime(context),
      network: this.scoreNetwork(context)
    };
    
    // CONTEXT-AWARE weighted average
    const weights = context.weights || {
      // Increase auth weight for critical operations
      authentication: context.isCriticalOperation ? 0.40 : 0.30,
      device: 0.20,
      behavior: context.isCriticalOperation ? 0.25 : 0.20,
      // Increase location weight for high-risk countries
      location: context.isHighRiskCountry ? 0.25 : 0.15,
      time: 0.10,
      network: context.untrustedNetwork ? 0.10 : 0.05
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    Object.keys(factors).forEach(factor => {
      if (factors[factor] !== null) {
        totalScore += factors[factor] * weights[factor];
        totalWeight += weights[factor];
      }
    });
    
    const trustScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    
    // Store trust score
    this.trustScores.set(deviceId, {
      score: trustScore,
      factors: factors,
      timestamp: Date.now(),
      context: context
    });
    
    return trustScore;
  }

  /**
   * Score authentication strength
   */
  scoreAuthentication(deviceId) {
    const deviceInfo = this.authService.getDeviceInfo(deviceId);
    
    if (!deviceInfo) return 0;
    
    let score = 0.5; // Base score for valid auth
    
    // Recent authentication
    const timeSinceAuth = Date.now() - deviceInfo.lastSeen.getTime();
    if (timeSinceAuth < 5 * 60 * 1000) score += 0.3; // Within 5 min
    else if (timeSinceAuth < 30 * 60 * 1000) score += 0.15; // Within 30 min
    
    // Multi-factor authentication (if implemented)
    if (deviceInfo.mfaEnabled) score += 0.2;
    
    return Math.min(1, score);
  }

  /**
   * Score device trustworthiness
   */
  scoreDevice(deviceId, context) {
    let score = 0.5;
    
    // Device fingerprint match
    if (context.fingerprintMatch) score += 0.3;
    
    // Known device
    const deviceInfo = this.authService.getDeviceInfo(deviceId);
    if (deviceInfo) {
      const deviceAge = Date.now() - deviceInfo.registeredAt.getTime();
      if (deviceAge > 30 * 24 * 60 * 60 * 1000) score += 0.2; // 30+ days old
      else if (deviceAge > 7 * 24 * 60 * 60 * 1000) score += 0.1; // 7+ days old
    }
    
    return Math.min(1, score);
  }

  /**
   * Score behavioral patterns
   */
  scoreBehavior(deviceId) {
    // This would integrate with AI threat detector
    // For now, simplified version
    const recent = this.contextFactors.get(deviceId);
    
    if (!recent) return 0.5;
    
    let score = 0.5;
    
    // Consistent behavior
    if (recent.consistentPattern) score += 0.3;
    
    // No anomalies
    if (!recent.anomalyDetected) score += 0.2;
    
    return Math.min(1, score);
  }

  /**
   * Score location trustworthiness
   */
  scoreLocation(context) {
    if (!context.location) return 0.5;
    
    let score = 0.5;
    
    // Whitelisted location
    if (this.isWhitelistedLocation(context.location)) score += 0.3;
    
    // Known location
    if (context.knownLocation) score += 0.2;
    
    return Math.min(1, score);
  }

  /**
   * Score time-based factors
   */
  scoreTime(context) {
    const hour = new Date().getHours();
    
    // Business hours (higher trust)
    if (hour >= 8 && hour <= 18) return 0.8;
    
    // Evening (medium trust)
    if (hour >= 18 && hour <= 23) return 0.6;
    
    // Late night (lower trust)
    return 0.4;
  }

  /**
   * Score network trustworthiness
   */
  scoreNetwork(context) {
    if (!context.network) return 0.5;
    
    let score = 0.5;
    
    // Private network
    if (context.network.private) score += 0.3;
    
    // Known network
    if (context.network.known) score += 0.2;
    
    return Math.min(1, score);
  }

  /**
   * Verify access to resource
   */
  verifyAccess(deviceId, resource, context) {
    // Calculate current trust score
    const trustScore = this.calculateTrustScore(deviceId, context);
    
    // Determine required security zone
    const requiredZone = this.getRequiredZone(resource);
    
    // Check if trust score meets requirement
    const zoneLevel = requiredZone.level;
    const requiredTrust = 0.5 + (zoneLevel * 0.15); // Increases with zone level
    
    const access = {
      granted: trustScore >= requiredTrust && trustScore >= this.trustThreshold,
      trustScore: trustScore,
      requiredTrust: requiredTrust,
      zone: requiredZone,
      reason: null
    };
    
    if (!access.granted) {
      access.reason = trustScore < this.trustThreshold 
        ? 'Trust score below minimum threshold'
        : 'Insufficient trust for requested resource';
    }
    
    // Log access attempt
    this.auditLogger.logDataAccess(
      deviceId,
      resource,
      access.granted ? 'allowed' : 'denied',
      access.granted
    );
    
    return access;
  }

  /**
   * Get required security zone for resource
   */
  getRequiredZone(resource) {
    for (const [zoneName, zone] of Object.entries(this.securityZones)) {
      if (zone.resources.some(r => resource.startsWith(r))) {
        return { name: zoneName, ...zone };
      }
    }
    
    return this.securityZones.authenticated; // Default
  }

  /**
   * Check if location is whitelisted
   */
  isWhitelistedLocation(location) {
    // In production, check against whitelist database
    // For now, simplified
    const whitelistedCountries = ['US', 'CA', 'UK', 'AU', 'NZ'];
    return whitelistedCountries.includes(location.country);
  }

  /**
   * Continuous verification middleware
   */
  continuousVerification(deviceId) {
    setInterval(() => {
      const trustData = this.trustScores.get(deviceId);
      
      if (trustData) {
        const timeSinceUpdate = Date.now() - trustData.timestamp;
        
        // Re-verify if trust score is old
        if (timeSinceUpdate > this.verificationInterval) {
          const newScore = this.calculateTrustScore(deviceId, trustData.context);
          
          // Alert if trust score dropped significantly
          if (newScore < trustData.score - 0.3) {
            this.auditLogger.logSecurityViolation(
              deviceId,
              trustData.context.ipAddress || 'unknown',
              'TRUST_SCORE_DROP',
              {
                oldScore: trustData.score,
                newScore: newScore,
                drop: trustData.score - newScore
              }
            );
          }
        }
      }
    }, this.verificationInterval);
  }

  /**
   * Implement least privilege access
   */
  grantLeastPrivilege(deviceId, requestedPermissions) {
    const trustData = this.trustScores.get(deviceId);
    
    if (!trustData) {
      return { granted: [], denied: requestedPermissions };
    }
    
    const granted = [];
    const denied = [];
    
    requestedPermissions.forEach(permission => {
      const required = this.getPermissionTrustRequirement(permission);
      
      if (trustData.score >= required) {
        granted.push(permission);
      } else {
        denied.push(permission);
      }
    });
    
    return { granted, denied };
  }

  /**
   * Get trust requirement for permission
   */
  getPermissionTrustRequirement(permission) {
    const requirements = {
      'read': 0.5,
      'write': 0.7,
      'delete': 0.8,
      'admin': 0.9,
      'security': 0.95
    };
    
    return requirements[permission] || 0.7;
  }

  /**
   * Microsegmentation enforcement
   */
  enforceSegmentation(deviceId, targetZone) {
    const trustData = this.trustScores.get(deviceId);
    
    if (!trustData) {
      return { allowed: false, reason: 'No trust data available' };
    }
    
    const zone = this.securityZones[targetZone];
    if (!zone) {
      return { allowed: false, reason: 'Invalid security zone' };
    }
    
    const requiredTrust = 0.5 + (zone.level * 0.15);
    const allowed = trustData.score >= requiredTrust;
    
    return {
      allowed: allowed,
      reason: allowed ? null : `Trust score ${trustData.score.toFixed(2)} below required ${requiredTrust.toFixed(2)}`,
      currentZone: this.getCurrentZone(trustData.score),
      targetZone: targetZone
    };
  }

  /**
   * Get current zone based on trust score
   */
  getCurrentZone(trustScore) {
    if (trustScore >= 0.95) return 'critical';
    if (trustScore >= 0.8) return 'privileged';
    if (trustScore >= 0.5) return 'authenticated';
    return 'public';
  }

  /**
   * Get trust statistics
   */
  getStatistics() {
    const stats = {
      totalDevices: this.trustScores.size,
      byZone: { public: 0, authenticated: 0, privileged: 0, critical: 0 },
      averageTrust: 0,
      lowTrustDevices: []
    };
    
    let totalTrust = 0;
    
    this.trustScores.forEach((data, deviceId) => {
      totalTrust += data.score;
      const zone = this.getCurrentZone(data.score);
      stats.byZone[zone]++;
      
      if (data.score < this.trustThreshold) {
        stats.lowTrustDevices.push({
          deviceId,
          trustScore: data.score,
          zone: zone
        });
      }
    });
    
    stats.averageTrust = stats.totalDevices > 0 
      ? totalTrust / stats.totalDevices 
      : 0;
    
    return stats;
  }
}

