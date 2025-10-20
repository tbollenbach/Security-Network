# API Documentation

Complete API reference for the Resource Pooling Network backend server.

## Base URL

```
http://your-server:3000
```

## REST API Endpoints

### GET /

Get server status and basic information.

**Response:**
```json
{
  "service": "Resource Pooling Network",
  "version": "1.0.0",
  "devices": 5,
  "status": "online"
}
```

### GET /api/devices

Get list of all connected devices.

**Response:**
```json
{
  "devices": [
    {
      "id": "device-uuid-1",
      "name": "Desktop PC",
      "platform": "windows",
      "ipAddress": "192.168.1.100",
      "lastSeen": "2025-10-20T10:30:00.000Z",
      "isOnline": true,
      "resources": {
        "cpuUsage": 45.5,
        "cpuAvailable": 54.5,
        "cpuCores": 8,
        "memoryUsage": 8192,
        "memoryAvailable": 8192,
        "memoryTotal": 16384,
        "storageUsage": 512000,
        "storageAvailable": 488000,
        "storageTotal": 1000000,
        "hasGPU": true,
        "gpuName": "NVIDIA RTX 3080",
        "gpuUsage": 30.0
      }
    }
  ]
}
```

### GET /api/resources

Get current resource pool status.

**Response:**
```json
{
  "pool": {
    "totalCpuAvailable": 272.5,
    "totalCpuCores": 24,
    "totalMemoryAvailable": 49152,
    "totalStorageAvailable": 2440000,
    "totalGPUs": 3,
    "devices": 5
  }
}
```

### GET /api/stats

Get comprehensive system statistics.

**Response:**
```json
{
  "devices": 5,
  "resources": {
    "totalCpuAvailable": 272.5,
    "totalCpuCores": 24,
    "totalMemoryAvailable": 49152,
    "totalStorageAvailable": 2440000,
    "totalGPUs": 3,
    "devices": 5
  },
  "uptime": 3600
}
```

## WebSocket API

Connect to: `ws://your-server:3000/ws`

### Client Messages

#### Register Device

Register a new device with the server.

```json
{
  "type": "register",
  "deviceId": "unique-device-id",
  "deviceName": "My Laptop",
  "platform": "macos"
}
```

**Server Response:**
```json
{
  "type": "devices",
  "devices": [...]
}
```

#### Heartbeat

Send periodic heartbeat to maintain connection.

```json
{
  "type": "heartbeat",
  "deviceId": "unique-device-id"
}
```

**Frequency:** Every 5 seconds recommended

#### Resource Update

Update device's resource availability.

```json
{
  "type": "resource_update",
  "deviceId": "unique-device-id",
  "resources": {
    "cpuUsage": 45.5,
    "cpuAvailable": 54.5,
    "cpuCores": 8,
    "memoryUsage": 8192,
    "memoryAvailable": 8192,
    "memoryTotal": 16384,
    "storageUsage": 512000,
    "storageAvailable": 488000,
    "storageTotal": 1000000,
    "hasGPU": true,
    "gpuName": "NVIDIA RTX 3080",
    "gpuUsage": 30.0
  }
}
```

**Broadcast:** This update is broadcast to all connected devices.

#### Resource Request

Request resource allocation for a task.

```json
{
  "type": "resource_request",
  "deviceId": "unique-device-id",
  "requirements": {
    "cpu": 100,
    "memory": 4096,
    "storage": 10000,
    "gpu": true
  }
}
```

**Server Response:**
```json
{
  "type": "resource_allocation",
  "allocation": {
    "id": "allocation-uuid",
    "requestingDevice": "unique-device-id",
    "timestamp": "2025-10-20T10:30:00.000Z",
    "requirements": {...},
    "fulfilled": true,
    "allocatedDevices": [
      {
        "deviceId": "device-2",
        "deviceName": "Desktop PC",
        "allocatedCpu": 50,
        "allocatedMemory": 2048,
        "allocatedStorage": 5000,
        "allocatedGpu": true
      },
      {
        "deviceId": "device-3",
        "deviceName": "Workstation",
        "allocatedCpu": 50,
        "allocatedMemory": 2048,
        "allocatedStorage": 5000,
        "allocatedGpu": false
      }
    ]
  }
}
```

