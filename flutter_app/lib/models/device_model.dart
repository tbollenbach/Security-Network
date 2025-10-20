class DeviceModel {
  final String id;
  final String name;
  final String platform;
  final String ipAddress;
  final DateTime lastSeen;
  final ResourceInfo resources;
  final bool isOnline;

  DeviceModel({
    required this.id,
    required this.name,
    required this.platform,
    required this.ipAddress,
    required this.lastSeen,
    required this.resources,
    this.isOnline = true,
  });

  factory DeviceModel.fromJson(Map<String, dynamic> json) {
    return DeviceModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      platform: json['platform'] ?? '',
      ipAddress: json['ipAddress'] ?? '',
      lastSeen: DateTime.parse(json['lastSeen'] ?? DateTime.now().toIso8601String()),
      resources: ResourceInfo.fromJson(json['resources'] ?? {}),
      isOnline: json['isOnline'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'platform': platform,
      'ipAddress': ipAddress,
      'lastSeen': lastSeen.toIso8601String(),
      'resources': resources.toJson(),
      'isOnline': isOnline,
    };
  }
}

class ResourceInfo {
  final double cpuUsage;
  final double cpuAvailable;
  final int cpuCores;
  final double memoryUsage;
  final double memoryAvailable;
  final double memoryTotal;
  final double storageUsage;
  final double storageAvailable;
  final double storageTotal;
  final bool hasGPU;
  final String? gpuName;
  final double? gpuUsage;

  ResourceInfo({
    this.cpuUsage = 0.0,
    this.cpuAvailable = 100.0,
    this.cpuCores = 0,
    this.memoryUsage = 0.0,
    this.memoryAvailable = 0.0,
    this.memoryTotal = 0.0,
    this.storageUsage = 0.0,
    this.storageAvailable = 0.0,
    this.storageTotal = 0.0,
    this.hasGPU = false,
    this.gpuName,
    this.gpuUsage,
  });

  factory ResourceInfo.fromJson(Map<String, dynamic> json) {
    return ResourceInfo(
      cpuUsage: (json['cpuUsage'] ?? 0.0).toDouble(),
      cpuAvailable: (json['cpuAvailable'] ?? 100.0).toDouble(),
      cpuCores: json['cpuCores'] ?? 0,
      memoryUsage: (json['memoryUsage'] ?? 0.0).toDouble(),
      memoryAvailable: (json['memoryAvailable'] ?? 0.0).toDouble(),
      memoryTotal: (json['memoryTotal'] ?? 0.0).toDouble(),
      storageUsage: (json['storageUsage'] ?? 0.0).toDouble(),
      storageAvailable: (json['storageAvailable'] ?? 0.0).toDouble(),
      storageTotal: (json['storageTotal'] ?? 0.0).toDouble(),
      hasGPU: json['hasGPU'] ?? false,
      gpuName: json['gpuName'],
      gpuUsage: json['gpuUsage']?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'cpuUsage': cpuUsage,
      'cpuAvailable': cpuAvailable,
      'cpuCores': cpuCores,
      'memoryUsage': memoryUsage,
      'memoryAvailable': memoryAvailable,
      'memoryTotal': memoryTotal,
      'storageUsage': storageUsage,
      'storageAvailable': storageAvailable,
      'storageTotal': storageTotal,
      'hasGPU': hasGPU,
      'gpuName': gpuName,
      'gpuUsage': gpuUsage,
    };
  }
}



