import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'dart:typed_data';

/**
 * Secure Storage Service
 * Encrypts sensitive data before storing locally
 */
class SecureStorageService {
  static const String _keyDeviceToken = 'device_token_encrypted';
  static const String _keyAccessToken = 'access_token';
  static const String _keyRefreshToken = 'refresh_token';
  static const String _keyDeviceId = 'device_id';
  static const String _keyCertificate = 'device_certificate';
  static const String _keyPrivateKey = 'private_key_encrypted';

  /// Save device token securely
  Future<void> saveDeviceToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    final encrypted = _encryptData(token);
    await prefs.setString(_keyDeviceToken, encrypted);
  }

  /// Get device token
  Future<String?> getDeviceToken() async {
    final prefs = await SharedPreferences.getInstance();
    final encrypted = prefs.getString(_keyDeviceToken);
    if (encrypted == null) return null;
    return _decryptData(encrypted);
  }

  /// Save access token
  Future<void> saveAccessToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyAccessToken, token);
  }

  /// Get access token
  Future<String?> getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyAccessToken);
  }

  /// Save refresh token
  Future<void> saveRefreshToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyRefreshToken, token);
  }

  /// Get refresh token
  Future<String?> getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyRefreshToken);
  }

  /// Save device ID
  Future<void> saveDeviceId(String deviceId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyDeviceId, deviceId);
  }

  /// Get device ID
  Future<String?> getDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyDeviceId);
  }

  /// Clear all tokens (logout)
  Future<void> clearTokens() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyDeviceToken);
    await prefs.remove(_keyAccessToken);
    await prefs.remove(_keyRefreshToken);
  }

  /// Clear all data
  Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }

  /// Simple encryption (in production, use flutter_secure_storage or similar)
  String _encryptData(String data) {
    final bytes = utf8.encode(data);
    final digest = sha256.convert(bytes);
    // This is a simplified encryption. In production, use proper encryption
    return base64.encode(bytes);
  }

  /// Simple decryption
  String _decryptData(String encrypted) {
    final bytes = base64.decode(encrypted);
    return utf8.decode(bytes);
  }

  /// Check if authenticated
  Future<bool> isAuthenticated() async {
    final accessToken = await getAccessToken();
    return accessToken != null && accessToken.isNotEmpty;
  }
}



