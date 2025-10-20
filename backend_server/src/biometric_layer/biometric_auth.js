import crypto from 'crypto';
import { WakeDetector } from './voice/wake_detector.js';
import { VoiceMatcher } from './voice/voice_matcher.js';
import { FaceMatcher } from './face/face_matcher.js';

/**
 * Unified Biometric Authentication System
 * Combines voice + face + trust score for ultimate human verification
 */
export class BiometricAuth {
  constructor(zeroTrustService, notificationService, auditLogger) {
    this.zeroTrust = zeroTrustService;
    this.notificationService = notificationService;
    this.auditLogger = auditLogger;
    
    // Initialize biometric components
    this.wakeDetector = new WakeDetector();
    this.voiceMatcher = new VoiceMatcher();
    this.faceMatcher = new FaceMatcher();
    
    // Authentication attempts tracking
    this.authAttempts = new Map();
    this.maxFailedAttempts = 3;
    this.lockoutDuration = 30 * 60 * 1000; // 30 minutes
    
    // Spoofing detection
    this.spoofingAttempts = new Map();
    
    // Start wake detector
    this.wakeDetector.startListening();
    
    // Listen for wake phrase detections
    this.wakeDetector.on('wake-phrase-detected', (detection) => {
      this.handleWakePhraseDetection(detection);
    });
    
    console.log('🧠 Biometric Authentication System: INITIALIZED');
  }

