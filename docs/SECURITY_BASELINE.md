# Security Baseline - Production Requirements

**Version 1.0 | Last Updated: 2025-10-20**

This document defines the **required security controls** for the Resource Pooling Network. These are not aspirational - they are **mandatory**.

---

## 1. Transport Layer Security

### TLS Configuration

**Required**:
- TLS 1.3 (minimum TLS 1.2)
- Let Node.js/OpenSSL choose ciphersuites (don't hand-roll)
- Certificate from trusted CA or internal PKI
- HSTS enabled (max-age: 31536000, includeSubDomains)

**Recommended Ciphersuites** (TLS 1.3):
```
TLS_AES_256_GCM_SHA384
TLS_CHACHA20_POLY1305_SHA256
TLS_AES_128_GCM_SHA256
```

**TLS 1.2 Fallback** (if required):
```
ECDHE-RSA-AES256-GCM-SHA384
ECDHE-RSA-AES128-GCM-SHA256
```

**Configuration**:
```javascript
const tlsOptions = {
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3',
  // Let Node choose ciphersuites - don't override unless required
  honorCipherOrder: true
};
```

---

## 2. Authentication & Authorization

### JWT Configuration

**CORRECT Implementation**:
- Algorithm: **RS256** (RSA-SHA256 with 2048+ bit key) or **EdDSA** (Ed25519)
- ❌ NOT "RSA-512" (doesn't exist)
- ❌ NOT HS256 for multi-service deployments

**Token Structure**:
```javascript
{
  "alg": "RS256",    // or "EdDSA"
  "typ": "JWT",
  "kid": "key-2025-10"  // Key ID for rotation
}
.
{
  "iss": "resource-pool-network",
  "sub": "device-123",
  "aud": "api.resourcepool.local",
  "exp": 1729450200,      // 15 minutes from issue
  "iat": 1729449300,
  "jti": "unique-token-id",  // Prevent replay
  "scope": "read write"
}
```

**Key Rotation**:
- Generate new signing key every 90 days
- Publish JWKS endpoint: `GET /.well-known/jwks.json`
- Support 2 active keys during rotation period
- Revoke old keys after 24 hours

**Implementation**:
```javascript
import jwt from 'jsonwebtoken';
import fs from 'fs';

const privateKey = fs.readFileSync('./keys/private-key.pem');
const publicKey = fs.readFileSync('./keys/public-key.pem');

// Sign
const token = jwt.sign(payload, privateKey, {
  algorithm: 'RS256',
  expiresIn: '15m',
  issuer: 'resource-pool-network',
  audience: 'api.resourcepool.local',
  jwtid: generateUniqueId(),
  keyid: 'key-2025-10'
});

// Verify
const decoded = jwt.verify(token, publicKey, {
  algorithms: ['RS256'],
  issuer: 'resource-pool-network',
  audience: 'api.resourcepool.local'
});
```

### Multi-Factor Authentication

**Required for**:
- Admin actions
- Device registration (first time)
- Critical resource operations

**Implementation**:
- TOTP (RFC 6238) with 30s window
- Backup codes (10 codes, single-use, bcrypt hashed)
- Optional: FIDO2/WebAuthn for passwordless

---

## 3. Rate Limiting

### Implementation

**Per-IP Limits**:
```javascript
{
  '/api/*': {
    windowMs: 900000,      // 15 minutes
    max: 100,              // requests per window
    standardHeaders: true,
    message: 'Rate limit exceeded'
  },
  
  '/api/auth/*': {
    windowMs: 900000,
    max: 5,               // Strict for auth
    skipSuccessfulRequests: true
  },
  
  '/ws': {
    windowMs: 60000,
    max: 10              // Connection attempts per minute
  }
}
```

**Per-Token Limits**:
- 1000 requests/hour per authenticated device
- Burst: 50 requests/minute

---

## 4. Logging & Audit Trail

### Required Log Fields

**Every request must log**:
```json
{
  "timestamp": "2025-10-20T14:32:15.123Z",
  "correlationId": "req-a3f7e9c2",
  "method": "POST",
  "path": "/api/devices",
  "status": 200,
  "duration": 42,
  "ip": "192.168.1.100",
  "userId": "device-123",
  "userAgent": "ResourcePool/1.0",
  "error": null
}
```

### Tamper-Evident Logs

**Merkle Tree Root Hash** (daily):
```bash
# Generate daily root hash
sha256sum /logs/2025-10-20.log > /logs/roots/2025-10-20.root

# Contents of .root file:
7a3f5b9c2e1d8f4a6b3c9d7e2f5a1b8c4d6e9f3a5c7b2d8e4f1a6c9b3e7d5f2a
```

**Verification**:
```javascript
// Verify log hasn't been tampered with
const currentHash = sha256(logFile);
const storedHash = fs.readFileSync('./logs/roots/2025-10-20.root', 'utf8');

if (currentHash !== storedHash) {
  alert('LOG TAMPERING DETECTED');
}
```

### Retention

- Security logs: **90 days** minimum
- Access logs: **30 days** minimum
- Error logs: **90 days** minimum
- Audit trail: **1 year** (compliance requirement)

---

## 5. Input Validation

**All inputs must be validated**:

```javascript
import { z } from 'zod';

const heartbeatSchema = z.object({
  deviceId: z.string().uuid(),
  cpu: z.number().min(0).max(100),
  memory: z.number().min(0),
  storage: z.number().min(0),
  timestamp: z.number().positive()
});

// Validate
try {
  const validated = heartbeatSchema.parse(req.body);
} catch (error) {
  return res.status(400).json({ error: 'Invalid input' });
}
```

**Sanitization**:
- HTML entities escaped
- SQL parameterized queries only
- No eval() or Function() constructor
- Path traversal prevention (no ../ in paths)

---

## 6. Security Headers

**Required Headers** (via Helmet.js):

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss://api.resourcepool.local'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
```

---

## 7. CORS Policy

**Strict Configuration**:

```javascript
app.use(cors({
  origin: [
    'https://dashboard.resourcepool.local',
    'https://app.resourcepool.local'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600
}));
```

---

## 8. Session Management

**Requirements**:
- Session timeout: 24 hours
- Idle timeout: 30 minutes
- Secure session storage (Redis or encrypted DB)
- Session ID: cryptographically random (32+ bytes)
- HttpOnly, Secure, SameSite=Strict cookies

```javascript
{
  sessionId: crypto.randomBytes(32).toString('hex'),
  userId: 'device-123',
  createdAt: Date.now(),
  expiresAt: Date.now() + (24 * 60 * 60 * 1000),
  lastActivity: Date.now()
}
```

---

## 9. Secrets Management

**Never commit**:
- Private keys
- API secrets
- Database passwords
- JWT signing keys
- Encryption keys

**Use**:
- Environment variables (`.env` with `.env.example`)
- Secrets manager (AWS Secrets Manager, HashiCorp Vault)
- Encrypted config files
- Hardware Security Module (production)

**Rotation Schedule**:
- JWT signing keys: Every 90 days
- API keys: Every 180 days
- Database passwords: Every 90 days
- TLS certificates: Before expiry

---

## 10. Incident Response

### Detection → Response → Recovery

**Alert Triggers**:
- Failed auth (5+ in 15 minutes)
- Rate limit exceeded
- Honeypot trap hit
- Unauthorized access attempt
- Suspicious activity pattern

**Response Actions**:
1. Log to security log (with context)
2. Alert admin (webhook/email)
3. Auto-ban IP (if critical)
4. Create incident ID
5. Preserve evidence

**Recovery**:
- Revoke compromised tokens
- Rotate affected keys
- Patch vulnerability
- Document in incident log
- Update controls

---

## 11. Data Protection

### Encryption

**At Rest**:
- Database: Encrypted tablespaces
- Files: AES-256-GCM
- Backups: Encrypted archives

**In Transit**:
- TLS 1.3 for all connections
- WebSocket over WSS
- No cleartext transmission

### Data Classification

| Level | Examples | Requirements |
|-------|----------|--------------|
| Public | Documentation | No encryption required |
| Internal | Resource stats | TLS required |
| Confidential | Device IDs, IPs | TLS + encryption at rest |
| Restricted | Auth tokens, keys | HSM, strict access control |

---

## 12. Compliance Mapping

### ISO 27001 Annex A Controls (Subset)

| Control | Implementation |
|---------|----------------|
| A.9.1 Access Control | JWT + MFA + RBAC |
| A.9.4 Secret Management | .env + rotation |
| A.10.1 Cryptography | TLS 1.3 + AES-256 |
| A.12.4 Logging | Structured logs + Merkle hash |
| A.13.1 Network Security | Firewall + rate limiting |
| A.16.1 Incident Mgmt | Alert + response playbook |
| A.18.1 Compliance | This document + audits |

**Note**: This implements **controls aligned to** ISO 27001, not certified. Certification requires third-party audit.

### NIST 800-53 (Subset)

- AC-2: Account Management → Device registration
- AC-3: Access Enforcement → Zero-trust
- AU-2: Audit Events → Comprehensive logging
- IA-2: Identification & Auth → JWT + MFA
- SC-8: Transmission Confidentiality → TLS 1.3
- SI-4: System Monitoring → IDS + alerts

---

## 13. Honeypot Baseline

### Minimal Viable Honeypot

**Single fake endpoint**:
```javascript
app.get('/admin', (req, res) => {
  // Log access attempt
  auditLogger.log('HONEYPOT_HIT', {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: Date.now()
  });
  
  // Alert webhook
  sendWebhook(process.env.ALERT_WEBHOOK_URL, {
    text: `🍯 Honeypot triggered: ${req.ip}`,
    severity: 'HIGH'
  });
  
  // Delay response (waste time)
  setTimeout(() => {
    res.status(200).send(`
      <html><head><title>Admin Panel</title></head>
      <body>
        <h1>Admin Login</h1>
        <form>
          <input name="user" placeholder="Username">
          <input name="pass" type="password" placeholder="Password">
          <button>Login</button>
        </form>
        <!-- Canary token: admin123:${generateCanaryToken()} -->
      </body></html>
    `);
  }, 2000);
});
```

**Canary Token**:
- Embed fake credential in HTML comment
- If used elsewhere → Attacker accessed honeypot data
- Alert immediately

---

## 14. Monitoring & Alerting

### Alert Channels

**Webhook Integration** (Discord, Slack, PagerDuty):
```javascript
async function sendAlert(alert) {
  await fetch(process.env.ALERT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `**${alert.severity}**: ${alert.message}`,
      embeds: [{
        title: alert.type,
        description: alert.details,
        color: alert.severity === 'CRITICAL' ? 0xFF0000 : 0xFFA500,
        timestamp: new Date().toISOString()
      }]
    })
  });
}
```

### Metrics to Track

- Request rate (per endpoint)
- Error rate (4xx, 5xx)
- Auth success/failure rate
- Active devices
- Resource utilization
- Response time (p50, p95, p99)

---

## 15. Post-Quantum Crypto (When Ready)

### Current Status

**DO NOT implement custom post-quantum crypto**.

**Wait for**:
- **ML-KEM** (formerly Kyber) - Key Encapsulation
- **ML-DSA** (formerly Dilithium) - Digital Signatures
- **SLH-DSA** (SPHINCS+) - Stateless signatures

**When available**:
- Use NIST-standardized implementations
- Hybrid mode: Classical + PQ (e.g., X25519-Kyber)
- Via TLS 1.3 extensions or library support

**Current Action**: Monitor OpenSSL 3.2+ for PQ support

---

## 16. Biometric Data Handling

### Legal Requirements

**GDPR (EU)**:
- Explicit consent required (Article 9)
- Data minimization
- Right to deletion
- Purpose limitation

**CCPA/CPRA (California)**:
- Opt-in for biometric data
- Notice at collection
- Do not sell
- Deletion on request

**BIPA (Illinois)**:
- Written consent
- Retention policy
- Destruction schedule
- No profit from biometric data

### Implementation Requirements

**Before collecting biometric data**:
1. Display clear consent form
2. Explain what data is collected
3. State retention period
4. Provide deletion mechanism
5. Get explicit opt-in

**Storage**:
```javascript
{
  userId: 'user-123',
  consentGiven: true,
  consentDate: '2025-10-20T14:30:00Z',
  dataType: 'voiceprint',
  retentionDays: 365,
  deleteBy: '2026-10-20T14:30:00Z',
  embedding: encrypt(voiceEmbedding),  // Encrypted at rest
  canDelete: true
}
```

**Deletion API**:
```javascript
app.delete('/api/biometric/:userId', authenticate, async (req, res) => {
  await biometricStorage.delete(req.params.userId);
  auditLogger.log('BIOMETRIC_DELETED', { userId: req.params.userId });
  res.json({ deleted: true });
});
```

---

## 17. Blockchain Audit (Local-First)

### Correct Implementation

**Don't**: Run full Proof-of-Work blockchain  
**Do**: Merkle tree with daily anchoring

**Implementation**:
```javascript
class AuditLog {
  constructor() {
    this.entries = [];
  }
  
