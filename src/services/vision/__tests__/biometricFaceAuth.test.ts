import {
  LivenessDetectionEngine,
  compute128DEmbedding,
  normalizeL2Vector,
  calculateCosineSimilarity,
  encryptKYCReferenceEmbedding,
  decryptKYCReferenceEmbedding,
  verifyFaceMatchAgainstKYC,
  generatePmsAuthToken,
  verifyPmsAuthToken,
  generateDigitalRoomKey,
  authorizeHotelPmsCheckIn,
  createMockFacialLandmarks,
  COSINE_SIMILARITY_THRESHOLD,
  EMBEDDING_DIMENSION,
} from "../biometricFaceAuth";

// Mock supabase to ensure boundaries: No Supabase auth or password modifications
jest.mock("../../../utils/supabase", () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

// Mock expo-secure-store
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

describe("Biometric Face Authentication & Mobile Vision Service", () => {
  describe("1. Liveness Detection Engine", () => {
    let engine: LivenessDetectionEngine;

    beforeEach(() => {
      engine = new LivenessDetectionEngine(["blink", "smile", "head_turn_right"]);
    });

    it("initializes with first challenge as blink", () => {
      const current = engine.getCurrentChallenge();
      expect(current).not.toBeNull();
      expect(current?.type).toBe("blink");
      expect(current?.prompt).toContain("blink your eyes naturally");
    });

    it("evaluates blink challenge through eye closure and recovery", () => {
      // 1. Initial open eyes
      const initialFrame = createMockFacialLandmarks({
        leftEye: { ear: 0.35, isClosed: false, x: 120, y: 150 },
        rightEye: { ear: 0.35, isClosed: false, x: 180, y: 150 },
      });
      engine.evaluateFrame(initialFrame);
      expect(engine.getCurrentChallenge()?.type).toBe("blink");

      // 2. Eyes closed (EAR < 0.20)
      const closedFrame = createMockFacialLandmarks({
        leftEye: { ear: 0.12, isClosed: true, x: 120, y: 150 },
        rightEye: { ear: 0.12, isClosed: true, x: 180, y: 150 },
      });
      engine.evaluateFrame(closedFrame);

      // 3. Eyes reopen (EAR >= 0.27)
      const openFrame = createMockFacialLandmarks({
        leftEye: { ear: 0.32, isClosed: false, x: 120, y: 150 },
        rightEye: { ear: 0.32, isClosed: false, x: 180, y: 150 },
      });
      const result = engine.evaluateFrame(openFrame);

      expect(result.currentChallengeCompleted).toBe(true);
      expect(result.antiSpoofingTelemetry.blinkDetected).toBe(true);
      expect(engine.getCurrentChallenge()?.type).toBe("smile");
    });

    it("completes full multi-step sequence (blink -> smile -> head turn)", () => {
      // 1. Complete blink
      engine.evaluateFrame(
        createMockFacialLandmarks({
          leftEye: { ear: 0.10, isClosed: true, x: 120, y: 150 },
          rightEye: { ear: 0.10, isClosed: true, x: 180, y: 150 },
        })
      );
      engine.evaluateFrame(
        createMockFacialLandmarks({
          leftEye: { ear: 0.35, isClosed: false, x: 120, y: 150 },
          rightEye: { ear: 0.35, isClosed: false, x: 180, y: 150 },
        })
      );
      expect(engine.getCurrentChallenge()?.type).toBe("smile");

      // 2. Complete smile
      const smileFrame = createMockFacialLandmarks({
        mouth: {
          leftCorner: { x: 100, y: 220 },
          rightCorner: { x: 200, y: 220 },
          topLip: { x: 150, y: 210 },
          bottomLip: { x: 150, y: 235 },
          mar: 0.25,
          smileScore: 0.85,
          isSmiling: true,
        },
      });
      engine.evaluateFrame(smileFrame);
      expect(engine.getCurrentChallenge()?.type).toBe("head_turn_right");

      // 3. Complete head turn right
      const headTurnFrame = createMockFacialLandmarks({
        headPose: { yaw: 22, pitch: 0, roll: 0 },
      });
      const finalResult = engine.evaluateFrame(headTurnFrame);

      expect(finalResult.allChallengesCompleted).toBe(true);
      expect(finalResult.antiSpoofingTelemetry.blinkDetected).toBe(true);
      expect(finalResult.antiSpoofingTelemetry.smileDetected).toBe(true);
      expect(finalResult.antiSpoofingTelemetry.headTurnDetected).toBe(true);
      expect(finalResult.antiSpoofingTelemetry.livenessConfidence).toBeGreaterThanOrEqual(0.85);
    });

    it("flags digital screen spoof risk when high moiré score is detected", () => {
      const spoofFrame = createMockFacialLandmarks({
        opticalTexture: {
          moiréPatternScore: 0.85,
          luminanceVariance: 0.1,
          isScreenSpoofLikely: true,
        },
      });
      const res = engine.evaluateFrame(spoofFrame);
      expect(res.antiSpoofingTelemetry.screenSpoofRisk).toBe("high");
    });
  });

  describe("2. Local 128-Dimensional Feature Vector Embedding", () => {
    it("computes exactly 128-dimensional embedding from facial landmarks", () => {
      const landmarks = createMockFacialLandmarks();
      const embedding = compute128DEmbedding(landmarks);

      expect(embedding).toHaveLength(EMBEDDING_DIMENSION);
      expect(embedding.length).toBe(128);
    });

    it("ensures vector is normalized to unit Euclidean norm (||v||_2 = 1.0)", () => {
      const landmarks = createMockFacialLandmarks();
      const embedding = compute128DEmbedding(landmarks);

      let sumSq = 0;
      for (const val of embedding) {
        sumSq += val * val;
      }
      const norm = Math.sqrt(sumSq);
      expect(norm).toBeCloseTo(1.0, 5);
    });

    it("computes deterministic 128-D embedding from image/string data", () => {
      const rawImage = "data:image/jpeg;base64,sample_user_selfie_feed_payload_2026";
      const emb1 = compute128DEmbedding(rawImage);
      const emb2 = compute128DEmbedding(rawImage);

      expect(emb1).toHaveLength(128);
      expect(emb1).toEqual(emb2);
    });
  });

  describe("3. Cosine Similarity & Encrypted KYC Verification", () => {
    const testSecretKey = "super_secure_client_device_key_9918";

    it("calculates exact 1.0 cosine similarity for identical vectors", () => {
      const vec = normalizeL2Vector(Array.from({ length: 128 }, (_, i) => Math.sin(i)));
      const similarity = calculateCosineSimilarity(vec, vec);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it("encrypts and decrypts KYC reference embedding with AES-256", () => {
      const originalEmbedding = compute128DEmbedding("passport_photo_robert_fox_2026");
      const encryptedPayload = encryptKYCReferenceEmbedding(originalEmbedding, testSecretKey, {
        documentNumber: "A98765432",
        documentType: "passport",
      });

      expect(encryptedPayload.encryptedEmbedding).toBeDefined();
      expect(encryptedPayload.documentNumberMasked).toBe("A9****32");
      expect(encryptedPayload.checksum).toBeDefined();

      const { embedding: decryptedEmbedding, checksumValid } = decryptKYCReferenceEmbedding(
        encryptedPayload,
        testSecretKey
      );

      expect(checksumValid).toBe(true);
      expect(decryptedEmbedding).toHaveLength(128);
      expect(calculateCosineSimilarity(originalEmbedding, decryptedEmbedding)).toBeCloseTo(1.0, 5);
    });

    it("approves verification when cosine similarity exceeds >0.85 threshold", () => {
      // Given the same identity with slight natural variation
      const baseSelfie = compute128DEmbedding("passport_photo_guest_alice");
      const encryptedKYC = encryptKYCReferenceEmbedding(baseSelfie, testSecretKey);

      // Same identity live selfie
      const liveSelfie = compute128DEmbedding("passport_photo_guest_alice");
      const matchResult = verifyFaceMatchAgainstKYC(liveSelfie, encryptedKYC, testSecretKey);

      expect(matchResult.isMatchPassed).toBe(true);
      expect(matchResult.cosineSimilarity).toBeGreaterThanOrEqual(COSINE_SIMILARITY_THRESHOLD);
      expect(matchResult.thresholdRequired).toBe(0.85);
      expect(matchResult.rejectionReason).toBeUndefined();
    });

    it("rejects verification when cosine similarity falls below 0.85 threshold", () => {
      const aliceKYC = encryptKYCReferenceEmbedding(
        compute128DEmbedding("alice_verified_passport_photo"),
        testSecretKey
      );

      // Imposter/different user's face
      const eveLiveSelfie = compute128DEmbedding("eve_unauthorized_imposter_face");
      const matchResult = verifyFaceMatchAgainstKYC(eveLiveSelfie, aliceKYC, testSecretKey);

      expect(matchResult.isMatchPassed).toBe(false);
      expect(matchResult.cosineSimilarity).toBeLessThan(COSINE_SIMILARITY_THRESHOLD);
      expect(matchResult.rejectionReason).toContain("fell below the required biometric threshold");
    });
  });

  describe("4. Hotel PMS Check-In Handoff & Keyless Room Access", () => {
    it("generates and cryptographically verifies PMS auth tokens", () => {
      const token = generatePmsAuthToken({
        bookingId: "BK-2026-HOTEL-7789",
        guestId: "user-uuid-101",
        hotelId: "hotel-grand-luxe",
        matchScore: 0.94,
        timestamp: Date.now(),
        nonce: "test_nonce_123",
      });

      expect(token.startsWith("PMS_AUTH_")).toBe(true);
      expect(verifyPmsAuthToken(token)).toBe(true);
      expect(verifyPmsAuthToken("PMS_AUTH_corrupted_payload.fake_sig")).toBe(false);
    });

    it("generates valid digital room key with NFC and BLE payloads", () => {
      const key = generateDigitalRoomKey(
        "BK-2026-HOTEL-7789",
        "hotel-grand-luxe",
        "The Grand Luxe Palace",
        "Robert Fox",
        "Room 304",
        "Executive Suite"
      );

      expect(key.keyId).toContain("DKEY-");
      expect(key.roomNumber).toBe("Room 304");
      expect(key.status).toBe("active");
      expect(key.nfcPasscode).toHaveLength(16);
      expect(key.bleToken).toBeDefined();
      expect(key.encryptedQrToken).toBeDefined();
    });

    it("authorizes check-in and returns digital key without touching Supabase auth", async () => {
      const result = await authorizeHotelPmsCheckIn({
        bookingId: "BK-2026-HOTEL-7789",
        guestId: "user-uuid-101",
        guestName: "Robert Fox",
        hotelId: "hotel-grand-luxe",
        hotelName: "The Grand Luxe Palace",
        matchScore: 0.92,
        livenessScore: 0.96,
      });

      expect(result.success).toBe(true);
      expect(result.digitalRoomKey.roomNumber).toBe("Room 304");
      expect(result.pmsAuthToken).toContain("PMS_AUTH_");
      expect(result.message).toContain("Keyless digital room key issued");
    });
  });
});