  /**
   * Verify command with full biometric authentication
   */
  async verifyCommand(userId, command, audioStream, videoStream, context = {}) {
    const verificationId = crypto.randomBytes(8).toString('hex');
    
    console.log(`\n🧠 BIOMETRIC COMMAND VERIFICATION INITIATED`);
    console.log(`   Verification ID: ${verificationId}`);
    console.log(`   User: ${userId}`);
    console.log(`   Command: ${command}`);
    
    // Check if user is locked out
    if (this.isLockedOut(userId)) {
      const result = {
        success: false,
        verificationId,
        reason: 'User locked out due to repeated failed attempts',
        lockedUntil: this.authAttempts.get(userId).lockedUntil
      };
      
      this.auditLogger.logSecurityViolation(
        userId,
        context.ipAddress || 'unknown',
        'BIOMETRIC_LOCKOUT',
        result
      );
      
      return result;
    }
    
    const startTime = Date.now();
    const results = {
      verificationId,
      userId,
      command,
      timestamp: Date.now(),
      steps: {}
    };
    
    try {
      // Step 1: Voice Pattern Matching
      console.log('   🎤 Step 1: Voice Pattern Matching...');
      const voiceResult = await this.voiceMatcher.verifySpeaker(userId, audioStream, command);
      results.steps.voice = voiceResult;
      
      if (!voiceResult.verified) {
        return this.handleVerificationFailure(userId, results, 'VOICE_MISMATCH', context);
      }
      
      // Step 2: Phrase Validation
      console.log('   🧠 Step 2: Phrase Validation...');
      const phraseResult = this.validatePhrase(userId, command);
      results.steps.phrase = phraseResult;
      
      if (!phraseResult.valid) {
        return this.handleVerificationFailure(userId, results, 'PHRASE_UNAUTHORIZED', context);
      }
      
      // Step 3: Face Recognition
      console.log('   👁️  Step 3: Face Recognition...');
      const faceResult = await this.faceMatcher.verifyFace(userId, videoStream, {
        requireLiveness: true,
        videoFrames: videoStream.frames || []
      });
      results.steps.face = faceResult;
      
      if (!faceResult.verified) {
        // Check for spoofing
        if (faceResult.reason && faceResult.reason.includes('spoof')) {
          return this.handleSpoofingAttempt(userId, results, context);
        }
        return this.handleVerificationFailure(userId, results, 'FACE_MISMATCH', context);
      }
      
      // Step 4: Trust Score Check
      console.log('   📊 Step 4: Trust Score Verification...');
      const trustResult = this.verifyTrustScore(userId, context);
      results.steps.trust = trustResult;
      
      if (!trustResult.sufficient) {
        return this.handleVerificationFailure(userId, results, 'INSUFFICIENT_TRUST', context);
      }
      
      // All checks passed!
      const duration = Date.now() - startTime;
      
      results.success = true;
      results.duration = duration;
      results.confidence = this.calculateOverallConfidence(results.steps);
      
      // Clear failed attempts
      this.authAttempts.delete(userId);
      
      // Update trust score (biometric success)
      this.updateTrustScoreWithBiometrics(userId, results, context);
      
      // Log successful authentication
      this.auditLogger.logDataAccess(
        userId,
        'BIOMETRIC_COMMAND',
        'AUTHORIZED',
        true
      );
      
      console.log(`\n✅ BIOMETRIC VERIFICATION SUCCESSFUL`);
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Confidence: ${(results.confidence * 100).toFixed(1)}%`);
      console.log(`   Voice Match: ${(voiceResult.similarity * 100).toFixed(1)}%`);
      console.log(`   Face Match: ${(faceResult.similarity * 100).toFixed(1)}%`);
      console.log(`   Trust Score: ${(trustResult.score * 100).toFixed(1)}%`);
      
      return results;
      
    } catch (error) {
      console.error('   ❌ Biometric verification error:', error.message);
      
      results.success = false;
      results.error = error.message;
      
      this.auditLogger.logError(error, { userId, verificationId });
      
      return results;
    }
  }

  /**
   * Validate phrase is authorized
   */
  validatePhrase(userId, phrase) {
    const profile = this.voiceMatcher.profiles.get(userId);
    
    if (!profile) {
      return {
        valid: false,
        reason: 'User profile not found'
      };
    }
    
    const normalizedPhrase = phrase.toLowerCase().trim();
    
    // Check if phrase matches any allowed phrases
    const isAllowed = profile.allowedPhrases.some(allowed =>
      normalizedPhrase.includes(allowed.toLowerCase())
    );
    
    return {
      valid: isAllowed,
      phrase,
      reason: isAllowed ? 'Phrase authorized' : 'Phrase not in allowed list'
    };
  }

  /**
   * Verify trust score
   */
  verifyTrustScore(userId, context) {
    const trustScore = this.zeroTrust ? 
      this.zeroTrust.calculateTrustScore(userId, context) : 
      0.9; // Default high if zero-trust not available
    
    const minTrustRequired = 0.85; // 85% minimum
    const sufficient = trustScore >= minTrustRequired;
    
    return {
      score: trustScore,
      threshold: minTrustRequired,
      sufficient,
      reason: sufficient ? 'Trust score sufficient' : 'Trust score below threshold'
    };
  }

  /**
   * Calculate overall confidence from all verification steps
   */
  calculateOverallConfidence(steps) {
    const weights = {
      voice: 0.3,
      phrase: 0.2,
      face: 0.3,
      trust: 0.2
    };
    
    let confidence = 0;
    
    if (steps.voice && steps.voice.verified) {
      confidence += steps.voice.similarity * weights.voice;
    }
    
    if (steps.phrase && steps.phrase.valid) {
      confidence += 1.0 * weights.phrase;
    }
    
    if (steps.face && steps.face.verified) {
      confidence += steps.face.similarity * weights.face;
    }
    
    if (steps.trust && steps.trust.sufficient) {
      confidence += steps.trust.score * weights.trust;
    }
    
    return confidence;
  }

  /**
   * Update trust score with biometric results
   */
  updateTrustScoreWithBiometrics(userId, results, context) {
    if (!this.zeroTrust) return;
    
    // Feed biometric data into zero-trust scoring
    const biometricFactors = {
      biometricConfirmed: true,
      voiceMatchScore: results.steps.voice?.similarity || 0,
      faceMatchScore: results.steps.face?.similarity || 0,
      livenessConfirmed: results.steps.face?.livenessChecked || false,
      multiFactorAuth: true
    };
    
    // Update trust score
    this.zeroTrust.updateShardedTrust(userId, 0.15, {
      type: 'BIOMETRIC_SUCCESS',
      ...biometricFactors,
      timestamp: Date.now()
    });
    
    console.log('   ✓ Trust score updated with biometric data');
  }

  /**
   * Handle verification failure
   */
  handleVerificationFailure(userId, results, failureType, context) {
    results.success = false;
    results.failureType = failureType;
    results.reason = this.getFailureReason(failureType);
    
    // Track failed attempts
    this.recordFailedAttempt(userId);
    
    // Check for lockout
    const attemptData = this.authAttempts.get(userId);
    if (attemptData && attemptData.count >= this.maxFailedAttempts) {
      attemptData.locked = true;
      attemptData.lockedUntil = Date.now() + this.lockoutDuration;
      results.locked = true;
      results.lockedUntil = attemptData.lockedUntil;
      
      console.log(`   🔒 USER LOCKED OUT: ${userId} (${this.maxFailedAttempts} failed attempts)`);
    }
    
    // Reduce trust score
    if (this.zeroTrust) {
      this.zeroTrust.updateShardedTrust(userId, -0.1, {
        type: 'BIOMETRIC_FAILURE',
        failureType,
        timestamp: Date.now()
      });
    }
    
    // Alert admin
    this.notificationService.emit('biometric-failure', {
      userId,
      failureType,
      attempts: attemptData?.count || 1,
      context
    });
    
    // Log to audit
    this.auditLogger.logSecurityViolation(
      userId,
      context.ipAddress || 'unknown',
      'BIOMETRIC_FAILURE',
      { failureType, results }
    );
    
    console.log(`   ❌ VERIFICATION FAILED: ${failureType}`);
    
    return results;
  }

  /**
   * Handle spoofing attempt
   */
  handleSpoofingAttempt(userId, results, context) {
    results.success = false;
    results.failureType = 'SPOOFING_DETECTED';
    results.reason = 'Biometric spoofing attempt detected';
    results.critical = true;
    
    // Track spoofing attempt
    if (!this.spoofingAttempts.has(userId)) {
      this.spoofingAttempts.set(userId, []);
    }
    this.spoofingAttempts.get(userId).push({
      timestamp: Date.now(),
      type: 'FACE_SPOOF',
      context
    });
    
    // Immediate lockout
    this.authAttempts.set(userId, {
      count: this.maxFailedAttempts,
      locked: true,
      lockedUntil: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      spoofingDetected: true
    });
    
    // Severely reduce trust score
    if (this.zeroTrust) {
      this.zeroTrust.updateShardedTrust(userId, -0.5, {
        type: 'SPOOFING_ATTEMPT',
        timestamp: Date.now()
      });
    }
    
    // Critical alert
    this.notificationService.emit('spoofing-detected', {
      userId,
      type: 'BIOMETRIC_SPOOFING',
      severity: 'CRITICAL',
      context,
      snapshot: results.steps.face
    });
    
    // Log to audit
    this.auditLogger.logSecurityViolation(
      userId,
      context.ipAddress || 'unknown',
      'BIOMETRIC_SPOOFING',
      { results, context }
    );
    
    console.log(`   🚨 SPOOFING ATTEMPT DETECTED: ${userId}`);
    console.log(`   ⚠️  User locked for 24 hours`);
    
    return results;
  }

  /**
   * Get failure reason text
   */
  getFailureReason(failureType) {
    const reasons = {
      'VOICE_MISMATCH': 'Voice pattern does not match enrolled profile',
      'PHRASE_UNAUTHORIZED': 'Command phrase not authorized for this user',
      'FACE_MISMATCH': 'Face does not match enrolled profile',
      'INSUFFICIENT_TRUST': 'Trust score below required threshold',
      'SPOOFING_DETECTED': 'Biometric spoofing attempt detected',
      'USER_LOCKED': 'User locked due to repeated failed attempts'
    };
    
    return reasons[failureType] || 'Verification failed';
  }

  /**
   * Record failed attempt
   */
  recordFailedAttempt(userId) {
    if (!this.authAttempts.has(userId)) {
      this.authAttempts.set(userId, {
        count: 0,
        firstAttempt: Date.now(),
        locked: false
      });
    }
    
    const attemptData = this.authAttempts.get(userId);
    attemptData.count++;
    attemptData.lastAttempt = Date.now();
  }

  /**
   * Check if user is locked out
   */
  isLockedOut(userId) {
    const attemptData = this.authAttempts.get(userId);
    
    if (!attemptData || !attemptData.locked) {
      return false;
    }
    
    // Check if lockout expired
    if (Date.now() > attemptData.lockedUntil) {
      // Reset
      this.authAttempts.delete(userId);
      return false;
    }
    
    return true;
  }

  /**
   * Handle wake phrase detection
   */
  handleWakePhraseDetection(detection) {
    console.log(`\n🎤 WAKE PHRASE DETECTED!`);
    console.log(`   Phrase: "${detection.phrase}"`);
    console.log(`   Action: ${detection.action}`);
    console.log(`   ⚠️  Awaiting biometric verification...`);
    
    // Emit event for system to handle
    this.notificationService.emit('wake-phrase-detected', detection);
  }

  /**
   * Enroll new user
   */
  async enrollUser(userId, voiceData, faceData, allowedPhrases) {
    console.log(`\n🧠 ENROLLING NEW USER: ${userId}`);
    
    // Enroll voice
    console.log('   🎤 Enrolling voice profile...');
    const voiceProfile = await this.voiceMatcher.enrollSpeaker(
      userId,
      voiceData.audioSamples,
      allowedPhrases
    );
    
    // Enroll face
    console.log('   👁️  Enrolling face profile...');
    const faceProfile = await this.faceMatcher.enrollFace(
      userId,
      faceData.images
    );
    
    console.log(`   ✅ User enrolled successfully`);
    console.log(`      Voice Profile: ${voiceProfile.voiceId}`);
    console.log(`      Face Profile: ${faceProfile.faceId}`);
    console.log(`      Allowed Phrases: ${allowedPhrases.length}`);
    
    return {
      userId,
      voiceProfile,
      faceProfile,
      enrolledAt: Date.now()
    };
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      wakeDetector: this.wakeDetector.getStatistics(),
      voiceProfiles: this.voiceMatcher.getStatistics(),
      faceProfiles: this.faceMatcher.getStatistics(),
      authAttempts: {
        total: this.authAttempts.size,
        lockedUsers: Array.from(this.authAttempts.values()).filter(a => a.locked).length
      },
      spoofingAttempts: {
        total: Array.from(this.spoofingAttempts.values()).reduce((sum, arr) => sum + arr.length, 0),
        uniqueUsers: this.spoofingAttempts.size
      }
    };
  }
}



