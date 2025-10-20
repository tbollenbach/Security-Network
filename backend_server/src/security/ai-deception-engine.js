import crypto from 'crypto';

/**
 * AI Deception Engine
 * LLM-powered adaptive honeypots that trap and distract attackers
 * Each session is unique and learns from attacker behavior
 */
export class AIDeceptionEngine {
  constructor(notificationService) {
    this.notificationService = notificationService;
    
    // Active deception sessions
    this.deceptionSessions = new Map();
    
    // Attacker profiles (learning from behavior)
    this.attackerProfiles = new Map();
    
    // Deception scenarios
    this.scenarios = this.loadDeceptionScenarios();
    
    // Response templates
    this.responseTemplates = this.loadResponseTemplates();
  }

  /**
   * Load deception scenarios
   */
  loadDeceptionScenarios() {
    return [
      {
        name: 'Fake Admin Panel',
        description: 'Simulates a real admin dashboard',
        endpoints: ['/admin', '/administrator', '/admin.php'],
        complexity: 'high',
        engagement: 'interactive'
      },
      {
        name: 'Fake Database Console',
        description: 'MySQL/PostgreSQL console simulator',
        endpoints: ['/phpmyadmin', '/db/console', '/database'],
        complexity: 'medium',
        engagement: 'command-line'
      },
      {
        name: 'Fake API Documentation',
        description: 'Swagger/OpenAPI docs with fake endpoints',
        endpoints: ['/api/docs', '/swagger', '/api-docs'],
        complexity: 'low',
        engagement: 'browse'
      },
      {
        name: 'Fake File Browser',
        description: 'Realistic file system with sensitive files',
        endpoints: ['/files', '/browse', '/filemanager'],
        complexity: 'high',
        engagement: 'interactive'
      },
      {
        name: 'Fake Terminal',
        description: 'Web-based terminal that accepts commands',
        endpoints: ['/terminal', '/shell', '/console'],
        complexity: 'high',
        engagement: 'command-line'
      }
    ];
  }

  /**
   * Load AI response templates
   */
  loadResponseTemplates() {
    return {
      login: [
        'Welcome to Alpha Resource Pool Admin Panel v3.2.1',
        'Authenticating...',
        'Login successful! Loading dashboard...',
        'Warning: Elevated privileges detected. Logging session.'
      ],
      database: [
        'MySQL Console 8.0.32',
        'Connected to: production_db',
        'Type "help" for list of commands',
        'Database selected: user_data'
      ],
      terminal: [
        'root@alpha-server:~# ',
        'bash-5.1$ ',
        'Permission granted. Welcome, administrator.',
        'Loading secure shell environment...'
      ],
      fileList: [
        'drwxr-xr-x 12 root root  4096 Oct 20 14:32 .',
        'drwxr-xr-x  3 root root  4096 Oct 15 09:15 ..',
        '-rw------- 1 root root  2048 Oct 20 14:30 .env',
        '-rw------- 1 root root  4096 Oct 18 11:22 database.sql',
        '-rw-r--r-- 1 root root  8192 Oct 20 14:32 config.json',
        'drwx------ 2 root root  4096 Oct 19 16:45 keys/'
      ]
    };
  }

  /**
   * Create deception session for attacker
   */
  createDeceptionSession(attackerIP, endpoint) {
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    // Select scenario based on endpoint
    const scenario = this.selectScenario(endpoint);
    
    // Generate unique session
    const session = {
      id: sessionId,
      attackerIP,
      endpoint,
      scenario: scenario.name,
      startTime: Date.now(),
      interactions: [],
      attackerProfile: this.getOrCreateProfile(attackerIP),
      sessionData: this.generateSessionData(scenario),
      engaged: true,
      distraction Level: 0
    };
    
    this.deceptionSessions.set(sessionId, session);
    
    console.log(`🎭 AI Deception Session Started: ${sessionId}`);
    console.log(`   IP: ${attackerIP}`);
    console.log(`   Scenario: ${scenario.name}`);
    
    this.notificationService.emit('deception-session-started', {
      sessionId,
      attackerIP,
      scenario: scenario.name
    });
    
    return session;
  }

  /**
   * Select appropriate scenario
   */
  selectScenario(endpoint) {
    for (const scenario of this.scenarios) {
      if (scenario.endpoints.some(ep => endpoint.includes(ep))) {
        return scenario;
      }
    }
    
    // Default to admin panel
    return this.scenarios[0];
  }

  /**
   * Get or create attacker profile
   */
  getOrCreateProfile(attackerIP) {
    if (!this.attackerProfiles.has(attackerIP)) {
      this.attackerProfiles.set(attackerIP, {
        ip: attackerIP,
        firstSeen: Date.now(),
        sessions: [],
        skillLevel: 'unknown',
        tactics: [],
        interactionPatterns: [],
        distractionTime: 0
      });
    }
    
    return this.attackerProfiles.get(attackerIP);
  }

