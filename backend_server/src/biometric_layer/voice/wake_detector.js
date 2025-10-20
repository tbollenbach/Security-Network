import { EventEmitter } from 'events';
import crypto from 'crypto';

/**
 * Wake Phrase Detection System
 * Detects specific command phrases using local ML models
 */
export class WakeDetector extends EventEmitter {
  constructor() {
    super();
    
    // Wake phrases (keyphrase triggers)
    this.wakePhrases = new Map([
      ['initiate_maximum_lockdown', {
        phrase: 'initiate maximum lockdown',
        pattern: /initiate.*maximum.*lockdown/i,
        sensitivity: 0.9,
        action: 'SYSTEM_LOCKDOWN'
      }],
      ['deploy_threat_defense', {
        phrase: 'deploy threat defense grid',
        pattern: /deploy.*threat.*defense/i,
        sensitivity: 0.85,
        action: 'THREAT_DEFENSE'
      }],
      ['authorize_breach_protocol', {
        phrase: 'authorize breach protocol',
        pattern: /authorize.*breach.*protocol/i,
        sensitivity: 0.95,
        action: 'BREACH_PROTOCOL'
      }],
      ['initiate_planetary_lockdown', {
        phrase: 'initiate planetary lockdown',
        pattern: /initiate.*planetary.*lockdown/i,
        sensitivity: 0.92,
        action: 'PLANETARY_LOCKDOWN'
      }],
      ['emergency_override_alpha', {
        phrase: 'emergency override alpha',
        pattern: /emergency.*override.*alpha/i,
        sensitivity: 0.88,
        action: 'EMERGENCY_OVERRIDE'
      }],
      ['activate_self_destruct', {
        phrase: 'activate self destruct sequence',
        pattern: /activate.*self.*destruct/i,
        sensitivity: 0.98,
        action: 'SELF_DESTRUCT'
      }]
    ]);
    
    // Detection history
    this.detectionHistory = [];
    
    // Active listening state
    this.isListening = false;
    
    // Noise gate threshold
    this.noiseThreshold = 0.15;
  }

  /**
   * Start listening for wake phrases
   */
  startListening() {
    this.isListening = true;
    console.log('🎤 Wake Phrase Detection: ACTIVE');
    console.log(`   Monitoring ${this.wakePhrases.size} command phrases`);
  }

  /**
   * Stop listening
   */
  stopListening() {
    this.isListening = false;
    console.log('🎤 Wake Phrase Detection: STOPPED');
  }

  /**
   * Process audio stream for wake phrase detection
   */
  async processAudioStream(audioData) {
    if (!this.isListening) return null;
    
    // In production, this would use actual audio processing
    // Libraries like: Porcupine, Vosk, Silero, or custom ML model
    
    // Simulate audio processing
    const transcription = await this.transcribeAudio(audioData);
    
    if (!transcription) return null;
    
    // Check for wake phrase matches
    for (const [phraseId, phraseData] of this.wakePhrases) {
      if (this.matchesPhrase(transcription, phraseData)) {
        return this.handleWakePhraseDetection(phraseId, phraseData, transcription, audioData);
      }
    }
    
    return null;
  }

  /**
   * Transcribe audio (simplified - in production use Whisper, Vosk, etc.)
   */
  async transcribeAudio(audioData) {
    // Check audio quality
    if (!this.isAudioValid(audioData)) {
      return null;
    }
    
    // Simulate transcription
    // In production: Use Whisper, Vosk, or cloud API
    const simulatedTranscriptions = [
      'initiate maximum lockdown',
      'deploy threat defense grid',
      'authorize breach protocol',
      'hello system',
      'check status'
    ];
    
    // Simulate - in production, actual transcription happens here
    return audioData.transcription || null;
  }

  /**
   * Check if audio meets quality threshold
   */
  isAudioValid(audioData) {
    // Check audio level (amplitude)
    const amplitude = audioData.amplitude || 0.5;
    
    if (amplitude < this.noiseThreshold) {
      return false; // Too quiet - likely noise
    }
    
    // Check audio duration
    const duration = audioData.duration || 0;
    if (duration < 500) {
      return false; // Too short
    }
    
    return true;
  }

  /**
   * Match transcription against wake phrase
   */
  matchesPhrase(transcription, phraseData) {
    // Normalize transcription
    const normalized = transcription.toLowerCase().trim();
    
    // Pattern matching
    if (phraseData.pattern.test(normalized)) {
      // Calculate similarity score
      const similarity = this.calculateSimilarity(normalized, phraseData.phrase);
      
      return similarity >= phraseData.sensitivity;
    }
    
    return false;
  }

  /**
   * Calculate similarity between strings
   */
  calculateSimilarity(str1, str2) {
    // Levenshtein distance based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Handle wake phrase detection
   */
  handleWakePhraseDetection(phraseId, phraseData, transcription, audioData) {
    const detection = {
      id: crypto.randomBytes(8).toString('hex'),
      phraseId,
      phrase: phraseData.phrase,
      action: phraseData.action,
      transcription,
      timestamp: Date.now(),
      audioData: this.extractAudioFeatures(audioData),
      confidence: phraseData.sensitivity
    };
    
    // Add to history
    this.detectionHistory.push(detection);
    
    // Keep only last 100 detections
    if (this.detectionHistory.length > 100) {
      this.detectionHistory.shift();
    }
    
    // Emit event
    this.emit('wake-phrase-detected', detection);
    
    console.log(`🎤 WAKE PHRASE DETECTED: "${phraseData.phrase}"`);
    console.log(`   Action: ${phraseData.action}`);
    console.log(`   Confidence: ${(phraseData.sensitivity * 100).toFixed(1)}%`);
    
    return detection;
  }

  /**
   * Extract audio features for voiceprint matching
   */
  extractAudioFeatures(audioData) {
    // In production: Extract MFCCs, spectrograms, etc.
    return {
      sampleRate: audioData.sampleRate || 16000,
      duration: audioData.duration || 0,
      amplitude: audioData.amplitude || 0,
      frequency: audioData.frequency || 0,
      // Add more features for voiceprint matching
      spectralCentroid: audioData.spectralCentroid || 0,
      zeroCrossingRate: audioData.zeroCrossingRate || 0
    };
  }

  /**
   * Register custom wake phrase
   */
  registerWakePhrase(phraseId, phraseData) {
    this.wakePhrases.set(phraseId, {
      phrase: phraseData.phrase,
      pattern: new RegExp(phraseData.pattern, 'i'),
      sensitivity: phraseData.sensitivity || 0.9,
      action: phraseData.action
    });
    
    console.log(`✓ Registered wake phrase: "${phraseData.phrase}"`);
  }

  /**
   * Get detection statistics
   */
  getStatistics() {
    return {
      isListening: this.isListening,
      registeredPhrases: this.wakePhrases.size,
      totalDetections: this.detectionHistory.length,
      recentDetections: this.detectionHistory.slice(-10),
      phrases: Array.from(this.wakePhrases.entries()).map(([id, data]) => ({
        id,
        phrase: data.phrase,
        action: data.action,
        sensitivity: data.sensitivity
      }))
    };
  }

  /**
   * Clear detection history
   */
  clearHistory() {
    this.detectionHistory = [];
  }
}



