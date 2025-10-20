# Architecture Documentation

Detailed technical architecture of the Resource Pooling Network system.

## System Overview

The Resource Pooling Network is a distributed system that enables multiple devices to pool their hardware resources (CPU, GPU, Memory, Storage) for shared use.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Devices                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Windows  │  │  macOS   │  │  Linux   │  │  Mobile  │   │
│  │  Flutter │  │  Flutter │  │  Flutter │  │  Flutter │   │
│  │   App    │  │   App    │  │   App    │  │   App    │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │           │
│       └─────────────┴─────────────┴─────────────┘           │
│                          │                                   │
│                     WebSocket                                │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                          ▼                                    │
│              ┌─────────────────────┐                         │
│              │   Node.js Server    │                         │
│              │                     │                         │
│              │  ┌───────────────┐  │                         │
│              │  │ WebSocket API │  │                         │
│              │  │   REST API    │  │                         │
│              │  └───────┬───────┘  │                         │
│              │          │          │                         │
│              │  ┌───────▼───────┐  │                         │
│              │  │Device Manager │  │                         │
│              │  └───────┬───────┘  │                         │
│              │          │          │                         │
│              │  ┌───────▼───────┐  │                         │
│              │  │Resource Pool  │  │                         │
│              │  └───────┬───────┘  │                         │
│              │          │          │                         │
│              │  ┌───────▼───────┐  │                         │
│              │  │Task Scheduler │  │                         │
│              │  └───────────────┘  │                         │
│              │                     │                         │
│              │  ┌───────────────┐  │                         │
│              │  │mDNS Discovery │  │                         │
│              │  └───────────────┘  │                         │
│              └─────────────────────┘                         │
│                    Backend Server                            │
└──────────────────────────────────────────────────────────────┘
```

## Component Details

### Flutter Application (Client)

#### Technology Stack
- **Framework**: Flutter 3.0+
- **Language**: Dart
- **State Management**: Provider
- **Networking**: WebSocket (web_socket_channel)
- **Platform Support**: Windows, macOS, Linux, Android, iOS

#### Key Components

**1. Main Application (`main.dart`)**
- Entry point
- Provider setup
- Theme configuration
- Multi-platform initialization

**2. Services Layer**

**NetworkService (`network_service.dart`)**
- WebSocket connection management
- Device registration
- Message handling
- Automatic reconnection
- Heartbeat mechanism
- Server discovery via mDNS

**ResourceService (`resource_service.dart`)**
- System resource monitoring
- CPU usage tracking
- Memory monitoring
- Storage tracking
- GPU detection
- Platform-specific implementations

**3. UI Layer**

**Screens:**
- `HomeScreen`: Main navigation and tabs
- `DashboardTab`: Resource overview
- `DevicesTab`: Connected devices list
- `SettingsTab`: Configuration options

**Widgets:**
- `DeviceCard`: Device information display
- `ResourceMonitor`: Resource usage visualization
- `ConnectionStatus`: Connection indicator

**4. Data Models**

**DeviceModel:**
```dart
class DeviceModel {
  String id;
  String name;
  String platform;
  String ipAddress;
  DateTime lastSeen;
  ResourceInfo resources;
  bool isOnline;
}
```

**ResourceInfo:**
```dart
class ResourceInfo {
  double cpuUsage;
  double cpuAvailable;
  int cpuCores;
  double memoryUsage;
  double memoryTotal;
  double storageUsage;
  double storageTotal;
  bool hasGPU;
  String? gpuName;
}
```

### Backend Server

#### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **WebSocket**: ws library
- **Discovery**: bonjour-service (mDNS)
- **System Info**: systeminformation

#### Key Components

**1. Server (`server.js`)**
- HTTP/REST API server
- WebSocket server
- Connection management
- Message routing
- Graceful shutdown

**2. Device Manager (`device-manager.js`)**

Responsibilities:
- Device registration and tracking
- Heartbeat monitoring
- Resource updates
- Device cleanup
- Device queries

Data Structure:
```javascript
Map<deviceId, {
  id: string,
  name: string,
  platform: string,
  ipAddress: string,
  ws: WebSocket,
  lastSeen: Date,
  isOnline: boolean,
  resources: ResourceInfo
}>
```

**3. Resource Pool (`resource-pool.js`)**

Responsibilities:
- Aggregate resource tracking
- Resource allocation
- Task distribution
- Load balancing
- Allocation cleanup

Allocation Algorithm:
1. Receive resource request
2. Query available devices
3. Sort by availability
4. Allocate resources respecting limits
5. Return allocation plan

**4. Discovery Service (`discovery.js`)**

Responsibilities:
- mDNS/Bonjour service publishing
- Service discovery
- Network announcement

Service Details:
- Service Type: `_resourcepool._tcp`
- Port: Configurable (default 3000)
- Metadata: Version, platform

## Communication Protocol

### WebSocket Message Format

All messages use JSON format:

```json
{
  "type": "message_type",
  "...": "additional fields"
}
```

### Message Flow

#### Device Registration
```
Client                          Server
  │                              │
  ├─── register ─────────────────>│
  │                              │ (Store device info)
  │<──── devices ─────────────── │
  │                              │
  │<──── device_joined ──────────┤ (Broadcast to others)
