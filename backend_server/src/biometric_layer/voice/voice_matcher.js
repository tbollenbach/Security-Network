import crypto from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Voice Pattern Matcher (Voiceprint Authentication)
 * Uses speaker embeddings (ECAPA-TDNN or Resemblyzer-style)
 */
export class VoiceMatcher {
  constructor() {
    // Speaker profiles directory
    this.profilesDir = join(process.cwd(), 'biometric_layer/voice/speaker_profiles');
    
    // Loaded profiles
    this.profiles = new Map();
    
    // Matching threshold (90%+ required)
    this.matchThreshold = 0.90;
    
    // Vector dimension (typical speaker embedding size)
    this.vectorDimension = 192;
    
    // Load existing profiles
    this.loadProfiles();
  }

  /**
   * Load speaker profiles
   */
  loadProfiles() {
    try {
      if (!existsSync(this.profilesDir)) {
        return;
      }
      
      // Load each .vec file
      // In production, read actual vector files
      console.log('📊 Loading speaker profiles...');
      
      // Simulate loading profiles
      this.profiles.set('admin', {
        userId: 'admin',
        voiceId: 'admin_voice.vec',
        embedding: this.generateSimulatedEmbedding(),
        enrolledAt: Date.now(),
        allowedPhrases: [
          'initiate maximum lockdown',
          'deploy threat defense grid',
          'authorize breach protocol',
          'initiate planetary lockdown',
          'emergency override alpha'
        ]
      });
      
      console.log(`✓ Loaded ${this.profiles.size} speaker profile(s)`);
    } catch (error) {
      console.error('Error loading profiles:', error.message);
    }
  }

  /**
   * Enroll new speaker
   */
  async enrollSpeaker(userId, audioSamples, allowedPhrases) {
    console.log(`🎤 Enrolling speaker: ${userId}`);
    
    // Extract speaker embedding from multiple audio samples
    const embedding = await this.extractSpeakerEmbedding(audioSamples);
    
    if (!embedding) {
      throw new Error('Failed to extract speaker embedding');
    }
    
    const profile = {
      userId,
      voiceId: `${userId}_voice.vec`,
      embedding,
      enrolledAt: Date.now(),
      allowedPhrases: allowedPhrases || [],
      verificationCount: 0,
      lastVerified: null
    };
    
    // Save profile
    this.profiles.set(userId, profile);
    this.saveProfile(userId, profile);
    
    console.log(`✓ Speaker enrolled: ${userId}`);
    console.log(`   Allowed phrases: ${allowedPhrases.length}`);
    
    return profile;
  }

  /**
   * Extract speaker embedding from audio
   */
  async extractSpeakerEmbedding(audioSamples) {
    // In production: Use ECAPA-TDNN, Resemblyzer, or SpeechBrain
    // This would extract a fixed-dimension vector representing the speaker
    
    // For now, simulate embedding extraction
    const embedding = this.generateSimulatedEmbedding();
    
    return embedding;
  }

  /**
   * Generate simulated speaker embedding
   */
  generateSimulatedEmbedding() {
    const embedding = [];
    for (let i = 0; i < this.vectorDimension; i++) {
      embedding.push(Math.random() * 2 - 1); // Values between -1 and 1
    }
    return embedding;
  }

  /**
   * Verify speaker identity
   */
  async verifySpeaker(userId, audioData, spokenPhrase) {
    const profile = this.profiles.get(userId);
    
    if (!profile) {
      return {
        verified: false,
        reason: 'Speaker profile not found',
        userId,
        similarity: 0
      };
    }
    
    // Check if phrase is allowed
    if (!this.isPhraseAllowed(profile, spokenPhrase)) {
      return {
        verified: false,
        reason: 'Phrase not authorized for this user',
        userId,
        phrase: spokenPhrase,
        similarity: 0
      };
    }
    
    // Extract embedding from audio
    const testEmbedding = await this.extractSpeakerEmbedding([audioData]);
    
    // Calculate similarity
    const similarity = this.calculateCosineSimilarity(profile.embedding, testEmbedding);
    
    const verified = similarity >= this.matchThreshold;
    
    if (verified) {
      profile.verificationCount++;
      profile.lastVerified = Date.now();
    }
    
    console.log(`🔊 Voice Verification: ${verified ? '✅ MATCH' : '❌ NO MATCH'}`);
    console.log(`   User: ${userId}`);
    console.log(`   Similarity: ${(similarity * 100).toFixed(2)}%`);
    console.log(`   Threshold: ${(this.matchThreshold * 100).toFixed(2)}%`);
    
    return {
      verified,
      userId,
      similarity,
      phrase: spokenPhrase,
      threshold: this.matchThreshold,
      reason: verified ? 'Voice pattern matched' : 'Similarity below threshold'
    };
  }

  /**
   * Check if phrase is allowed for user
   */
  isPhraseAllowed(profile, phrase) {
    if (!profile.allowedPhrases || profile.allowedPhrases.length === 0) {
      return true; // No restrictions
    }
    
    const normalizedPhrase = phrase.toLowerCase().trim();
    
    return profile.allowedPhrases.some(allowed => 
      normalizedPhrase.includes(allowed.toLowerCase())
    );
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  calculateCosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have same dimension');
    }
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);
    
    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }
    
    return dotProduct / (norm1 * norm2);
  }

  /**
   * Update speaker profile
   */
  async updateProfile(userId, newAudioSamples) {
    const profile = this.profiles.get(userId);
    
    if (!profile) {
      throw new Error('Profile not found');
    }
    
    // Extract new embedding
    const newEmbedding = await this.extractSpeakerEmbedding(newAudioSamples);
    
    // Average with existing embedding (adaptive enrollment)
    const updatedEmbedding = profile.embedding.map((val, idx) => 
      (val + newEmbedding[idx]) / 2
    );
    
    profile.embedding = updatedEmbedding;
    this.saveProfile(userId, profile);
    
    console.log(`✓ Updated speaker profile: ${userId}`);
  }

  /**
   * Save profile to disk
   */
  saveProfile(userId, profile) {
    // In production: Save as binary vector file
    const profilePath = join(this.profilesDir, `${userId}_voice.json`);
    
    try {
      const fs = require('fs');
      if (!fs.existsSync(this.profilesDir)) {
        fs.mkdirSync(this.profilesDir, { recursive: true });
      }
      
      writeFileSync(profilePath, JSON.stringify({
        userId: profile.userId,
        voiceId: profile.voiceId,
        enrolledAt: profile.enrolledAt,
        allowedPhrases: profile.allowedPhrases,
        verificationCount: profile.verificationCount,
        // Don't save full embedding in JSON (use binary format)
        embeddingDimension: profile.embedding.length
      }, null, 2));
    } catch (error) {
      console.error('Error saving profile:', error.message);
    }
  }

  /**
   * Delete speaker profile
   */
  deleteProfile(userId) {
    this.profiles.delete(userId);
    console.log(`✓ Deleted speaker profile: ${userId}`);
  }

  /**
   * Get all profiles
   */
  getProfiles() {
    const profiles = [];
    
    this.profiles.forEach((profile, userId) => {
      profiles.push({
        userId: profile.userId,
        enrolledAt: profile.enrolledAt,
        allowedPhrases: profile.allowedPhrases,
        verificationCount: profile.verificationCount,
        lastVerified: profile.lastVerified
      });
    });
    
    return profiles;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      totalProfiles: this.profiles.size,
      matchThreshold: this.matchThreshold,
      vectorDimension: this.vectorDimension,
      profiles: this.getProfiles()
    };
  }
}



