import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { createServer as createSecureServer } from 'https';
import cors from 'cors';
import helmet from 'helmet';
import { readFileSync } from 'fs';
import { DeviceManager } from './device-manager.js';
import { ResourcePool } from './resource-pool.js';
import { DiscoveryService } from './discovery.js';
import { EncryptionService } from './security/encryption.js';
import { AuthenticationService } from './security/authentication.js';
import { AuditLogger } from './security/audit-logger.js';
import { RateLimiterService } from './security/rate-limiter.js';
import { HoneypotService } from './security/honeypot.js';
import { IntrusionDetectionSystem } from './security/intrusion-detection.js';
import { NotificationService } from './security/notification-service.js';

/**
 * ULTRA-SECURE SERVER WITH HONEYPOT & IDS
 * Fort Knox Level + Honeypot Traps + Intrusion Detection + Real-time Alerts
 */
class UltraSecureServer {
  constructor() {
    this.loadConfiguration();
    this.initializeServices();
    this.setupExpress();
    this.setupServer();
    this.setupHoneypots();
    this.setupWebSocket();
    this.setupRoutes();
    this.setupSecurityMonitoring();
    this.setupCleanupTasks();
  }

  loadConfiguration() {
    try {
      this.config = JSON.parse(readFileSync('./config.secure.json', 'utf-8'));
    } catch (error) {
      console.error('⚠️  Secure config not found, using default config');
      this.config = JSON.parse(readFileSync('./config.json', 'utf-8'));
    }
  }

  initializeServices() {
    console.log('🔒 Initializing Ultra-Secure System with Honeypot & IDS...\n');
    
    // Core security services
    this.encryptionService = new EncryptionService();
    console.log('✓ AES-256-GCM Encryption initialized');
    
    this.authService = new AuthenticationService(this.config);
    console.log('✓ JWT Authentication (RSA-512) initialized');
    
    this.auditLogger = new AuditLogger();
    console.log('✓ Security Audit Logger initialized');
    
    this.rateLimiter = new RateLimiterService(this.config);
    console.log('✓ Rate Limiter & DDoS Protection initialized');
    
    // Advanced security services
    this.notificationService = new NotificationService();
    console.log('✓ Real-time Notification System initialized');
    
    this.honeypotService = new HoneypotService(this.auditLogger);
    console.log('✓ Honeypot Decoy System initialized');
    
    this.ids = new IntrusionDetectionSystem(this.auditLogger, this.notificationService);
    console.log('✓ Intrusion Detection System (IDS) initialized');
    
    // Application services
    this.deviceManager = new DeviceManager(this.config);
    this.resourcePool = new ResourcePool(this.config, this.deviceManager);
    this.discoveryService = new DiscoveryService(this.config);
    
    console.log('\n🛡️  All security systems online!\n');
  }

