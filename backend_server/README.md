# Resource Pooling Backend Server

Node.js backend server for the Resource Pooling Network.

## Features

- WebSocket server for real-time device communication
- REST API for device and resource queries
- Automatic device discovery via mDNS
- Resource pooling and allocation
- Task distribution system
- Device health monitoring

## Installation

```bash
npm install
```

## Configuration

Edit `config.json` to customize:

```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  },
  "discovery": {
    "enabled": true,
    "serviceName": "_resourcepool._tcp",
    "servicePort": 3000
  },
  "resources": {
    "maxCpuAllocation": 80,
    "maxMemoryAllocation": 80,
    "maxStorageAllocation": 50,
    "enableGpuSharing": true
  },
  "security": {
    "requireAuth": false,
    "maxDevices": 100
  },
  "monitoring": {
    "updateInterval": 2000,
    "deviceTimeout": 30000
  }
}
```

## Usage

### Development

```bash
npm start
```

### Production

```bash
npm install -g pm2
pm2 start src/server.js --name resource-pool
```

## API Endpoints

### REST API

- `GET /` - Server status
- `GET /api/devices` - List connected devices
- `GET /api/resources` - Resource pool status
- `GET /api/stats` - System statistics

### WebSocket

Connect to `ws://server:3000/ws`

**Message Types:**
- `register` - Register device
- `heartbeat` - Keep connection alive
- `resource_update` - Update device resources
- `resource_request` - Request resource allocation
- `task_submit` - Submit distributed task

See [../docs/API.md](../docs/API.md) for complete API documentation.

## Architecture

```
src/
├── server.js           # Main server and WebSocket handling
├── device-manager.js   # Device registration and tracking
├── resource-pool.js    # Resource allocation and pooling
└── discovery.js        # mDNS service discovery
```

## Dependencies

- `express` - HTTP server and REST API
- `ws` - WebSocket server
- `bonjour-service` - mDNS/Bonjour service discovery
- `systeminformation` - System resource information
- `uuid` - Unique ID generation
- `cors` - Cross-origin resource sharing

## License

MIT



