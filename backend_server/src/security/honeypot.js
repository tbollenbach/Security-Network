import crypto from 'crypto';

/**
 * Honeypot and Decoy System
 * Detects and traps potential attackers with fake endpoints and data
 */
export class HoneypotService {
  constructor(auditLogger) {
    this.auditLogger = auditLogger;
    this.attackers = new Map();
    this.honeypotHits = new Map();
    this.decoyData = this.generateDecoyData();
    this.suspicionScores = new Map();
    
    // Trap indicators
    this.trapEndpoints = new Set([
      '/admin',
      '/administrator',
      '/.env',
      '/config.php',
      '/wp-admin',
      '/phpmyadmin',
      '/admin.php',
      '/login.php',
      '/xmlrpc.php',
      '/.git/config',
      '/backup.sql',
      '/database.sql',
      '/api/admin',
      '/api/users/all',
      '/api/keys',
      '/api/secret'
    ]);
  }

  /**
   * Generate fake decoy data
   */
  generateDecoyData() {
    return {
      fakeDevices: [
        {
          id: 'decoy-001',
          name: 'HIGH-VALUE-SERVER',
          platform: 'linux',
          ipAddress: '10.0.0.100',
          resources: {
            cpuCores: 128,
            memoryTotal: 1048576, // 1TB RAM (fake)
            storageTotal: 10485760, // 10PB storage (fake)
            hasGPU: true,
            gpuName: 'NVIDIA A100 x8'
          }
        },
        {
          id: 'decoy-002',
          name: 'DATABASE-MASTER',
          platform: 'linux',
          ipAddress: '10.0.0.101',
          resources: {
            cpuCores: 64,
            memoryTotal: 524288,
            storageTotal: 5242880,
            hasGPU: false
          }
        }
      ],
      fakeSecrets: {
        'api_key': 'sk_test_' + crypto.randomBytes(32).toString('hex'),
        'admin_password': 'SuperSecret123!@#',
        'database_url': 'postgresql://admin:password@localhost:5432/production',
        'encryption_key': crypto.randomBytes(32).toString('hex')
      },
      fakeUsers: [
        { username: 'admin', password: 'admin123', role: 'administrator' },
        { username: 'root', password: 'toor', role: 'superuser' },
        { username: 'operator', password: 'operator123', role: 'operator' }
      ]
    };
  }

  /**
   * Check if request hits honeypot trap
   */
  isHoneypotTrap(path) {
    // Check exact match
    if (this.trapEndpoints.has(path)) {
      return true;
    }
    
    // Check patterns
    const suspiciousPatterns = [
      /\.\./,  // Directory traversal
      /\\/,    // Path traversal
      /etc\/passwd/,
      /proc\/self/,
      /admin/i,
      /backup/i,
      /config/i,
      /secret/i,
      /password/i,
      /\.php$/,
      /\.sql$/,
      /\.bak$/,
      /\.old$/,
      /\.git/,
      /\.svn/,
      /\.env/
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(path));
  }

  /**
   * Handle honeypot trap hit
   */
  trapHit(req, res) {
    const ip = req.ip || req.socket.remoteAddress;
    const path = req.path;
    const method = req.method;
    const headers = req.headers;
    const userAgent = headers['user-agent'] || 'unknown';
    
    // Log the attack
    this.auditLogger.logSecurityViolation(
      null,
      ip,
      'HONEYPOT_TRAP',
      {
        path,
        method,
        userAgent,
        headers: JSON.stringify(headers),
        timestamp: new Date().toISOString()
      }
    );
    
    // Record attacker
    this.recordAttacker(ip, path, userAgent);
    
    // Increase suspicion score
    this.increaseSuspicionScore(ip, 50);
    
    // Record honeypot hit
    const hitCount = (this.honeypotHits.get(ip) || 0) + 1;
    this.honeypotHits.set(ip, hitCount);
    
    // Respond with convincing fake data
    return this.generateFakeResponse(path, res);
  }

  /**
   * Generate convincing fake response
   */
  generateFakeResponse(path, res) {
    // Delay response to waste attacker's time
    const delay = Math.random() * 2000 + 1000; // 1-3 seconds
    
    setTimeout(() => {
      if (path.includes('admin') || path.includes('login')) {
        // Fake login page
        res.status(200).json({
          message: 'Authentication required',
          loginUrl: '/api/auth/login',
          hint: 'Default credentials: admin/admin123'
        });
      } else if (path.includes('.env') || path.includes('config')) {
        // Fake environment variables
        res.status(200).send(
          `# Production Environment\n` +
          `API_KEY=${this.decoyData.fakeSecrets.api_key}\n` +
          `DB_HOST=localhost\n` +
          `DB_USER=admin\n` +
          `DB_PASS=${this.decoyData.fakeSecrets.admin_password}\n` +
          `SECRET_KEY=${this.decoyData.fakeSecrets.encryption_key}\n`
        );
      } else if (path.includes('users')) {
        // Fake user list
        res.status(200).json({
          users: this.decoyData.fakeUsers
        });
      } else if (path.includes('backup') || path.includes('.sql')) {
        // Fake database backup
        res.status(200).send(
          `-- MySQL Backup\n` +
          `-- Database: production\n` +
          `CREATE TABLE users (...)\n` +
          `INSERT INTO users VALUES ('admin', 'hashed_password', 'admin@example.com');\n`
        );
      } else {
        // Generic fake error
        res.status(403).json({
          error: 'Access denied',
          message: 'Insufficient privileges',
          retry: true
        });
      }
    }, delay);
  }

