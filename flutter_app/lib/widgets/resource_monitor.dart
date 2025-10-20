import 'package:flutter/material.dart';
import '../models/device_model.dart';

class ResourceMonitor extends StatelessWidget {
  final ResourceInfo resources;

  const ResourceMonitor({super.key, required this.resources});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            _buildResourceCircle(
              context,
              'CPU',
              resources.cpuUsage,
              100.0,
              '${resources.cpuCores} cores',
              Colors.blue,
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: _buildResourceCircle(
                    context,
                    'Memory',
                    resources.memoryUsage,
                    resources.memoryTotal,
                    '${(resources.memoryTotal / 1024).toStringAsFixed(1)} GB',
                    Colors.orange,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildResourceCircle(
                    context,
                    'Storage',
                    resources.storageUsage,
                    resources.storageTotal,
                    '${(resources.storageTotal / 1024).toStringAsFixed(1)} GB',
                    Colors.green,
                  ),
                ),
              ],
            ),
            if (resources.hasGPU) ...[
              const SizedBox(height: 24),
              _buildResourceCircle(
                context,
                'GPU',
                resources.gpuUsage ?? 0,
                100.0,
                resources.gpuName ?? 'Unknown GPU',
                Colors.red,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildResourceCircle(
    BuildContext context,
    String label,
    double used,
    double total,
    String subtitle,
    Color color,
  ) {
    final percentage = total > 0 ? (used / total) : 0.0;

    return Column(
      children: [
        SizedBox(
          width: 120,
          height: 120,
          child: Stack(
            alignment: Alignment.center,
            children: [
              SizedBox(
                width: 120,
                height: 120,
                child: CircularProgressIndicator(
                  value: percentage,
                  strokeWidth: 12,
                  backgroundColor: Colors.grey.withOpacity(0.2),
                  color: color,
                ),
              ),
              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '${(percentage * 100).toStringAsFixed(0)}%',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Text(
          subtitle,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}



