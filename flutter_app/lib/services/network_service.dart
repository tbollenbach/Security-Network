import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:multicast_dns/multicast_dns.dart';
import '../models/device_model.dart';

class NetworkService extends ChangeNotifier {
  WebSocketChannel? _channel;
  List<DeviceModel> _connectedDevices = [];
  String? _serverAddress;
  bool _isConnected = false;
  String? _deviceId;
  String? _deviceName;
  Timer? _heartbeatTimer;
  Timer? _discoveryTimer;

  List<DeviceModel> get connectedDevices => _connectedDevices;
  bool get isConnected => _isConnected;
  String? get deviceId => _deviceId;
  String? get serverAddress => _serverAddress;

  NetworkService() {
    _initializeDevice();
    _startDiscovery();
  }

  Future<void> _initializeDevice() async {
    final deviceInfo = DeviceInfoPlugin();
    
    try {
      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        _deviceId = androidInfo.id;
        _deviceName = '${androidInfo.brand} ${androidInfo.model}';
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        _deviceId = iosInfo.identifierForVendor ?? 'ios-${DateTime.now().millisecondsSinceEpoch}';
        _deviceName = '${iosInfo.name} (${iosInfo.model})';
      } else if (Platform.isWindows) {
        final windowsInfo = await deviceInfo.windowsInfo;
        _deviceId = windowsInfo.deviceId;
        _deviceName = windowsInfo.computerName;
      } else if (Platform.isMacOS) {
        final macInfo = await deviceInfo.macOsInfo;
        _deviceId = macInfo.systemGUID ?? 'mac-${DateTime.now().millisecondsSinceEpoch}';
        _deviceName = macInfo.computerName;
      } else if (Platform.isLinux) {
        final linuxInfo = await deviceInfo.linuxInfo;
        _deviceId = linuxInfo.machineId ?? 'linux-${DateTime.now().millisecondsSinceEpoch}';
        _deviceName = linuxInfo.prettyName;
      }
    } catch (e) {
      _deviceId = 'device-${DateTime.now().millisecondsSinceEpoch}';
      _deviceName = 'Unknown Device';
    }
    
    notifyListeners();
  }

  Future<void> _startDiscovery() async {
    // Start mDNS discovery for the server
    _discoveryTimer = Timer.periodic(const Duration(seconds: 10), (timer) {
      _discoverServer();
    });
    
    // Initial discovery
    await _discoverServer();
  }

  Future<void> _discoverServer() async {
    try {
      final MDnsClient client = MDnsClient();
      await client.start();

      await for (final PtrResourceRecord ptr in client.lookup<PtrResourceRecord>(
        ResourceRecordQuery.serverPointer('_resourcepool._tcp'),
      )) {
        await for (final SrvResourceRecord srv in client.lookup<SrvResourceRecord>(
          ResourceRecordQuery.service(ptr.domainName),
        )) {
          _serverAddress = '${srv.target}:${srv.port}';
          await connectToServer(_serverAddress!);
          break;
        }
      }
      
      client.stop();
    } catch (e) {
      debugPrint('Discovery error: $e');
    }
  }

  Future<void> connectToServer(String address) async {
    if (_isConnected) return;

    try {
      final uri = Uri.parse('ws://$address/ws');
      _channel = WebSocketChannel.connect(uri);
      
      // Register this device
      _channel?.sink.add(jsonEncode({
        'type': 'register',
        'deviceId': _deviceId,
        'deviceName': _deviceName,
        'platform': Platform.operatingSystem,
      }));

      _isConnected = true;
      _serverAddress = address;
      
      // Listen for messages
      _channel?.stream.listen(
        _handleMessage,
        onError: (error) {
          debugPrint('WebSocket error: $error');
          _handleDisconnect();
        },
        onDone: () {
          _handleDisconnect();
        },
      );

      // Start heartbeat
      _startHeartbeat();
      
      notifyListeners();
    } catch (e) {
      debugPrint('Connection error: $e');
      _isConnected = false;
      notifyListeners();
    }
  }

  void _handleMessage(dynamic message) {
    try {
      final data = jsonDecode(message);
      
      switch (data['type']) {
        case 'devices':
          _updateDeviceList(data['devices']);
          break;
        case 'device_joined':
          _addDevice(data['device']);
          break;
        case 'device_left':
          _removeDevice(data['deviceId']);
          break;
        case 'resource_update':
          _updateDeviceResources(data['deviceId'], data['resources']);
          break;
      }
    } catch (e) {
      debugPrint('Message handling error: $e');
    }
  }

  void _updateDeviceList(List<dynamic> devices) {
    _connectedDevices = devices
        .map((d) => DeviceModel.fromJson(d))
        .where((d) => d.id != _deviceId) // Exclude self
        .toList();
    notifyListeners();
  }

  void _addDevice(Map<String, dynamic> deviceData) {
    final device = DeviceModel.fromJson(deviceData);
    if (device.id != _deviceId && !_connectedDevices.any((d) => d.id == device.id)) {
      _connectedDevices.add(device);
      notifyListeners();
    }
  }

  void _removeDevice(String deviceId) {
    _connectedDevices.removeWhere((d) => d.id == deviceId);
    notifyListeners();
  }

  void _updateDeviceResources(String deviceId, Map<String, dynamic> resources) {
    final index = _connectedDevices.indexWhere((d) => d.id == deviceId);
    if (index != -1) {
      final device = _connectedDevices[index];
      _connectedDevices[index] = DeviceModel(
        id: device.id,
        name: device.name,
        platform: device.platform,
        ipAddress: device.ipAddress,
        lastSeen: DateTime.now(),
        resources: ResourceInfo.fromJson(resources),
        isOnline: device.isOnline,
      );
      notifyListeners();
    }
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (_isConnected) {
        _channel?.sink.add(jsonEncode({
          'type': 'heartbeat',
          'deviceId': _deviceId,
        }));
      }
    });
  }

  void _handleDisconnect() {
    _isConnected = false;
    _heartbeatTimer?.cancel();
    _connectedDevices.clear();
    notifyListeners();
  }

  void sendResourceUpdate(ResourceInfo resources) {
    if (_isConnected) {
      _channel?.sink.add(jsonEncode({
        'type': 'resource_update',
        'deviceId': _deviceId,
        'resources': resources.toJson(),
      }));
    }
  }

  void disconnect() {
    _heartbeatTimer?.cancel();
    _discoveryTimer?.cancel();
    _channel?.sink.close();
    _handleDisconnect();
  }

  @override
  void dispose() {
    disconnect();
    super.dispose();
  }
}



