import React, { useEffect } from 'react';
import renderer, { act } from 'react-test-renderer';
import { useSearchAutocomplete, AutocompleteOptions } from '../useSearchAutocomplete';

describe('useSearchAutocomplete Hook', () => {
  it('returns initial hub inventory and state', () => {
    let hookState: any;

    function TestComponent() {
      hookState = useSearchAutocomplete('');
      return null;
    }

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<TestComponent />);
    });

    expect(hookState).toBeDefined();
    expect(hookState.allHubsCount).toBeGreaterThanOrEqual(500);
    expect(hookState.query).toBe('');
    expect(hookState.isLoading).toBe(false);
    expect(hookState.results.length).toBeGreaterThan(0); // top destinations when empty
    expect(hookState.topDestinations.length).toBeGreaterThan(0);

    act(() => {
      root.unmount();
    });
  });

  it('performs instant synchronous autocomplete with sub-5ms latency', () => {
    let hookState: any;

    function TestComponent({ query }: { query: string }) {
      hookState = useSearchAutocomplete(query);
      return null;
    }

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<TestComponent query="dhak" />);
    });

    expect(hookState.results.length).toBeGreaterThan(0);
    expect(hookState.results[0].hub.name).toBe('Dhaka');
    expect(hookState.latencyMs).toBeLessThan(5);

    // Update query
    act(() => {
      root.update(<TestComponent query="cxb" />);
    });

    expect(hookState.results[0].hub.name).toBe("Cox's Bazar");
    expect(hookState.results[0].matchType).toBe('code');

    act(() => {
      root.unmount();
    });
  });

  it('tolerates typos up to 2 edits via the hook ("Coxes Bazar" and "Syleht")', () => {
    let hookState: any;

    function TestComponent({ query }: { query: string }) {
      hookState = useSearchAutocomplete(query, { enableFuzzy: true });
      return null;
    }

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<TestComponent query="Coxes Bazar" />);
    });

    expect(hookState.results[0].hub.name).toBe("Cox's Bazar");

    act(() => {
      root.update(<TestComponent query="Syleht" />);
    });

    expect(hookState.results[0].hub.name).toBe('Sylhet');

    act(() => {
      root.unmount();
    });
  });

  it('contextually reranks suggestions when userLocation is updated', () => {
    let hookState: any;

    function TestComponent({ location }: { location?: string }) {
      hookState = useSearchAutocomplete('ba', { userLocation: location });
      return null;
    }

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<TestComponent />);
    });

    const unrankedTop = hookState.results[0].hub.name;
    expect(unrankedTop).not.toBe('Bandarban');

    // Dynamically update location to Chittagong
    act(() => {
      root.update(<TestComponent location="Chittagong" />);
    });

    expect(hookState.results[0].hub.name).toBe('Bandarban');
    expect(hookState.results[0].distanceKm).toBeDefined();

    // Test setUserLocation method
    act(() => {
      hookState.setUserLocation({ latitude: 22.3569, longitude: 91.7832 });
    });

    expect(hookState.results[0].hub.name).toBe('Bandarban');

    act(() => {
      root.unmount();
    });
  });

  it('provides a working clear() function', () => {
    let hookState: any;

    function TestComponent() {
      hookState = useSearchAutocomplete('dhaka');
      return null;
    }

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<TestComponent />);
    });

    expect(hookState.results.length).toBeGreaterThan(0);

    act(() => {
      hookState.clear();
    });

    expect(hookState.results).toHaveLength(0);
    expect(hookState.latencyMs).toBe(0);

    act(() => {
      root.unmount();
    });
  });
});
