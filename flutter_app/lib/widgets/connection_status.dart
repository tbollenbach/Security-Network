import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/network_service.dart';

class ConnectionStatus extends StatelessWidget {
  const ConnectionStatus({super.key});

  @override
  Widget build(BuildContext context) {
    final networkService = Provider.of<NetworkService>(context);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          networkService.isConnected ? Icons.cloud_done : Icons.cloud_off,
          color: networkService.isConnected ? Colors.green : Colors.red,
          size: 20,
        ),
        const SizedBox(width: 8),
        Text(
          networkService.isConnected ? 'Connected' : 'Offline',
          style: TextStyle(
            color: networkService.isConnected ? Colors.green : Colors.red,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}



