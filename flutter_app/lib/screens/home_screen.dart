import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/network_service.dart';
import '../services/resource_service.dart';
import '../widgets/device_card.dart';
import '../widgets/resource_monitor.dart';
import '../widgets/connection_status.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    // Auto-connect on startup
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final networkService = Provider.of<NetworkService>(context, listen: false);
      if (!networkService.isConnected && networkService.serverAddress != null) {
        networkService.connectToServer(networkService.serverAddress!);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Resource Pooling Network'),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 16.0),
            child: ConnectionStatus(),
          ),
        ],
      ),
      body: _getSelectedScreen(),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.devices),
            label: 'Devices',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }

  Widget _getSelectedScreen() {
    switch (_selectedIndex) {
      case 0:
        return const DashboardTab();
      case 1:
        return const DevicesTab();
      case 2:
        return const SettingsTab();
      default:
        return const DashboardTab();
    }
  }
}

class DashboardTab extends StatelessWidget {
  const DashboardTab({super.key});

  @override
  Widget build(BuildContext context) {
    final networkService = Provider.of<NetworkService>(context);
    final resourceService = Provider.of<ResourceService>(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Local Resources',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          ResourceMonitor(resources: resourceService.currentResources),
          const SizedBox(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Network Overview',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              Text(
                '${networkService.connectedDevices.length} devices',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Colors.blue,
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildNetworkStats(context, networkService),
        ],
      ),
    );
  }

  Widget _buildNetworkStats(BuildContext context, NetworkService networkService) {
    final devices = networkService.connectedDevices;
    
    double totalCPU = 0;
    double totalMemory = 0;
    double totalStorage = 0;
    int gpuCount = 0;

    for (final device in devices) {
      totalCPU += device.resources.cpuAvailable;
      totalMemory += device.resources.memoryAvailable;
      totalStorage += device.resources.storageAvailable;
      if (device.resources.hasGPU) gpuCount++;
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            _buildStatRow('Available CPU Power', '${totalCPU.toStringAsFixed(1)}%'),
            const Divider(),
            _buildStatRow('Available Memory', '${(totalMemory / 1024).toStringAsFixed(1)} GB'),
            const Divider(),
            _buildStatRow('Available Storage', '${(totalStorage / 1024).toStringAsFixed(1)} GB'),
            const Divider(),
            _buildStatRow('GPUs Available', '$gpuCount'),
          ],
        ),
      ),
    );
  }

  Widget _buildStatRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 16)),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.blue,
            ),
          ),
        ],
      ),
    );
  }
}

class DevicesTab extends StatelessWidget {
  const DevicesTab({super.key});

  @override
  Widget build(BuildContext context) {
    final networkService = Provider.of<NetworkService>(context);

    if (!networkService.isConnected) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.cloud_off, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            const Text('Not connected to network'),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () {
                // Manual connection dialog
                _showConnectDialog(context, networkService);
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Connect'),
            ),
          ],
        ),
      );
    }

    final devices = networkService.connectedDevices;

    if (devices.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.devices_other, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('No devices connected'),
            SizedBox(height: 8),
            Text('Waiting for devices to join...'),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16.0),
      itemCount: devices.length,
      itemBuilder: (context, index) {
        return DeviceCard(device: devices[index]);
      },
    );
  }

  void _showConnectDialog(BuildContext context, NetworkService networkService) {
    final controller = TextEditingController(text: 'localhost:3000');
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Connect to Server'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Server Address',
            hintText: 'hostname:port',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              networkService.connectToServer(controller.text);
              Navigator.pop(context);
            },
            child: const Text('Connect'),
          ),
        ],
      ),
    );
  }
}

class SettingsTab extends StatelessWidget {
  const SettingsTab({super.key});

  @override
  Widget build(BuildContext context) {
    final networkService = Provider.of<NetworkService>(context);
    final resourceService = Provider.of<ResourceService>(context);

    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        Text(
          'Device Information',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 16),
        Card(
          child: ListTile(
            leading: const Icon(Icons.smartphone),
            title: const Text('Device ID'),
            subtitle: Text(networkService.deviceId ?? 'Unknown'),
          ),
        ),
        Card(
          child: ListTile(
            leading: const Icon(Icons.computer),
            title: const Text('Platform'),
            subtitle: Text(Theme.of(context).platform.name),
          ),
        ),
        const SizedBox(height: 32),
        Text(
          'Network Settings',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 16),
        Card(
          child: ListTile(
            leading: const Icon(Icons.dns),
            title: const Text('Server Address'),
            subtitle: Text(networkService.serverAddress ?? 'Not connected'),
            trailing: networkService.isConnected
                ? const Icon(Icons.check_circle, color: Colors.green)
                : const Icon(Icons.cancel, color: Colors.red),
          ),
        ),
        Card(
          child: SwitchListTile(
            secondary: const Icon(Icons.sync),
            title: const Text('Auto-discover'),
            subtitle: const Text('Automatically find servers on network'),
            value: true,
            onChanged: (value) {
              // TODO: Implement auto-discovery toggle
            },
          ),
        ),
        const SizedBox(height: 32),
        Text(
          'Resource Sharing',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 16),
        Card(
          child: SwitchListTile(
            secondary: const Icon(Icons.memory),
            title: const Text('Share CPU'),
            subtitle: const Text('Allow other devices to use CPU power'),
            value: true,
            onChanged: (value) {
              // TODO: Implement CPU sharing toggle
            },
          ),
        ),
        Card(
          child: SwitchListTile(
            secondary: const Icon(Icons.storage),
            title: const Text('Share Storage'),
            subtitle: const Text('Allow other devices to use storage'),
            value: true,
            onChanged: (value) {
              // TODO: Implement storage sharing toggle
            },
          ),
        ),
        Card(
          child: SwitchListTile(
            secondary: const Icon(Icons.graphic_eq),
            title: const Text('Share GPU'),
            subtitle: Text(
              resourceService.currentResources.hasGPU
                  ? 'Allow other devices to use GPU'
                  : 'No GPU detected',
            ),
            value: resourceService.currentResources.hasGPU,
            onChanged: resourceService.currentResources.hasGPU
                ? (value) {
                    // TODO: Implement GPU sharing toggle
                  }
                : null,
          ),
        ),
      ],
    );
  }
}



