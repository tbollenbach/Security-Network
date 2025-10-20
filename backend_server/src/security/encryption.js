import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import forge from 'node-forge';

/**
 * Fort Knox Level Encryption Service
 * Implements AES-256-GCM for symmetric encryption
 * and RSA-4096 for asymmetric encryption
 */
export class EncryptionService {
  constructor() {
    // AES-256-GCM for data encryption
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.saltLength = 64;
    this.tagLength = 16;
    
    // RSA key size for asymmetric encryption
    this.rsaKeySize = 4096;
    
    // Master encryption key (should be stored securely)
    this.masterKey = this.generateMasterKey();
  }

  /**
   * Generate a cryptographically secure master key
   */
  generateMasterKey() {
    return crypto.randomBytes(this.keyLength);
  }

  /**
   * Generate a secure random key
   */
  generateSecureKey(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Derive a key from password using PBKDF2
   */
  deriveKey(password, salt, iterations = 100000) {
    return crypto.pbkdf2Sync(
      password,
      salt,
      iterations,
      this.keyLength,
      'sha512'
    );
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encryptData(data, key = null) {
    try {
      const encryptionKey = key || this.masterKey;
      const iv = crypto.randomBytes(this.ivLength);
      const salt = crypto.randomBytes(this.saltLength);
      
      // Derive key from master key and salt
      const derivedKey = this.deriveKey(encryptionKey, salt);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, derivedKey, iv);
      
      // Encrypt
      const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(data), 'utf8'),
        cipher.final()
      ]);
      
      // Get auth tag
      const tag = cipher.getAuthTag();
      
      // Combine all parts
      const result = Buffer.concat([salt, iv, tag, encrypted]);
      
      return {
        encrypted: result.toString('base64'),
        algorithm: this.algorithm,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decryptData(encryptedData, key = null) {
    try {
      const encryptionKey = key || this.masterKey;
      const buffer = Buffer.from(encryptedData.encrypted, 'base64');
      
      // Extract components
      const salt = buffer.slice(0, this.saltLength);
      const iv = buffer.slice(this.saltLength, this.saltLength + this.ivLength);
      const tag = buffer.slice(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.tagLength
      );
      const encrypted = buffer.slice(this.saltLength + this.ivLength + this.tagLength);
      
      // Derive key
      const derivedKey = this.deriveKey(encryptionKey, salt);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, derivedKey, iv);
      decipher.setAuthTag(tag);
      
      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate RSA key pair for asymmetric encryption
   */
  generateRSAKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: this.rsaKeySize,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase: this.generateSecureKey()
      }
    });
    
    return { publicKey, privateKey };
  }

  /**
   * Encrypt with RSA public key
   */
  encryptWithPublicKey(data, publicKey) {
    const buffer = Buffer.from(JSON.stringify(data), 'utf8');
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      buffer
    );
    return encrypted.toString('base64');
  }

  /**
   * Decrypt with RSA private key
   */
  decryptWithPrivateKey(encryptedData, privateKey, passphrase) {
    const buffer = Buffer.from(encryptedData, 'base64');
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        passphrase: passphrase,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      buffer
    );
    return JSON.parse(decrypted.toString('utf8'));
  }

  /**
   * Create HMAC signature for data integrity
   */
  createSignature(data, secret) {
    return crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifySignature(data, signature, secret) {
    const expectedSignature = this.createSignature(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Hash password securely
   */
  hashPassword(password, rounds = 12) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, rounds, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verify hashed password
   */
  verifyPassword(password, hashedPassword) {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 12, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(verifyHash));
  }

  /**
   * Generate secure token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Encrypt sensitive file data
   */
  encryptFile(fileBuffer, password) {
    const salt = crypto.randomBytes(this.saltLength);
    const key = this.deriveKey(password, salt);
    const iv = crypto.randomBytes(this.ivLength);
    
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final()
    ]);
    const tag = cipher.getAuthTag();
    
    return Buffer.concat([salt, iv, tag, encrypted]);
  }

  /**
   * Decrypt sensitive file data
   */
  decryptFile(encryptedBuffer, password) {
    const salt = encryptedBuffer.slice(0, this.saltLength);
    const iv = encryptedBuffer.slice(this.saltLength, this.saltLength + this.ivLength);
    const tag = encryptedBuffer.slice(
      this.saltLength + this.ivLength,
      this.saltLength + this.ivLength + this.tagLength
    );
    const encrypted = encryptedBuffer.slice(this.saltLength + this.ivLength + this.tagLength);
    
    const key = this.deriveKey(password, salt);
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(tag);
    
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
  }

  /**
   * Generate device certificate
   */
  generateDeviceCertificate(deviceId, deviceInfo) {
    const keys = forge.pki.rsa.generateKeyPair(this.rsaKeySize);
    const cert = forge.pki.createCertificate();
    
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    
    const attrs = [{
      name: 'commonName',
      value: deviceId
    }, {
      name: 'organizationName',
      value: 'Resource Pooling Network'
    }, {
      shortName: 'OU',
      value: deviceInfo.platform || 'unknown'
    }];
    
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.sign(keys.privateKey, forge.md.sha512.create());
    
    return {
      certificate: forge.pki.certificateToPem(cert),
      privateKey: forge.pki.privateKeyToPem(keys.privateKey),
      publicKey: forge.pki.publicKeyToPem(keys.publicKey)
    };
  }
}



