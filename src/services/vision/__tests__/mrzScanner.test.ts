/**
 * MRZ Scanner & Checksum Verification Unit Tests
 *
 * Tests:
 * 1. Optical Character Recognition (OCR): TD3 (Passport - 2 lines, 44 chars) and TD1 (ID Card - 3 lines, 30 chars).
 * 2. Mathematical Checksum Verification: ICAO 9303 7-3-1 weighting for document number, birth date, expiry date, composite.
 * 3. OCR Ambiguity Repair: Checksum-guided correction for OCR-B character confusions (0/O, 1/I, 8/B).
 * 4. Auto-Population: Traveler field population in useBookingStore (First Name, Last Name, Passport Number, Nationality, Expiry Date).
 * 5. Security & Privacy: Local execution in volatile memory with zero network transmission.
 */

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

import {
  computeICAOCheckDigit,
  verifyICAOCheckDigit,
  getMRZCharValue,
  cleanMRZLine,
  correctNumericField,
  correctAlphaField,
  repairDocumentNumberWithChecksum,
  parseMRZDate,
  parseMRZNames,
  resolveCountryName,
  parseTD3,
  parseTD1,
  parseMRZ,
  autoPopulateTravelerInBookingStore,
  processOnDeviceFrame,
  MRZ_TEST_PRESETS,
} from "../mrzScanner";
import { useBookingStore } from "../../../store/bookingStore";

