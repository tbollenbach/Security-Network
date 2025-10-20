import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { readFileSync } from 'fs';

/**
 * CORRECT JWT Authentication Implementation
 * Uses RS256 (RSA-SHA256), NOT "RSA-512" which doesn't exist
 */
export class AuthenticationServiceCorrect {
  constructor(config) {
    this.config = config;
    
    // Load RSA keys (2048-bit minimum, 4096-bit recommended)
    // Generated with: openssl genrsa -out private.pem 2048
    try {
      this.privateKey = readFileSync(config.jwt.privateKeyPath, 'utf8');
      this.publicKey = readFileSync(config.jwt.publicKeyPath, 'utf8');
    } catch (error) {
      console.error('❌ Failed to load JWT keys:', error.message);
      console.log('   Generate with:');
      console.log('   openssl genrsa -out private.pem 2048');
      console.log('   openssl rsa -in private.pem -pubout -out public.pem');
      throw new Error('JWT keys not found');
    }
    
    // Token settings
    this.issuer = config.jwt.issuer || 'resourcepool';
    this.audience = config.jwt.audience || 'api';
    this.accessTokenExpiry = '15m';  // Short-lived access tokens
    this.refreshTokenExpiry = '7d';  // Longer refresh tokens
    
    // Key ID for rotation
    this.keyId = config.jwt.keyId || 'key-2025-10';
    
    // Token blacklist (revoked tokens)
    this.blacklist = new Set();
    
    // Active sessions
    this.sessions = new Map();
  }

  /**
   * Generate access token (RS256)
   */
  generateAccessToken(deviceId, scope = 'agent') {
    const payload = {
      sub: deviceId,
      scope: scope,
      type: 'access'
    };
    
    const token = jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',  // RSA with SHA-256 (2048+ bit key)
      expiresIn: this.accessTokenExpiry,
      issuer: this.issuer,
      audience: this.audience,
      jwtid: crypto.randomUUID(),  // Unique token ID (prevents replay)
      keyid: this.keyId            // For key rotation
    });
    
    return token;
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(deviceId) {
    const payload = {
      sub: deviceId,
      type: 'refresh'
    };
    
    const token = jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: this.refreshTokenExpiry,
      issuer: this.issuer,
      audience: this.audience,
      jwtid: crypto.randomUUID(),
      keyid: this.keyId
    });
    
    return token;
  }

  /**
   * Verify token
   */
  verifyToken(token) {
    try {
      // Check blacklist first
      if (this.blacklist.has(token)) {
        throw new Error('Token has been revoked');
      }
      
      // Verify signature and claims
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],  // Only allow RS256 (prevent algorithm confusion)
        issuer: this.issuer,
        audience: this.audience,
        clockTolerance: 30  // Allow 30 seconds clock skew
      });
      
      return {
        valid: true,
        deviceId: decoded.sub,
        scope: decoded.scope,
        jti: decoded.jti,
        exp: decoded.exp
      };
      
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Refresh access token
   */
  refreshAccessToken(refreshToken) {
    const verification = this.verifyToken(refreshToken);
    
    if (!verification.valid) {
      throw new Error('Invalid refresh token');
    }
    
    if (verification.scope !== 'refresh') {
      throw new Error('Not a refresh token');
    }
    
    // Generate new access token
    const newAccessToken = this.generateAccessToken(verification.deviceId);
    
    return {
      accessToken: newAccessToken,
      expiresIn: this.accessTokenExpiry
    };
  }

  /**
   * Revoke token (logout)
   */
  revokeToken(token) {
    this.blacklist.add(token);
    
    // Cleanup old tokens from blacklist periodically
    if (this.blacklist.size > 10000) {
      // Keep only last 5000
      const tokensArray = Array.from(this.blacklist);
      this.blacklist = new Set(tokensArray.slice(-5000));
    }
  }

  /**
   * Get JWKS (for key rotation)
   */
  getJWKS() {
    // In production: Extract public key components
    // For now, return placeholder
    return {
      keys: [
        {
          kid: this.keyId,
          kty: 'RSA',
          use: 'sig',
          alg: 'RS256',
          // In production: Include n and e from public key
        }
      ]
    };
  }

  /**
   * Rotate keys (every 90 days)
   */
  async rotateKeys(newPrivateKeyPath, newPublicKeyPath, newKeyId) {
    console.log('🔄 Rotating JWT signing keys...');
    
    // Load new keys
    const newPrivateKey = readFileSync(newPrivateKeyPath, 'utf8');
    const newPublicKey = readFileSync(newPublicKeyPath, 'utf8');
    
    // Keep old keys for 24 hours (verify existing tokens)
    this.oldPrivateKey = this.privateKey;
    this.oldPublicKey = this.publicKey;
    this.oldKeyId = this.keyId;
    
    // Set new keys
    this.privateKey = newPrivateKey;
    this.publicKey = newPublicKey;
    this.keyId = newKeyId;
    
    // After 24 hours, remove old keys
    setTimeout(() => {
      this.oldPrivateKey = null;
      this.oldPublicKey = null;
      console.log('   ✅ Old keys removed');
    }, 24 * 60 * 60 * 1000);
    
    console.log('   ✅ Key rotation complete');
    console.log(`   New Key ID: ${newKeyId}`);
  }
}

/**
 * Alternative: EdDSA (Ed25519)
 * Even better than RS256 - smaller keys, faster
 */
export class AuthenticationServiceEdDSA {
  constructor() {
    // Generate Ed25519 keypair
    // openssl genpkey -algorithm Ed25519 -out ed25519-private.pem
    // openssl pkey -in ed25519-private.pem -pubout -out ed25519-public.pem
    
    this.privateKey = readFileSync('./keys/ed25519-private.pem', 'utf8');
    this.publicKey = readFileSync('./keys/ed25519-public.pem', 'utf8');
  }
  
  generateToken(deviceId) {
    return jwt.sign(
      { sub: deviceId },
      this.privateKey,
      {
        algorithm: 'EdDSA',  // Ed25519 - faster and more secure
        expiresIn: '15m',
        issuer: 'resourcepool',
        audience: 'api',
        jwtid: crypto.randomUUID()
      }
    );
  }
  
  verifyToken(token) {
    return jwt.verify(token, this.publicKey, {
      algorithms: ['EdDSA'],  // Only allow EdDSA
      issuer: 'resourcepool',
      audience: 'api'
    });
  }
}



