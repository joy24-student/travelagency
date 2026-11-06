/**
 * Unit & Integration Tests
 * Enterprise Itinerary PDF Generator
 */

import {
  generateItineraryHtml,
  createSampleItineraryData,
  toBengaliNumerals,
  I18N_STRINGS,
  ItineraryDocumentData,
} from "../itineraryPdfGenerator";

describe("Enterprise PDF Generator Service", () => {
  it("converts numbers to Bengali numerals accurately", () => {
    expect(toBengaliNumerals("1234567890")).toBe("১২৩৪৫৬৭৮৯০");
    expect(toBengaliNumerals(2026)).toBe("২০২৬");
    expect(toBengaliNumerals("GTL-BK-99214")).toBe("GTL-BK-৯৯২১৪");
  });

  it("generates English HTML document with all sections and branding", async () => {
    const data = createSampleItineraryData();
    const html = await generateItineraryHtml(data, { language: "en" });

    // Assert branding
    expect(html).toContain("Global Travels Ltd.");
    expect(html).toContain("+880 1800-746766 (24/7)");
    expect(html).toContain("GLOBAL TRAVELS OFFICIAL");

    // Assert 4 modules
    expect(html).toContain(I18N_STRINGS.en.itinerarySectionTitle);
    expect(html).toContain(I18N_STRINGS.en.flightSectionTitle);
    expect(html).toContain(I18N_STRINGS.en.hotelSectionTitle);
    expect(html).toContain(I18N_STRINGS.en.receiptSectionTitle);

    // Assert Flight details
    expect(html).toContain("SQ 447");
    expect(html).toContain("W9KZ7Q");

    // Assert Hotel details
    expect(html).toContain("The Mulia Resort");
    expect(html).toContain("MULIA-VCH-99201");

    // Assert Receipt
    expect(html).toContain("PAID IN FULL");
    expect(html).toContain("RCPT-2026-08812");

    // Assert Zero Clipping Typography and Fonts
    expect(html).toContain("Hind Siliguri");
    expect(html).toContain("Noto Sans Bengali");
    expect(html).toContain("line-height: 1.65 !important");
  });

  it("generates Bengali (বাংলা) HTML document with zero font clipping typography", async () => {
    const data = createSampleItineraryData();
    const html = await generateItineraryHtml(data, {
      language: "bn",
      useBengaliNumerals: true,
    });

    // Assert Bengali translated section titles
    expect(html).toContain(I18N_STRINGS.bn.officialDocTitle);
    expect(html).toContain(I18N_STRINGS.bn.itinerarySectionTitle);
    expect(html).toContain(I18N_STRINGS.bn.flightSectionTitle);
    expect(html).toContain(I18N_STRINGS.bn.hotelSectionTitle);
    expect(html).toContain(I18N_STRINGS.bn.receiptSectionTitle);
    expect(html).toContain(I18N_STRINGS.bn.emergencyHelpline);

    // Assert Bengali diacritics / conjuncts rendering
    expect(html).toContain("ভ্রমণ বিবরণী");
    expect(html).toContain("২৪/৭ সার্বক্ষণিক জরুরি সহায়তা হটলাইন");
    expect(html).toContain("হোটেল বুকিং ভাউচার");
    expect(html).toContain("সম্পূর্ণ পরিশোধিত");

    // Assert WebFonts and anti-clipping CSS
    expect(html).toContain("https://fonts.googleapis.com/css2?family=Hind+Siliguri");
    expect(html).toContain("overflow: visible !important");
  });

  it("respects module toggle options", async () => {
    const data = createSampleItineraryData();
    const htmlWithoutFlights = await generateItineraryHtml(data, {
      language: "en",
      includeFlights: false,
      includeHotels: false,
    });

    expect(htmlWithoutFlights).toContain(I18N_STRINGS.en.itinerarySectionTitle);
    expect(htmlWithoutFlights).toContain(I18N_STRINGS.en.receiptSectionTitle);
    expect(htmlWithoutFlights).not.toContain(I18N_STRINGS.en.flightSectionTitle);
    expect(htmlWithoutFlights).not.toContain(I18N_STRINGS.en.hotelSectionTitle);
  });
});
