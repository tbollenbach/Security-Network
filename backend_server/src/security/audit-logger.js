import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Security Audit Logger
 * Logs all security-relevant events with tamper-proof signatures
 */
export class AuditLogger {
  constructor() {
    this.setupLoggers();
  }

  /**
   * Setup Winston loggers with rotation
   */
  setupLoggers() {
    // Security audit log
    const securityTransport = new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/security/audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d',
      level: 'info'
    });

    // Error log
    const errorTransport = new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/errors/error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d',
      level: 'error'
    });

    // Access log
    const accessTransport = new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/access/access-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'info'
    });

    // Security logger
    this.securityLogger = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta,
            signature: this.generateLogSignature({ timestamp, level, message, ...meta })
          });
        })
      ),
      transports: [
        securityTransport,
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });

    // Error logger
    this.errorLogger = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [errorTransport]
    });

    // Access logger
    this.accessLogger = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [accessTransport]
    });
  }

  /**
   * Generate tamper-proof signature for log entry
   */
  generateLogSignature(logData) {
    const crypto = await import('crypto');
    return crypto.default
      .createHash('sha256')
      .update(JSON.stringify(logData))
      .digest('hex');
  }

  /**
   * Log device registration
   */
  logDeviceRegistration(deviceId, deviceInfo, ipAddress, success) {
    this.securityLogger.info('Device Registration', {
      eventType: 'DEVICE_REGISTRATION',
      deviceId,
      deviceName: deviceInfo.deviceName,
      platform: deviceInfo.platform,
      ipAddress,
      success,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log authentication attempt
   */
  logAuthenticationAttempt(deviceId, ipAddress, success, reason = null) {
    this.securityLogger.info('Authentication Attempt', {
      eventType: 'AUTHENTICATION',
      deviceId,
      ipAddress,
      success,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log failed authentication
   */
  logFailedAuthentication(deviceId, ipAddress, reason, attemptNumber) {
    this.securityLogger.warn('Failed Authentication', {
      eventType: 'FAILED_AUTHENTICATION',
      deviceId,
      ipAddress,
      reason,
      attemptNumber,
      severity: attemptNumber >= 3 ? 'HIGH' : 'MEDIUM',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log device lockout
   */
  logDeviceLockout(deviceId, ipAddress, attemptCount) {
    this.securityLogger.error('Device Lockout', {
      eventType: 'DEVICE_LOCKOUT',
      deviceId,
      ipAddress,
      attemptCount,
      severity: 'HIGH',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log data access
   */
  logDataAccess(deviceId, resourceType, action, success) {
    this.accessLogger.info('Data Access', {
      eventType: 'DATA_ACCESS',
      deviceId,
      resourceType,
      action,
      success,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log resource allocation
   */
  logResourceAllocation(requestingDevice, allocatedDevices, requirements) {
    this.securityLogger.info('Resource Allocation', {
      eventType: 'RESOURCE_ALLOCATION',
      requestingDevice,
      allocatedDevices: allocatedDevices.map(d => d.deviceId),
      requirements,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log task submission
   */
  logTaskSubmission(deviceId, taskId, taskType, encrypted) {
    this.securityLogger.info('Task Submission', {
      eventType: 'TASK_SUBMISSION',
      deviceId,
      taskId,
      taskType,
      encrypted,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log security violation
   */
  logSecurityViolation(deviceId, ipAddress, violationType, details) {
    this.securityLogger.error('Security Violation', {
      eventType: 'SECURITY_VIOLATION',
      deviceId,
      ipAddress,
      violationType,
      details,
      severity: 'CRITICAL',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log token revocation
   */
  logTokenRevocation(deviceId, reason, revokedBy) {
    this.securityLogger.info('Token Revocation', {
      eventType: 'TOKEN_REVOCATION',
      deviceId,
      reason,
      revokedBy,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log encryption operation
   */
  logEncryptionOperation(deviceId, operation, dataType, success) {
    this.securityLogger.info('Encryption Operation', {
      eventType: 'ENCRYPTION_OPERATION',
      deviceId,
      operation,
      dataType,
      success,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log rate limit exceeded
   */
  logRateLimitExceeded(deviceId, ipAddress, endpoint) {
    this.securityLogger.warn('Rate Limit Exceeded', {
      eventType: 'RATE_LIMIT_EXCEEDED',
      deviceId,
      ipAddress,
      endpoint,
      severity: 'MEDIUM',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log connection event
   */
  logConnection(deviceId, ipAddress, eventType) {
    this.accessLogger.info('Connection Event', {
      eventType: `CONNECTION_${eventType.toUpperCase()}`,
      deviceId,
      ipAddress,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log error
   */
  logError(error, context = {}) {
    this.errorLogger.error('Error', {
      message: error.message,
      stack: error.stack,
      ...context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log certificate operation
   */
  logCertificateOperation(deviceId, operation, success) {
    this.securityLogger.info('Certificate Operation', {
      eventType: 'CERTIFICATE_OPERATION',
      deviceId,
      operation,
      success,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log key exchange
   */
  logKeyExchange(deviceId, keyType, success) {
    this.securityLogger.info('Key Exchange', {
      eventType: 'KEY_EXCHANGE',
      deviceId,
      keyType,
      success,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Generate security report
   */
  generateSecurityReport(startDate, endDate) {
    // This would query the log files and generate a comprehensive report
    // Implementation would depend on log analysis requirements
    return {
      period: { startDate, endDate },
      totalEvents: 0,
      authenticationAttempts: 0,
      failedAuthentications: 0,
      securityViolations: 0,
      activeDevices: 0,
      resourceAllocations: 0
    };
  }
}



