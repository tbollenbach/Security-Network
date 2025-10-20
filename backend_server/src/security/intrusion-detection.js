import crypto from 'crypto';

/**
 * Intrusion Detection System (IDS)
 * Detects and responds to security threats and penetration attempts
 */
export class IntrusionDetectionSystem {
  constructor(auditLogger, notificationService) {
    this.auditLogger = auditLogger;
    this.notificationService = notificationService;
    
    // Attack signatures
    this.attackSignatures = this.loadAttackSignatures();
    
    // Behavioral analysis
    this.behaviorProfiles = new Map();
    
    // Attack counters
    this.detectedAttacks = new Map();
    
    // Anomaly thresholds
    this.thresholds = {
      requestRate: 100, // requests per minute
      failedAuthRate: 5, // failed auth per 15 min
      suspiciousPatterns: 3, // suspicious patterns per hour
      dataExfiltration: 100 * 1024 * 1024, // 100MB per minute
      connectionRate: 10 // connections per minute
    };
  }

  /**
   * Load attack signatures
   */
  loadAttackSignatures() {
    return {
      sqlInjection: [
        /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
        /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
        /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
        /union.*select/i,
        /insert.*into/i,
        /delete.*from/i,
        /drop.*table/i
      ],
      xss: [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /onerror=/gi,
        /onload=/gi,
        /<iframe/gi,
        /eval\(/gi
      ],
      pathTraversal: [
        /\.\.[\/\\]/,
        /\%2e\%2e[\/\\]/i,
        /\/etc\/passwd/i,
        /\/proc\/self/i,
        /c:\\windows\\system32/i
      ],
      commandInjection: [
        /;.*?\s*(cat|ls|wget|curl|chmod|rm|kill)/i,
        /\|.*?\s*(cat|ls|wget|curl|chmod|rm|kill)/i,
        /`.*?(cat|ls|wget|curl|chmod|rm|kill)/i,
        /\$\(.*?(cat|ls|wget|curl|chmod|rm|kill)\)/i
      ],
      bruteForce: {
        timeWindow: 15 * 60 * 1000, // 15 minutes
        maxAttempts: 5
      },
      portScanning: {
        timeWindow: 60 * 1000, // 1 minute
        maxPorts: 20
      }
    };
  }

  /**
   * Analyze request for threats
   */
  analyzeRequest(req) {
    const threats = [];
    const ip = req.ip || req.socket.remoteAddress;
    const path = req.path;
    const query = JSON.stringify(req.query);
    const body = JSON.stringify(req.body);
    const headers = req.headers;
    
    // Check for SQL injection
    if (this.detectSQLInjection(path + query + body)) {
      threats.push({
        type: 'SQL_INJECTION',
        severity: 'critical',
        details: 'SQL injection attempt detected'
      });
    }
    
    // Check for XSS
    if (this.detectXSS(path + query + body)) {
      threats.push({
        type: 'XSS',
        severity: 'high',
        details: 'Cross-site scripting attempt detected'
      });
    }
    
    // Check for path traversal
    if (this.detectPathTraversal(path + query)) {
      threats.push({
        type: 'PATH_TRAVERSAL',
        severity: 'high',
        details: 'Directory traversal attempt detected'
      });
    }
    
    // Check for command injection
    if (this.detectCommandInjection(path + query + body)) {
      threats.push({
        type: 'COMMAND_INJECTION',
        severity: 'critical',
        details: 'Command injection attempt detected'
      });
    }
    
    // Check for suspicious headers
    if (this.detectSuspiciousHeaders(headers)) {
      threats.push({
        type: 'SUSPICIOUS_HEADERS',
        severity: 'medium',
        details: 'Suspicious HTTP headers detected'
      });
    }
    
    // Behavioral analysis
    const behavioralThreats = this.analyzeBehavior(ip, req);
    threats.push(...behavioralThreats);
    
    // Log and notify if threats detected
    if (threats.length > 0) {
      this.handleThreatDetection(ip, threats, req);
    }
    
    return threats;
  }

  /**
   * Detect SQL injection
   */
  detectSQLInjection(input) {
    return this.attackSignatures.sqlInjection.some(pattern => pattern.test(input));
  }

  /**
   * Detect XSS
   */
  detectXSS(input) {
    return this.attackSignatures.xss.some(pattern => pattern.test(input));
  }

  /**
   * Detect path traversal
   */
  detectPathTraversal(input) {
    return this.attackSignatures.pathTraversal.some(pattern => pattern.test(input));
  }

  /**
   * Detect command injection
   */
  detectCommandInjection(input) {
    return this.attackSignatures.commandInjection.some(pattern => pattern.test(input));
  }

  /**
   * Detect suspicious headers
   */
  detectSuspiciousHeaders(headers) {
    const suspicious = [
      { header: 'x-forwarded-for', pattern: /^(127\.0\.0\.1|localhost|::1)$/i },
      { header: 'user-agent', pattern: /^(sqlmap|nikto|nmap|masscan|metasploit)/i },
      { header: 'referer', pattern: /<script|javascript:/i }
    ];
    
    return suspicious.some(({ header, pattern }) => {
      const value = headers[header];
      return value && pattern.test(value);
    });
  }

  /**
   * Analyze behavior patterns
   */
  analyzeBehavior(ip, req) {
    const threats = [];
    const now = Date.now();
    
    // Get or create behavior profile
    if (!this.behaviorProfiles.has(ip)) {
      this.behaviorProfiles.set(ip, {
        requests: [],
        failedAuth: [],
        connections: [],
        dataTransferred: 0,
        firstSeen: now,
        lastSeen: now
      });
    }
    
    const profile = this.behaviorProfiles.get(ip);
    profile.lastSeen = now;
    
    // Record request
    profile.requests.push({ timestamp: now, path: req.path });
    
    // Check request rate
    const recentRequests = profile.requests.filter(
      r => now - r.timestamp < 60000 // Last minute
    );
    
    if (recentRequests.length > this.thresholds.requestRate) {
      threats.push({
        type: 'EXCESSIVE_REQUESTS',
        severity: 'high',
        details: `Excessive request rate: ${recentRequests.length}/min`
      });
    }
    
    // Check for scanning behavior
    const uniquePaths = new Set(recentRequests.map(r => r.path));
    if (uniquePaths.size > 50) {
      threats.push({
        type: 'SCANNING',
        severity: 'high',
        details: `Scanning behavior detected: ${uniquePaths.size} unique paths`
      });
    }
    
    // Cleanup old data
    profile.requests = recentRequests;
    
    return threats;
  }

  /**
   * Record failed authentication
   */
  recordFailedAuth(ip) {
    if (!this.behaviorProfiles.has(ip)) {
      this.behaviorProfiles.set(ip, {
        requests: [],
        failedAuth: [],
        connections: [],
        dataTransferred: 0,
        firstSeen: Date.now(),
        lastSeen: Date.now()
      });
    }
    
    const profile = this.behaviorProfiles.get(ip);
    const now = Date.now();
    
    profile.failedAuth.push(now);
    
    // Check for brute force
    const recentFailed = profile.failedAuth.filter(
      t => now - t < this.attackSignatures.bruteForce.timeWindow
    );
    
    if (recentFailed.length >= this.attackSignatures.bruteForce.maxAttempts) {
      const threat = {
        type: 'BRUTE_FORCE',
        severity: 'critical',
        details: `Brute force attack detected: ${recentFailed.length} failed attempts`
      };
      
      this.handleThreatDetection(ip, [threat], null);
      
      // Cleanup
      profile.failedAuth = recentFailed;
      
      return true;
    }
    
    return false;
  }

  /**
   * Handle threat detection
   */
  handleThreatDetection(ip, threats, req) {
    const attackId = crypto.randomBytes(8).toString('hex');
    const timestamp = new Date().toISOString();
    
    // Log to audit
    threats.forEach(threat => {
      this.auditLogger.logSecurityViolation(
        null,
        ip,
        threat.type,
        {
          attackId,
          severity: threat.severity,
          details: threat.details,
          path: req?.path,
          method: req?.method,
          userAgent: req?.headers?.['user-agent'],
          timestamp
        }
      );
    });
    
    // Store attack
    if (!this.detectedAttacks.has(ip)) {
      this.detectedAttacks.set(ip, []);
    }
    this.detectedAttacks.get(ip).push({
      attackId,
      threats,
      timestamp: Date.now()
    });
    
    // Send notifications
    const criticalThreats = threats.filter(t => t.severity === 'critical');
    if (criticalThreats.length > 0) {
      this.notificationService.notifyPenetrationAttempt({
        ip,
        attackId,
        threats: criticalThreats,
        timestamp
      });
    }
    
    // Auto-response
    this.executeAutoResponse(ip, threats);
  }

  /**
   * Execute automatic response to threat
   */
  executeAutoResponse(ip, threats) {
    const maxSeverity = this.getMaxSeverity(threats);
    
    switch (maxSeverity) {
      case 'critical':
        // Immediate ban
        return { action: 'BAN', duration: 24 * 60 * 60 * 1000 }; // 24 hours
      
      case 'high':
        // Temporary ban
        return { action: 'BAN', duration: 60 * 60 * 1000 }; // 1 hour
      
      case 'medium':
        // Rate limit
        return { action: 'RATE_LIMIT', factor: 10 };
      
      default:
        // Log only
        return { action: 'LOG' };
    }
  }

  /**
   * Get maximum severity from threats
   */
  getMaxSeverity(threats) {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    let maxSeverity = 'low';
    let maxLevel = 1;
    
    threats.forEach(threat => {
      const level = severityOrder[threat.severity] || 1;
      if (level > maxLevel) {
        maxLevel = level;
        maxSeverity = threat.severity;
      }
    });
    
    return maxSeverity;
  }

  /**
   * Get attack statistics
   */
  getStatistics() {
    const stats = {
      totalAttacks: 0,
      byType: {},
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      topAttackers: []
    };
    
    this.detectedAttacks.forEach((attacks, ip) => {
      stats.totalAttacks += attacks.length;
      
      attacks.forEach(attack => {
        attack.threats.forEach(threat => {
          stats.byType[threat.type] = (stats.byType[threat.type] || 0) + 1;
          stats.bySeverity[threat.severity]++;
        });
      });
      
      stats.topAttackers.push({
        ip,
        attackCount: attacks.length
      });
    });
    
    stats.topAttackers.sort((a, b) => b.attackCount - a.attackCount);
    stats.topAttackers = stats.topAttackers.slice(0, 10);
    
    return stats;
  }

  /**
   * Cleanup old data
   */
  cleanup(maxAge = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    
    // Cleanup behavior profiles
    for (const [ip, profile] of this.behaviorProfiles.entries()) {
      if (now - profile.lastSeen > maxAge) {
        this.behaviorProfiles.delete(ip);
      }
    }
    
    // Cleanup detected attacks
    for (const [ip, attacks] of this.detectedAttacks.entries()) {
      const recentAttacks = attacks.filter(a => now - a.timestamp < maxAge);
      if (recentAttacks.length === 0) {
        this.detectedAttacks.delete(ip);
      } else {
        this.detectedAttacks.set(ip, recentAttacks);
      }
    }
  }
}