  append(event) {
    const entry = {
      index: this.entries.length,
      event,
      timestamp: Date.now(),
      previousHash: this.getLastHash(),
      hash: null
    };
    
    entry.hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(entry))
      .digest('hex');
    
    this.entries.push(entry);
    
    // Daily: anchor root hash to public blockchain (optional)
    if (this.shouldAnchor()) {
      this.anchorToPublicChain(entry.hash);
    }
  }
  
  verify() {
    for (let i = 1; i < this.entries.length; i++) {
      if (this.entries[i].previousHash !== this.entries[i - 1].hash) {
        return { valid: false, tamperedAt: i };
      }
    }
    return { valid: true };
  }
}
```

**Anchoring** (optional):
- Daily: Hash root to Ethereum/Bitcoin (costs ~$1)
- Provides external proof of existence
- Use services like Tierion or OpenTimestamps

---

## 18. Compliance Claims

### Correct Wording

❌ **WRONG**:
- "ISO 27001 certified"
- "SOC 2 compliant"
- "HIPAA compliant"

✅ **CORRECT**:
- "Implements controls **aligned to** ISO 27001 Annex A"
- "Designed to support SOC 2 requirements"
- "Provides HIPAA-ready technical safeguards"

**Add disclaimer**:
> "Compliance certification requires third-party audit and is the responsibility of the deploying organization."

---

## 19. Security Testing

### Required Tests

**Automated**:
```bash
# Static analysis
npm audit
npm run lint
semgrep --config auto

# Dependency scanning
npm audit --audit-level=moderate

# Unit tests (security)
npm test -- --grep "security|auth|crypto"

# Integration tests
npm run test:integration
```

**Manual (Quarterly)**:
- Penetration testing
- Code review
- Threat modeling update
- Dependency review

---

## 20. Secure Development Lifecycle

### Code Review Checklist

Before merging:
- [ ] No secrets in code
- [ ] Input validation present
- [ ] Output encoding done
- [ ] Error handling proper (no stack traces to client)
- [ ] Audit log entry added
- [ ] Security tests pass
- [ ] Dependencies up to date
- [ ] Threat model updated (if needed)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-20 | Initial baseline |

---

**This is the REAL security baseline. No hype. Just requirements.** ✅



