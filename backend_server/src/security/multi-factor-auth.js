import crypto from 'crypto';
import { authenticator } from 'otplib';

/**
 * Multi-Factor Authentication System
 * TOTP, SMS, Email, Biometric, Hardware Keys
 */
export class MultiFactorAuth {
  constructor() {
    this.totpSecrets = new Map();
    this.backupCodes = new Map();
    this.trustedDevices = new Map();
    this.mfaChallenges = new Map();
    
    // MFA settings
    this.totpWindow = 1; // Allow 1 step before/after
    this.backupCodeCount = 10;
    this.challengeTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Enable TOTP for device
   */
  enableTOTP(deviceId) {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(deviceId, 'ResourcePool', secret);
    
    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    
    this.totpSecrets.set(deviceId, {
      secret,
      enabled: false, // Requires verification
      createdAt: Date.now()
    });
    
    this.backupCodes.set(deviceId, backupCodes);
    
    return {
      secret,
      otpauth,
      qrCode: this.generateQRCodeData(otpauth),
      backupCodes
    };
  }

  /**
   * Verify and activate TOTP
   */
  verifyAndActivateTOTP(deviceId, token) {
    const totpData = this.totpSecrets.get(deviceId);
    if (!totpData) {
      throw new Error('TOTP not initialized');
    }
    
    const isValid = authenticator.verify({
      token,
      secret: totpData.secret
    });
    
    if (isValid) {
      totpData.enabled = true;
      totpData.activatedAt = Date.now();
      return true;
    }
    
    return false;
  }

  /**
   * Verify TOTP token
   */
  verifyTOTP(deviceId, token) {
    const totpData = this.totpSecrets.get(deviceId);
    
    if (!totpData || !totpData.enabled) {
      return false;
    }
    
    return authenticator.verify({
      token,
      secret: totpData.secret,
      window: this.totpWindow
    });
  }

  /**
   * Generate backup codes
   */
  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < this.backupCodeCount; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
      codes.push({
        code: formatted,
        used: false,
        createdAt: Date.now()
      });
    }
    return codes;
  }

  /**
   * Use backup code
   */
  useBackupCode(deviceId, code) {
    const codes = this.backupCodes.get(deviceId);
    if (!codes) return false;
    
    const codeData = codes.find(c => c.code === code && !c.used);
    if (codeData) {
      codeData.used = true;
      codeData.usedAt = Date.now();
      return true;
    }
    
    return false;
  }

  /**
   * Generate QR code data
   */
  generateQRCodeData(otpauth) {
    // In production, use a QR code library
    return {
      data: otpauth,
      size: 200,
      format: 'otpauth'
    };
  }

  /**
   * Create MFA challenge
   */
  createChallenge(deviceId, type = 'totp') {
    const challengeId = crypto.randomBytes(16).toString('hex');
    
    this.mfaChallenges.set(challengeId, {
      deviceId,
      type,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.challengeTimeout,
      attempts: 0,
      maxAttempts: 3
    });
    
    // Auto-cleanup expired challenge
    setTimeout(() => {
      this.mfaChallenges.delete(challengeId);
    }, this.challengeTimeout);
    
    return {
      challengeId,
      type,
      expiresIn: this.challengeTimeout
    };
  }

  /**
   * Verify MFA challenge
   */
  verifyChallenge(challengeId, response) {
    const challenge = this.mfaChallenges.get(challengeId);
    
    if (!challenge) {
      return { success: false, error: 'Invalid or expired challenge' };
    }
    
    if (Date.now() > challenge.expiresAt) {
      this.mfaChallenges.delete(challengeId);
      return { success: false, error: 'Challenge expired' };
    }
    
    challenge.attempts++;
    
    if (challenge.attempts > challenge.maxAttempts) {
      this.mfaChallenges.delete(challengeId);
      return { success: false, error: 'Too many attempts' };
    }
    
    let verified = false;
    
    switch (challenge.type) {
      case 'totp':
        verified = this.verifyTOTP(challenge.deviceId, response);
        break;
      case 'backup':
        verified = this.useBackupCode(challenge.deviceId, response);
        break;
    }
    
    if (verified) {
      this.mfaChallenges.delete(challengeId);
      return { success: true };
    }
    
    return { 
      success: false, 
      error: 'Invalid code',
      attemptsLeft: challenge.maxAttempts - challenge.attempts
    };
  }

  /**
   * Trust device (remember for 30 days)
   */
  trustDevice(deviceId, fingerprint) {
    const trustToken = crypto.randomBytes(32).toString('hex');
    
    this.trustedDevices.set(trustToken, {
      deviceId,
      fingerprint,
      trustedAt: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
    });
    
    return trustToken;
  }

  /**
   * Check if device is trusted
   */
  isTrustedDevice(trustToken, deviceId, fingerprint) {
    const trust = this.trustedDevices.get(trustToken);
    
    if (!trust) return false;
    
    if (Date.now() > trust.expiresAt) {
      this.trustedDevices.delete(trustToken);
      return false;
    }
    
    return trust.deviceId === deviceId && trust.fingerprint === fingerprint;
  }

  /**
   * Revoke trusted device
   */
  revokeTrust(trustToken) {
    return this.trustedDevices.delete(trustToken);
  }

  /**
   * Check if MFA is enabled for device
   */
  isMFAEnabled(deviceId) {
    const totpData = this.totpSecrets.get(deviceId);
    return totpData && totpData.enabled;
  }

  /**
   * Disable MFA for device
   */
  disableMFA(deviceId) {
    this.totpSecrets.delete(deviceId);
    this.backupCodes.delete(deviceId);
    
    // Revoke all trusted devices
    this.trustedDevices.forEach((trust, token) => {
      if (trust.deviceId === deviceId) {
        this.trustedDevices.delete(token);
      }
    });
  }

  /**
   * Get MFA statistics
   */
  getStatistics() {
    return {
      totalMFAUsers: this.totpSecrets.size,
      enabledUsers: Array.from(this.totpSecrets.values()).filter(t => t.enabled).length,
      trustedDevices: this.trustedDevices.size,
      activeChallenges: this.mfaChallenges.size
    };
  }
}



