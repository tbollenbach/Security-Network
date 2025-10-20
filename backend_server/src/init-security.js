import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize security configuration
 */
class SecurityInitializer {
  constructor() {
    this.configDir = path.join(__dirname, '../');
    this.secureConfigPath = path.join(this.configDir, 'config.secure.json');
    this.envPath = path.join(this.configDir, '.env.security');
  }

  /**
   * Generate secure secrets
   */
  generateSecrets() {
    return {
      jwtSecret: crypto.randomBytes(64).toString('hex'),
      encryptionKey: crypto.randomBytes(32).toString('hex'),
      masterKey: crypto.randomBytes(32).toString('hex'),
      apiSecret: crypto.randomBytes(32).toString('hex'),
      sessionSecret: crypto.randomBytes(32).toString('hex')
    };
  }

  /**
   * Create secure configuration
   */
  createSecureConfig() {
    const secrets = this.generateSecrets();
    
    const secureConfig = {
      server: {
        port: 3000,
        host: "0.0.0.0",
        protocol: "https",
        wsProtocol: "wss"
      },
      security: {
        enabled: true,
        requireAuth: true,
        jwtSecret: secrets.jwtSecret,
        jwtExpiry: "24h",
        refreshTokenExpiry: "7d",
        encryptionKey: secrets.encryptionKey,
        masterKey: secrets.masterKey,
        sessionSecret: secrets.sessionSecret,
        maxDevices: 100,
        passwordMinLength: 12,
        requireStrongPassword: true,
        enableAuditLog: true,
        enableEncryption: true,
        enableCertificateValidation: true
      },
      ssl: {
        enabled: true,
        certPath: "./certs/server-cert.pem",
        keyPath: "./certs/server-key.pem",
        caPath: "./certs/ca-cert.pem",
        rejectUnauthorized: true,
        requestCert: false,
        minVersion: "TLSv1.3",
        ciphers: [
          "TLS_AES_256_GCM_SHA384",
          "TLS_CHACHA20_POLY1305_SHA256",
          "TLS_AES_128_GCM_SHA256"
        ].join(':')
      },
      rateLimit: {
        enabled: true,
        api: {
          windowMs: 900000,
          max: 100
        },
        auth: {
          windowMs: 900000,
          max: 5
        },
        websocket: {
          windowMs: 60000,
          max: 10
        }
      },
      discovery: {
        enabled: true,
        serviceName: "_resourcepool._tcp",
        servicePort: 3000,
        secure: true
      },
      resources: {
        maxCpuAllocation: 80,
        maxMemoryAllocation: 80,
        maxStorageAllocation: 50,
        enableGpuSharing: true
      },
      monitoring: {
        updateInterval: 2000,
        deviceTimeout: 30000,
        sessionTimeout: 86400000,
        logLevel: "info"
      }
    };

    return secureConfig;
  }

  /**
   * Create .env.security file
   */
  createEnvFile(secrets) {
    const envContent = `# Security Secrets - DO NOT COMMIT TO VERSION CONTROL
# Generated: ${new Date().toISOString()}

JWT_SECRET=${secrets.jwtSecret}
ENCRYPTION_KEY=${secrets.encryptionKey}
MASTER_KEY=${secrets.masterKey}
API_SECRET=${secrets.apiSecret}
SESSION_SECRET=${secrets.sessionSecret}

# WARNING: Keep these secrets secure!
# - Never commit to git
# - Never share publicly
# - Rotate regularly
# - Use environment variables in production
`;

    return envContent;
  }

  /**
   * Create .gitignore entries
   */
  updateGitignore() {
    const gitignorePath = path.join(this.configDir, '.gitignore');
    const entriesToAdd = [
      '',
      '# Security files',
      '.env.security',
      'config.secure.json',
      'certs/*.pem',
      'certs/*.key',
      'logs/',
      '*.log'
    ].join('\n');

    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      if (!content.includes('.env.security')) {
        fs.appendFileSync(gitignorePath, '\n' + entriesToAdd);
      }
    } else {
      fs.writeFileSync(gitignorePath, entriesToAdd);
    }
  }

  /**
   * Initialize security
   */
  initialize() {
    console.log('🔒 Initializing Fort Knox Security System...\n');

    // Check if already initialized
    if (fs.existsSync(this.secureConfigPath)) {
      console.log('⚠️  Security configuration already exists!');
      console.log('   Delete config.secure.json and .env.security to regenerate.\n');
      return;
    }

    // Generate secrets
    console.log('🔑 Generating cryptographic secrets...');
    const secrets = this.generateSecrets();
    console.log('   ✓ JWT secret generated');
    console.log('   ✓ Encryption keys generated');
    console.log('   ✓ Master keys generated\n');

    // Create secure config
    console.log('📝 Creating secure configuration...');
    const config = this.createSecureConfig();
    fs.writeFileSync(
      this.secureConfigPath,
      JSON.stringify(config, null, 2)
    );
    console.log(`   ✓ Saved to ${this.secureConfigPath}\n`);

    // Create .env file
    console.log('🔐 Creating environment secrets...');
    const envContent = this.createEnvFile(secrets);
    fs.writeFileSync(this.envPath, envContent);
    console.log(`   ✓ Saved to ${this.envPath}\n`);

    // Update .gitignore
    console.log('📄 Updating .gitignore...');
    this.updateGitignore();
    console.log('   ✓ Security files added to .gitignore\n');

    // Create necessary directories
    console.log('📁 Creating required directories...');
    const dirs = [
      path.join(this.configDir, 'certs'),
      path.join(this.configDir, 'logs'),
      path.join(this.configDir, 'logs/security'),
      path.join(this.configDir, 'logs/access'),
      path.join(this.configDir, 'logs/errors')
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    console.log('   ✓ All directories created\n');

    // Print summary
    console.log('✅ Security initialization complete!\n');
    console.log('📋 Next steps:');
    console.log('   1. Run: npm run generate-certs');
    console.log('   2. Review: config.secure.json');
    console.log('   3. Secure: .env.security (never commit!)');
    console.log('   4. Start server: npm start\n');

    console.log('⚠️  IMPORTANT SECURITY NOTES:');
    console.log('   - Keep .env.security secure and private');
    console.log('   - Never commit secrets to version control');
    console.log('   - Rotate secrets regularly');
    console.log('   - Use environment variables in production');
    console.log('   - Enable firewall rules');
    console.log('   - Monitor security logs\n');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const initializer = new SecurityInitializer();
  initializer.initialize();
}

export { SecurityInitializer };



