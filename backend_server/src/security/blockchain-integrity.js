import crypto from 'crypto';

/**
 * Blockchain-Based Integrity Verification
 * Immutable audit trail using blockchain technology
 */
export class BlockchainIntegrity {
  constructor() {
    this.chain = [];
    this.pendingTransactions = [];
    this.difficulty = 4; // Mining difficulty
    this.miningReward = 0;
    
    // Create genesis block
    this.createGenesisBlock();
  }

  /**
   * Create the first block in the chain
   */
  createGenesisBlock() {
    const genesisBlock = {
      index: 0,
      timestamp: Date.now(),
      transactions: [{
        type: 'GENESIS',
        data: 'System Initialized',
        timestamp: Date.now()
      }],
      previousHash: '0',
      nonce: 0
    };
    
    genesisBlock.hash = this.calculateHash(genesisBlock);
    this.chain.push(genesisBlock);
    
    console.log('✓ Blockchain genesis block created');
  }

  /**
   * Calculate hash for a block
   */
  calculateHash(block) {
    const data = JSON.stringify({
      index: block.index,
      timestamp: block.timestamp,
      transactions: block.transactions,
      previousHash: block.previousHash,
      nonce: block.nonce
    });
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Add security event to blockchain
   */
  addSecurityEvent(eventType, data) {
    const transaction = {
      id: crypto.randomBytes(16).toString('hex'),
      type: eventType,
      data: data,
      timestamp: Date.now(),
      signature: this.signTransaction(eventType, data)
    };
    
    this.pendingTransactions.push(transaction);
    
    // Auto-mine if enough transactions
    if (this.pendingTransactions.length >= 10) {
      this.mineBlock();
    }
    
    return transaction.id;
  }

  /**
   * Sign transaction for authenticity
   */
  signTransaction(eventType, data) {
    const content = JSON.stringify({ eventType, data, timestamp: Date.now() });
    return crypto.createHash('sha512').update(content).digest('hex');
  }

  /**
   * Mine a new block (Proof of Work)
   */
  mineBlock() {
    if (this.pendingTransactions.length === 0) {
      return null;
    }
    
    const previousBlock = this.chain[this.chain.length - 1];
    
    const block = {
      index: previousBlock.index + 1,
      timestamp: Date.now(),
      transactions: [...this.pendingTransactions],
      previousHash: previousBlock.hash,
      nonce: 0
    };
    
    // Proof of Work
    console.log(`⛏️  Mining block ${block.index}...`);
    const startTime = Date.now();
    
    while (true) {
      block.hash = this.calculateHash(block);
      
      if (block.hash.substring(0, this.difficulty) === '0'.repeat(this.difficulty)) {
        break;
      }
      
      block.nonce++;
    }
    
    const miningTime = Date.now() - startTime;
    console.log(`✓ Block ${block.index} mined in ${miningTime}ms (hash: ${block.hash})`);
    
    this.chain.push(block);
    this.pendingTransactions = [];
    
    return block;
  }

  /**
   * Verify blockchain integrity
   */
  verifyIntegrity() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];
      
      // Verify current block hash
      const calculatedHash = this.calculateHash(currentBlock);
      if (currentBlock.hash !== calculatedHash) {
        return {
          valid: false,
          error: `Block ${i} hash mismatch`,
          block: i
        };
      }
      
      // Verify previous hash link
      if (currentBlock.previousHash !== previousBlock.hash) {
        return {
          valid: false,
          error: `Block ${i} previous hash mismatch`,
          block: i
        };
      }
      
      // Verify Proof of Work
      if (currentBlock.hash.substring(0, this.difficulty) !== '0'.repeat(this.difficulty)) {
        return {
          valid: false,
          error: `Block ${i} invalid proof of work`,
          block: i
        };
      }
    }
    
    return { valid: true, blocks: this.chain.length };
  }

  /**
   * Get transaction by ID
   */
  getTransaction(transactionId) {
    for (const block of this.chain) {
      const transaction = block.transactions.find(t => t.id === transactionId);
      if (transaction) {
        return {
          transaction,
          block: block.index,
          confirmed: true
        };
      }
    }
    
    // Check pending
    const pending = this.pendingTransactions.find(t => t.id === transactionId);
    if (pending) {
      return {
        transaction: pending,
        block: null,
        confirmed: false
      };
    }
    
    return null;
  }

  /**
   * Get all events of a specific type
   */
  getEventsByType(eventType) {
    const events = [];
    
    this.chain.forEach(block => {
      block.transactions.forEach(transaction => {
        if (transaction.type === eventType) {
          events.push({
            ...transaction,
            blockIndex: block.index,
            blockHash: block.hash
          });
        }
      });
    });
    
    return events;
  }

  /**
   * Get events within time range
   */
  getEventsByTimeRange(startTime, endTime) {
    const events = [];
    
    this.chain.forEach(block => {
      block.transactions.forEach(transaction => {
        if (transaction.timestamp >= startTime && transaction.timestamp <= endTime) {
          events.push({
            ...transaction,
            blockIndex: block.index,
            blockHash: block.hash
          });
        }
      });
    });
    
    return events;
  }

  /**
   * Export blockchain for forensics
   */
  exportChain() {
    return {
      chainLength: this.chain.length,
      totalTransactions: this.chain.reduce((sum, block) => sum + block.transactions.length, 0),
      lastBlock: this.chain[this.chain.length - 1],
      integrity: this.verifyIntegrity(),
      exportTime: Date.now(),
      chain: this.chain
    };
  }

  /**
   * Get blockchain statistics
   */
  getStatistics() {
    const stats = {
      blockCount: this.chain.length,
      transactionCount: 0,
      pendingTransactions: this.pendingTransactions.length,
      averageBlockTime: 0,
      eventTypes: {},
      integrity: this.verifyIntegrity()
    };
    
    let totalBlockTime = 0;
    
    this.chain.forEach((block, index) => {
      stats.transactionCount += block.transactions.length;
      
      if (index > 0) {
        totalBlockTime += block.timestamp - this.chain[index - 1].timestamp;
      }
      
      block.transactions.forEach(tx => {
        stats.eventTypes[tx.type] = (stats.eventTypes[tx.type] || 0) + 1;
      });
    });
    
    stats.averageBlockTime = this.chain.length > 1 
      ? totalBlockTime / (this.chain.length - 1) 
      : 0;
    
    return stats;
  }

  /**
   * Force mine pending transactions
   */
  forceSync() {
    if (this.pendingTransactions.length > 0) {
      return this.mineBlock();
    }
    return null;
  }

  /**
   * Create tamper-proof audit record
   */
  createAuditRecord(action, user, details) {
    return this.addSecurityEvent('AUDIT', {
      action,
      user,
      details,
      immutable: true,
      auditId: crypto.randomBytes(16).toString('hex')
    });
  }

  /**
   * Verify audit record hasn't been tampered with
   */
  verifyAuditRecord(transactionId) {
    const result = this.getTransaction(transactionId);
    
    if (!result) {
      return { valid: false, error: 'Transaction not found' };
    }
    
    if (!result.confirmed) {
      return { valid: false, error: 'Transaction not yet confirmed' };
    }
    
    // Verify transaction signature
    const signature = this.signTransaction(
      result.transaction.type,
      result.transaction.data
    );
    
    if (signature !== result.transaction.signature) {
      return { valid: false, error: 'Signature mismatch - possible tampering' };
    }
    
    return {
      valid: true,
      transaction: result.transaction,
      block: result.block
    };
  }
}



