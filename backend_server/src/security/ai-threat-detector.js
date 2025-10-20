import crypto from 'crypto';

/**
 * AI-Powered Threat Detection System
 * Machine learning-based anomaly detection and behavioral analysis
 */
export class AIThreatDetector {
  constructor(notificationService) {
    this.notificationService = notificationService;
    
    // Behavioral models
    this.userProfiles = new Map();
    this.normalBehaviorPatterns = new Map();
    
    // ML parameters
    this.anomalyThreshold = 0.75; // 75% confidence for anomaly
    this.learningRate = 0.01;
    this.minSamplesForModel = 100;
    
    // Feature extraction
    this.features = [
      'requestRate',
      'errorRate',
      'dataSize',
      'timeOfDay',
      'requestPattern',
      'pathDiversity',
      'sessionDuration',
      'authFailures'
    ];
    
    // Threat patterns (learned over time)
    this.threatSignatures = new Map();
    this.knownThreats = this.initializeKnownThreats();
  }

  /**
   * Initialize known threat patterns
   */
  initializeKnownThreats() {
    return [
      {
        name: 'Port Scanning',
        pattern: { pathDiversity: [0.8, 1.0], requestRate: [0.9, 1.0], timeOfDay: [0, 0.3] },
        severity: 'high'
      },
      {
        name: 'Credential Stuffing',
        pattern: { authFailures: [0.8, 1.0], requestRate: [0.7, 1.0], errorRate: [0.8, 1.0] },
        severity: 'critical'
      },
      {
        name: 'Data Exfiltration',
        pattern: { dataSize: [0.9, 1.0], sessionDuration: [0.8, 1.0], requestPattern: [0, 0.2] },
        severity: 'critical'
      },
      {
        name: 'API Abuse',
        pattern: { requestRate: [0.9, 1.0], pathDiversity: [0, 0.3], errorRate: [0.5, 0.7] },
        severity: 'high'
      },
      {
        name: 'Reconnaissance',
        pattern: { pathDiversity: [0.7, 1.0], requestRate: [0.5, 0.8], sessionDuration: [0.6, 0.9] },
        severity: 'medium'
      }
    ];
  }