  /**
   * Record attacker information
   */
  recordAttacker(ip, path, userAgent) {
    if (!this.attackers.has(ip)) {
      this.attackers.set(ip, {
        firstSeen: new Date(),
        attempts: [],
        userAgents: new Set(),
        threatLevel: 'low'
      });
    }
    
    const attacker = this.attackers.get(ip);
    attacker.attempts.push({
      path,
      timestamp: new Date(),
      userAgent
    });
    attacker.userAgents.add(userAgent);
    attacker.lastSeen = new Date();
    
    // Calculate threat level
    attacker.threatLevel = this.calculateThreatLevel(attacker);
  }

  /**
   * Calculate threat level
   */
  calculateThreatLevel(attacker) {
    const attemptCount = attacker.attempts.length;
    const timeSpan = (attacker.lastSeen - attacker.firstSeen) / 1000; // seconds
    const rate = attemptCount / (timeSpan || 1);
    
    if (attemptCount > 100 || rate > 10) {
      return 'critical';
    } else if (attemptCount > 50 || rate > 5) {
      return 'high';
    } else if (attemptCount > 10 || rate > 2) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Increase suspicion score
   */
  increaseSuspicionScore(ip, points) {
    const currentScore = this.suspicionScores.get(ip) || 0;
    const newScore = currentScore + points;
    this.suspicionScores.set(ip, newScore);
    
    // Auto-ban at threshold
    if (newScore >= 100) {
      return { shouldBan: true, score: newScore };
    }
    
    return { shouldBan: false, score: newScore };
  }

  /**
   * Create decoy WebSocket endpoint
   */
  createDecoyWebSocket(wss) {
    wss.on('connection', (ws, req) => {
      const ip = req.socket.remoteAddress;
      
      this.auditLogger.logSecurityViolation(
        null,
        ip,
        'DECOY_WEBSOCKET_CONNECTION',
        {
          headers: JSON.stringify(req.headers),
          timestamp: new Date().toISOString()
        }
      );
      
      this.recordAttacker(ip, 'decoy-websocket', req.headers['user-agent'] || 'unknown');
      this.increaseSuspicionScore(ip, 30);
      
      // Send fake data
      ws.send(JSON.stringify({
        type: 'devices',
        devices: this.decoyData.fakeDevices
      }));
      
      // Keep connection open to waste resources
      setTimeout(() => {
        ws.close();
      }, 30000); // 30 seconds
    });
  }

  /**
   * Get attacker information
   */
  getAttackerInfo(ip) {
    return this.attackers.get(ip);
  }

  /**
   * Get all attackers
   */
  getAllAttackers() {
    const attackers = [];
    this.attackers.forEach((data, ip) => {
      attackers.push({
        ip,
        ...data,
        userAgents: Array.from(data.userAgents),
        suspicionScore: this.suspicionScores.get(ip) || 0,
        honeypotHits: this.honeypotHits.get(ip) || 0
      });
    });
    
    // Sort by threat level
    return attackers.sort((a, b) => {
      const threatOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return threatOrder[b.threatLevel] - threatOrder[a.threatLevel];
    });
  }

  /**
   * Get honeypot statistics
   */
  getStatistics() {
    const stats = {
      totalTraps: this.trapEndpoints.size,
      totalAttackers: this.attackers.size,
      totalHits: 0,
      threatLevels: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      topPaths: {},
      topUserAgents: {}
    };
    
    this.attackers.forEach((data) => {
      stats.totalHits += data.attempts.length;
      stats.threatLevels[data.threatLevel]++;
      
      data.attempts.forEach(attempt => {
        stats.topPaths[attempt.path] = (stats.topPaths[attempt.path] || 0) + 1;
        stats.topUserAgents[attempt.userAgent] = (stats.topUserAgents[attempt.userAgent] || 0) + 1;
      });
    });
    
    return stats;
  }

  /**
   * Check if IP is suspicious
   */
  isSuspicious(ip) {
    const score = this.suspicionScores.get(ip) || 0;
    return score >= 50;
  }

  /**
   * Reset attacker data (periodic cleanup)
   */
  cleanup(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const now = Date.now();
    
    for (const [ip, data] of this.attackers.entries()) {
      if (now - data.lastSeen.getTime() > maxAge) {
        this.attackers.delete(ip);
        this.suspicionScores.delete(ip);
        this.honeypotHits.delete(ip);
      }
    }
  }
}



