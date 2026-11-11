import {
  intentGraph,
  searchAutocomplete,
  getTravelHubsCount,
  damerauLevenshteinDistance,
  calculateDistanceKm,
} from '../intentGraph';

describe('Search Infrastructure: Radix Tree & Intent Graph', () => {
  // ─── 1. MEMORY-EFFICIENT RADIX TREE & DATASET ───────────────────────────────
  describe('Hub Catalog & In-Memory Index', () => {
    it('loads 500+ regional and global travel hubs in memory', () => {
      const count = getTravelHubsCount();
      expect(count).toBeGreaterThanOrEqual(500);
    });

    it('indexes regional destinations, attractions, airlines, and airports', () => {
      const dhaka = intentGraph.search('Dhaka', { limit: 1 })[0];
      expect(dhaka).toBeDefined();
      expect(dhaka.hub.category).toBe('destination');
      expect(dhaka.hub.country).toBe('Bangladesh');

      const biman = intentGraph.search('Biman', { limit: 1 })[0];
      expect(biman).toBeDefined();
      expect(biman.hub.category).toBe('airline');

      const nilgiri = intentGraph.search('Nilgiri', { limit: 1 })[0];
      expect(nilgiri).toBeDefined();
      expect(nilgiri.hub.category).toBe('attraction');
    });

    it('resolves IATA airport and airline codes instantly', () => {
      const cxb = searchAutocomplete('CXB', { limit: 1 })[0];
      expect(cxb).toBeDefined();
      expect(cxb.hub.name).toBe("Cox's Bazar");
      expect(cxb.matchType).toBe('code');

      const bg = searchAutocomplete('BG', { limit: 1 })[0];
      expect(bg).toBeDefined();
      expect(bg.hub.name).toBe('Biman Bangladesh Airlines');
      expect(bg.matchType).toBe('code');

      const ek = searchAutocomplete('EK', { limit: 1 })[0];
      expect(ek).toBeDefined();
      expect(ek.hub.name).toBe('Emirates');
      expect(ek.matchType).toBe('code');
    });
  });

  // ─── 2. FUZZY LEVENSHTEIN & DAMERAU MATCHING ────────────────────────────────
  describe('Fuzzy Matching & Typo Tolerance', () => {
    it('calculates Damerau-Levenshtein distance correctly for transpositions and edits', () => {
      // 1 transposition: "Syleht" -> "Sylhet"
      expect(damerauLevenshteinDistance('syleht', 'sylhet')).toBe(1);
      // 1 substitution: "bandarbon" -> "bandarban"
      expect(damerauLevenshteinDistance('bandarbon', 'bandarban')).toBe(1);
      // 1 substitution: "sondarban" -> "sundarban"
      expect(damerauLevenshteinDistance('sondarban', 'sundarban')).toBe(1);
      // 1 insertion / apostrophe: "coxes" -> "cox's"
      expect(damerauLevenshteinDistance('coxes', "cox's")).toBe(1);
    });

    it('tolerates up to 2 typos for "Coxes Bazar" -> "Cox\'s Bazar"', () => {
      const results = searchAutocomplete('Coxes Bazar', { limit: 5, enableFuzzy: true });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].hub.name).toBe("Cox's Bazar");
    });

    it('tolerates typos for "Syleht" -> "Sylhet"', () => {
      const results = searchAutocomplete('Syleht', { limit: 5, enableFuzzy: true });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].hub.name).toBe('Sylhet');
    });

    it('resolves common misspelling "bandarbon" -> "Bandarban"', () => {
      const results = searchAutocomplete('bandarbon', { limit: 3, enableFuzzy: true });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].hub.name).toBe('Bandarban');
    });

    it('resolves "sondarban" -> "Sundarbans National Park"', () => {
      const results = searchAutocomplete('sondarban', { limit: 3, enableFuzzy: true });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].hub.name).toBe('Sundarbans National Park');
    });

    it('resolves global destination typos (e.g. "emirats" -> "Emirates", "bagkok" -> "Bangkok")', () => {
      const emiratesMatch = searchAutocomplete('emirats', { limit: 1, enableFuzzy: true })[0];
      expect(emiratesMatch.hub.name).toBe('Emirates');

      const bangkokMatch = searchAutocomplete('bagkok', { limit: 1, enableFuzzy: true })[0];
      expect(bangkokMatch.hub.name).toBe('Bangkok');
    });
  });

  // ─── 3. CONTEXTUAL RERANKING ────────────────────────────────────────────────
  describe('Contextual Location-Based Reranking', () => {
    const chittagongCoords = { latitude: 22.3569, longitude: 91.7832 };

    it('calculates Haversine distances accurately', () => {
      // Distance between Chittagong and Bandarban is ~48km
      const dist = calculateDistanceKm(22.3569, 91.7832, 22.1953, 92.2184);
      expect(dist).toBeGreaterThan(40);
      expect(dist).toBeLessThan(60);
    });

    it('prioritizes nearby regional spots (Bandarban) when user is in Chittagong', () => {
      // Searching "ba" without location prioritizes global popularity (e.g. British Airways, Bali)
      const unranked = searchAutocomplete('ba', { limit: 5 });
      const unrankedNames = unranked.map((m) => m.hub.name);
      expect(unrankedNames[0]).not.toBe('Bandarban');

      // Searching "ba" with userLocation in Chittagong MUST prioritize nearby Bandarban
      const rankedWithCoords = searchAutocomplete('ba', {
        userLocation: chittagongCoords,
        limit: 5,
      });
      expect(rankedWithCoords[0].hub.name).toBe('Bandarban');
      expect(rankedWithCoords[0].distanceKm).toBeDefined();
      expect(rankedWithCoords[0].distanceKm!).toBeLessThan(60);

      // String location "Chittagong" should produce equivalent contextual boost
      const rankedWithString = searchAutocomplete('ba', {
        userLocation: 'Chittagong',
        limit: 5,
      });
      expect(rankedWithString[0].hub.name).toBe('Bandarban');
    });
  });

  // ─── 4. SUB-5MS LATENCY REQUIREMENT ─────────────────────────────────────────
  describe('Performance & Zero Server Round-Trips', () => {
    it('executes prefix queries within < 5ms', () => {
      // Prime JIT inside this test execution frame
      searchAutocomplete('dhaka', { limit: 10 });
      searchAutocomplete('cox', { limit: 10 });

      const queries = ['dhak', 'cox', 'syl', 'ban', 'dub', 'sin', 'tha', 'air', 'cxb', 'biman'];
      const latencies: number[] = [];

      for (const q of queries) {
        const t0 = performance.now();
        searchAutocomplete(q, { limit: 10 });
        const elapsed = performance.now() - t0;
        latencies.push(elapsed);
        expect(elapsed).toBeLessThan(5); // Strict requirement: < 5ms
      }

      const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      expect(avg).toBeLessThan(2);
    });
  });
});
