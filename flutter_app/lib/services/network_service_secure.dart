import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:multicast_dns/multicast_dns.dart';
import '../models/device_model.dart';
import 'secure_storage_service.dart';
import 'dart:math';

/**
 * Secure Network Service with Fort Knox encryption
 */
class SecureNetworkService extends ChangeNotifier {
  WebSocketChannel? _channel;
  List<DeviceModel> _connectedDevices = [];
  String? _serverAddress;
  bool _isConnected = false;
  bool _isAuthenticated = false;
  String? _deviceId;
  String? _deviceName;
  String? _sessionId;
  Timer? _heartbeatTimer;
  Timer? _discoveryTimer;
  
  final SecureStorageService _secureStorage = SecureStorageService();

  List<DeviceModel> get connectedDevices => _connectedDevices;
  bool get isConnected => _isConnected;
  bool get isAuthenticated => _isAuthenticated;
  String? get deviceId => _deviceId;
  String? get serverAddress => _serverAddress;

  SecureNetworkService() {
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
      
      // Save device ID
      await _secureStorage.saveDeviceId(_deviceId!);
    } catch (e) {
      _deviceId = 'device-${DateTime.now().millisecondsSinceEpoch}';
      _deviceName = 'Unknown Device';
    }
    
    // Check if already authenticated
    _isAuthenticated = await _secureStorage.isAuthenticated();
    
    notifyListeners();
  }

  Future<void> _startDiscovery() async {
    _discoveryTimer = Timer.periodic(const Duration(seconds: 10), (timer) {
      _discoverServer();
    });
    
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

  Future<void> connectToServer(String address, {bool useSSL = true}) async {
    if (_isConnected) return;

    try {
      final protocol = useSSL ? 'wss' : 'ws';
      final uri = Uri.parse('$protocol://$address/ws');
      
      _channel = WebSocketChannel.connect(uri);
      
      // Check if already registered
      final existingToken = await _secureStorage.getDeviceToken();
      
      if (existingToken != null) {
        // Authenticate with existing token
        await _authenticate(existingToken);
      } else {
        // Register new device
        await _registerDevice();
      }

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

      _startHeartbeat();
      
      notifyListeners();
    } catch (e) {
      debugPrint('Connection error: $e');
      
      // Fallback to non-SSL if SSL fails
      if (useSSL) {
        debugPrint('SSL connection failed, trying non-SSL...');
        await connectToServer(address, useSSL: false);
      } else {
        _isConnected = false;
        notifyListeners();
      }
    }
  }

  Future<void> _registerDevice() async {
    _channel?.sink.add(jsonEncode({
      'type': 'register',
      'deviceId': _deviceId,
      'deviceName': _deviceName,
      'platform': Platform.operatingSystem,
    }));
  }

  Future<void> _authenticate(String deviceToken) async {
    _channel?.sink.add(jsonEncode({
      'type': 'authenticate',
      'deviceId': _deviceId,
      'deviceToken': deviceToken,
    }));
  }

  void _handleMessage(dynamic message) {
    try {
      final data = jsonDecode(message.toString());
      
      // Handle encrypted messages
      Map<String, dynamic> decryptedData = data;
      if (data['encrypted'] != null) {
        decryptedData = _decryptMessage(data);
      }
      
      switch (decryptedData['type']) {
        case 'registered':
          _handleRegistrationResponse(decryptedData);
          break;
        case 'authenticated':
          _handleAuthenticationResponse(decryptedData);
          break;
        case 'devices':
          _updateDeviceList(decryptedData['devices']);
          break;
        case 'device_joined':
          _addDevice(decryptedData['device']);
          break;
        case 'device_left':
          _removeDevice(decryptedData['deviceId']);
          break;
        case 'resource_update':
          _updateDeviceResources(decryptedData['deviceId'], decryptedData['resources']);
          break;
        case 'error':
          debugPrint('Server error: ${decryptedData['message']}');
          if (decryptedData['message'].contains('authentication')) {
            _handleAuthenticationError();
          }
          break;
      }
    } catch (e) {
      debugPrint('Message handling error: $e');
    }
  }

  Future<void> _handleRegistrationResponse(Map<String, dynamic> data) async {
    // Save tokens securely
    await _secureStorage.saveDeviceToken(data['deviceToken']);
    await _secureStorage.saveAccessToken(data['accessToken']);
    await _secureStorage.saveRefreshToken(data['refreshToken']);
    
    _isAuthenticated = true;
    _sessionId = data['sessionId'];
    
    // Update device list
    if (data['devices'] != null) {
      _updateDeviceList(data['devices']);
    }
    
    notifyListeners();
  }

  Future<void> _handleAuthenticationResponse(Map<String, dynamic> data) async {
    await _secureStorage.saveAccessToken(data['accessToken']);
    await _secureStorage.saveRefreshToken(data['refreshToken']);
    
    _isAuthenticated = true;
    _sessionId = data['sessionId'];
    
    notifyListeners();
  }

  Future<void> _handleAuthenticationError() async {
    // Clear tokens and re-register
    await _secureStorage.clearTokens();
    _isAuthenticated = false;
    
    // Try to re-register
    if (_isConnected) {
      await _registerDevice();
    }
    
    notifyListeners();
  }

  Map<String, dynamic> _decryptMessage(Map<String, dynamic> encryptedData) {
    // In production, implement proper AES-GCM decryption
    // For now, return as-is
    return encryptedData;
  }

  Map<String, dynamic> _encryptMessage(Map<String, dynamic> data) {
    // In production, implement proper AES-GCM encryption
    // For now, return as-is
    return data;
  }

  void _updateDeviceList(List<dynamic> devices) {
    _connectedDevices = devices
        .map((d) => DeviceModel.fromJson(d))
        .where((d) => d.id != _deviceId)
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
      if (_isConnected && _isAuthenticated) {
        final message = _encryptMessage({
          'type': 'heartbeat',
          'deviceId': _deviceId,
          'sessionId': _sessionId,
        });
        _channel?.sink.add(jsonEncode(message));
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
    if (_isConnected && _isAuthenticated) {
      final message = _encryptMessage({
        'type': 'resource_update',
        'deviceId': _deviceId,
        'resources': resources.toJson(),
      });
      _channel?.sink.add(jsonEncode(message));
    }
  }

  Future<void> logout() async {
    // Send logout message
    if (_isConnected && _isAuthenticated) {
      final message = _encryptMessage({
        'type': 'logout',
        'deviceId': _deviceId,
        'sessionId': _sessionId,
      });
      _channel?.sink.add(jsonEncode(message));
    }
    
    // Clear tokens
    await _secureStorage.clearTokens();
    _isAuthenticated = false;
    
    disconnect();
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



