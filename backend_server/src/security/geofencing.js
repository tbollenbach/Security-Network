import crypto from 'crypto';

/**
 * Geofencing and IP Reputation System
 * Location-based access control and threat intelligence
 */
export class GeofencingService {
  constructor(notificationService) {
    this.notificationService = notificationService;
    
    // Geofences (allowed regions)
    this.geofences = new Map();
    
    // IP reputation database
    this.ipReputation = new Map();
    
    // Known malicious IPs
    this.blacklistedIPs = new Set();
    
    // Suspicious countries/regions
    this.highRiskCountries = new Set([
      'CN', 'RU', 'KP', 'IR' // Example high-risk countries
    ]);
    
    // Initialize default geofence (worldwide)
    this.addGeofence('global', {
      type: 'worldwide',
      enabled: true,
      allowedCountries: [] // Empty = all allowed
    });
  }

  /**
   * Add geofence rule
   */
  addGeofence(name, config) {
    this.geofences.set(name, {
      name,
      ...config,
      created: Date.now()
    });
  }

  /**
   * Check if IP is within allowed geofence
   */
  checkGeofence(ip, context = {}) {
    // Get location from IP
    const location = this.geolocateIP(ip);
    
    // Check each geofence
    for (const [name, geofence] of this.geofences.entries()) {
      if (!geofence.enabled) continue;
      
      if (geofence.type === 'worldwide') {
        if (geofence.allowedCountries.length === 0) {
          return { allowed: true, location, geofence: name };
        }
        
        if (geofence.allowedCountries.includes(location.country)) {
          return { allowed: true, location, geofence: name };
        }
      }
      
      if (geofence.type === 'radius' && context.userLocation) {
        const distance = this.calculateDistance(
          geofence.center,
          context.userLocation
        );
        
        if (distance <= geofence.radius) {
          return { allowed: true, location, geofence: name };
        }
      }
    }
    
    return { 
      allowed: false, 
      location, 
      reason: 'IP outside allowed geofences' 
    };
  }

  /**
   * Geolocate IP address
   */
  geolocateIP(ip) {
    // In production, use a service like MaxMind GeoIP2
    // For now, simplified implementation
    
    // Check if private IP
    if (this.isPrivateIP(ip)) {
      return {
        ip,
        country: 'LOCAL',
        region: 'Private Network',
        city: 'Local',
        latitude: 0,
        longitude: 0,
        isPrivate: true
      };
    }
    
    // Simulate geolocation (in production, use real service)
    return {
      ip,
      country: 'US',
      region: 'Unknown',
      city: 'Unknown',
      latitude: 0,
      longitude: 0,
      isPrivate: false
    };
  }

  /**
   * Check if IP is private
   */
  isPrivateIP(ip) {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^127\./,
      /^::1$/,
      /^fe80:/,
      /^fc00:/
    ];
    
