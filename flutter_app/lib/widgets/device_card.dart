import 'package:flutter/material.dart';
import '../models/device_model.dart';

class DeviceCard extends StatelessWidget {
  final DeviceModel device;

  const DeviceCard({super.key, required this.device});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12.0),
      child: ExpansionTile(
        leading: _getPlatformIcon(device.platform),
        title: Text(device.name),
        subtitle: Text('${device.platform} • ${device.ipAddress}'),
        trailing: Icon(
          Icons.circle,
          size: 12,
          color: device.isOnline ? Colors.green : Colors.red,
        ),
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                _buildResourceBar(
                  'CPU',
                  device.resources.cpuUsage,
                  100.0,
                  '${device.resources.cpuCores} cores',
                  Colors.blue,
                ),
                const SizedBox(height: 12),
                _buildResourceBar(
                  'Memory',
                  device.resources.memoryUsage,
                  device.resources.memoryTotal,
                  '${(device.resources.memoryTotal / 1024).toStringAsFixed(1)} GB',
                  Colors.orange,
                ),
                const SizedBox(height: 12),
                _buildResourceBar(
                  'Storage',
                  device.resources.storageUsage,
                  device.resources.storageTotal,
                  '${(device.resources.storageTotal / 1024).toStringAsFixed(1)} GB',
                  Colors.green,
                ),
                if (device.resources.hasGPU) ...[
                  const SizedBox(height: 12),
                  _buildResourceBar(
                    'GPU',
                    device.resources.gpuUsage ?? 0,
                    100.0,
                    device.resources.gpuName ?? 'Unknown GPU',
                    Colors.red,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _getPlatformIcon(String platform) {
    IconData icon;
    Color color;

    switch (platform.toLowerCase()) {
      case 'android':
        icon = Icons.android;
        color = Colors.green;
        break;
      case 'ios':
        icon = Icons.apple;
        color = Colors.grey;
        break;
      case 'windows':
        icon = Icons.computer;
        color = Colors.blue;
        break;
      case 'macos':
        icon = Icons.laptop_mac;
        color = Colors.grey;
        break;
      case 'linux':
        icon = Icons.computer;
        color = Colors.orange;
        break;
      default:
        icon = Icons.devices;
        color = Colors.grey;
    }

    return Icon(icon, color: color, size: 32);
  }

  Widget _buildResourceBar(
    String label,
    double used,
    double total,
    String subtitle,
    Color color,
  ) {
    final percentage = total > 0 ? (used / total * 100) : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
            Text(
              '${percentage.toStringAsFixed(1)}%',
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        LinearProgressIndicator(
          value: percentage / 100,
          backgroundColor: Colors.grey.withOpacity(0.2),
          color: color,
          minHeight: 8,
        ),
        const SizedBox(height: 4),
        Text(
          subtitle,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }
}



