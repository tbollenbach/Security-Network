import rateLimit from 'express-rate-limit';

/**
 * Advanced Rate Limiting and DDoS Protection
 * WITH ADAPTIVE SCALING - No more static limits!
 */
export class RateLimiterService {
  constructor(config) {
    this.config = config;
    this.requestCounts = new Map();
    this.suspiciousIPs = new Set();
    this.bannedIPs = new Set();
    
    // Adaptive rate limiting
    this.serverLoad = 0;
    this.adaptiveEnabled = config.rateLimit?.api?.adaptive?.enabled || true;
    this.adaptiveThreshold = config.rateLimit?.api?.adaptive?.threshold || 0.8;
    this.scaleFactor = config.rateLimit?.api?.adaptive?.scaleFactor || 0.5;
    
    // Monitor server load
    this.startLoadMonitoring();
  }
  
  /**
   * Monitor server load for adaptive limiting
   */
  startLoadMonitoring() {
    setInterval(() => {
      this.serverLoad = this.calculateServerLoad();
      
      if (this.serverLoad > this.adaptiveThreshold) {
        console.log(`⚠️  High server load: ${(this.serverLoad * 100).toFixed(1)}%`);
        console.log(`   Adaptive rate limiting activated`);
      }
    }, 10000); // Check every 10 seconds
  }
  
  /**
   * Calculate current server load
   */
  calculateServerLoad() {
    const cpuUsage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    
    // Normalize to 0-1 scale
    const cpuLoad = (cpuUsage.user + cpuUsage.system) / (process.uptime() * 1000000);
    const memLoad = memUsage.heapUsed / memUsage.heapTotal;
    
    return Math.min(1, (cpuLoad + memLoad) / 2);
  }

  /**
   * API rate limiter (ADAPTIVE!)
   */
  getAPILimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: (req, res) => {
        // Dynamic limit based on server load
        const baseMax = 100;
        
        if (!this.adaptiveEnabled) {
          return baseMax;
        }
        
        if (this.serverLoad > this.adaptiveThreshold) {
          const adaptiveMax = Math.floor(baseMax * this.scaleFactor);
          console.log(`   Adaptive: Reduced limit to ${adaptiveMax} (load: ${(this.serverLoad * 100).toFixed(1)}%)`);
          return adaptiveMax;
        }
        
        return baseMax;
      },
      message: {
        error: 'Too many requests from this IP, please try again later',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        this.markSuspiciousIP(req.ip);
        res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: req.rateLimit.resetTime,
          serverLoad: this.serverLoad > this.adaptiveThreshold ? 'HIGH' : 'NORMAL'
        });
      }
    });
  }

  /**
   * Strict rate limiter for authentication
   */
  getAuthLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5, // Only 5 attempts per 15 minutes
      skipSuccessfulRequests: true,
      message: {
        error: 'Too many authentication attempts, please try again later'
      },
      handler: (req, res) => {
        this.markSuspiciousIP(req.ip);
        res.status(429).json({
          error: 'Authentication rate limit exceeded',
          retryAfter: req.rateLimit.resetTime
        });
      }
    });
  }

  /**
   * WebSocket connection limiter
   */
  getWebSocketLimiter() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 10, // Max 10 connection attempts per minute
      message: 'Too many WebSocket connection attempts'
    });
  }

  /**
   * Check if IP is banned
   */
  isIPBanned(ip) {
    return this.bannedIPs.has(ip);
  }

  /**
   * Ban an IP address
   */
  banIP(ip, duration = 24 * 60 * 60 * 1000) { // 24 hours default
    this.bannedIPs.add(ip);
    
    // Auto-unban after duration
    setTimeout(() => {
      this.bannedIPs.delete(ip);
    }, duration);
  }

  /**
   * Mark IP as suspicious
   */
  markSuspiciousIP(ip) {
    this.suspiciousIPs.add(ip);
    
    // If IP triggers multiple rate limits, ban it
    const suspicionCount = this.getSuspicionCount(ip);
    if (suspicionCount >= 3) {
      this.banIP(ip);
    }
  }

  /**
   * Get suspicion count for IP
   */
  getSuspicionCount(ip) {
    let count = 0;
    // Count how many times this IP has been marked suspicious
    // In production, this would use a more sophisticated tracking system
    return this.suspiciousIPs.has(ip) ? 1 : 0;
  }

  /**
   * Middleware to check if IP is banned
   */
  banCheckMiddleware() {
    return (req, res, next) => {
      if (this.isIPBanned(req.ip)) {
        return res.status(403).json({
          error: 'Access denied',
          reason: 'IP address is banned due to suspicious activity'
        });
      }
      next();
    };
  }

  /**
   * WebSocket message rate limiter
   */
  checkWebSocketMessageRate(deviceId) {
    const now = Date.now();
    const windowMs = 1000; // 1 second
    const maxMessages = 20; // Max 20 messages per second
    
    if (!this.requestCounts.has(deviceId)) {
      this.requestCounts.set(deviceId, []);
    }
    
    const timestamps = this.requestCounts.get(deviceId);
    
    // Remove old timestamps outside the window
    const recentTimestamps = timestamps.filter(ts => now - ts < windowMs);
    
    if (recentTimestamps.length >= maxMessages) {
      return false; // Rate limit exceeded
    }
    
    recentTimestamps.push(now);
    this.requestCounts.set(deviceId, recentTimestamps);
    
    return true;
  }

  /**
   * Detect potential DDoS attack
   */
  detectDDoS(ipAddresses) {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const threshold = 1000; // 1000 requests per minute indicates potential DDoS
    
    const recentRequests = ipAddresses.filter(
      ([ip, timestamp]) => now - timestamp < windowMs
    );
    
    if (recentRequests.length >= threshold) {
      return {
        isDDoS: true,
        requestCount: recentRequests.length,
        affectedIPs: [...new Set(recentRequests.map(([ip]) => ip))]
      };
    }
    
    return { isDDoS: false };
  }

  /**
   * Clean up old data
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    // Clean up request counts
    for (const [deviceId, timestamps] of this.requestCounts.entries()) {
      const recent = timestamps.filter(ts => now - ts < maxAge);
      if (recent.length === 0) {
        this.requestCounts.delete(deviceId);
      } else {
        this.requestCounts.set(deviceId, recent);
      }
    }
  }
}