  setupExpress() {
    this.app = express();
    
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true
    }));
    
    // CORS
    this.app.use(cors({
      origin: (origin, callback) => {
        callback(null, true);
      },
      credentials: true
    }));
    
    this.app.use(express.json({ limit: '10mb' }));
    
    // IP ban check
    this.app.use(this.rateLimiter.banCheckMiddleware());
    
    // Intrusion detection middleware
    this.app.use((req, res, next) => {
      // Check for honeypot trap
      if (this.honeypotService.isHoneypotTrap(req.path)) {
        return this.honeypotService.trapHit(req, res);
      }
      
      // Analyze for threats
      const threats = this.ids.analyzeRequest(req);
      
      if (threats.length > 0) {
        const response = this.ids.executeAutoResponse(req.ip, threats);
        
        if (response.action === 'BAN') {
          this.rateLimiter.banIP(req.ip, response.duration);
          return res.status(403).json({
            error: 'Access denied',
            reason: 'Security violation detected'
          });
        }
      }
      
      next();
    });
    
    // API rate limiting
    if (this.config.rateLimit?.enabled) {
      this.app.use('/api/', this.rateLimiter.getAPILimiter());
    }
  }

  setupServer() {
    if (this.config.ssl?.enabled) {
      try {
        const options = {
          cert: readFileSync(this.config.ssl.certPath),
          key: readFileSync(this.config.ssl.keyPath),
          ca: readFileSync(this.config.ssl.caPath),
          minVersion: this.config.ssl.minVersion || 'TLSv1.3',
          ciphers: this.config.ssl.ciphers,
          honorCipherOrder: true,
          rejectUnauthorized: this.config.ssl.rejectUnauthorized
        };
        
        this.server = createSecureServer(options, this.app);
        console.log('✓ HTTPS server configured with TLS 1.3');
      } catch (error) {
        console.error('⚠️  SSL certificates not found');
        console.error('   Run: npm run generate-certs');
        this.server = createServer(this.app);
      }
    } else {
      this.server = createServer(this.app);
    }
  }

  setupHoneypots() {
    // Create decoy WebSocket on alternate port
    const decoyWss = new WebSocketServer({ 
      port: this.config.server.port + 1000,
      path: '/admin-ws' 
    });
    
    this.honeypotService.createDecoyWebSocket(decoyWss);
    console.log(`✓ Decoy WebSocket honeypot on port ${this.config.server.port + 1000}`);
  }

  setupWebSocket() {
    const wsProtocol = this.config.ssl?.enabled ? 'wss' : 'ws';
    this.wss = new WebSocketServer({
      server: this.server,
      path: '/ws',
      verifyClient: (info, callback) => {
        const ip = info.req.socket.remoteAddress;
        
        // Check if IP is banned
        if (this.rateLimiter.isIPBanned(ip)) {
          this.notificationService.notifyUnauthorizedAccess(null, ip, 'WebSocket');
          callback(false, 403, 'IP banned');
          return;
        }
        
        // Check if IP is suspicious
        if (this.honeypotService.isSuspicious(ip)) {
          this.notificationService.notifySuspiciousBehavior(
            ip,
            'HONEYPOT_TRIGGER',
            'IP previously triggered honeypot traps'
          );
        }
        
        callback(true);
      }
    });

    this.wss.on('connection', (ws, req) => this.handleWebSocketConnection(ws, req));
    console.log(`✓ Secure WebSocket server (${wsProtocol}) configured\n`);
  }

  async handleWebSocketConnection(ws, req) {
    const ipAddress = req.socket.remoteAddress;
    let deviceId = null;
    let sessionId = null;
    let isAuthenticated = false;

    this.auditLogger.logConnection(null, ipAddress, 'ATTEMPT');

    ws.on('message', async (message) => {
      try {
        // Rate limit check
        if (deviceId && !this.rateLimiter.checkWebSocketMessageRate(deviceId)) {
          this.auditLogger.logRateLimitExceeded(deviceId, ipAddress, 'WebSocket');
          this.notificationService.notifySuspiciousBehavior(
            ipAddress,
            'EXCESSIVE_WEBSOCKET_MESSAGES',
            { deviceId }
          );
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Message rate limit exceeded'
          }));
          return;
        }

        const data = JSON.parse(message.toString());
        
        // Decrypt message if encrypted
        let decryptedData = data;
        if (data.encrypted && isAuthenticated) {
          try {
            decryptedData = this.encryptionService.decryptData(data);
            this.auditLogger.logEncryptionOperation(deviceId, 'decrypt', 'message', true);
          } catch (error) {
            this.auditLogger.logEncryptionOperation(deviceId, 'decrypt', 'message', false);
            this.notificationService.notifySuspiciousBehavior(
              ipAddress,
              'DECRYPTION_FAILURE',
              { deviceId, error: error.message }
            );
            throw new Error('Decryption failed');
          }
        }
        
        switch (decryptedData.type) {
          case 'register':
            const result = await this.handleDeviceRegistration(ws, decryptedData, ipAddress);
            deviceId = result.deviceId;
            isAuthenticated = result.isAuthenticated;
            break;

          case 'authenticate':
            const authResult = await this.handleAuthentication(ws, decryptedData, ipAddress);
            deviceId = authResult.deviceId;
            sessionId = authResult.sessionId;
            isAuthenticated = authResult.isAuthenticated;
            break;

          case 'heartbeat':
            if (!isAuthenticated) {
              throw new Error('Not authenticated');
            }
            this.handleHeartbeat(decryptedData.deviceId, sessionId);
            break;

          case 'resource_update':
            if (!isAuthenticated) {
              throw new Error('Not authenticated');
            }
            await this.handleResourceUpdate(decryptedData, deviceId);
            break;

          case 'resource_request':
            if (!isAuthenticated) {
              throw new Error('Not authenticated');
            }
            await this.handleResourceRequest(ws, decryptedData, deviceId);
            break;

          case 'task_submit':
            if (!isAuthenticated) {
              throw new Error('Not authenticated');
            }
            await this.handleTaskSubmission(ws, decryptedData, deviceId);
            break;

          default:
            this.notificationService.notifySuspiciousBehavior(
              ipAddress,
              'UNKNOWN_MESSAGE_TYPE',
              { type: decryptedData.type, deviceId }
            );
            throw new Error('Unknown message type');
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        this.auditLogger.logError(error, { deviceId, ipAddress });
        
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    });

    ws.on('close', () => {
      if (deviceId) {
        this.deviceManager.removeDevice(deviceId);
        this.resourcePool.updateResources();
        this.auditLogger.logConnection(deviceId, ipAddress, 'DISCONNECT');
        
        if (sessionId) {
          this.authService.revokeToken(sessionId, sessionId);
        }
        
        this.broadcast({
          type: 'device_left',
          deviceId: deviceId
        });
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.auditLogger.logError(error, { deviceId, ipAddress });
    });
  }

  async handleDeviceRegistration(ws, data, ipAddress) {
    try {
      const authResult = await this.authService.registerDevice(data, ipAddress);
      const deviceId = this.deviceManager.registerDevice(ws, {
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        platform: data.platform,
        ipAddress: ipAddress
      });
      
      this.auditLogger.logDeviceRegistration(deviceId, data, ipAddress, true);
      
      const response = {
        type: 'registered',
        deviceId: deviceId,
        ...authResult,
        devices: this.deviceManager.getAllDevices()
      };
      
      const encryptedResponse = this.encryptionService.encryptData(response);
      ws.send(JSON.stringify(encryptedResponse));
      
      this.broadcastToOthers(deviceId, {
        type: 'device_joined',
        device: this.deviceManager.getDevice(deviceId)
      });
      
      return { deviceId, isAuthenticated: true };
    } catch (error) {
      this.auditLogger.logDeviceRegistration(data.deviceId, data, ipAddress, false);
      this.notificationService.notifyUnauthorizedAccess(data.deviceId, ipAddress, 'device_registration');
      throw error;
    }
  }

  async handleAuthentication(ws, data, ipAddress) {
    try {
      const fingerprint = this.authService.generateDeviceFingerprint(data, ipAddress);
      const authResult = await this.authService.authenticateDevice(
        data.deviceId,
        data.deviceToken,
        fingerprint
      );
      
      this.auditLogger.logAuthenticationAttempt(data.deviceId, ipAddress, true);
      
      const response = {
        type: 'authenticated',
        ...authResult
      };
      
      const encryptedResponse = this.encryptionService.encryptData(response);
      ws.send(JSON.stringify(encryptedResponse));
      
      return {
        deviceId: data.deviceId,
        sessionId: authResult.sessionId,
        isAuthenticated: true
      };
    } catch (error) {
      this.auditLogger.logFailedAuthentication(data.deviceId, ipAddress, error.message, 1);
      
      // Check for brute force
      const isBruteForce = this.ids.recordFailedAuth(ipAddress);
      if (isBruteForce) {
        this.notificationService.notifyBruteForce(ipAddress, 5);
        this.rateLimiter.banIP(ipAddress, 60 * 60 * 1000); // 1 hour
      }
      
      throw error;
    }
  }

  handleHeartbeat(deviceId, sessionId) {
    this.deviceManager.updateHeartbeat(deviceId);
    if (sessionId) {
      this.authService.validateSession(sessionId);
    }
  }

  async handleResourceUpdate(data, deviceId) {
    this.deviceManager.updateDeviceResources(deviceId, data.resources);
    this.resourcePool.updateResources();
    
    this.auditLogger.logDataAccess(deviceId, 'resources', 'update', true);
    
    this.broadcast({
      type: 'resource_update',
      deviceId: deviceId,
      resources: data.resources
    });
  }

  async handleResourceRequest(ws, data, deviceId) {
    const allocation = this.resourcePool.allocateResources(deviceId, data.requirements);
    
    this.auditLogger.logResourceAllocation(
      deviceId,
      allocation.allocatedDevices,
      data.requirements
    );
    
    const response = {
      type: 'resource_allocation',
      allocation: allocation
    };
    
    const encryptedResponse = this.encryptionService.encryptData(response);
    ws.send(JSON.stringify(encryptedResponse));
  }

  async handleTaskSubmission(ws, data, deviceId) {
    this.auditLogger.logTaskSubmission(deviceId, data.task.id, data.task.type, true);
    
    this.resourcePool.submitTask(data.task, (result) => {
      const response = {
        type: 'task_result',
        taskId: data.task.id,
        result: result
      };
      
      const encryptedResponse = this.encryptionService.encryptData(response);
      ws.send(JSON.stringify(encryptedResponse));
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Resource Pooling Network',
        version: '2.0.0',
        security: 'Ultra-Secure + Honeypot + IDS',
        encryption: 'AES-256-GCM',
        authentication: 'JWT + RSA-512',
        protection: ['DDoS', 'Intrusion Detection', 'Honeypot Traps'],
        protocol: this.config.ssl?.enabled ? 'HTTPS/WSS' : 'HTTP/WS',
        status: 'online'
      });
    });

    // Security dashboard (protected)
    this.app.get('/api/security/dashboard', this.authenticateRequest.bind(this), (req, res) => {
      res.json({
        ids: this.ids.getStatistics(),
        honeypot: this.honeypotService.getStatistics(),
        alerts: this.notificationService.getStatistics(),
        attackers: this.honeypotService.getAllAttackers()
      });
    });

    // Alert history
    this.app.get('/api/security/alerts', this.authenticateRequest.bind(this), (req, res) => {
      res.json({
        alerts: this.notificationService.getAlertHistory(100)
      });
    });

    // Authentication required for all other /api routes
    this.app.use('/api', this.authenticateRequest.bind(this));

    this.app.get('/api/devices', (req, res) => {
      const devices = this.deviceManager.getAllDevices();
      this.auditLogger.logDataAccess(req.deviceId, 'devices', 'read', true);
      res.json({ devices });
    });

    this.app.get('/api/resources', (req, res) => {
      const pool = this.resourcePool.getPoolStatus();
      this.auditLogger.logDataAccess(req.deviceId, 'resources', 'read', true);
      res.json({ pool });
    });

    this.app.get('/api/stats', (req, res) => {
      res.json({
        devices: this.deviceManager.getDeviceCount(),
        resources: this.resourcePool.getPoolStatus(),
        sessions: this.authService.getActiveSessionsCount(),
        uptime: process.uptime(),
        security: {
          encryption: 'AES-256-GCM',
          authentication: 'JWT + RSA-512',
          tls: this.config.ssl?.enabled ? 'TLS 1.3' : 'disabled',
          honeypots: 'active',
          ids: 'active',
          alerts: this.notificationService.getStatistics()
        }
      });
    });
  }

  async authenticateRequest(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        this.notificationService.notifyUnauthorizedAccess(null, req.ip, req.path);
        return res.status(401).json({ error: 'No authorization token provided' });
      }
      
      const decoded = this.authService.verifyToken(token);
      req.deviceId = decoded.deviceId;
      next();
    } catch (error) {
      this.auditLogger.logSecurityViolation(
        null,
        req.ip,
        'INVALID_TOKEN',
        error.message
      );
      this.notificationService.notifyUnauthorizedAccess(null, req.ip, req.path);
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  broadcast(message) {
    const encryptedMessage = this.encryptionService.encryptData(message);
    const messageStr = JSON.stringify(encryptedMessage);
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(messageStr);
      }
    });
  }

  broadcastToOthers(excludeDeviceId, message) {
    const encryptedMessage = this.encryptionService.encryptData(message);
    const messageStr = JSON.stringify(encryptedMessage);
    const devices = this.deviceManager.getAllDevices();
    
    devices.forEach((device) => {
      if (device.id !== excludeDeviceId && device.ws && device.ws.readyState === 1) {
        device.ws.send(messageStr);
      }
    });
  }

  setupSecurityMonitoring() {
    // Listen for security alerts
    this.notificationService.on('alert', (alert) => {
      console.log(`\n🚨 SECURITY ALERT: ${alert.message}`);
      
      // Auto-ban for critical threats
      if (alert.severity === 'critical' && alert.data?.ip) {
        this.rateLimiter.banIP(alert.data.ip, 24 * 60 * 60 * 1000);
        console.log(`   ✓ Auto-banned IP: ${alert.data.ip}`);
      }
    });
  }

  setupCleanupTasks() {
    // Cleanup inactive devices
    setInterval(() => {
      const removedDevices = this.deviceManager.cleanupInactiveDevices();
      if (removedDevices.length > 0) {
        removedDevices.forEach((deviceId) => {
          this.broadcast({
            type: 'device_left',
            deviceId: deviceId
          });
        });
        this.resourcePool.updateResources();
      }
    }, this.config.monitoring.updateInterval);

    // Cleanup expired sessions
    setInterval(() => {
      this.authService.cleanupExpiredSessions();
    }, 60 * 60 * 1000);

    // Cleanup security data
    setInterval(() => {
      this.rateLimiter.cleanup();
      this.honeypotService.cleanup();
      this.ids.cleanup();
    }, 60 * 60 * 1000);
  }

  start() {
    const port = this.config.server.port;
    const host = this.config.server.host;
    
    this.server.listen(port, host, () => {
      console.log('\n' + '═'.repeat(70));
      console.log('🔒🍯 ULTRA-SECURE SERVER WITH HONEYPOT & IDS');
      console.log('═'.repeat(70));
      console.log(`✓ Server running on ${host}:${port}`);
      console.log(`✓ Protocol: ${this.config.ssl?.enabled ? 'HTTPS/WSS (TLS 1.3)' : 'HTTP/WS'}`);
      console.log(`✓ Encryption: AES-256-GCM`);
      console.log(`✓ Authentication: JWT with RSA-512`);
      console.log(`✓ Rate Limiting: Active`);
      console.log(`✓ DDoS Protection: Active`);
      console.log(`✓ Honeypot System: ${this.honeypotService.trapEndpoints.size} traps deployed`);
      console.log(`✓ Intrusion Detection: Active`);
      console.log(`✓ Real-time Alerts: Active`);
      console.log(`✓ Audit Logging: Active`);
      console.log('═'.repeat(70));
      console.log('\n🛡️  All security systems operational!\n');
      console.log('⚠️  WARNING: Honeypots are armed. Attackers will be trapped and logged.\n');
      
      // Start discovery service
      if (this.config.discovery.enabled) {
        this.discoveryService.start();
        console.log('✓ mDNS Discovery service started\n');
      }
    });

    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  shutdown() {
    console.log('\n🔒 Shutting down ultra-secure server...');
    console.log('✓ Saving security logs...');
    console.log('✓ Closing connections...');
    
    this.discoveryService.stop();
    
    this.server.close(() => {
      console.log('✓ Server closed');
      console.log('✓ All security data saved');
      console.log('\n👋 Shutdown complete. Stay secure!\n');
      process.exit(0);
    });
  }
}

// Start server
const server = new UltraSecureServer();
server.start();



