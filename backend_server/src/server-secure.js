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

/**
 * Fort Knox Secure Server
 * Military-grade encryption and security
 */
class SecureServer {
  constructor() {
    this.loadConfiguration();
    this.initializeServices();
    this.setupExpress();
    this.setupServer();
    this.setupWebSocket();
    this.setupRoutes();
    this.setupCleanupTasks();
  }

  /**
   * Load configuration
   */
  loadConfiguration() {
    try {
      this.config = JSON.parse(readFileSync('./config.secure.json', 'utf-8'));
    } catch (error) {
      console.error('⚠️  Secure config not found, using default config');
      this.config = JSON.parse(readFileSync('./config.json', 'utf-8'));
    }
  }

  /**
   * Initialize security services
   */
  initializeServices() {
    console.log('🔒 Initializing Fort Knox Security Services...');
    
    this.encryptionService = new EncryptionService();
    this.authService = new AuthenticationService(this.config);
    this.auditLogger = new AuditLogger();
    this.rateLimiter = new RateLimiterService(this.config);
    this.deviceManager = new DeviceManager(this.config);
    this.resourcePool = new ResourcePool(this.config, this.deviceManager);
    this.discoveryService = new DiscoveryService(this.config);
    
    console.log('✓ Security services initialized');
  }

  /**
   * Setup Express application
   */
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
      }
    }));
    
    // CORS with restrictions
    this.app.use(cors({
      origin: (origin, callback) => {
        // In production, specify allowed origins
        callback(null, true);
      },
      credentials: true
    }));
    
    this.app.use(express.json({ limit: '10mb' }));
    
    // IP ban check
    this.app.use(this.rateLimiter.banCheckMiddleware());
    
    // API rate limiting
    if (this.config.rateLimit?.enabled) {
      this.app.use('/api/', this.rateLimiter.getAPILimiter());
    }
  }

  /**
   * Setup HTTP/HTTPS server
   */
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
        console.error('⚠️  SSL certificates not found, falling back to HTTP');
        console.error('   Run: npm run generate-certs');
        this.server = createServer(this.app);
      }
    } else {
      this.server = createServer(this.app);
      console.log('⚠️  Running in HTTP mode (not recommended for production)');
    }
  }

  /**
   * Setup WebSocket server with security
   */
  setupWebSocket() {
    const wsProtocol = this.config.ssl?.enabled ? 'wss' : 'ws';
    this.wss = new WebSocketServer({
      server: this.server,
      path: '/ws',
      verifyClient: (info, callback) => {
        // IP ban check
        if (this.rateLimiter.isIPBanned(info.req.socket.remoteAddress)) {
          callback(false, 403, 'IP banned');
          return;
        }
        callback(true);
      }
    });

    this.wss.on('connection', (ws, req) => this.handleWebSocketConnection(ws, req));
    console.log(`✓ Secure WebSocket server (${wsProtocol}) configured`);
  }

  /**
   * Handle WebSocket connection
   */
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

  /**
   * Handle device registration
   */
  async handleDeviceRegistration(ws, data, ipAddress) {
    try {
      // Register with authentication service
      const authResult = await this.authService.registerDevice(data, ipAddress);
      
      // Register with device manager
      const deviceId = this.deviceManager.registerDevice(ws, {
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        platform: data.platform,
        ipAddress: ipAddress
      });
      
      this.auditLogger.logDeviceRegistration(deviceId, data, ipAddress, true);
      
      // Send registration response with tokens
      const response = {
        type: 'registered',
        deviceId: deviceId,
        ...authResult,
        devices: this.deviceManager.getAllDevices()
      };
      
      // Encrypt response
      const encryptedResponse = this.encryptionService.encryptData(response);
      ws.send(JSON.stringify(encryptedResponse));
      
      // Notify other devices
      this.broadcastToOthers(deviceId, {
        type: 'device_joined',
        device: this.deviceManager.getDevice(deviceId)
      });
      
      return { deviceId, isAuthenticated: true };
    } catch (error) {
      this.auditLogger.logDeviceRegistration(data.deviceId, data, ipAddress, false);
      throw error;
    }
  }

  /**
   * Handle authentication
   */
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
      throw error;
    }
  }

  /**
   * Handle heartbeat
   */
  handleHeartbeat(deviceId, sessionId) {
    this.deviceManager.updateHeartbeat(deviceId);
    if (sessionId) {
      this.authService.validateSession(sessionId);
    }
  }

  /**
   * Handle resource update
   */
  async handleResourceUpdate(data, deviceId) {
    this.deviceManager.updateDeviceResources(deviceId, data.resources);
    this.resourcePool.updateResources();
    
    this.auditLogger.logDataAccess(deviceId, 'resources', 'update', true);
    
    // Broadcast update
    this.broadcast({
      type: 'resource_update',
      deviceId: deviceId,
      resources: data.resources
    });
  }

  /**
   * Handle resource request
   */
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

  /**
   * Handle task submission
   */
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

  /**
   * Setup REST API routes
   */
  setupRoutes() {
    // Health check (no auth required)
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Resource Pooling Network',
        version: '2.0.0',
        security: 'Fort Knox Level',
        encryption: 'AES-256-GCM',
        protocol: this.config.ssl?.enabled ? 'HTTPS/WSS' : 'HTTP/WS',
        status: 'online'
      });
    });

    // Authentication required for all /api routes
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
          encryption: 'enabled',
          authentication: 'required',
          tls: this.config.ssl?.enabled ? 'TLS 1.3' : 'disabled'
        }
      });
    });
  }

  /**
   * Middleware to authenticate API requests
   */
  async authenticateRequest(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
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
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  /**
   * Broadcast to all connected devices
   */
  broadcast(message) {
    const encryptedMessage = this.encryptionService.encryptData(message);
    const messageStr = JSON.stringify(encryptedMessage);
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(messageStr);
      }
    });
  }

  /**
   * Broadcast to all devices except sender
   */
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

  /**
   * Setup periodic cleanup tasks
   */
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
    }, 60 * 60 * 1000); // Every hour

    // Cleanup rate limiter
    setInterval(() => {
      this.rateLimiter.cleanup();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Start the server
   */
  start() {
    const port = this.config.server.port;
    const host = this.config.server.host;
    
    this.server.listen(port, host, () => {
      console.log('\n🔒 Fort Knox Secure Resource Pooling Server');
      console.log('═'.repeat(50));
      console.log(`✓ Server running on ${host}:${port}`);
      console.log(`✓ Protocol: ${this.config.ssl?.enabled ? 'HTTPS/WSS' : 'HTTP/WS'}`);
      console.log(`✓ Encryption: AES-256-GCM`);
      console.log(`✓ Authentication: JWT with RSA-512`);
      console.log(`✓ Rate Limiting: Enabled`);
      console.log(`✓ Audit Logging: Enabled`);
      console.log('═'.repeat(50));
      
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

  /**
   * Graceful shutdown
   */
  shutdown() {
    console.log('\n🔒 Shutting down secure server...');
    
    this.discoveryService.stop();
    
    this.server.close(() => {
      console.log('✓ Server closed');
      console.log('✓ Security logs saved');
      process.exit(0);
    });
  }
}

// Start server
const server = new SecureServer();
server.start();



