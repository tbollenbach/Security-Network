import { v4 as uuidv4 } from 'uuid';

export class ResourcePool {
  constructor(config, deviceManager) {
    this.config = config;
    this.deviceManager = deviceManager;
    this.poolStatus = {
      totalCpuAvailable: 0,
      totalCpuCores: 0,
      totalMemoryAvailable: 0,
      totalStorageAvailable: 0,
      totalGPUs: 0,
      devices: 0
    };
    this.tasks = new Map();
    this.allocations = new Map();
  }

  updateResources() {
    const devices = this.deviceManager.getOnlineDevices();
    
    let totalCpuAvailable = 0;
    let totalCpuCores = 0;
    let totalMemoryAvailable = 0;
    let totalStorageAvailable = 0;
    let totalGPUs = 0;

    devices.forEach((device) => {
      const resources = device.resources;
      totalCpuAvailable += resources.cpuAvailable || 0;
      totalCpuCores += resources.cpuCores || 0;
      totalMemoryAvailable += resources.memoryAvailable || 0;
      totalStorageAvailable += resources.storageAvailable || 0;
      if (resources.hasGPU) {
        totalGPUs++;
      }
    });

    this.poolStatus = {
      totalCpuAvailable,
      totalCpuCores,
      totalMemoryAvailable,
      totalStorageAvailable,
      totalGPUs,
      devices: devices.length
    };
  }

  getPoolStatus() {
    return this.poolStatus;
  }

  allocateResources(requestingDeviceId, requirements) {
    const devices = this.deviceManager.getOnlineDevices();
    const allocation = {
      id: uuidv4(),
      requestingDevice: requestingDeviceId,
      timestamp: new Date(),
      requirements: requirements,
      allocatedDevices: []
    };

    // Simple allocation strategy: find devices with available resources
    let requiredCpu = requirements.cpu || 0;
    let requiredMemory = requirements.memory || 0;
    let requiredStorage = requirements.storage || 0;
    let requiredGpu = requirements.gpu || false;

    devices.forEach((device) => {
      if (device.id === requestingDeviceId) return; // Don't allocate to self

      const deviceAllocation = {
        deviceId: device.id,
        deviceName: device.name,
        allocatedCpu: 0,
        allocatedMemory: 0,
        allocatedStorage: 0,
        allocatedGpu: false
      };

      // Allocate CPU
      if (requiredCpu > 0) {
        const availableCpu = Math.min(
          device.resources.cpuAvailable,
          this.config.resources.maxCpuAllocation
        );
        const allocate = Math.min(availableCpu, requiredCpu);
        deviceAllocation.allocatedCpu = allocate;
        requiredCpu -= allocate;
      }

      // Allocate Memory
      if (requiredMemory > 0) {
        const availableMemory = Math.min(
          device.resources.memoryAvailable,
          (device.resources.memoryTotal * this.config.resources.maxMemoryAllocation) / 100
        );
        const allocate = Math.min(availableMemory, requiredMemory);
        deviceAllocation.allocatedMemory = allocate;
        requiredMemory -= allocate;
      }

      // Allocate Storage
      if (requiredStorage > 0) {
        const availableStorage = Math.min(
          device.resources.storageAvailable,
          (device.resources.storageTotal * this.config.resources.maxStorageAllocation) / 100
        );
        const allocate = Math.min(availableStorage, requiredStorage);
        deviceAllocation.allocatedStorage = allocate;
        requiredStorage -= allocate;
      }

      // Allocate GPU
      if (requiredGpu && device.resources.hasGPU && this.config.resources.enableGpuSharing) {
        deviceAllocation.allocatedGpu = true;
        requiredGpu = false;
      }

      // Add to allocation if anything was allocated
      if (
        deviceAllocation.allocatedCpu > 0 ||
        deviceAllocation.allocatedMemory > 0 ||
        deviceAllocation.allocatedStorage > 0 ||
        deviceAllocation.allocatedGpu
      ) {
        allocation.allocatedDevices.push(deviceAllocation);
      }
    });

    allocation.fulfilled = requiredCpu <= 0 && requiredMemory <= 0 && requiredStorage <= 0 && !requiredGpu;
    
    this.allocations.set(allocation.id, allocation);
    
    // Clean up old allocations (older than 1 hour)
    this.cleanupAllocations();

    return allocation;
  }

  submitTask(task, callback) {
    const taskId = task.id || uuidv4();
    
    const taskData = {
      id: taskId,
      type: task.type,
      requirements: task.requirements,
      data: task.data,
      status: 'pending',
      submittedAt: new Date(),
      callback: callback
    };

    this.tasks.set(taskId, taskData);

    // Allocate resources for the task
    const allocation = this.allocateResources(task.submitterId, task.requirements);
    
    if (allocation.fulfilled) {
      taskData.status = 'allocated';
      taskData.allocation = allocation;

      // In a real implementation, you would distribute the task to allocated devices
      // For now, we'll simulate task completion
      setTimeout(() => {
        this.completeTask(taskId, { success: true, result: 'Task completed' });
      }, 1000);
    } else {
      taskData.status = 'failed';
      taskData.error = 'Insufficient resources';
      if (callback) {
        callback({ success: false, error: 'Insufficient resources' });
      }
    }
  }

  completeTask(taskId, result) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'completed';
      task.completedAt = new Date();
      task.result = result;

      if (task.callback) {
        task.callback(result);
      }

      // Clean up task after completion
      setTimeout(() => {
        this.tasks.delete(taskId);
      }, 60000); // Keep for 1 minute
    }
  }

  cleanupAllocations() {
    const now = new Date();
    const maxAge = 3600000; // 1 hour

    this.allocations.forEach((allocation, id) => {
      if (now - allocation.timestamp > maxAge) {
        this.allocations.delete(id);
      }
    });
  }

  getTaskStatus(taskId) {
    return this.tasks.get(taskId);
  }

  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  getAllAllocations() {
    return Array.from(this.allocations.values());
  }
}



