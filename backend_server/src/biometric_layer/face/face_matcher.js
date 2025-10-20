import crypto from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Face Recognition Matcher
 * Uses face embeddings (FaceNet or InsightFace style)
 */
export class FaceMatcher {
  constructor() {
    // Face profiles directory
    this.profilesDir = join(process.cwd(), 'biometric_layer/face/face_profiles');
    
    // Loaded profiles
    this.profiles = new Map();
    
    // Matching threshold (95%+ required)
    this.matchThreshold = 0.95;
    
    // Face embedding dimension (FaceNet uses 128 or 512)
    this.embeddingDimension = 128;
    
    // Liveness detection settings
    this.livenessRequired = true;
    this.livenessThreshold = 0.8;
    
    // Load existing profiles
    this.loadProfiles();
  }

  /**
   * Load face profiles
   */
  loadProfiles() {
    try {
      console.log('👁️  Loading face profiles...');
      
      // Simulate loading profiles
      this.profiles.set('admin', {
        userId: 'admin',
        faceId: 'admin_face.vec',
        embedding: this.generateSimulatedFaceEmbedding(),
        enrolledAt: Date.now(),
        verificationCount: 0,
        lastVerified: null,
        livenessEnabled: true
      });
      
      console.log(`✓ Loaded ${this.profiles.size} face profile(s)`);
    } catch (error) {
      console.error('Error loading face profiles:', error.message);
    }
  }

  /**
   * Enroll new face
   */
  async enrollFace(userId, faceImages) {
    console.log(`👁️  Enrolling face: ${userId}`);
    
    if (faceImages.length < 3) {
      throw new Error('At least 3 face images required for enrollment');
    }
    
    // Extract face embeddings from multiple images
    const embeddings = [];
    for (const image of faceImages) {
      const embedding = await this.extractFaceEmbedding(image);
      if (embedding) {
        embeddings.push(embedding);
      }
    }
    
    if (embeddings.length === 0) {
      throw new Error('No valid face detected in images');
    }
    
    // Average embeddings for robust profile
    const avgEmbedding = this.averageEmbeddings(embeddings);
    
    const profile = {
      userId,
      faceId: `${userId}_face.vec`,
      embedding: avgEmbedding,
      enrolledAt: Date.now(),
      verificationCount: 0,
      lastVerified: null,
      livenessEnabled: this.livenessRequired
    };
    
    // Save profile
    this.profiles.set(userId, profile);
    this.saveProfile(userId, profile);
    
    console.log(`✓ Face enrolled: ${userId}`);
    console.log(`   Images used: ${embeddings.length}`);
    
    return profile;
  }

  /**
   * Extract face embedding from image
   */
  async extractFaceEmbedding(imageData) {
    // In production: Use FaceNet, InsightFace, or Mediapipe
    // This would:
    // 1. Detect face in image
    // 2. Align face
    // 3. Extract 128 or 512-dimensional embedding
    
    // Simulate face detection
    if (!imageData || imageData.length === 0) {
      return null;
    }
    
    // Check if face is detected
    const faceDetected = imageData.hasFace !== false; // Simulate
    
    if (!faceDetected) {
      return null;
    }
    
    // Generate simulated embedding
    return this.generateSimulatedFaceEmbedding();
  }

  /**
   * Generate simulated face embedding
   */
  generateSimulatedFaceEmbedding() {
    const embedding = [];
    for (let i = 0; i < this.embeddingDimension; i++) {
      embedding.push(Math.random() * 2 - 1); // Values between -1 and 1
    }
    return embedding;
  }

  /**
   * Average multiple embeddings
   */
  averageEmbeddings(embeddings) {
    const avgEmbedding = new Array(this.embeddingDimension).fill(0);
    
    embeddings.forEach(embedding => {
      embedding.forEach((val, idx) => {
        avgEmbedding[idx] += val;
      });
    });
    
    return avgEmbedding.map(val => val / embeddings.length);
  }

  /**
   * Verify face identity
   */
  async verifyFace(userId, imageData, options = {}) {
    const profile = this.profiles.get(userId);
    
    if (!profile) {
      return {
        verified: false,
        reason: 'Face profile not found',
        userId,
        similarity: 0
      };
    }
    
    // Detect face in image
    const faceData = await this.detectFace(imageData);
    
    if (!faceData.detected) {
      return {
        verified: false,
        reason: 'No face detected in image',
        userId,
        similarity: 0
      };
    }
    
    // Liveness detection (anti-spoofing)
    if (profile.livenessEnabled || options.requireLiveness) {
      const livenessCheck = await this.detectLiveness(imageData, options.videoFrames);
      
      if (!livenessCheck.isLive) {
        return {
          verified: false,
          reason: 'Liveness check failed - possible photo/video spoof',
          userId,
          similarity: 0,
          livenessScore: livenessCheck.score
        };
      }
    }
    
    // Extract embedding from detected face
    const testEmbedding = await this.extractFaceEmbedding(imageData);
    
    if (!testEmbedding) {
      return {
        verified: false,
        reason: 'Failed to extract face embedding',
        userId,
        similarity: 0
      };
    }
    
    // Calculate similarity
    const similarity = this.calculateCosineSimilarity(profile.embedding, testEmbedding);
    
    const verified = similarity >= this.matchThreshold;
    
    if (verified) {
      profile.verificationCount++;
      profile.lastVerified = Date.now();
    }
    
    console.log(`👁️  Face Verification: ${verified ? '✅ MATCH' : '❌ NO MATCH'}`);
    console.log(`   User: ${userId}`);
    console.log(`   Similarity: ${(similarity * 100).toFixed(2)}%`);
    console.log(`   Threshold: ${(this.matchThreshold * 100).toFixed(2)}%`);
    
    return {
      verified,
      userId,
      similarity,
      threshold: this.matchThreshold,
      livenessChecked: profile.livenessEnabled,
      reason: verified ? 'Face matched' : 'Similarity below threshold'
    };
  }

