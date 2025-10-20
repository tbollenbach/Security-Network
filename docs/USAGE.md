# Usage Guide

Learn how to use the Resource Pooling Network application to connect devices and share resources.

## Getting Started

### First Launch

1. **Start the Backend Server** on one computer on your network:
   ```bash
   cd backend_server
   npm start
   ```

2. **Launch the App** on each device you want to connect

3. **Automatic Connection**: The app will automatically discover and connect to the server on your local network

## Main Interface

### Dashboard Tab

The Dashboard shows:
- **Local Resources**: Your device's CPU, Memory, Storage, and GPU usage
- **Network Overview**: Combined resources from all connected devices
- **Device Count**: Number of devices in the network

#### Understanding Resource Monitors

- **Circular Progress**: Shows percentage of resource in use
- **Green**: Healthy usage (< 70%)
- **Orange**: High usage (70-90%)
- **Red**: Critical usage (> 90%)

### Devices Tab

View all connected devices in the network:

- **Device Cards**: Show each device's name, platform, and IP
- **Expand Card**: Tap to see detailed resource breakdown
- **Status Indicator**: 
  - 🟢 Green dot = Online
  - 🔴 Red dot = Offline

#### Device Information

Each device card displays:
- CPU usage and core count
- Memory usage and total RAM
- Storage usage and total capacity
- GPU information (if available)

### Settings Tab

Configure your app and device settings:

#### Device Information
- **Device ID**: Your unique device identifier
- **Platform**: Operating system

#### Network Settings
- **Server Address**: Current server connection
- **Auto-discover**: Automatically find servers (toggle on/off)
- **Manual Connect**: Connect to a specific server address

#### Resource Sharing
Toggle which resources you want to share:
- **Share CPU**: Allow others to use your CPU power
- **Share Storage**: Provide storage to the network
- **Share GPU**: Share GPU resources (if available)

## Common Use Cases

### 1. Distributed Computing

**Scenario**: You have a heavy computation task

1. Submit your task through the app
2. The server automatically distributes it across available devices
3. Results are collected and returned to you

**Example Applications**:
- Video rendering
- 3D modeling
- Machine learning training
- Data processing
- Scientific simulations

### 2. Storage Pooling

**Scenario**: Need more storage space

1. Enable "Share Storage" on devices with free space
2. Your files are automatically distributed across the network
3. Access them from any device

**Benefits**:
- Increased total storage
- Automatic redundancy
- Load balancing

### 3. GPU Sharing

**Scenario**: Need GPU for rendering but don't have one

1. Other devices with GPUs share their resources
2. Your tasks use their GPU power
3. Processed results are sent back to you

**Use Cases**:
- AI/ML inference
- Video editing
- Game streaming
- Graphics rendering

### 4. Mobile + Desktop Integration

**Scenario**: Use your phone and computer together

1. Connect both to the same network
2. Heavy tasks on phone use desktop's resources
3. Desktop can access phone's sensors/data

**Benefits**:
- Extend battery life on mobile
- Utilize more powerful desktop hardware
- Seamless cross-device workflows

## Advanced Features

### Resource Allocation

The system intelligently allocates resources based on:
- **Availability**: Only uses free/available resources
- **Fairness**: Distributes load evenly
- **Priority**: Critical tasks get precedence
- **Limits**: Respects configured maximum allocations

### Automatic Load Balancing

- Tasks are distributed based on current device load
- Overloaded devices receive fewer new tasks
- Idle devices receive more work
- Dynamic reallocation if devices disconnect

### Security Features

- Device authentication (optional)
- Encrypted communication (configure in server)
- Resource usage limits
- Network isolation options

## Monitoring and Management

### Real-time Updates

- Resource usage updates every 2 seconds
- Device status checked every 5 seconds
- Automatic reconnection if disconnected

### Performance Metrics

View detailed statistics:
- Total pooled resources
- Resource utilization rates
- Task completion times
- Network throughput

### Device Management

- Manually disconnect devices
- View device history
- Export usage logs
- Configure per-device limits

## Tips and Best Practices

### Optimization

1. **Connect via Ethernet**: Better performance than Wi-Fi
2. **Keep Devices Plugged In**: Prevent battery drain during heavy usage
3. **Close Background Apps**: More resources available for pooling
4. **Use Desktop as Server**: More reliable than mobile/laptop

### Troubleshooting

**Connection Issues**:
- Ensure all devices on same network
- Check firewall settings
- Try manual server connection
- Restart the server

**Performance Issues**:
- Reduce number of connected devices
- Lower resource allocation limits
- Check network bandwidth
- Update to latest version

**Resource Not Sharing**:
- Verify sharing is enabled in Settings
- Check resource limits in server config
- Ensure device has available resources
- Restart the app

### Best Practices

1. **Start Small**: Connect 2-3 devices first to test
2. **Monitor Usage**: Watch resource monitors during tasks
3. **Set Limits**: Configure reasonable allocation limits
4. **Regular Updates**: Keep all devices updated
5. **Stable Network**: Use reliable network connection

## API Usage (Advanced)

For developers who want to integrate with the system:

### Submit Task via API

```bash
curl -X POST http://server:3000/api/task \
  -H "Content-Type: application/json" \
  -d '{
    "type": "compute",
    "requirements": {
      "cpu": 50,
      "memory": 2048,
      "gpu": false
    },
    "data": {
      "command": "your-task-data"
    }
  }'
```

### Check Pool Status

```bash
curl http://server:3000/api/resources
```

### Get Connected Devices

```bash
curl http://server:3000/api/devices
```

See [API.md](API.md) for complete API documentation.

## Support

For issues, questions, or feature requests:
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Review [FAQ.md](FAQ.md)
- Submit issues on GitHub



