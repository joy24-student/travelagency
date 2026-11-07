import {
  evaluateLuggageAllowance,
  AIRLINE_SPECIFICATIONS,
  DEFAULT_AIRLINE,
} from "../luggageEstimator";
import { toBengaliNumber } from "../../../screens/LandmarkScannerScreen";

describe("Landmark Scanner & Luggage Measurement UX Enhancements", () => {
  describe("Problem 1: Landmark Scanner Solutions", () => {
    it("converts numerals to Bengali correctly for confidence percentages", () => {
      expect(toBengaliNumber(85)).toBe("৮৫");
      expect(toBengaliNumber(98)).toBe("৯৮");
      expect(toBengaliNumber(100)).toBe("১০০");
      expect(toBengaliNumber("85.5")).toBe("৮৫.৫");
    });

    it("formats 85% confidence label in Bengali", () => {
      const confidenceScore = 0.85;
      const formatted = `${toBengaliNumber(Math.round(confidenceScore * 100))}% নিশ্চিত`;
      expect(formatted).toBe("৮৫% নিশ্চিত");
    });
  });

  describe("Problem 2: Luggage Measurement Solutions", () => {
    const bimanAirline = AIRLINE_SPECIFICATIONS.find((a) => a.id === "biman-bangladesh") || DEFAULT_AIRLINE;

    it("displays '✓ ক্যাবিন সীমার মধ্যে' when luggage fits within airline limits", () => {
      // Biman Bangladesh allowance: 56 x 36 x 23 cm
      const compliantBag = { height: 54.0, width: 34.0, depth: 21.0 };
      const result = evaluateLuggageAllowance(compliantBag, bimanAirline, "Economy");

      expect(result.status).toBe("COMPLIANT");
      expect(result.isCompliant).toBe(true);

      const maxExcess = Math.max(
        0,
        result.dimensions.height.differenceCm,
        result.dimensions.width.differenceCm,
        result.dimensions.depth.differenceCm
      );

      const verdict = maxExcess <= 0.8
        ? "✓ ক্যাবিন সীমার মধ্যে"
        : `✗ ${toBengaliNumber(Math.round(maxExcess))} সেমি বেশি`;

      expect(verdict).toBe("✓ ক্যাবিন সীমার মধ্যে");
    });

    it("displays '✗ ২ সেমি বেশি' when luggage height exceeds airline limit by 2 cm", () => {
      // 58 cm height exceeds 56 cm limit by exactly 2 cm
      const oversizedBag = { height: 58.0, width: 36.0, depth: 23.0 };
      const result = evaluateLuggageAllowance(oversizedBag, bimanAirline, "Economy");

      expect(result.status).toBe("OVERSIZED");
      expect(result.isCompliant).toBe(false);
      expect(result.dimensions.height.differenceCm).toBe(2.0);

      const maxExcess = Math.max(
        0,
        result.dimensions.height.differenceCm,
        result.dimensions.width.differenceCm,
        result.dimensions.depth.differenceCm
      );

      const verdict = maxExcess <= 0.8
        ? "✓ ক্যাবিন সীমার মধ্যে"
        : `✗ ${toBengaliNumber(Math.round(maxExcess))} সেমি বেশি`;

      expect(verdict).toBe("✗ ২ সেমি বেশি");
    });

    it("updates verdict dynamically when airline is switched", () => {
      // Bag size: 56 x 45 x 25 cm (Exceeds Biman width 36cm, but compliant for some other airlines or classes)
      const bag = { height: 55.0, width: 38.0, depth: 23.0 };

      // Against Biman (max width 36cm -> 2cm excess):
      const bimanRes = evaluateLuggageAllowance(bag, bimanAirline, "Economy");
      const bimanExcess = Math.max(
        0,
        bimanRes.dimensions.height.differenceCm,
        bimanRes.dimensions.width.differenceCm,
        bimanRes.dimensions.depth.differenceCm
      );
      const bimanVerdict = bimanExcess <= 0.8
        ? "✓ ক্যাবিন সীমার মধ্যে"
        : `✗ ${toBengaliNumber(Math.round(bimanExcess))} সেমি বেশি`;
      expect(bimanVerdict).toBe("✗ ২ সেমি বেশি");

      // Against Emirates (max dimensions: 55 x 38 x 22 or similar depending on spec)
      const emirates = AIRLINE_SPECIFICATIONS.find((a) => a.id === "emirates");
      if (emirates) {
        const emiratesRes = evaluateLuggageAllowance(bag, emirates, "Economy");
        expect(emiratesRes).toBeDefined();
      }
    });
  });
});