    return privateRanges.some(range => range.test(ip));
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) * 
      Math.cos(this.toRadians(point2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get IP reputation score
   */
  getIPReputation(ip) {
    // Check if blacklisted
    if (this.blacklistedIPs.has(ip)) {
      return {
        score: 0,
        level: 'malicious',
        blacklisted: true
      };
    }
    
    // Get existing reputation
    if (this.ipReputation.has(ip)) {
      const rep = this.ipReputation.get(ip);
      return {
        score: rep.score,
        level: this.getReputationLevel(rep.score),
        blacklisted: false,
        reports: rep.reports
      };
    }
    
    // New IP - neutral reputation
    return {
      score: 0.5,
      level: 'unknown',
      blacklisted: false
    };
  }

  /**
   * Update IP reputation
   */
  updateIPReputation(ip, incident) {
    if (!this.ipReputation.has(ip)) {
      this.ipReputation.set(ip, {
        score: 0.5,
        reports: [],
        firstSeen: Date.now()
      });
    }
    
    const rep = this.ipReputation.get(ip);
    
    // Add incident report
    rep.reports.push({
      type: incident.type,
      severity: incident.severity,
      timestamp: Date.now()
    });
    
    // Adjust score based on incident
    const severityImpact = {
      critical: -0.3,
      high: -0.2,
      medium: -0.1,
      low: -0.05
    };
    
    rep.score += severityImpact[incident.severity] || -0.1;
    rep.score = Math.max(0, Math.min(1, rep.score)); // Clamp to [0, 1]
    
    // Auto-blacklist if score drops too low
    if (rep.score <= 0.2) {
      this.blacklistIP(ip, 'Low reputation score');
    }
    
    rep.lastUpdated = Date.now();
  }

  /**
   * Get reputation level from score
   */
  getReputationLevel(score) {
    if (score >= 0.8) return 'excellent';
    if (score >= 0.6) return 'good';
    if (score >= 0.4) return 'neutral';
    if (score >= 0.2) return 'poor';
    return 'malicious';
  }

  /**
   * Blacklist IP
   */
  blacklistIP(ip, reason) {
    this.blacklistedIPs.add(ip);
    
    this.notificationService.emit('ip-blacklisted', {
      ip,
      reason,
      timestamp: Date.now()
    });
    
    console.log(`🚫 IP Blacklisted: ${ip} (${reason})`);
  }

  /**
   * Check if IP is from high-risk country
   */
  isHighRiskCountry(ip) {
    const location = this.geolocateIP(ip);
    return this.highRiskCountries.has(location.country);
  }

  /**
   * Check for VPN/Proxy/Tor
   */
  detectVPN(ip) {
    // In production, use services like IPQualityScore or IPHub
    // For now, simplified detection
    
    // Check known VPN/Proxy IP ranges
    const vpnIndicators = [
      /^(45\.)/,  // Common VPN range
      /^(104\.)/,  // Common VPN range
    ];
    
    const isVPN = vpnIndicators.some(pattern => pattern.test(ip));
    
    return {
      isVPN: isVPN,
      isTor: false, // Would check Tor exit nodes
      isProxy: false, // Would check proxy databases
      confidence: isVPN ? 0.7 : 0.3
    };
  }

  /**
   * Comprehensive IP analysis
   */
  analyzeIP(ip) {
    const location = this.geolocateIP(ip);
    const reputation = this.getIPReputation(ip);
    const vpnCheck = this.detectVPN(ip);
    const geofence = this.checkGeofence(ip);
    const highRisk = this.isHighRiskCountry(ip);
    
    // Calculate overall risk score
    let riskScore = 0;
    
    if (reputation.blacklisted) riskScore += 0.5;
    if (reputation.score < 0.5) riskScore += 0.2;
    if (vpnCheck.isVPN) riskScore += 0.15;
    if (vpnCheck.isTor) riskScore += 0.3;
    if (highRisk) riskScore += 0.2;
    if (!geofence.allowed) riskScore += 0.3;
    
    return {
      ip,
      location,
      reputation,
      vpnCheck,
      geofence,
      highRisk,
      riskScore: Math.min(1, riskScore),
      riskLevel: this.getRiskLevel(riskScore),
      recommendation: this.getRecommendation(riskScore)
    };
  }

  /**
   * Get risk level from score
   */
  getRiskLevel(score) {
    if (score >= 0.7) return 'critical';
    if (score >= 0.5) return 'high';
    if (score >= 0.3) return 'medium';
    return 'low';
  }

  /**
   * Get security recommendation
   */
  getRecommendation(riskScore) {
    if (riskScore >= 0.7) return 'BLOCK';
    if (riskScore >= 0.5) return 'CHALLENGE';
    if (riskScore >= 0.3) return 'MONITOR';
    return 'ALLOW';
  }

  /**
   * Get geofencing statistics
   */
  getStatistics() {
    const stats = {
      totalGeofences: this.geofences.size,
      blacklistedIPs: this.blacklistedIPs.size,
      trackedIPs: this.ipReputation.size,
      byCountry: {},
      byReputation: {
        excellent: 0,
        good: 0,
        neutral: 0,
        poor: 0,
        malicious: 0
      }
    };
    
    this.ipReputation.forEach((rep, ip) => {
      const location = this.geolocateIP(ip);
      stats.byCountry[location.country] = (stats.byCountry[location.country] || 0) + 1;
      
      const level = this.getReputationLevel(rep.score);
      stats.byReputation[level]++;
    });
    
    return stats;
  }

  /**
   * Cleanup old data
   */
  cleanup(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
    const now = Date.now();
    
    this.ipReputation.forEach((rep, ip) => {
      if (now - rep.lastUpdated > maxAge && rep.score > 0.5) {
        this.ipReputation.delete(ip);
      }
    });
  }
}



