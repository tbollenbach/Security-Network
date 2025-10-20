# MVP Plan - 30-Day Roadmap

**Goal**: Ship a working, secure, credible resource pooling network

**No hype. Just delivery.**

---

## MVP Scope (v0.1)

### What We're Building

A **secure distributed computing network** that:
1. Connects devices across VPN
2. Pools resources (CPU, GPU, RAM, Storage)
3. Shows real-time aggregate dashboard
4. Has credible security (not science fiction)
5. Works reliably

### What We're NOT Building (Yet)

- ❌ Biometric authentication (Phase 3)
- ❌ Full blockchain PoW (Phase 3)
- ❌ Post-quantum crypto (Phase 4)
- ❌ AI-powered everything (Phase 2-3)
- ❌ Advanced honeypots (Phase 2)
- ❌ Self-healing AI (Phase 3)

**Focus**: Get the fundamentals rock solid first.

---

## Architecture (MVP)

```
┌─────────────────┐
│  Flutter/React  │  ← Dashboard (real-time view)
│   Dashboard     │
└────────┬────────┘
         │ WSS (TLS 1.3)
         ↓
┌─────────────────┐
│   Node.js API   │  ← Fastify + PostgreSQL
│   (Backend)     │     TLS 1.3, JWT RS256, MFA
└────────┬────────┘
         │ WSS
         ↓
┌─────────────────┐
│  Node Agents    │  ← Cross-platform daemon
│  (100 devices)  │     Reports resources
└─────────────────┘
```

---

## Week 1: Core Backend

### Deliverables

**1. Fastify Server** (TypeScript)
- TLS 1.3 server
- PostgreSQL for device state
- OIDC integration (Auth0 or Keycloak)
- JWT RS256 (NOT HS512!)

**2. Endpoints**:
```typescript
POST /v1/agent/register
  → Body: { deviceId, platform, capabilities }
  → Returns: { agentToken, refreshToken, expiresIn }

POST /v1/agent/heartbeat
  → Auth: Bearer agentToken
  → Body: { cpu, gpu, memory, storage, uptime }
  → Returns: { accepted: true, nextHeartbeat: 5000 }

GET /v1/aggregate
  → Auth: Required
  → Returns: {
      totalCpu: 600,
      totalMemory: 1200000,
      totalStorage: 38400000,
      onlineNodes: 100,
      totalGpus: 30
    }
```

**3. Security**:
- Helmet.js (all headers)
- CORS (strict origin whitelist)
- Rate limiting (express-rate-limit)
- Input validation (zod)
- Structured logging (pino)

**4. Database Schema**:
```sql
CREATE TABLE devices (
  device_id UUID PRIMARY KEY,
  platform VARCHAR(50),
  cpu_cores INT,
  memory_mb BIGINT,
  storage_mb BIGINT,
  has_gpu BOOLEAN,
  gpu_name VARCHAR(255),
  ip_address INET,
  last_heartbeat TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  is_online BOOLEAN DEFAULT true
);

CREATE INDEX idx_devices_online ON devices(is_online);
CREATE INDEX idx_devices_heartbeat ON devices(last_heartbeat);
```

---

## Week 2: Node Agent

### Deliverables

**1. Cross-Platform Daemon** (Node.js)
- Runs on Windows, Mac, Linux
- Auto-starts on boot (optional)
- System tray icon

**2. Capabilities**:
- Generate stable device ID
- Register with server
- Heartbeat every 5 seconds
- Report: CPU cores, RAM, storage, GPU
- Exponential backoff reconnect

**3. Implementation**:
```typescript
class NodeAgent {
  async start() {
    this.deviceId = await this.generateDeviceId();
    await this.register();
    
    setInterval(() => {
      this.sendHeartbeat();
    }, 5000);
  }
  
  async generateDeviceId() {
    const machineId = await getMachineId();
    const mac = await getMacAddress();
    return crypto.createHash('sha256')
      .update(`${machineId}:${mac}`)
      .digest('hex');
  }
  
  async sendHeartbeat() {
    const metrics = {
      cpu: os.cpus().length,
      memory: os.totalmem() / 1024 / 1024,
      storage: await getDiskSpace(),
      gpu: await getGPUInfo(),
      uptime: os.uptime()
    };
    
    await api.post('/v1/agent/heartbeat', metrics, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
  }
}
```

**4. Auto-Update** (gated):
- Check for updates daily
- Download signed updates only
- Verify signature before applying
- Rollback on failure

---

## Week 3: Dashboard

### Deliverables

**1. React Dashboard** (Vite + TypeScript)
- Clean, modern UI (Material UI or Tailwind)
- Real-time updates (SSE or WebSocket)
- Mobile responsive

**2. Views**:

**Home Dashboard**:
```
┌─────────────────────────────────────────────┐
│  Alpha Resource Pool Network                │
├─────────────────────────────────────────────┤
│                                             │
│   ┌─────────────┐  ┌─────────────┐        │
│   │ 600 CORES   │  │  1.2 TB RAM │        │
│   │   ━━━━━     │  │   ━━━━━     │        │
│   └─────────────┘  └─────────────┘        │
│                                             │
│   ┌─────────────┐  ┌─────────────┐        │
│   │ 38.4 TB SSD │  │  30 GPUs    │        │
│   │   ━━━━━     │  │   ━━━━━     │        │
│   └─────────────┘  └─────────────┘        │
│                                             │
│   Online Nodes: ████████████░ 100          │
│                                             │
│   Recent Events:                            │
│   • Device joined: laptop-42 (2s ago)      │
│   • Device left: desktop-15 (1m ago)       │
│   • Resources updated (5s ago)             │
└─────────────────────────────────────────────┘
```

**Node List** (Admin):
- Table of all devices
- Last seen, specs, status
- Sortable, filterable

**3. Authentication**:
- Login via OIDC
- MFA challenge (TOTP)
- Session management

---

## Week 4: Security & Polish

### Deliverables

**1. Security Baseline**:
- All controls from SECURITY_BASELINE.md implemented
- Threat model documented
- Logging with Merkle hashing

**2. Minimal Honeypot**:
```javascript
app.get('/admin', (req, res) => {
  logger.warn('HONEYPOT_HIT', { ip: req.ip });
  
  sendWebhook({
    text: `🍯 Honeypot accessed: ${req.ip}`,
    timestamp: new Date().toISOString()
  });
  
  setTimeout(() => {
    res.send(generateFakeAdminPanel());
  }, 2000);
});
```

**3. Tests**:
- Unit tests (80%+ coverage)
- Integration tests
- Security tests
- Load tests (k6 scripts)

**4. DevOps**:
- Docker Compose for local dev
- Environment config (.env.example)
- Makefile for common tasks
- CI/CD pipeline (GitHub Actions)

**5. Documentation**:
- API docs (OpenAPI/Swagger)
- Setup guide
- Deployment guide
- Security docs

---

## Technical Stack (Realistic)

### Backend
- **Runtime**: Node.js 18+ LTS
- **Framework**: Fastify (faster than Express)
- **Language**: TypeScript
- **Database**: PostgreSQL 14+
- **Cache**: Redis (optional)
- **Auth**: Auth0 or Keycloak (OIDC)

### Agent
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **System Info**: systeminformation package
- **Auto-update**: electron-updater (if using Electron)

### Dashboard
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **UI Library**: Material-UI or Tailwind
- **State**: Zustand or Redux Toolkit
- **Real-time**: Server-Sent Events (SSE)

---

## Correct Crypto Implementation

### JWT Signing (FIXED!)

```typescript
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';

// Generate RS256 keys (DO THIS ONCE)
// openssl genrsa -out private.pem 2048
// openssl rsa -in private.pem -pubout -out public.pem

const privateKey = await fs.readFile('./keys/private.pem', 'utf8');
const publicKey = await fs.readFile('./keys/public.pem', 'utf8');

// Sign token
const token = jwt.sign(
  {
    sub: deviceId,
    scope: 'agent'
  },
  privateKey,
  {
    algorithm: 'RS256',  // NOT "HS512" or "RSA-512"
    expiresIn: '15m',
    issuer: 'resourcepool',
    audience: 'api',
    jwtid: crypto.randomUUID(),
    keyid: 'key-2025-10'
  }
);

// Verify token
const decoded = jwt.verify(token, publicKey, {
  algorithms: ['RS256'],  // Whitelist allowed algorithms
  issuer: 'resourcepool',
  audience: 'api'
});
```

### TLS Configuration (FIXED!)

```typescript
import https from 'https';
import fs from 'fs';

const server = https.createServer({
  key: fs.readFileSync('./certs/server-key.pem'),
  cert: fs.readFileSync('./certs/server-cert.pem'),
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3',
  // Let OpenSSL choose secure ciphersuites
  // Don't specify unless you have a specific requirement
  honorCipherOrder: true
}, app);
```

**Let Node.js/OpenSSL handle cipher selection!**

---

## Logging (Production-Grade)

```typescript
import pino from 'pino';

const logger = pino({
  level: 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err
  }
});

// Add correlation ID middleware
app.use((req, res, next) => {
  req.correlationId = crypto.randomUUID();
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
});

// Log every request
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    logger.info({
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      ip: req.ip,
      userId: req.user?.sub
    });
  });
  
  next();
});
```

---

## MVP Success Criteria

