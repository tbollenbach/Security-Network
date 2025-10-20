# Privacy Policy

**Effective Date**: October 20, 2025  
**Last Updated**: October 20, 2025

---

## 1. Introduction

Resource Pooling Network ("we", "our", "the system") provides distributed computing infrastructure. This Privacy Policy explains how we collect, use, and protect your data.

---

## 2. Data We Collect

### 2.1 Automatically Collected

**Device Information**:
- Device ID (hardware-based, hashed)
- Platform/OS version
- IP address
- Device capabilities (CPU cores, RAM, storage)

**Usage Data**:
- Resource utilization metrics
- Connection timestamps
- Request logs
- Error logs

**Purpose**: System operation, resource allocation, security monitoring

**Retention**: 90 days (logs), 1 year (audit trail)

### 2.2 Optional Data (Requires Explicit Consent)

**Biometric Data** (if you enable biometric features):
- Voice embeddings (mathematical representation)
- Face embeddings (mathematical representation)

**Collection**: Only with explicit opt-in  
**Storage**: Encrypted at rest (AES-256)  
**Retention**: Until you delete or 1 year, whichever comes first  
**Deletion**: Available via `/api/biometric/:userId DELETE`

**Legal Basis**:
- GDPR: Article 9 explicit consent
- CCPA: Opt-in for sensitive data
- BIPA (Illinois): Written consent with retention policy

---

## 3. How We Use Data

We use collected data for:

1. **System Operation**: Resource pooling, task distribution
2. **Security**: Threat detection, anomaly monitoring
3. **Analytics**: Performance metrics, usage patterns
4. **Compliance**: Audit requirements, incident response

**We do NOT**:
- ❌ Sell your data
- ❌ Share with third parties (except legal requirement)
- ❌ Use for advertising
- ❌ Profile you for marketing

---

## 4. Data Storage & Security

### 4.1 Encryption

- **In Transit**: TLS 1.3 (all connections)
- **At Rest**: AES-256-GCM (sensitive data)
- **Backups**: Encrypted archives

### 4.2 Access Control

- Role-based access (RBAC)
- Multi-factor authentication (MFA)
- Audit logging for all access
- Principle of least privilege

### 4.3 Location

Data is stored:
- On your deployed server (self-hosted)
- OR cloud region of your choice
- Never transferred without encryption

---

## 5. Your Rights

### GDPR Rights (EU Users)

- **Access**: Request copy of your data
- **Rectification**: Correct inaccurate data
- **Erasure**: "Right to be forgotten"
- **Portability**: Export data in standard format
- **Objection**: Object to processing
- **Restriction**: Limit how we process data

### CCPA/CPRA Rights (California Users)

- **Know**: What data we collect
- **Delete**: Request deletion
- **Opt-out**: From sharing (we don't share)
- **Non-discrimination**: No penalty for exercising rights

### How to Exercise Rights

**Email**: privacy@resourcepool.local  
**Response time**: 30 days  
**Verification**: Required for security

---

## 6. Data Deletion

### Automatic Deletion

- Logs: After 90 days
- Inactive devices: After 180 days
- Revoked tokens: After 24 hours

### Manual Deletion

```bash
# Delete your device data
curl -X DELETE https://api.resourcepool.local/v1/device/:deviceId \
  -H "Authorization: Bearer YOUR_TOKEN"

# Delete biometric data
curl -X DELETE https://api.resourcepool.local/v1/biometric/:userId \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Verification**: Deletion logged to audit trail

---

## 7. Data Sharing

### We Share Data With:

**No one**, except:
- Legal requirement (subpoena, court order)
- Your explicit instruction
- Emergency (life-threatening situation)

### We Do NOT Share With:

- ❌ Advertisers
- ❌ Data brokers
- ❌ Analytics companies
- ❌ Social networks

---

## 8. Cookies & Tracking

**We use**:
- Session cookies (authentication)
- Security tokens (CSRF protection)

**We do NOT use**:
- Third-party tracking
- Advertising cookies
- Analytics cookies (optional, opt-in only)

**Control**: All cookies are HttpOnly, Secure, SameSite=Strict

---

## 9. Children's Privacy

This service is NOT intended for children under 13 (or 16 in EU).

We do not knowingly collect data from children. If we discover it, we delete immediately.

---

## 10. Data Breach Notification

**If breach occurs**:
- You will be notified within **72 hours**
- Email to registered address
- Details: What happened, what data, what we're doing
- Free credit monitoring (if applicable)

**Breach Response**:
1. Contain breach
2. Investigate cause
3. Notify affected users
4. Notify authorities (if required)
5. Implement fixes
6. Publish incident report

---

## 11. Changes to Policy

**Notification**:
- Email notification 30 days before changes
- Prominent notice in dashboard
- Continued use = acceptance

**Your Choice**:
- Accept changes
- OR delete account and data

---

## 12. Contact

**Privacy Questions**: privacy@resourcepool.local  
**Data Deletion**: privacy@resourcepool.local  
**Security Issues**: security@resourcepool.local  

**Mailing Address**:  
[Your Organization Name]  
[Address]  
[City, State, ZIP]  

---

## 13. Jurisdiction

Governed by laws of: [Your Jurisdiction]

Disputes: [Your Jurisdiction] courts

---

**We take your privacy seriously. This is not boilerplate - we follow it.** 🔒