```

#### Heartbeat
```
Client                          Server
  │                              │
  ├─── heartbeat ────────────────>│
  │                              │ (Update lastSeen)
  │                              │
  (Every 5 seconds)
```

#### Resource Updates
```
Client                          Server
  │                              │
  ├─── resource_update ──────────>│
  │                              │ (Update device resources)
  │                              │ (Update resource pool)
  │<──── resource_update ────────┤ (Broadcast to all)
```

#### Task Submission
```
Client                          Server
  │                              │
  ├─── task_submit ──────────────>│
  │                              │ (Allocate resources)
  │                              │ (Distribute task)
  │                              │ (Execute on devices)
  │<──── task_result ────────────┤
```

## Resource Allocation Algorithm

### Phase 1: Resource Discovery
1. Query all online devices
2. Filter by available resources
3. Exclude requesting device
4. Apply allocation limits

### Phase 2: Allocation
```javascript
for each device in available_devices {
  allocate_cpu = min(device.cpu_available, required_cpu, max_cpu_limit)
  allocate_memory = min(device.memory_available, required_memory, max_memory_limit)
  allocate_storage = min(device.storage_available, required_storage, max_storage_limit)
  
  if (device.has_gpu && required_gpu) {
    allocate_gpu = true
  }
  
  required_cpu -= allocate_cpu
  required_memory -= allocate_memory
  required_storage -= allocate_storage
}
```

### Phase 3: Fulfillment Check
```javascript
fulfilled = (required_cpu <= 0) && 
            (required_memory <= 0) && 
            (required_storage <= 0) && 
            (!required_gpu || gpu_allocated)
```

## Security Considerations

### Current Implementation
- Network-level isolation (local network only)
- No authentication (trust-based)
- Plain WebSocket (unencrypted)

### Recommended Enhancements
1. **Authentication**
   - Device tokens
   - User accounts
   - OAuth integration

2. **Encryption**
   - WSS (WebSocket Secure)
   - TLS/SSL certificates
   - End-to-end encryption for tasks

3. **Authorization**
   - Role-based access control
   - Resource usage quotas
   - Task approval system

4. **Audit**
   - Activity logging
   - Resource usage tracking
   - Security event monitoring

## Scalability

### Current Limitations
- Single server instance
- In-memory device storage
- No persistence
- Limited to ~100 devices

### Scaling Strategies

**Horizontal Scaling:**
- Multiple server instances
- Load balancer
- Shared state (Redis)
- Device partitioning

**Vertical Scaling:**
- Increase server resources
- Optimize algorithms
- Caching strategies
- Connection pooling

**Geographic Distribution:**
- Regional servers
- Edge computing nodes
- CDN for static assets
- Multi-region deployment

## Performance Optimization

### Client-Side
- Resource monitoring throttling
- Message batching
- Local caching
- Lazy loading

### Server-Side
- Connection pooling
- Message queuing
- Efficient data structures
- Asynchronous operations

### Network
- Message compression
- Binary protocols
- Reduced message frequency
- Adaptive quality

## Monitoring and Observability

### Metrics to Track
- Device count
- Resource utilization
- Task completion rate
- Connection latency
- Error rates
- Server uptime

### Logging
- Device events
- Task execution
- Resource allocation
- Errors and exceptions
- Performance metrics

### Recommended Tools
- Prometheus (metrics)
- Grafana (visualization)
- ELK Stack (logging)
- Sentry (error tracking)

## Future Enhancements

### Planned Features
1. **Persistent Storage**
   - Database integration
   - Device history
   - Task logs

2. **Advanced Scheduling**
   - Priority queues
   - Resource reservations
   - Time-based allocation

3. **Mobile Optimization**
   - Battery awareness
   - Network efficiency
   - Background operation

4. **Enhanced UI**
   - Real-time charts
   - Task management
   - Performance analytics

5. **API Extensions**
   - REST API for all operations
   - GraphQL endpoint
   - Webhook support

6. **Integration**
   - Cloud provider integration
   - Container orchestration
   - CI/CD pipelines



