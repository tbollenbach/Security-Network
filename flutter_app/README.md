# Resource Pooling Network - Flutter App

Cross-platform Flutter application for connecting devices and sharing hardware resources.

## Supported Platforms

✅ Windows  
✅ macOS  
✅ Linux  
✅ Android  
✅ iOS  

## Features

- 🌐 Automatic device discovery
- 📊 Real-time resource monitoring
- 💻 Multi-platform support
- 🔄 Live device synchronization
- 📱 Beautiful, modern UI

## Installation

### Prerequisites

- Flutter SDK 3.0+
- Platform-specific tools (see [Setup Guide](../docs/SETUP_GUIDE.md))

### Install Dependencies

```bash
flutter pub get
```

## Running the App

### Desktop

**Windows:**
```bash
flutter run -d windows
```

**macOS:**
```bash
flutter run -d macos
```

**Linux:**
```bash
flutter run -d linux
```

### Mobile

**Android:**
```bash
flutter run -d android
```

**iOS:**
```bash
flutter run -d ios
```

## Building

### Release Builds

**Windows:**
```bash
flutter build windows --release
```

**Android APK:**
```bash
flutter build apk --release
```

**iOS:**
```bash
flutter build ios --release
```

**macOS:**
```bash
flutter build macos --release
```

**Linux:**
```bash
flutter build linux --release
```

## Project Structure

```
lib/
├── main.dart                 # App entry point
├── models/
│   └── device_model.dart     # Data models
├── screens/
│   └── home_screen.dart      # Main UI screens
├── services/
│   ├── network_service.dart  # Network & WebSocket
│   └── resource_service.dart # System monitoring
└── widgets/
    ├── device_card.dart      # Device UI components
    ├── resource_monitor.dart # Resource displays
    └── connection_status.dart
```

## Configuration

### Server Connection

The app automatically discovers servers via mDNS. For manual connection:

1. Open Settings tab
2. Enter server address (e.g., `192.168.1.100:3000`)
3. Tap Connect

### Resource Sharing

Configure which resources to share in Settings:
- CPU sharing
- Memory sharing
- Storage sharing
- GPU sharing (if available)

## Dependencies

- `provider` - State management
- `web_socket_channel` - WebSocket communication
- `device_info_plus` - Device information
- `multicast_dns` - Service discovery
- `network_info_plus` - Network details
- `fl_chart` - Charts and graphs
- `shared_preferences` - Local storage

## Development

### Hot Reload

Press `r` in terminal for hot reload during development.

### Debug Mode

```bash
flutter run --debug
```

### Release Mode

```bash
flutter run --release
```

## Troubleshooting

### Connection Issues

- Ensure server is running
- Check firewall settings
- Verify devices on same network
- Try manual connection

### Build Issues

Run Flutter doctor to check setup:
```bash
flutter doctor -v
```

### Platform-Specific Issues

**Android**: Update SDK and build tools  
**iOS**: Check Xcode and signing  
**Windows**: Install Visual Studio with C++ tools  
**Linux**: Install build dependencies  

## Documentation

- [Setup Guide](../docs/SETUP_GUIDE.md)
- [Usage Guide](../docs/USAGE.md)
- [API Documentation](../docs/API.md)

## License

MIT