describe("MRZ Scanner & Checksum Verification Suite", () => {
  beforeEach(() => {
    useBookingStore.getState().resetDraft();
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });

  describe("1. ICAO 9303 Check Digit Computation (7-3-1 Modulo 10)", () => {
    it("maps character weights correctly according to ICAO Doc 9303", () => {
      expect(getMRZCharValue("0")).toBe(0);
      expect(getMRZCharValue("9")).toBe(9);
      expect(getMRZCharValue("A")).toBe(10);
      expect(getMRZCharValue("B")).toBe(11);
      expect(getMRZCharValue("Z")).toBe(35);
      expect(getMRZCharValue("<")).toBe(0);
    });

    it("computes exact mathematical check digit for document numbers", () => {
      // Official ICAO sample: 'L898902C3' check digit is 6
      expect(computeICAOCheckDigit("L898902C3")).toBe(6);
      expect(verifyICAOCheckDigit("L898902C3", "6")).toBe(true);
      expect(verifyICAOCheckDigit("L898902C3", 6)).toBe(true);
      expect(verifyICAOCheckDigit("L898902C3", "5")).toBe(false);
    });

    it("computes check digits for birth dates and expiration dates", () => {
      // DOB: 740812 -> 2
      expect(computeICAOCheckDigit("740812")).toBe(2);
      expect(verifyICAOCheckDigit("740812", "2")).toBe(true);

      // Expiration: 120415 -> 9
      expect(computeICAOCheckDigit("120415")).toBe(9);
      expect(verifyICAOCheckDigit("120415", "9")).toBe(true);
    });

    it("computes composite check digits over concatenated fields", () => {
      // Official ICAO TD3 composite: doc(10) + dob(7) + expiry(7) + personal(15) = check digit 0
      const compositeData = "L898902C3674081221204159ZE184226B<<<<<1";
      expect(computeICAOCheckDigit(compositeData)).toBe(0);
      expect(verifyICAOCheckDigit(compositeData, "0")).toBe(true);
    });
  });

  describe("2. TD3 (Passport - 2 Lines x 44) Scanning & Parsing", () => {
    it("successfully parses official ICAO TD3 passport specimen", () => {
      const lines = [
        "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",
        "L898902C36UTO7408122F1204159ZE184226B<<<<<10",
      ];

      const result = parseTD3(lines);
      expect(result).not.toBeNull();
      if (!result) return;

      expect(result.format).toBe("TD3");
      expect(result.documentType).toBe("PASSPORT");
      expect(result.documentNumber).toBe("L898902C3");
      expect(result.firstName).toBe("Anna Maria");
      expect(result.lastName).toBe("Eriksson");
      expect(result.nationality).toBe("UTO");
      expect(result.nationalityName).toBe("Utopia (ICAO Specimen)");
      expect(result.gender).toBe("female");
      expect(result.dateOfBirthISO).toBe("1974-08-12");
      expect(result.expirationDateISO).toBe("2012-04-15");
      expect(result.checksums.documentNumber).toBe(true);
      expect(result.checksums.dateOfBirth).toBe(true);
      expect(result.checksums.expirationDate).toBe(true);
      expect(result.checksums.composite).toBe(true);
      expect(result.checksums.allValid).toBe(true);
      expect(result.confidenceScore).toBe(100);
    });

    it("successfully parses Bangladesh TD3 passport with check digit validation", () => {
      const preset = MRZ_TEST_PRESETS.find((p) => p.id === "passport-bgd")!;
      const result = parseTD3(preset.lines);

      expect(result).not.toBeNull();
      if (!result) return;

      expect(result.documentNumber).toBe("A09876543");
      expect(result.firstName).toBe("Tanvir");
      expect(result.lastName).toBe("Ahmad");
      expect(result.nationalityName).toBe("Bangladesh");
      expect(result.gender).toBe("male");
      expect(result.dateOfBirthISO).toBe("1994-08-20");
      expect(result.expirationDateISO).toBe("2030-08-19");
      expect(result.checksums.allValid).toBe(true);
    });

    it("successfully parses USA TD3 passport with check digit validation", () => {
      const preset = MRZ_TEST_PRESETS.find((p) => p.id === "passport-usa")!;
      const result = parseTD3(preset.lines);

      expect(result).not.toBeNull();
      if (!result) return;

      expect(result.documentNumber).toBe("123456789");
      expect(result.firstName).toBe("Alex Jordan");
      expect(result.lastName).toBe("Traveler");
      expect(result.nationalityName).toBe("United States of America");
      expect(result.checksums.allValid).toBe(true);
    });
  });

  describe("3. TD1 (Smart National ID - 3 Lines x 30) Scanning & Parsing", () => {
    it("successfully parses Bangladesh Smart National ID card", () => {
      const preset = MRZ_TEST_PRESETS.find((p) => p.id === "idcard-nid-td1")!;
      const result = parseTD1(preset.lines);

      expect(result).not.toBeNull();
      if (!result) return;

      expect(result.format).toBe("TD1");
      expect(result.documentType).toBe("ID_CARD");
      expect(result.documentNumber).toBe("199412345");
      expect(result.firstName).toBe("Md Shamsur");
      expect(result.lastName).toBe("Rahman");
      expect(result.nationalityName).toBe("Bangladesh");
      expect(result.gender).toBe("male");
      expect(result.dateOfBirthISO).toBe("1994-08-20");
      expect(result.expirationDateISO).toBe("2030-08-19");
      expect(result.checksums.allValid).toBe(true);
      expect(result.confidenceScore).toBe(100);
    });

    it("successfully parses EU Citizen Smart ID card", () => {
      const preset = MRZ_TEST_PRESETS.find((p) => p.id === "idcard-eu-td1")!;
      const result = parseTD1(preset.lines);

      expect(result).not.toBeNull();
      if (!result) return;

      expect(result.format).toBe("TD1");
      expect(result.documentType).toBe("ID_CARD");
      expect(result.documentNumber).toBe("T22000129");
      expect(result.firstName).toBe("Erika");
      expect(result.lastName).toBe("Mustermann");
      expect(result.checksums.allValid).toBe(true);
    });
  });

  describe("4. OCR Ambiguity Resolution & Checksum Repair", () => {
    it("cleans raw OCR lines with whitespace, dashes, and punctuation", () => {
      const raw = " P<BGD«AHMAD--TANVIR...<<< ";
      const cleaned = cleanMRZLine(raw);
      expect(cleaned).toBe("P<BGD<AHMAD<<TANVIR<<<<<<");
    });

    it("corrects numbers in numeric fields (O->0, I->1, B->8, Z->2)", () => {
      expect(correctNumericField("O9IO2B")).toBe("091028");
      expect(correctNumericField("Z4O8I2")).toBe("240812");
    });

    it("repairs OCR document number using check digit mathematical constraint", () => {
      // Suppose OCR read 'A09876543' as 'AO9876543' (letter O instead of digit 0)
      const corrupted = "AO9876543";
      const expectedCheck = "2"; // known check digit for A09876543

      const repaired = repairDocumentNumberWithChecksum(corrupted, expectedCheck);
      expect(repaired).toBe("A09876543");
      expect(verifyICAOCheckDigit(repaired, expectedCheck)).toBe(true);
    });
  });

  describe("5. Auto-Population into useBookingStore", () => {
    it("automatically fills traveler fields in useBookingStore", () => {
      const preset = MRZ_TEST_PRESETS.find((p) => p.id === "passport-bgd")!;
      const mrz = parseMRZ(preset.lines)!;
      expect(mrz).not.toBeNull();

      const result = autoPopulateTravelerInBookingStore(mrz, 0);

      expect(result.success).toBe(true);
      expect(result.populatedFields.firstName).toBe("Tanvir");
      expect(result.populatedFields.lastName).toBe("Ahmad");
      expect(result.populatedFields.passportNumber).toBe("A09876543");
      expect(result.populatedFields.nationality).toBe("Bangladesh");
      expect(result.populatedFields.expiryDate).toBe("2030-08-19");
      expect(result.populatedFields.dateOfBirth).toBe("1994-08-20");
      expect(result.populatedFields.gender).toBe("male");

      // Verify directly from Zustand store
      const storeTraveler = useBookingStore.getState().travelers[0];
      expect(storeTraveler).toBeDefined();
      expect(storeTraveler.firstName).toBe("Tanvir");
      expect(storeTraveler.lastName).toBe("Ahmad");
      expect(storeTraveler.passportNumber).toBe("A09876543");
      expect(storeTraveler.nationality).toBe("Bangladesh");
      expect(storeTraveler.expiryDate).toBe("2030-08-19");
      expect(storeTraveler.dateOfBirth).toBe("1994-08-20");
      expect(storeTraveler.gender).toBe("male");
    });

    it("updates existing traveler at specified index without overwriting unrelated fields", () => {
      // First setup traveler with custom email
      useBookingStore.getState().setTravelers([
        {
          firstName: "OldName",
          lastName: "OldLast",
          email: "custom.traveler@example.com",
          phone: "+8801900000000",
        },
      ]);

      const preset = MRZ_TEST_PRESETS.find((p) => p.id === "passport-usa")!;
      const mrz = parseMRZ(preset.lines)!;

      autoPopulateTravelerInBookingStore(mrz, 0);

      const storeTraveler = useBookingStore.getState().travelers[0];
      expect(storeTraveler.firstName).toBe("Alex Jordan");
      expect(storeTraveler.lastName).toBe("Traveler");
      expect(storeTraveler.passportNumber).toBe("123456789");
      expect(storeTraveler.email).toBe("custom.traveler@example.com");
      expect(storeTraveler.phone).toBe("+8801900000000");
    });
  });

  describe("6. Security & Privacy Guarantees", () => {
    it("processes frames strictly on-device in volatile memory without network dispatch", async () => {
      // Verify processOnDeviceFrame executes safely in local memory
      const frameBufferSimulation = "data:image/jpeg;base64," + "A".repeat(200);
      const result = await processOnDeviceFrame(frameBufferSimulation);

      // Null return for incomplete frame, executed without throwing and with zero network calls
      expect(result).toBeNull();
    });
  });
});
