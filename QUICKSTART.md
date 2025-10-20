# Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **Flutter 3.0+** - [Install](https://flutter.dev/docs/get-started/install)

## Step 1: Start the Backend Server (2 minutes)

```bash
# Navigate to backend directory
cd backend_server

# Install dependencies
npm install

# Start the server
npm start
```

You should see:
```
Resource Pooling Server running on 0.0.0.0:3000
WebSocket endpoint: ws://0.0.0.0:3000/ws
mDNS Discovery service started
```

✅ Server is now running!

## Step 2: Launch the Flutter App (3 minutes)

### On Windows:

```bash
# Navigate to app directory
cd flutter_app

# Get dependencies
flutter pub get

# Run the app
flutter run -d windows
```

### On macOS:

```bash
cd flutter_app
flutter pub get
flutter run -d macos
```

### On Linux:

```bash
cd flutter_app
flutter pub get
flutter run -d linux
```

### On Android:

1. Connect your Android device or start emulator
2. Run:
```bash
cd flutter_app
flutter pub get
flutter run -d android
```

### On iOS (macOS only):

```bash
cd flutter_app
flutter pub get
flutter run -d ios
```

## Step 3: Connect Multiple Devices

1. **Repeat Step 2** on other devices on the same network
2. The apps will **automatically discover** and connect to the server
3. View connected devices in the **Devices tab**

## Verify It's Working

### In the App:

- ✅ **Connection Status** in top-right shows "Connected" (green)
- ✅ **Dashboard** displays your device's resources
- ✅ **Devices tab** shows other connected devices

### Test the Server:

Open browser to `http://localhost:3000`:

```json
{
  "service": "Resource Pooling Network",
  "version": "1.0.0",
  "devices": 2,
  "status": "online"
}
```

## Troubleshooting

### Can't connect to server?

**Try manual connection:**
1. Open app → Settings tab
2. Find your server's IP address:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` or `ip addr`
3. Enter `YOUR_IP:3000` in Server Address
4. Tap Connect

### Port 3000 already in use?

Edit `backend_server/config.json`:
```json
{
  "server": {
    "port": 3001
  }
}
```

### Firewall blocking?

**Windows:**
```powershell
netsh advfirewall firewall add rule name="Resource Pool" dir=in action=allow protocol=TCP localport=3000
```

**Linux:**
```bash
sudo ufw allow 3000/tcp
```

**macOS:**
- System Preferences → Security & Privacy → Firewall → Firewall Options
- Add Node.js to allowed apps

## Next Steps

📚 **Learn more:**
- [Full Setup Guide](docs/SETUP_GUIDE.md)
- [Usage Guide](docs/USAGE.md)
- [API Documentation](docs/API.md)

🎯 **Try these features:**
- Monitor resource usage in Dashboard
- View device details in Devices tab
- Configure sharing in Settings tab

## Need Help?

- Check [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) for detailed setup
- See [docs/USAGE.md](docs/USAGE.md) for usage examples
- Review [docs/API.md](docs/API.md) for API integration

---

**Enjoy resource pooling!** 🚀



