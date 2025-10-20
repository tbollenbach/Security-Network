import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import { readFileSync } from 'fs';
import { DeviceManager } from './device-manager.js';
import { ResourcePool } from './resource-pool.js';
import { DiscoveryService } from './discovery.js';

// Load configuration
const config = JSON.parse(readFileSync('./config.json', 'utf-8'));

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// Initialize services
const deviceManager = new DeviceManager(config);
const resourcePool = new ResourcePool(config, deviceManager);
const discoveryService = new DiscoveryService(config);

// REST API endpoints
app.get('/', (req, res) => {
  res.json({
    service: 'Resource Pooling Network',
    version: '1.0.0',
    devices: deviceManager.getDeviceCount(),
    status: 'online'
  });
});

app.get('/api/devices', (req, res) => {
  res.json({
    devices: deviceManager.getAllDevices()
  });
});

app.get('/api/resources', (req, res) => {
  res.json({
    pool: resourcePool.getPoolStatus()
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    devices: deviceManager.getDeviceCount(),
    resources: resourcePool.getPoolStatus(),
    uptime: process.uptime()
  });
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection from:', req.socket.remoteAddress);
  
  let deviceId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'register':
          deviceId = deviceManager.registerDevice(ws, {
            deviceId: data.deviceId,
            deviceName: data.deviceName,
            platform: data.platform,
            ipAddress: req.socket.remoteAddress
          });
          
          // Send current device list to new device
          ws.send(JSON.stringify({
            type: 'devices',
            devices: deviceManager.getAllDevices()
          }));
          
          // Notify all other devices about new device
          broadcastToOthers(deviceId, {
            type: 'device_joined',
            device: deviceManager.getDevice(deviceId)
          });
          
          console.log(`Device registered: ${data.deviceName} (${deviceId})`);
          break;

        case 'heartbeat':
          if (data.deviceId) {
            deviceManager.updateHeartbeat(data.deviceId);
          }
          break;

        case 'resource_update':
          if (data.deviceId && data.resources) {
            deviceManager.updateDeviceResources(data.deviceId, data.resources);
            resourcePool.updateResources();
            
            // Broadcast resource update to all devices
            broadcast({
              type: 'resource_update',
              deviceId: data.deviceId,
              resources: data.resources
            });
          }
          break;

        case 'resource_request':
          // Handle resource allocation request
          const allocation = resourcePool.allocateResources(data.deviceId, data.requirements);
          ws.send(JSON.stringify({
            type: 'resource_allocation',
            allocation: allocation
          }));
          break;

        case 'task_submit':
          // Handle distributed task submission
          resourcePool.submitTask(data.task, (result) => {
            ws.send(JSON.stringify({
              type: 'task_result',
              taskId: data.task.id,
              result: result
            }));
          });
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  ws.on('close', () => {
    if (deviceId) {
      console.log(`Device disconnected: ${deviceId}`);
      deviceManager.removeDevice(deviceId);
      resourcePool.updateResources();
      
      // Notify all devices about device leaving
      broadcast({
        type: 'device_left',
        deviceId: deviceId
      });
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast to all connected devices
function broadcast(message) {
  const messageStr = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(messageStr);
    }
  });
}

// Broadcast to all devices except the sender
function broadcastToOthers(excludeDeviceId, message) {
  const messageStr = JSON.stringify(message);
  const devices = deviceManager.getAllDevices();
  
  devices.forEach((device) => {
    if (device.id !== excludeDeviceId && device.ws && device.ws.readyState === 1) {
      device.ws.send(messageStr);
    }
  });
}

// Start device cleanup timer
setInterval(() => {
  const removedDevices = deviceManager.cleanupInactiveDevices();
  if (removedDevices.length > 0) {
    removedDevices.forEach((deviceId) => {
      broadcast({
        type: 'device_left',
        deviceId: deviceId
      });
    });
    resourcePool.updateResources();
  }
}, config.monitoring.updateInterval);

// Start the server
server.listen(config.server.port, config.server.host, () => {
  console.log(`Resource Pooling Server running on ${config.server.host}:${config.server.port}`);
  console.log(`WebSocket endpoint: ws://${config.server.host}:${config.server.port}/ws`);
  
  // Start discovery service
  if (config.discovery.enabled) {
    discoveryService.start();
    console.log('mDNS Discovery service started');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  discoveryService.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});