  /**
   * Generate unique session data
   */
  generateSessionData(scenario) {
    const data = {
      sessionId: crypto.randomBytes(8).toString('hex'),
      username: this.generateFakeUsername(),
      filesystem: this.generateFakeFilesystem(),
      database: this.generateFakeDatabase(),
      apiEndpoints: this.generateFakeAPIEndpoints(),
      credentials: this.generateFakeCredentials(),
      logs: this.generateFakeLogs()
    };
    
    return data;
  }

  /**
   * Generate fake username
   */
  generateFakeUsername() {
    const usernames = [
      'admin', 'root', 'administrator', 'sysadmin',
      'operator', 'devops', 'jenkins', 'gitlab-admin'
    ];
    return usernames[Math.floor(Math.random() * usernames.length)];
  }

  /**
   * Generate fake filesystem
   */
  generateFakeFilesystem() {
    return {
      '/': {
        'home': {
          'admin': {
            '.ssh': {
              'id_rsa': '-----BEGIN RSA PRIVATE KEY-----\n' + crypto.randomBytes(400).toString('base64'),
              'authorized_keys': 'ssh-rsa AAAA...'
            },
            '.bash_history': this.generateFakeBashHistory()
          }
        },
        'etc': {
          'passwd': 'root:x:0:0:root:/root:/bin/bash\nadmin:x:1000:1000::/home/admin:/bin/bash',
          'shadow': '$6$' + crypto.randomBytes(16).toString('hex'),
          'nginx': {
            'nginx.conf': '# Fake nginx config...'
          }
        },
        'var': {
          'www': {
            'config.php': `<?php\n$db_host = "localhost";\n$db_user = "admin";\n$db_pass = "${crypto.randomBytes(16).toString('hex')}";`
          },
          'log': {
            'auth.log': 'Oct 20 14:32:10 alpha-server sshd[1234]: Accepted publickey for admin',
            'nginx': {
              'access.log': '192.168.1.100 - - [20/Oct/2025:14:32:15 +0000] "GET /api/users HTTP/1.1" 200'
            }
          }
        }
      }
    };
  }

  /**
   * Generate fake bash history
   */
  generateFakeBashHistory() {
    return [
      'sudo su',
      'cd /var/www',
      'vim config.php',
      'mysql -u root -p',
      'systemctl restart nginx',
      'cat /etc/shadow',
      'wget https://updates.alphanet.internal/update.sh',
      './update.sh',
      'rm update.sh',
      'history -c'
    ].join('\n');
  }

  /**
   * Generate fake database
   */
  generateFakeDatabase() {
    return {
      tables: ['users', 'sessions', 'api_keys', 'transactions', 'audit_log'],
      users: [
        { id: 1, username: 'admin', email: 'admin@alphanet.internal', role: 'administrator' },
        { id: 2, username: 'operator', email: 'ops@alphanet.internal', role: 'operator' },
        { id: 3, username: 'john.doe', email: 'john@alphanet.internal', role: 'user' }
      ],
      api_keys: [
        { id: 1, key: 'sk_live_' + crypto.randomBytes(32).toString('hex'), user_id: 1, active: true },
        { id: 2, key: 'sk_test_' + crypto.randomBytes(32).toString('hex'), user_id: 2, active: true }
      ]
    };
  }

  /**
   * Generate fake API endpoints
   */
  generateFakeAPIEndpoints() {
    return [
      { method: 'GET', path: '/api/users', description: 'Get all users', auth: 'required' },
      { method: 'POST', path: '/api/auth/login', description: 'User login', auth: 'none' },
      { method: 'GET', path: '/api/keys', description: 'List API keys', auth: 'admin' },
      { method: 'POST', path: '/api/execute', description: 'Execute command', auth: 'admin' },
      { method: 'GET', path: '/api/logs', description: 'Access logs', auth: 'admin' },
      { method: 'DELETE', path: '/api/users/:id', description: 'Delete user', auth: 'admin' }
    ];
  }

  /**
   * Generate fake credentials
   */
  generateFakeCredentials() {
    return {
      admin: {
        username: 'admin',
        password: 'Alpha2024!Secure',
        mfa_secret: crypto.randomBytes(16).toString('hex')
      },
      database: {
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: crypto.randomBytes(16).toString('hex'),
        database: 'production_db'
      },
      api: {
        key: 'pk_live_' + crypto.randomBytes(32).toString('hex'),
        secret: 'sk_live_' + crypto.randomBytes(32).toString('hex')
      }
    };
  }

  /**
   * Generate fake logs
   */
  generateFakeLogs() {
    const logs = [];
    const now = Date.now();
    
    for (let i = 0; i < 50; i++) {
      logs.push({
        timestamp: new Date(now - i * 60000).toISOString(),
        level: ['INFO', 'WARN', 'ERROR'][Math.floor(Math.random() * 3)],
        message: [
          'User login successful',
          'API request completed',
          'Database query executed',
          'Cache updated',
          'Background job completed',
          'Session created',
          'File uploaded'
        ][Math.floor(Math.random() * 7)]
      });
    }
    
    return logs;
  }