#### Task Submission

Submit a distributed task for execution.

```json
{
  "type": "task_submit",
  "task": {
    "id": "task-uuid",
    "type": "compute",
    "submitterId": "unique-device-id",
    "requirements": {
      "cpu": 100,
      "memory": 4096,
      "storage": 1000,
      "gpu": false
    },
    "data": {
      "command": "process-data",
      "input": "..."
    }
  }
}
```

**Server Response:**
```json
{
  "type": "task_result",
  "taskId": "task-uuid",
  "result": {
    "success": true,
    "result": "processed-output"
  }
}
```

### Server Messages

#### Device List

Sent to newly connected devices or when device list changes.

```json
{
  "type": "devices",
  "devices": [...]
}
```

#### Device Joined

Broadcast when a new device connects.

```json
{
  "type": "device_joined",
  "device": {
    "id": "new-device-id",
    "name": "New Device",
    "platform": "android",
    "ipAddress": "192.168.1.105",
    "lastSeen": "2025-10-20T10:30:00.000Z",
    "isOnline": true,
    "resources": {...}
  }
}
```

#### Device Left

Broadcast when a device disconnects.

```json
{
  "type": "device_left",
  "deviceId": "device-id"
}
```

#### Resource Update

Broadcast when any device updates its resources.

```json
{
  "type": "resource_update",
  "deviceId": "device-id",
  "resources": {...}
}
```

## Resource Requirements Format

When requesting resources, use this format:

```json
{
  "cpu": 100,        // CPU percentage needed (0-100 per core)
  "memory": 4096,    // Memory in MB
  "storage": 10000,  // Storage in MB
  "gpu": true        // Whether GPU is required (boolean)
}
```

## Error Handling

### WebSocket Errors

The server may close the connection with these codes:

- `1000`: Normal closure
- `1001`: Going away (server shutdown)
- `1002`: Protocol error
- `1003`: Invalid data type
- `1008`: Policy violation
- `1011`: Internal server error

### REST API Errors

Standard HTTP status codes:

- `200`: Success
- `400`: Bad Request
- `404`: Not Found
- `500`: Internal Server Error
- `503`: Service Unavailable

Error response format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Rate Limits

Current limits (configurable in server):
- REST API: 100 requests/minute per IP
- WebSocket: No limit on messages, but heartbeat required every 30s
- Device limit: 100 devices per server (configurable)

## Example Client Implementation

### JavaScript/Node.js

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
  // Register device
  ws.send(JSON.stringify({
    type: 'register',
    deviceId: 'my-device-1',
    deviceName: 'My Computer',
    platform: 'linux'
  }));

  // Send heartbeat every 5 seconds
  setInterval(() => {
    ws.send(JSON.stringify({
      type: 'heartbeat',
      deviceId: 'my-device-1'
    }));
  }, 5000);

  // Update resources every 2 seconds
  setInterval(() => {
    ws.send(JSON.stringify({
      type: 'resource_update',
      deviceId: 'my-device-1',
      resources: getSystemResources()
    }));
  }, 2000);
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message.type);
  
  switch(message.type) {
    case 'devices':
      console.log('Connected devices:', message.devices.length);
      break;
    case 'device_joined':
      console.log('New device:', message.device.name);
      break;
    case 'device_left':
      console.log('Device left:', message.deviceId);
      break;
  }
});
```

### Python

```python
import websocket
import json
import time
import threading

def on_message(ws, message):
    data = json.loads(message)
    print(f"Received: {data['type']}")

def on_open(ws):
    # Register
    ws.send(json.dumps({
        'type': 'register',
        'deviceId': 'my-device-1',
        'deviceName': 'My Computer',
        'platform': 'linux'
    }))
    
    # Heartbeat thread
    def heartbeat():
        while True:
            ws.send(json.dumps({
                'type': 'heartbeat',
                'deviceId': 'my-device-1'
            }))
            time.sleep(5)
    
    threading.Thread(target=heartbeat, daemon=True).start()

ws = websocket.WebSocketApp(
    'ws://localhost:3000/ws',
    on_message=on_message,
    on_open=on_open
)

ws.run_forever()
```

## Integration Examples

See the `/examples` directory for complete integration examples in various languages.