  /**
   * Analyze user behavior for anomalies
   */
  analyzeBehavior(userId, activity) {
    // Get or create user profile
    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, {
        activities: [],
        baselineEstablished: false,
        anomalyScore: 0,
        threatLevel: 'low'
      });
    }
    
    const profile = this.userProfiles.get(userId);
    profile.activities.push(activity);
    
    // Keep only recent activities
    if (profile.activities.length > 1000) {
      profile.activities = profile.activities.slice(-1000);
    }
    
    // Extract features
    const features = this.extractFeatures(profile.activities);
    
    // Establish baseline if enough data
    if (!profile.baselineEstablished && profile.activities.length >= this.minSamplesForModel) {
      profile.baseline = this.establishBaseline(profile.activities);
      profile.baselineEstablished = true;
    }
    
    // Detect anomalies if baseline exists
    if (profile.baselineEstablished) {
      const anomalyScore = this.detectAnomaly(features, profile.baseline);
      profile.anomalyScore = anomalyScore;
      
      if (anomalyScore > this.anomalyThreshold) {
        const threat = this.identifyThreat(features);
        profile.threatLevel = threat.severity;
        
        this.handleAnomalyDetection(userId, activity, anomalyScore, threat);
      }
    }
    
    return {
      anomalyScore: profile.anomalyScore,
      threatLevel: profile.threatLevel,
      isAnomaly: profile.anomalyScore > this.anomalyThreshold
    };
  }

  /**
   * Extract behavioral features
   */
  extractFeatures(activities) {
    const now = Date.now();
    const recentWindow = 60 * 60 * 1000; // 1 hour
    const recent = activities.filter(a => now - a.timestamp < recentWindow);
    
    if (recent.length === 0) {
      return this.getDefaultFeatures();
    }
    
    // Calculate features
    const features = {
      requestRate: this.normalizeValue(recent.length / 60, 0, 100), // requests per minute
      errorRate: this.normalizeValue(recent.filter(a => a.error).length / recent.length, 0, 1),
      dataSize: this.normalizeValue(recent.reduce((sum, a) => sum + (a.dataSize || 0), 0) / recent.length, 0, 10485760), // avg bytes
      timeOfDay: this.getTimeOfDayScore(now),
      requestPattern: this.calculatePatternScore(recent),
      pathDiversity: this.calculatePathDiversity(recent),
      sessionDuration: this.normalizeValue((now - recent[0].timestamp) / 1000 / 60, 0, 120), // minutes
      authFailures: this.normalizeValue(recent.filter(a => a.authFailed).length, 0, 10)
    };
    
    return features;
  }

  /**
   * Get default features
   */
  getDefaultFeatures() {
    return {
      requestRate: 0,
      errorRate: 0,
      dataSize: 0,
      timeOfDay: 0.5,
      requestPattern: 0.5,
      pathDiversity: 0,
      sessionDuration: 0,
      authFailures: 0
    };
  }

  /**
   * Normalize value to [0, 1]
   */
  normalizeValue(value, min, max) {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  /**
   * Get time of day score (0-1)
   */
  getTimeOfDayScore(timestamp) {
    const hour = new Date(timestamp).getHours();
    // Night time (0-6) = 0, Day time (6-18) = 0.5, Evening (18-24) = 1
    return hour < 6 ? 0 : (hour < 18 ? 0.5 : 1);
  }

  /**
   * Calculate request pattern score
   */
  calculatePatternScore(activities) {
    if (activities.length < 2) return 0.5;
    
    // Calculate intervals between requests
    const intervals = [];
    for (let i = 1; i < activities.length; i++) {
      intervals.push(activities[i].timestamp - activities[i - 1].timestamp);
    }
    
    // Calculate standard deviation (lower = more regular pattern)
    const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // Normalize (regular pattern = high score)
    return 1 - this.normalizeValue(stdDev, 0, 10000);
  }

  /**
   * Calculate path diversity
   */
  calculatePathDiversity(activities) {
    const uniquePaths = new Set(activities.map(a => a.path));
    return this.normalizeValue(uniquePaths.size, 0, 50);
  }

  /**
   * Establish baseline behavior
   */
  establishBaseline(activities) {
    const allFeatures = activities.map((_, index) => 
      this.extractFeatures(activities.slice(0, index + 1))
    );
    
    const baseline = {};
    
    this.features.forEach(feature => {
      const values = allFeatures.map(f => f[feature]).filter(v => v !== undefined);
      baseline[feature] = {
        mean: values.reduce((sum, val) => sum + val, 0) / values.length,
        stdDev: this.calculateStdDev(values)
      };
    });
    
    return baseline;
  }

  /**
   * Calculate standard deviation
   */
  calculateStdDev(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Detect anomaly using statistical methods
   */
  detectAnomaly(features, baseline) {
    let anomalyScore = 0;
    let scoreCount = 0;
    
    this.features.forEach(feature => {
      if (baseline[feature] && features[feature] !== undefined) {
        const value = features[feature];
        const mean = baseline[feature].mean;
        const stdDev = baseline[feature].stdDev || 0.1;
        
        // Calculate z-score
        const zScore = Math.abs((value - mean) / stdDev);
        
        // Convert z-score to probability (0-1)
        const featureAnomaly = Math.min(1, zScore / 3); // 3-sigma rule
        
        anomalyScore += featureAnomaly;
        scoreCount++;
      }
    });
    
    return scoreCount > 0 ? anomalyScore / scoreCount : 0;
  }

  /**
   * Identify specific threat type
   */
  identifyThreat(features) {
    let bestMatch = { name: 'Unknown Threat', severity: 'medium', confidence: 0 };
    
    this.knownThreats.forEach(threat => {
      let matchScore = 0;
      let matchCount = 0;
      
      Object.keys(threat.pattern).forEach(feature => {
        if (features[feature] !== undefined) {
          const [min, max] = threat.pattern[feature];
          if (features[feature] >= min && features[feature] <= max) {
            matchScore += 1;
          }
          matchCount++;
        }
      });
      
      const confidence = matchCount > 0 ? matchScore / matchCount : 0;
      
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          name: threat.name,
          severity: threat.severity,
          confidence: confidence
        };
      }
    });
    
    return bestMatch;
  }

  /**
   * Handle anomaly detection
   */
  handleAnomalyDetection(userId, activity, anomalyScore, threat) {
    this.notificationService.emit('ai-threat-detected', {
      userId,
      activity,
      anomalyScore,
      threat,
      timestamp: Date.now()
    });
    
    // Log threat
    console.log(`\n🤖 AI THREAT DETECTED:`);
    console.log(`   User: ${userId}`);
    console.log(`   Threat: ${threat.name} (${(threat.confidence * 100).toFixed(1)}% confidence)`);
    console.log(`   Severity: ${threat.severity.toUpperCase()}`);
    console.log(`   Anomaly Score: ${(anomalyScore * 100).toFixed(1)}%`);
  }

  /**
   * Train model with new data (online learning)
   */
  trainModel(userId, activity, label) {
    // Add labeled data to training set
    if (!this.threatSignatures.has(label)) {
      this.threatSignatures.set(label, []);
    }
    
    const features = this.extractFeatures([activity]);
    this.threatSignatures.get(label).push(features);
    
    // Update known threats
    this.updateThreatPatterns(label);
  }

  /**
   * Update threat patterns based on new data
   */
  updateThreatPatterns(label) {
    const samples = this.threatSignatures.get(label);
    if (samples.length < 10) return; // Need enough samples
    
    const pattern = {};
    
    this.features.forEach(feature => {
      const values = samples.map(s => s[feature]).filter(v => v !== undefined);
      if (values.length > 0) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        pattern[feature] = [min, max];
      }
    });
    
    // Update or add threat pattern
    const existingIndex = this.knownThreats.findIndex(t => t.name === label);
    if (existingIndex >= 0) {
      this.knownThreats[existingIndex].pattern = pattern;
    } else {
      this.knownThreats.push({
        name: label,
        pattern: pattern,
        severity: 'medium'
      });
    }
  }

  /**
   * Get user risk score
   */
  getUserRiskScore(userId) {
    const profile = this.userProfiles.get(userId);
    if (!profile) return { score: 0, level: 'low' };
    
    const score = profile.anomalyScore;
    let level = 'low';
    
    if (score > 0.9) level = 'critical';
    else if (score > 0.75) level = 'high';
    else if (score > 0.5) level = 'medium';
    
    return { score, level };
  }

  /**
   * Get threat intelligence report
   */
  getThreatIntelligence() {
    const report = {
      totalUsers: this.userProfiles.size,
      threatsDetected: 0,
      byThreatType: {},
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      highRiskUsers: []
    };
    
    this.userProfiles.forEach((profile, userId) => {
      if (profile.anomalyScore > this.anomalyThreshold) {
        report.threatsDetected++;
        report.bySeverity[profile.threatLevel]++;
        
        if (profile.anomalyScore > 0.8) {
          report.highRiskUsers.push({
            userId,
            riskScore: profile.anomalyScore,
            threatLevel: profile.threatLevel
          });
        }
      }
    });
    
    return report;
  }

  /**
   * Clear old data
   */
  cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    const now = Date.now();
    
    this.userProfiles.forEach((profile, userId) => {
      profile.activities = profile.activities.filter(
        a => now - a.timestamp < maxAge
      );
      
      if (profile.activities.length === 0) {
        this.userProfiles.delete(userId);
      }
    });
  }
}