  /**
   * Handle attacker interaction
   */
  handleInteraction(sessionId, interaction) {
    const session = this.deceptionSessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    
    // Log interaction
    session.interactions.push({
      timestamp: Date.now(),
      type: interaction.type,
      data: interaction.data
    });
    
    // Update attacker profile
    this.learnFromInteraction(session.attackerProfile, interaction);
    
    // Generate AI response
    const response = this.generateAIResponse(session, interaction);
    
    // Increase distraction level
    session.distractionLevel++;
    
    // Calculate time wasted
    const timeWasted = Date.now() - session.startTime;
    session.attackerProfile.distractionTime += timeWasted;
    
    console.log(`🎭 Attacker Interaction: ${interaction.type}`);
    console.log(`   Time Wasted: ${(timeWasted / 1000).toFixed(1)}s`);
    console.log(`   Distraction Level: ${session.distractionLevel}`);
    
    // If highly engaged, create infinite loop
    if (session.distractionLevel > 10) {
      response.loopTrap = true;
      response.message += '\n\nLoading additional data...';
      response.delay = 5000; // 5 second delay
    }
    
    return response;
  }

  /**
   * Generate AI response based on interaction
   */
  generateAIResponse(session, interaction) {
    const scenario = session.scenario;
    
    switch (interaction.type) {
      case 'command':
        return this.generateCommandResponse(session, interaction.data);
      
      case 'click':
        return this.generateClickResponse(session, interaction.data);
      
      case 'query':
        return this.generateQueryResponse(session, interaction.data);
      
      default:
        return { success: true, message: 'Processing...' };
    }
  }

  /**
   * Generate command response
   */
  generateCommandResponse(session, command) {
    const responses = {
      'ls': session.sessionData.filesystem['/'],
      'pwd': '/home/admin',
      'whoami': session.sessionData.username,
      'cat .env': `DB_PASSWORD=${crypto.randomBytes(16).toString('hex')}\nAPI_KEY=${crypto.randomBytes(24).toString('hex')}`,
      'history': session.sessionData.filesystem['/'].home.admin['.bash_history'],
      'sudo su': 'Authenticated. Welcome, root.',
      'mysql': 'MySQL monitor. Type "help" for help.',
      'SELECT * FROM users': JSON.stringify(session.sessionData.database.users, null, 2)
    };
    
    // Add random delay to waste time
    const delay = Math.random() * 2000 + 500;
    
    return {
      success: true,
      output: responses[command] || `Command not found: ${command}`,
      delay: delay,
      prompt: `${session.sessionData.username}@alpha-server:~# `
    };
  }

  /**
   * Generate click response
   */
  generateClickResponse(session, target) {
    return {
      success: true,
      message: `Loading ${target}...`,
      data: session.sessionData[target] || {},
      delay: Math.random() * 1000 + 300
    };
  }

  /**
   * Generate query response
   */
  generateQueryResponse(session, query) {
    return {
      success: true,
      results: session.sessionData.database[query] || [],
      delay: Math.random() * 1500 + 500
    };
  }

  /**
   * Learn from attacker interaction
   */
  learnFromInteraction(profile, interaction) {
    profile.interactionPatterns.push({
      type: interaction.type,
      timestamp: Date.now()
    });
    
    // Analyze skill level
    if (interaction.type === 'command') {
      const advancedCommands = ['nmap', 'netcat', 'sqlmap', 'metasploit', 'hydra'];
      if (advancedCommands.some(cmd => interaction.data.includes(cmd))) {
        profile.skillLevel = 'advanced';
      }
    }
    
    // Track tactics
    if (!profile.tactics.includes(interaction.type)) {
      profile.tactics.push(interaction.type);
    }
  }

  /**
   * Get deception statistics
   */
  getStatistics() {
    const sessions = Array.from(this.deceptionSessions.values());
    const profiles = Array.from(this.attackerProfiles.values());
    
    return {
      activeSessions: sessions.filter(s => s.engaged).length,
      totalSessions: sessions.length,
      totalAttackers: profiles.length,
      totalTimeWasted: profiles.reduce((sum, p) => sum + p.distractionTime, 0),
      averageDistractionLevel: sessions.reduce((sum, s) => sum + s.distractionLevel, 0) / sessions.length || 0,
      skillLevels: {
        unknown: profiles.filter(p => p.skillLevel === 'unknown').length,
        basic: profiles.filter(p => p.skillLevel === 'basic').length,
        intermediate: profiles.filter(p => p.skillLevel === 'intermediate').length,
        advanced: profiles.filter(p => p.skillLevel === 'advanced').length
      }
    };
  }

  /**
   * End deception session
   */
  endSession(sessionId) {
    const session = this.deceptionSessions.get(sessionId);
    if (session) {
      session.engaged = false;
      session.endTime = Date.now();
      session.totalDuration = session.endTime - session.startTime;
      
      console.log(`🎭 Deception Session Ended: ${sessionId}`);
      console.log(`   Duration: ${(session.totalDuration / 1000).toFixed(1)}s`);
      console.log(`   Interactions: ${session.interactions.length}`);
    }
  }
}



