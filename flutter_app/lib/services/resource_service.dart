import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import '../models/device_model.dart';

class ResourceService extends ChangeNotifier {
  ResourceInfo _currentResources = ResourceInfo();
  Timer? _updateTimer;
  
  ResourceInfo get currentResources => _currentResources;

  ResourceService() {
    _startMonitoring();
  }

  void _startMonitoring() {
    // Update resources every 2 seconds
    _updateTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      _updateResources();
    });
    
    // Initial update
    _updateResources();
  }

  Future<void> _updateResources() async {
    try {
      final cpuInfo = await _getCPUInfo();
      final memoryInfo = await _getMemoryInfo();
      final storageInfo = await _getStorageInfo();
      final gpuInfo = await _getGPUInfo();

      _currentResources = ResourceInfo(
        cpuUsage: cpuInfo['usage']!,
        cpuAvailable: cpuInfo['available']!,
        cpuCores: cpuInfo['cores']!.toInt(),
        memoryUsage: memoryInfo['usage']!,
        memoryAvailable: memoryInfo['available']!,
        memoryTotal: memoryInfo['total']!,
        storageUsage: storageInfo['usage']!,
        storageAvailable: storageInfo['available']!,
        storageTotal: storageInfo['total']!,
        hasGPU: gpuInfo['hasGPU']!.toInt() == 1,
        gpuName: gpuInfo['name'] != null ? gpuInfo['name'].toString() : null,
        gpuUsage: gpuInfo['usage'],
      );

      notifyListeners();
    } catch (e) {
      debugPrint('Resource update error: $e');
    }
  }

  Future<Map<String, double>> _getCPUInfo() async {
    // Platform-specific CPU monitoring
    double usage = 0.0;
    int cores = 4; // Default

    try {
      if (Platform.isLinux || Platform.isMacOS) {
        // Use top command
        final result = await Process.run('top', ['-bn1']);
        final output = result.stdout.toString();
        final cpuLine = output.split('\n').firstWhere(
          (line) => line.contains('Cpu'),
          orElse: () => '',
        );
        
        if (cpuLine.isNotEmpty) {
          // Parse CPU usage
          final match = RegExp(r'(\d+\.?\d*).*us').firstMatch(cpuLine);
          if (match != null) {
            usage = double.parse(match.group(1)!);
          }
        }

        // Get core count
        final coreResult = await Process.run('nproc', []);
        cores = int.tryParse(coreResult.stdout.toString().trim()) ?? 4;
      } else if (Platform.isWindows) {
        // Use PowerShell for Windows
        final result = await Process.run('powershell', [
          'Get-WmiObject',
          'Win32_Processor',
          '|',
          'Select-Object',
          '-ExpandProperty',
          'LoadPercentage'
        ]);
        usage = double.tryParse(result.stdout.toString().trim()) ?? 0.0;
        
        final coreResult = await Process.run('powershell', [
          '\$env:NUMBER_OF_PROCESSORS'
        ]);
        cores = int.tryParse(coreResult.stdout.toString().trim()) ?? 4;
      }
    } catch (e) {
      debugPrint('CPU info error: $e');
      // Simulate data for mobile/when commands fail
      usage = 20.0 + (DateTime.now().millisecond % 30);
      cores = Platform.numberOfProcessors;
    }

    return {
      'usage': usage,
      'available': 100.0 - usage,
      'cores': cores.toDouble(),
    };
  }

  Future<Map<String, double>> _getMemoryInfo() async {
    double total = 8192.0; // 8GB default
    double used = 0.0;

    try {
      if (Platform.isLinux || Platform.isMacOS) {
        final result = await Process.run('free', ['-m']);
        final lines = result.stdout.toString().split('\n');
        if (lines.length > 1) {
          final memLine = lines[1].split(RegExp(r'\s+'));
          total = double.tryParse(memLine[1]) ?? total;
          used = double.tryParse(memLine[2]) ?? 0.0;
        }
      } else if (Platform.isWindows) {
        final result = await Process.run('powershell', [
          '(Get-WmiObject Win32_OperatingSystem).TotalVisibleMemorySize'
        ]);
        total = (double.tryParse(result.stdout.toString().trim()) ?? total * 1024) / 1024;
        
        final usedResult = await Process.run('powershell', [
          '(Get-WmiObject Win32_OperatingSystem).FreePhysicalMemory'
        ]);
        final free = (double.tryParse(usedResult.stdout.toString().trim()) ?? 0) / 1024;
        used = total - free;
      }
    } catch (e) {
      debugPrint('Memory info error: $e');
      // Simulate for mobile
      used = total * 0.5;
    }

    return {
      'total': total,
      'usage': used,
      'available': total - used,
    };
  }

  Future<Map<String, double>> _getStorageInfo() async {
    double total = 256000.0; // 256GB default
    double used = 0.0;

    try {
      if (Platform.isLinux || Platform.isMacOS) {
        final result = await Process.run('df', ['-m', '/']);
        final lines = result.stdout.toString().split('\n');
        if (lines.length > 1) {
          final storageLine = lines[1].split(RegExp(r'\s+'));
          total = double.tryParse(storageLine[1]) ?? total;
          used = double.tryParse(storageLine[2]) ?? 0.0;
        }
      } else if (Platform.isWindows) {
        final result = await Process.run('powershell', [
          '(Get-PSDrive C).Used / 1MB'
        ]);
        used = double.tryParse(result.stdout.toString().trim()) ?? 0.0;
        
        final totalResult = await Process.run('powershell', [
          '((Get-PSDrive C).Used + (Get-PSDrive C).Free) / 1MB'
        ]);
        total = double.tryParse(totalResult.stdout.toString().trim()) ?? total;
      }
    } catch (e) {
      debugPrint('Storage info error: $e');
      used = total * 0.4;
    }

    return {
      'total': total,
      'usage': used,
      'available': total - used,
    };
  }

  Future<Map<String, dynamic>> _getGPUInfo() async {
    // GPU detection is platform-specific and may require additional packages
    bool hasGPU = false;
    String? gpuName;
    double? gpuUsage;

    try {
      if (Platform.isWindows) {
        final result = await Process.run('powershell', [
          'Get-WmiObject Win32_VideoController | Select-Object -ExpandProperty Name'
        ]);
        gpuName = result.stdout.toString().trim();
        hasGPU = gpuName.isNotEmpty;
      } else if (Platform.isLinux) {
        final result = await Process.run('lspci', []);
        final output = result.stdout.toString();
        final gpuLine = output.split('\n').firstWhere(
          (line) => line.toLowerCase().contains('vga') || line.toLowerCase().contains('3d'),
          orElse: () => '',
        );
        hasGPU = gpuLine.isNotEmpty;
        if (hasGPU) {
          gpuName = gpuLine.split(':').last.trim();
        }
      } else if (Platform.isMacOS) {
        final result = await Process.run('system_profiler', ['SPDisplaysDataType']);
        hasGPU = result.stdout.toString().contains('Chipset Model');
      }
    } catch (e) {
      debugPrint('GPU info error: $e');
    }

    return {
      'hasGPU': hasGPU ? 1.0 : 0.0,
      'name': gpuName,
      'usage': gpuUsage,
    };
  }

  @override
  void dispose() {
    _updateTimer?.cancel();
    super.dispose();
  }
}



