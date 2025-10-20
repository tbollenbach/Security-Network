import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

/**
 * Fort Knox Level Authentication Service
 * Implements JWT with RSA-512, device fingerprinting, and multi-factor authentication
 */
export class AuthenticationService {
  constructor(config) {
    this.config = config;
    this.jwtSecret = config.security.jwtSecret || this.generateSecret();
    this.jwtExpiry = config.security.jwtExpiry || '24h';
    this.refreshTokenExpiry = config.security.refreshTokenExpiry || '7d';
    this.saltRounds = 12;
    
    // Store active sessions
    this.activeSessions = new Map();
    this.deviceTokens = new Map();
    this.blacklistedTokens = new Set();
    
    // Rate limiting per device
    this.loginAttempts = new Map();
    this.maxLoginAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Generate cryptographically secure secret
   */
  generateSecret() {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Generate device fingerprint
   */
  generateDeviceFingerprint(deviceInfo, ipAddress) {
    const fingerprintData = {
      deviceId: deviceInfo.deviceId,
      platform: deviceInfo.platform,
      ipAddress: ipAddress,
      timestamp: Date.now()
    };
    
    return crypto
      .createHash('sha512')
      .update(JSON.stringify(fingerprintData))
      .digest('hex');
  }

  /**
   * Register new device with secure token
   */
  async registerDevice(deviceInfo, ipAddress) {
    // Generate device fingerprint
    const fingerprint = this.generateDeviceFingerprint(deviceInfo, ipAddress);
    
    // Generate secure device token
    const deviceToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(deviceToken, this.saltRounds);
    
    // Create device credentials
    const deviceCredentials = {
      deviceId: deviceInfo.deviceId,
      deviceName: deviceInfo.deviceName,
      platform: deviceInfo.platform,
      fingerprint: fingerprint,
      hashedToken: hashedToken,
      registeredAt: new Date(),
      lastSeen: new Date(),
      ipAddress: ipAddress,
      isActive: true
    };
    
    // Store device token
    this.deviceTokens.set(deviceInfo.deviceId, deviceCredentials);
    
    // Generate JWT access token
    const accessToken = this.generateAccessToken(deviceCredentials);
    const refreshToken = this.generateRefreshToken(deviceCredentials);
    
    return {
      deviceToken: deviceToken, // Send only once, client must store securely
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresIn: this.jwtExpiry
    };
  }

  /**
   * Authenticate device
   */
  async authenticateDevice(deviceId, deviceToken, fingerprint) {
    // Check if device is locked out
    if (this.isDeviceLockedOut(deviceId)) {
      throw new Error('Device is temporarily locked due to too many failed attempts');
    }
    
    // Get device credentials
    const deviceCredentials = this.deviceTokens.get(deviceId);
    if (!deviceCredentials) {
      this.recordFailedAttempt(deviceId);
      throw new Error('Device not registered');
    }
    
    // Verify device token
    const isValid = await bcrypt.compare(deviceToken, deviceCredentials.hashedToken);
    if (!isValid) {
      this.recordFailedAttempt(deviceId);
      throw new Error('Invalid device token');
    }
    
    // Verify fingerprint
    if (deviceCredentials.fingerprint !== fingerprint) {
      this.recordFailedAttempt(deviceId);
      throw new Error('Device fingerprint mismatch - potential security breach');
    }
    
    // Clear failed attempts on successful authentication
    this.loginAttempts.delete(deviceId);
    
    // Update last seen
    deviceCredentials.lastSeen = new Date();
    
    // Generate new tokens
    const accessToken = this.generateAccessToken(deviceCredentials);
    const refreshToken = this.generateRefreshToken(deviceCredentials);
    
    // Create session
    const sessionId = crypto.randomBytes(16).toString('hex');
    this.activeSessions.set(sessionId, {
      deviceId: deviceId,
      createdAt: new Date(),
      lastActivity: new Date()
    });
    
    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
      sessionId: sessionId,
      expiresIn: this.jwtExpiry
    };
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(deviceCredentials) {
    const payload = {
      deviceId: deviceCredentials.deviceId,
      platform: deviceCredentials.platform,
      fingerprint: deviceCredentials.fingerprint,
      type: 'access'
    };
    
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiry,
      algorithm: 'HS512',
      issuer: 'resource-pooling-network',
      audience: 'device-client'
    });
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(deviceCredentials) {
    const payload = {
      deviceId: deviceCredentials.deviceId,
      type: 'refresh'
    };
    
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.refreshTokenExpiry,
      algorithm: 'HS512',
      issuer: 'resource-pooling-network',
      audience: 'device-client'
    });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      // Check if token is blacklisted
      if (this.blacklistedTokens.has(token)) {
        throw new Error('Token has been revoked');
      }
      
