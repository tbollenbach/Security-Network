# Setup Guide

This guide will help you set up the Resource Pooling Network application on all supported platforms.

## Prerequisites

### For Backend Server
- Node.js 18+ installed
- npm or yarn package manager

### For Flutter App
- Flutter SDK 3.0+ installed
- Platform-specific requirements:
  - **Windows**: Visual Studio 2022 with C++ development tools
  - **Android**: Android Studio with Android SDK
  - **iOS**: Xcode 14+ (macOS only)
  - **macOS**: Xcode 14+
  - **Linux**: Standard build tools (gcc, cmake)

## Backend Server Setup

### Step 1: Install Dependencies

```bash
cd backend_server
npm install
```

### Step 2: Configure Settings

Edit `config.json` to customize your setup:

```json
{
  "server": {
    "port": 3000,          // Server port
    "host": "0.0.0.0"      // Listen on all interfaces
  },
  "discovery": {
    "enabled": true,       // Enable automatic device discovery
    "serviceName": "_resourcepool._tcp",
    "servicePort": 3000
  },
  "resources": {
    "maxCpuAllocation": 80,      // Max CPU % to allocate
    "maxMemoryAllocation": 80,    // Max Memory % to allocate
    "maxStorageAllocation": 50,   // Max Storage % to allocate
    "enableGpuSharing": true
  }
}
```

### Step 3: Start the Server

```bash
npm start
```

The server will start on `http://0.0.0.0:3000` and begin broadcasting via mDNS.

### Step 4: Verify Server is Running

Open a browser and navigate to `http://localhost:3000` - you should see:

```json
{
  "service": "Resource Pooling Network",
  "version": "1.0.0",
  "devices": 0,
  "status": "online"
}
```

## Flutter App Setup

### Step 1: Install Dependencies

```bash
cd flutter_app
flutter pub get
```

### Step 2: Platform-Specific Setup

#### Windows

```bash
flutter config --enable-windows-desktop
flutter run -d windows
```

#### Android

1. Connect an Android device or start an emulator
2. Enable USB debugging on your device
3. Run:

```bash
flutter run -d android
```

#### iOS (macOS only)

1. Open `ios/Runner.xcworkspace` in Xcode
2. Configure signing with your Apple Developer account
3. Run:

```bash
flutter run -d ios
```

#### macOS

```bash
flutter config --enable-macos-desktop
flutter run -d macos
```

#### Linux

```bash
flutter config --enable-linux-desktop
flutter run -d linux
```

### Step 3: Build Release Version

To build a release version for distribution:

**Windows:**
```bash
flutter build windows --release
```
Output: `build/windows/runner/Release/`

**Android APK:**
```bash
flutter build apk --release
```
Output: `build/app/outputs/flutter-apk/app-release.apk`

**Android App Bundle:**
```bash
flutter build appbundle --release
```
Output: `build/app/outputs/bundle/release/app-release.aab`

**iOS:**
```bash
flutter build ios --release
```
Then archive in Xcode for App Store distribution.

**macOS:**
```bash
flutter build macos --release
```
Output: `build/macos/Build/Products/Release/`

**Linux:**
```bash
flutter build linux --release
```
Output: `build/linux/x64/release/bundle/`

## Network Configuration

### Firewall Settings

Make sure to allow connections on port 3000 (or your configured port):

**Windows:**
```powershell
netsh advfirewall firewall add rule name="Resource Pool" dir=in action=allow protocol=TCP localport=3000
```

**Linux:**
```bash
sudo ufw allow 3000/tcp
```

**macOS:**
```bash
# Add rule in System Preferences > Security & Privacy > Firewall > Firewall Options
```

### Manual Server Connection

If automatic discovery doesn't work:

1. Open the app
2. Go to Settings tab
3. Tap on "Server Address"
4. Enter your server's IP address and port (e.g., `192.168.1.100:3000`)
5. Tap "Connect"

## Troubleshooting

### Server Issues

**Problem**: Server won't start
- **Solution**: Check if port 3000 is already in use. Change the port in `config.json`

**Problem**: mDNS discovery not working
- **Solution**: Ensure all devices are on the same network. Disable and re-enable discovery in config.

### Flutter App Issues

**Problem**: Can't connect to server
- **Solution**: 
  - Verify server is running
  - Check firewall settings
  - Ensure devices are on same network
  - Try manual connection with IP address

**Problem**: Build fails on Windows
- **Solution**: Install Visual Studio 2022 with C++ development tools

**Problem**: Resource monitoring shows 0
- **Solution**: Run the app with elevated privileges (admin/sudo) for system info access

**Problem**: Android build fails
- **Solution**: 
  - Update Android SDK
  - Run `flutter doctor` to check configuration
  - Check minSdkVersion in `android/app/build.gradle`

## Running in Production

### Backend Server

For production deployment, consider:

1. **Use PM2 for process management:**
```bash
npm install -g pm2
pm2 start src/server.js --name resource-pool
pm2 save
pm2 startup
```

2. **Use nginx as reverse proxy:**
```nginx
upstream resourcepool {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://resourcepool;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. **Enable SSL/TLS:**
```bash
certbot --nginx -d your-domain.com
```

### Flutter App

For production deployment:
- Sign Android APKs with your release keystore
- Configure iOS app signing for distribution
- Set up proper app icons and metadata
- Configure proper permissions in manifests

## Next Steps

- Read [USAGE.md](USAGE.md) for how to use the application
- Check [API.md](API.md) for backend API documentation
- See [ARCHITECTURE.md](ARCHITECTURE.md) for system design details



