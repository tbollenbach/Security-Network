import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Automated Plugin Vulnerability Scanner
 * NO MORE RELYING ON "COMMUNITY REVIEW" - AUTOMATED SECURITY!
 */
export class PluginScanner {
  constructor(notificationService) {
    this.notificationService = notificationService;
    
    // Scanning results
    this.scanResults = new Map();
    
    // Vulnerability signatures
    this.vulnerabilitySignatures = this.loadVulnerabilitySignatures();
    
    // Dangerous patterns
    this.dangerousPatterns = this.loadDangerousPatterns();
    
    console.log('🔍 Plugin Security Scanner: INITIALIZED');
    console.log(`   Vulnerability Signatures: ${this.vulnerabilitySignatures.length}`);
    console.log(`   Dangerous Patterns: ${this.dangerousPatterns.length}`);
  }

  /**
   * Load vulnerability signatures
   */
  loadVulnerabilitySignatures() {
    return [
      { id: 'SQL_INJECTION', pattern: /(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER).*FROM/i, severity: 'CRITICAL' },
      { id: 'XSS', pattern: /<script|javascript:|onerror=|onload=/i, severity: 'HIGH' },
      { id: 'COMMAND_INJECTION', pattern: /exec\(|system\(|eval\(|child_process/i, severity: 'CRITICAL' },
      { id: 'PATH_TRAVERSAL', pattern: /\.\.[\/\\]/i, severity: 'HIGH' },
      { id: 'HARDCODED_SECRETS', pattern: /(password|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"]+['"]/i, severity: 'CRITICAL' },
      { id: 'CRYPTO_MINING', pattern: /(coinhive|cryptonight|monero|bitcoin|mining)/i, severity: 'CRITICAL' },
      { id: 'BACKDOOR', pattern: /(backdoor|reverse.shell|netcat|bind.shell)/i, severity: 'CRITICAL' },
      { id: 'DATA_EXFILTRATION', pattern: /(XMLHttpRequest|fetch|axios|http\.post).*external/i, severity: 'HIGH' },
      { id: 'OBFUSCATION', pattern: /eval\(atob\(|Function\(.*String\.fromCharCode/i, severity: 'HIGH' }
    ];
  }

  /**
   * Load dangerous patterns
   */
  loadDangerousPatterns() {
    return [
      { pattern: /__proto__/g, name: 'PROTOTYPE_POLLUTION', risk: 'HIGH' },
      { pattern: /constructor\[/g, name: 'CONSTRUCTOR_ACCESS', risk: 'HIGH' },
      { pattern: /require\s*\(\s*['"]child_process['"]\s*\)/g, name: 'CHILD_PROCESS', risk: 'CRITICAL' },
      { pattern: /require\s*\(\s*['"]fs['"]\s*\)/g, name: 'FILESYSTEM_ACCESS', risk: 'MEDIUM' },
      { pattern: /require\s*\(\s*['"]net['"]\s*\)/g, name: 'NETWORK_ACCESS', risk: 'MEDIUM' },
      { pattern: /Buffer\.from\(.+,\s*['"]base64['"]\)/g, name: 'BASE64_DECODE', risk: 'MEDIUM' }
    ];
  }

  /**
   * Scan plugin for vulnerabilities
   */
  async scanPlugin(pluginId, pluginCode, metadata) {
    console.log(`\n🔍 SCANNING PLUGIN: ${pluginId}`);
    console.log(`   Name: ${metadata.name}`);
    console.log(`   Version: ${metadata.version}`);
    console.log(`   Author: ${metadata.author}`);
    
    const scanId = crypto.randomBytes(8).toString('hex');
    const startTime = Date.now();
    
    const scanResults = {
      scanId,
      pluginId,
      metadata,
      timestamp: Date.now(),
      vulnerabilities: [],
      warnings: [],
      score: 0,
      passed: false,
      checks: {}
    };
    
    // Run all security checks
    scanResults.checks.staticAnalysis = await this.runStaticAnalysis(pluginCode);
    scanResults.checks.dependencyCheck = await this.checkDependencies(metadata);
    scanResults.checks.permissionCheck = this.validatePermissions(metadata);
    scanResults.checks.codeQuality = this.analyzeCodeQuality(pluginCode);
    scanResults.checks.malwareCheck = this.scanForMalware(pluginCode);
    scanResults.checks.licenseCheck = this.validateLicense(metadata);
    
    // Collect vulnerabilities
    Object.values(scanResults.checks).forEach(check => {
      if (check.vulnerabilities) {
        scanResults.vulnerabilities.push(...check.vulnerabilities);
      }
      if (check.warnings) {
        scanResults.warnings.push(...check.warnings);
      }
    });
    
    // Calculate security score
    scanResults.score = this.calculateSecurityScore(scanResults);
    scanResults.passed = scanResults.score >= 85 && scanResults.vulnerabilities.length === 0;
    scanResults.duration = Date.now() - startTime;
    
    // Store results
    this.scanResults.set(scanId, scanResults);
    
    // Log results
    console.log(`\n   SCAN RESULTS:`);
    console.log(`   ✓ Duration: ${scanResults.duration}ms`);
    console.log(`   ✓ Security Score: ${scanResults.score}/100`);
    console.log(`   ✓ Vulnerabilities: ${scanResults.vulnerabilities.length}`);
    console.log(`   ✓ Warnings: ${scanResults.warnings.length}`);
    console.log(`   ${scanResults.passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (!scanResults.passed) {
      this.notificationService.emit('plugin-scan-failed', {
        pluginId,
        scanId,
        vulnerabilities: scanResults.vulnerabilities
      });
    }
    
    return scanResults;
  }

  /**
   * Run static code analysis
   */
  async runStaticAnalysis(code) {
    const vulnerabilities = [];
    const warnings = [];
    
    // Check for vulnerability signatures
    this.vulnerabilitySignatures.forEach(sig => {
      const matches = code.match(sig.pattern);
      if (matches) {
        vulnerabilities.push({
          id: sig.id,
          severity: sig.severity,
          matches: matches.length,
          pattern: sig.pattern.toString()
        });
      }
    });
    
    // Check for dangerous patterns
    this.dangerousPatterns.forEach(pattern => {
      const matches = code.match(pattern.pattern);
      if (matches) {
        warnings.push({
          name: pattern.name,
          risk: pattern.risk,
          occurrences: matches.length
        });
      }
    });
    
    return {
      vulnerabilities,
      warnings,
      passed: vulnerabilities.filter(v => v.severity === 'CRITICAL').length === 0
    };
  }

  /**
   * Check dependencies for known vulnerabilities
   */
  async checkDependencies(metadata) {
    const vulnerabilities = [];
    
    if (!metadata.dependencies) {
      return { vulnerabilities: [], passed: true };
    }
    
    // In production: Query NPM audit, Snyk, or OSV database
    // For now, simulate check
    
    return {
      vulnerabilities,
      passed: true,
      checked: Object.keys(metadata.dependencies || {}).length
    };
  }

  /**
   * Validate declared permissions
   */
  validatePermissions(metadata) {
    const issues = [];
    
    if (!metadata.permissions || metadata.permissions.length === 0) {
      issues.push({
        issue: 'NO_PERMISSIONS_DECLARED',
        severity: 'HIGH',
        message: 'Plugin must declare required permissions'
      });
    }
    
    // Check for excessive permissions
    const dangerousPermissions = ['SYSTEM_COMMANDS', 'FILE_WRITE', 'NETWORK_RAW'];
    const hasDangerous = metadata.permissions?.some(p => dangerousPermissions.includes(p));
    
    if (hasDangerous) {
      issues.push({
        issue: 'DANGEROUS_PERMISSIONS',
        severity: 'MEDIUM',
        message: 'Plugin requests dangerous permissions',
        permissions: metadata.permissions.filter(p => dangerousPermissions.includes(p))
      });
    }
    
    return {
      issues,
      passed: issues.filter(i => i.severity === 'HIGH' || i.severity === 'CRITICAL').length === 0
    };
  }

  /**
   * Analyze code quality
   */
  analyzeCodeQuality(code) {
    const issues = [];
    
    // Check code length
    if (code.length > 100000) {
      issues.push({
        issue: 'CODE_TOO_LARGE',
        severity: 'LOW',
        message: 'Plugin code exceeds recommended size'
      });
    }
    
    // Check for minified/obfuscated code
    const avgLineLength = code.split('\n').reduce((sum, line) => sum + line.length, 0) / code.split('\n').length;
    if (avgLineLength > 200) {
      issues.push({
        issue: 'POSSIBLY_OBFUSCATED',
        severity: 'HIGH',
        message: 'Code appears to be minified or obfuscated'
      });
    }
    
    return {
      issues,
      passed: issues.filter(i => i.severity === 'HIGH').length === 0,
      metrics: {
        lines: code.split('\n').length,
        size: code.length,
        avgLineLength
      }
    };
  }

  /**
   * Scan for malware signatures
   */
  scanForMalware(code) {
    const threats = [];
    
    // Malware signatures
    const malwareSignatures = [
      { name: 'REMOTE_CODE_EXECUTION', pattern: /eval\(.*fetch\(|eval\(.*http/i },
      { name: 'KEYLOGGER', pattern: /addEventListener.*keydown|keypress.*log/i },
      { name: 'SCREEN_CAPTURE', pattern: /getUserMedia|captureStream|getDisplayMedia/i },
      { name: 'CLIPBOARD_THEFT', pattern: /clipboard\.read|execCommand.*copy/i }
    ];
    
    malwareSignatures.forEach(sig => {
      if (sig.pattern.test(code)) {
        threats.push({
          name: sig.name,
          severity: 'CRITICAL',
          pattern: sig.pattern.toString()
        });
      }
    });
    
    return {
      threats,
      passed: threats.length === 0,
      clean: threats.length === 0
    };
  }

  /**
   * Validate license
   */
  validateLicense(metadata) {
    const approvedLicenses = ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'GPL-3.0', 'ISC'];
    
    if (!metadata.license) {
      return {
        valid: false,
        issue: 'NO_LICENSE',
        message: 'Plugin must declare a license'
      };
    }
    
    const isApproved = approvedLicenses.includes(metadata.license);
    
    return {
      valid: isApproved,
      license: metadata.license,
      issue: isApproved ? null : 'UNAPPROVED_LICENSE',
      message: isApproved ? 'License approved' : 'License not in approved list'
    };
  }

  /**
   * Calculate overall security score
   */
  calculateSecurityScore(scanResults) {
    let score = 100;
    
    // Deduct for vulnerabilities
    scanResults.vulnerabilities.forEach(vuln => {
      const deduction = {
        'CRITICAL': 50,
        'HIGH': 30,
        'MEDIUM': 15,
        'LOW': 5
      }[vuln.severity] || 10;
      
      score -= deduction;
    });
    
    // Deduct for warnings
    scanResults.warnings.forEach(warning => {
      const deduction = {
        'CRITICAL': 30,
        'HIGH': 20,
        'MEDIUM': 10,
        'LOW': 3
      }[warning.risk] || 5;
      
      score -= deduction;
    });
    
    return Math.max(0, score);
  }

  /**
   * Get scan report
   */
  getScanReport(scanId) {
    return this.scanResults.get(scanId);
  }

  /**
   * Get all failed scans
   */
  getFailedScans() {
    return Array.from(this.scanResults.values()).filter(r => !r.passed);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const results = Array.from(this.scanResults.values());
    
    return {
      totalScans: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length || 0,
      criticalVulnerabilities: results.reduce((sum, r) => 
        sum + r.vulnerabilities.filter(v => v.severity === 'CRITICAL').length, 0
      )
    };
  }
}