  /**
   * Detect face in image
   */
  async detectFace(imageData) {
    // In production: Use Mediapipe, Dlib, or OpenCV
    // This would detect face bounding box and landmarks
    
    // Simulate face detection
    return {
      detected: true,
      boundingBox: { x: 100, y: 100, width: 200, height: 200 },
      landmarks: {
        leftEye: { x: 150, y: 150 },
        rightEye: { x: 250, y: 150 },
        nose: { x: 200, y: 200 },
        mouth: { x: 200, y: 250 }
      },
      confidence: 0.98
    };
  }

  /**
   * Detect liveness (anti-spoofing)
   */
  async detectLiveness(imageData, videoFrames) {
    // In production: Check for:
    // - Eye blinking
    // - Head movement
    // - 3D depth (using multiple frames)
    // - Texture analysis (photo vs real skin)
    // - Reflection patterns
    
    let livenessScore = 0;
    const checks = [];
    
    // Check 1: Eye blink detection (requires video frames)
    if (videoFrames && videoFrames.length > 10) {
      const blinkDetected = this.detectEyeBlink(videoFrames);
      if (blinkDetected) {
        livenessScore += 0.3;
        checks.push('EYE_BLINK');
      }
    }
    
    // Check 2: Head movement
    if (videoFrames && videoFrames.length > 20) {
      const headMoved = this.detectHeadMovement(videoFrames);
      if (headMoved) {
        livenessScore += 0.3;
        checks.push('HEAD_MOVEMENT');
      }
    }
    
    // Check 3: Texture analysis (photo vs real skin)
    const textureCheck = this.analyzeTexture(imageData);
    if (textureCheck.isReal) {
      livenessScore += 0.4;
      checks.push('TEXTURE_REAL');
    }
    
    const isLive = livenessScore >= this.livenessThreshold;
    
    console.log(`   🔍 Liveness Check: ${isLive ? '✅ LIVE' : '❌ SPOOF'}`);
    console.log(`      Score: ${(livenessScore * 100).toFixed(1)}%`);
    console.log(`      Checks: ${checks.join(', ')}`);
    
    return {
      isLive,
      score: livenessScore,
      checks,
      threshold: this.livenessThreshold
    };
  }

  /**
   * Detect eye blink in video frames
   */
  detectEyeBlink(videoFrames) {
    // In production: Calculate Eye Aspect Ratio (EAR) across frames
    // Look for EAR dropping below threshold briefly
    
    // Simulate blink detection
    return Math.random() > 0.3; // 70% chance of blink detected
  }

  /**
   * Detect head movement in video frames
   */
  detectHeadMovement(videoFrames) {
    // In production: Track face landmarks across frames
    // Calculate movement vector
    
    // Simulate movement detection
    return Math.random() > 0.2; // 80% chance of movement detected
  }

  /**
   * Analyze texture for photo spoofing
   */
  analyzeTexture(imageData) {
    // In production: Use texture analysis algorithms
    // Check for screen reflection, printed photo artifacts, etc.
    
    // Simulate texture analysis
    return {
      isReal: Math.random() > 0.1, // 90% chance of real
      confidence: 0.9
    };
  }

  /**
   * Calculate cosine similarity
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
   * Save profile to disk
   */
  saveProfile(userId, profile) {
    const profilePath = join(this.profilesDir, `${userId}_face.json`);
    
    try {
      const fs = require('fs');
      if (!fs.existsSync(this.profilesDir)) {
        fs.mkdirSync(this.profilesDir, { recursive: true });
      }
      
      writeFileSync(profilePath, JSON.stringify({
        userId: profile.userId,
        faceId: profile.faceId,
        enrolledAt: profile.enrolledAt,
        verificationCount: profile.verificationCount,
        livenessEnabled: profile.livenessEnabled,
        embeddingDimension: profile.embedding.length
      }, null, 2));
    } catch (error) {
      console.error('Error saving face profile:', error.message);
    }
  }

  /**
   * Delete face profile
   */
  deleteProfile(userId) {
    this.profiles.delete(userId);
    console.log(`✓ Deleted face profile: ${userId}`);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const profiles = [];
    
    this.profiles.forEach((profile, userId) => {
      profiles.push({
        userId: profile.userId,
        enrolledAt: profile.enrolledAt,
        verificationCount: profile.verificationCount,
        lastVerified: profile.lastVerified,
        livenessEnabled: profile.livenessEnabled
      });
    });
    
    return {
      totalProfiles: this.profiles.size,
      matchThreshold: this.matchThreshold,
      embeddingDimension: this.embeddingDimension,
      livenessRequired: this.livenessRequired,
      profiles
    };
  }
}



