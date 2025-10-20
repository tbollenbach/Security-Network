import Bonjour from 'bonjour-service';

export class DiscoveryService {
  constructor(config) {
    this.config = config;
    this.bonjour = null;
    this.service = null;
  }

  start() {
    try {
      this.bonjour = new Bonjour();
      
      // Publish the service
      this.service = this.bonjour.publish({
        name: 'Resource Pooling Network',
        type: this.config.discovery.serviceName,
        port: this.config.discovery.servicePort,
        txt: {
          version: '1.0.0',
          platform: process.platform
        }
      });

      console.log('mDNS service published:', this.config.discovery.serviceName);
    } catch (error) {
      console.error('Failed to start discovery service:', error);
    }
  }

  stop() {
    if (this.service) {
      this.service.stop();
      console.log('mDNS service stopped');
    }
    
    if (this.bonjour) {
      this.bonjour.destroy();
    }
  }

  findServices(callback) {
    if (!this.bonjour) {
      console.error('Discovery service not started');
      return;
    }

    const browser = this.bonjour.find({ type: this.config.discovery.serviceName });

    browser.on('up', (service) => {
      console.log('Found service:', service.name, service.host, service.port);
      if (callback) {
        callback({
          name: service.name,
          host: service.host,
          port: service.port,
          addresses: service.addresses
        });
      }
    });

    browser.on('down', (service) => {
      console.log('Service went down:', service.name);
    });

    return browser;
  }
}



