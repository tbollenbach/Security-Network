import forge from 'node-forge';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate SSL/TLS certificates for secure communication
 */
class CertificateGenerator {
  constructor() {
    this.certsDir = path.join(__dirname, '../certs');
    this.ensureCertsDirectory();
  }

  ensureCertsDirectory() {
    if (!fs.existsSync(this.certsDir)) {
      fs.mkdirSync(this.certsDir, { recursive: true });
    }
  }

  /**
   * Generate CA (Certificate Authority) certificate
   */
  generateCA() {
    console.log('Generating CA certificate...');
    
    const keys = forge.pki.rsa.generateKeyPair(4096);
    const cert = forge.pki.createCertificate();
    
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);
    
    const attrs = [{
      name: 'commonName',
      value: 'Resource Pooling Network CA'
    }, {
      name: 'countryName',
      value: 'US'
    }, {
      shortName: 'ST',
      value: 'State'
    }, {
      name: 'localityName',
      value: 'City'
    }, {
      name: 'organizationName',
      value: 'Resource Pooling Network'
    }, {
      shortName: 'OU',
      value: 'Certificate Authority'
    }];
    
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    
    cert.setExtensions([{
      name: 'basicConstraints',
      cA: true
    }, {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    }]);
    
    cert.sign(keys.privateKey, forge.md.sha512.create());
    
    return {
      certificate: forge.pki.certificateToPem(cert),
      privateKey: forge.pki.privateKeyToPem(keys.privateKey),
      publicKey: forge.pki.publicKeyToPem(keys.publicKey)
    };
  }

  /**
   * Generate server certificate signed by CA
   */
  generateServerCert(caCert, caKey) {
    console.log('Generating server certificate...');
    
    const keys = forge.pki.rsa.generateKeyPair(4096);
    const cert = forge.pki.createCertificate();
    
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '02';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2);
    
    const attrs = [{
      name: 'commonName',
      value: 'localhost'
    }, {
      name: 'countryName',
      value: 'US'
    }, {
      shortName: 'ST',
      value: 'State'
    }, {
      name: 'localityName',
      value: 'City'
    }, {
      name: 'organizationName',
      value: 'Resource Pooling Network'
    }, {
      shortName: 'OU',
      value: 'Server'
    }];
    
    cert.setSubject(attrs);
    
    const caCertObj = forge.pki.certificateFromPem(caCert);
    cert.setIssuer(caCertObj.subject.attributes);
    
    cert.setExtensions([{
      name: 'basicConstraints',
      cA: false
    }, {
      name: 'keyUsage',
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    }, {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true
    }, {
      name: 'subjectAltName',
      altNames: [{
        type: 2, // DNS
        value: 'localhost'
      }, {
        type: 7, // IP
        ip: '127.0.0.1'
      }, {
        type: 7, // IP
        ip: '::1'
      }, {
        type: 2, // DNS
        value: '*.local'
      }]
    }]);
    
    const caKeyObj = forge.pki.privateKeyFromPem(caKey);
    cert.sign(caKeyObj, forge.md.sha512.create());
    
    return {
      certificate: forge.pki.certificateToPem(cert),
      privateKey: forge.pki.privateKeyToPem(keys.privateKey),
      publicKey: forge.pki.publicKeyToPem(keys.publicKey)
    };
  }

  /**
   * Generate all certificates
   */
  async generate() {
    console.log('Starting certificate generation...\n');
    
    // Generate CA
    const ca = this.generateCA();
    fs.writeFileSync(path.join(this.certsDir, 'ca-cert.pem'), ca.certificate);
    fs.writeFileSync(path.join(this.certsDir, 'ca-key.pem'), ca.privateKey);
    console.log('✓ CA certificate generated\n');
    
    // Generate Server certificate
    const server = this.generateServerCert(ca.certificate, ca.privateKey);
    fs.writeFileSync(path.join(this.certsDir, 'server-cert.pem'), server.certificate);
    fs.writeFileSync(path.join(this.certsDir, 'server-key.pem'), server.privateKey);
    console.log('✓ Server certificate generated\n');
    
    // Generate DH parameters for perfect forward secrecy
    console.log('Generating Diffie-Hellman parameters (this may take a while)...');
    // Note: In production, you'd want to generate proper DH params
    // For now, we'll skip this as it can take 30+ minutes for 4096-bit
    console.log('✓ DH parameters skipped (use openssl for production)\n');
    
    console.log('All certificates generated successfully!');
    console.log(`\nCertificates location: ${this.certsDir}`);
    console.log('\nFiles generated:');
    console.log('  - ca-cert.pem       (CA Certificate)');
    console.log('  - ca-key.pem        (CA Private Key - KEEP SECURE!)');
    console.log('  - server-cert.pem   (Server Certificate)');
    console.log('  - server-key.pem    (Server Private Key - KEEP SECURE!)');
    console.log('\nFor production, also generate:');
    console.log('  openssl dhparam -out dhparam.pem 4096');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new CertificateGenerator();
  generator.generate().catch(console.error);
}

export { CertificateGenerator };