### Functional
- ✅ 10 devices can join network
- ✅ Dashboard shows pooled resources in real-time
- ✅ Resources update every 5 seconds
- ✅ Device join/leave detected within 10 seconds
- ✅ No crashes for 24 hours

### Security
- ✅ TLS 1.3 enabled
- ✅ JWT RS256 working
- ✅ MFA enforced for admin
- ✅ Rate limiting active
- ✅ Audit logs with Merkle hash
- ✅ Basic honeypot deployed

### Performance
- ✅ < 100ms average latency
- ✅ Handles 100 concurrent devices
- ✅ 1000 req/sec sustained

### Documentation
- ✅ README (realistic)
- ✅ Setup guide
- ✅ API docs
- ✅ Security baseline
- ✅ Threat model

---

## Roadmap

### Phase 1: MVP (Days 1-30)
**Focus**: Get it working, get it secure, get it shipped

- Core backend (Fastify + PostgreSQL)
- Node agent (cross-platform)
- Dashboard (real-time view)
- Auth (OIDC + MFA)
- Security baseline
- Basic honeypot

**Deliverable**: Working demo with 10+ nodes

---

### Phase 2: Enhanced Security (Days 31-60)

- Advanced IDS (signature-based)
- AI threat detection (behavioral)
- Automated incident response
- Enhanced honeypots
- FIDO2/WebAuthn
- Advanced rate limiting

**Deliverable**: Enterprise-grade security

---

### Phase 3: Advanced Features (Days 61-120)

- Biometric auth (with legal compliance!)
- Distributed trust mesh
- Self-healing (quarantine + snapshot)
- Plugin ecosystem
- Governance system

**Deliverable**: Fully distributed system

---

### Phase 4: Enterprise (Days 121-180)

- HSM integration
- Post-quantum (when NIST standards available)
- SOC 2 certification prep
- Professional penetration test
- Compliance automation

**Deliverable**: Enterprise-ready product

---

## 30-Day Sprint

### Week 1: Backend Foundation
- [ ] Fastify server with TypeScript
- [ ] PostgreSQL schema
- [ ] JWT RS256 implementation
- [ ] OIDC integration (Auth0)
- [ ] Rate limiting
- [ ] Logging (pino)

### Week 2: Node Agent
- [ ] Cross-platform agent
- [ ] Device registration
- [ ] Heartbeat system
- [ ] Resource monitoring
- [ ] Auto-reconnect

### Week 3: Dashboard
- [ ] React + Vite setup
- [ ] Real-time resource view
- [ ] Authentication flow
- [ ] Node list (admin)
- [ ] Responsive design

### Week 4: Security & Testing
- [ ] Security baseline implemented
- [ ] Honeypot deployed
- [ ] Unit tests (80%+)
- [ ] Integration tests
- [ ] Load tests (k6)
- [ ] Security scan (npm audit)
- [ ] Documentation complete

---

## Success Metrics

**By Day 30, we must have**:

✅ **Functional**: 10+ devices connected, dashboard working  
✅ **Secure**: All SECURITY_BASELINE controls implemented  
✅ **Fast**: < 100ms latency, 1000+ req/sec  
✅ **Stable**: 99%+ uptime over 7 days  
✅ **Documented**: Complete setup + API docs  
✅ **Tested**: 80%+ coverage, all security tests pass  

---

## Anti-Goals (What We're Avoiding)

❌ Feature creep (stick to MVP scope)  
❌ Over-engineering (YAGNI principle)  
❌ Custom crypto (use standard libraries)  
❌ Marketing hype (credible claims only)  
❌ Scope expansion (phase it properly)  

---

## Tech Debt We're OK With (For Now)

These will be addressed in Phase 2+:

- Advanced AI features → Phase 2
- Blockchain PoW → Phase 3 (Merkle tree is fine for now)
- Biometric auth → Phase 3 (with legal review)
- Quantum crypto → Phase 4 (wait for standards)
- Advanced honeypots → Phase 2
- Full distributed consensus → Phase 3

**MVP = Minimal VIABLE Product, not Minimal**

---

## Launch Checklist

Before going live:

- [ ] Security audit (self or third-party)
- [ ] Penetration test (basic)
- [ ] Load test (published results)
- [ ] Legal review (Privacy Policy, Terms)
- [ ] Bug bash (team testing)
- [ ] Backup/restore tested
- [ ] Incident response plan
- [ ] Monitoring/alerts working
- [ ] Documentation complete
- [ ] .env.example up to date

---

## Realistic Timeline

**Realistic**: 30 days for MVP (with team)  
**Solo**: 60-90 days for MVP  
**Enterprise-ready**: 180 days  

---

**Focus on shipping, not dreaming.** 🚀

**"Make it work. Make it right. Make it fast." - Kent Beck** ✅