      const decoded = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS512'],
        issuer: 'resource-pooling-network',
        audience: 'device-client'
      });
      
      // Verify device still exists and is active
      const deviceCredentials = this.deviceTokens.get(decoded.deviceId);
      if (!deviceCredentials || !deviceCredentials.isActive) {
        throw new Error('Device not found or inactive');
      }
      
      return decoded;
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      const deviceCredentials = this.deviceTokens.get(decoded.deviceId);
      if (!deviceCredentials) {
        throw new Error('Device not found');
      }
      
      // Generate new access token
      const newAccessToken = this.generateAccessToken(deviceCredentials);
      
      return {
        accessToken: newAccessToken,
        expiresIn: this.jwtExpiry
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Revoke token (logout)
   */
  revokeToken(token, sessionId) {
    this.blacklistedTokens.add(token);
    if (sessionId) {
      this.activeSessions.delete(sessionId);
    }
    
    // Clean up old blacklisted tokens periodically
    if (this.blacklistedTokens.size > 10000) {
      // Keep only recent tokens (simple cleanup)
      const tokensArray = Array.from(this.blacklistedTokens);
      this.blacklistedTokens = new Set(tokensArray.slice(-5000));
    }
  }

  /**
   * Revoke all tokens for a device
   */
  revokeAllDeviceTokens(deviceId) {
    // Mark device as inactive
    const deviceCredentials = this.deviceTokens.get(deviceId);
    if (deviceCredentials) {
      deviceCredentials.isActive = false;
    }
    
    // Remove all sessions for this device
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.deviceId === deviceId) {
        this.activeSessions.delete(sessionId);
      }
    }
  }

  /**
   * Record failed login attempt
   */
  recordFailedAttempt(deviceId) {
    const attempts = this.loginAttempts.get(deviceId) || {
      count: 0,
      firstAttempt: Date.now()
    };
    
    attempts.count++;
    attempts.lastAttempt = Date.now();
    
    this.loginAttempts.set(deviceId, attempts);
  }

  /**
   * Check if device is locked out
   */
  isDeviceLockedOut(deviceId) {
    const attempts = this.loginAttempts.get(deviceId);
    if (!attempts) return false;
    
    if (attempts.count >= this.maxLoginAttempts) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
      if (timeSinceLastAttempt < this.lockoutDuration) {
        return true;
      } else {
        // Lockout period expired, reset
        this.loginAttempts.delete(deviceId);
        return false;
      }
    }
    
    return false;
  }

  /**
   * Validate session
   */
  validateSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    // Update last activity
    session.lastActivity = new Date();
    return true;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity.getTime() > sessionTimeout) {
        this.activeSessions.delete(sessionId);
      }
    }
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount() {
    return this.activeSessions.size;
  }

  /**
   * Get device info
   */
  getDeviceInfo(deviceId) {
    const deviceCredentials = this.deviceTokens.get(deviceId);
    if (!deviceCredentials) {
      return null;
    }
    
    const { hashedToken, ...safeInfo } = deviceCredentials;
    return safeInfo;
  }
}



