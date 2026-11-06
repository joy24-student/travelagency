jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import {
  soundscapeService,
  calculateHaversineDistance,
  SOUNDSCAPE_CATALOG,
} from '../soundscapeService';

describe('SoundscapeService & Geo-Trigger Intelligence', () => {
  it('has comprehensive catalog covering Bangladesh destination hubs', () => {
    expect(SOUNDSCAPE_CATALOG.length).toBeGreaterThanOrEqual(6);

    const inani = SOUNDSCAPE_CATALOG.find((t) => t.id === 'inani-beach');
    expect(inani).toBeDefined();
    expect(inani?.title).toContain('Inani Beach');
    expect(inani?.category).toBe('coastal');
    expect(inani?.geofenceRadiusMeters).toBe(2500);

    const sundarbans = SOUNDSCAPE_CATALOG.find((t) => t.id === 'sundarbans-rain');
    expect(sundarbans).toBeDefined();
    expect(sundarbans?.title).toContain('Sundarbans');
    expect(sundarbans?.category).toBe('rainforest');

    const sreemangal = SOUNDSCAPE_CATALOG.find((t) => t.id === 'sreemangal-breeze');
    expect(sreemangal).toBeDefined();
    expect(sreemangal?.title).toContain('Sreemangal');
    expect(sreemangal?.category).toBe('tea_garden');

    const sylhet = SOUNDSCAPE_CATALOG.find((t) => t.id === 'sylhet-morning-mist');
    expect(sylhet).toBeDefined();
    expect(sylhet?.title).toContain('Sylhet');
  });

  it('accurately computes Haversine spherical distance', () => {
    // 0 distance to self
    const zeroDist = calculateHaversineDistance(21.3103, 92.0494, 21.3103, 92.0494);
    expect(zeroDist).toBe(0);

    // Known approximate distance: Inani Beach to Old Dhaka (~300 - 350 km)
    const distInaniDhaka = calculateHaversineDistance(
      21.3103,
      92.0494,
      23.7196,
      90.3882
    );
    expect(distInaniDhaka).toBeGreaterThan(300000);
    expect(distInaniDhaka).toBeLessThan(400000);
  });

  it('triggers geofence arrival when user arrives inside perimeter', async () => {
    const inani = SOUNDSCAPE_CATALOG.find((t) => t.id === 'inani-beach')!;

    // Point 100 meters away from Inani
    const res = await soundscapeService.updateUserLocation({
      latitude: inani.coordinates.latitude + 0.0005,
      longitude: inani.coordinates.longitude + 0.0005,
      accuracy: 5,
    });

    expect(res.enteredGeofence).toBe(true);
    expect(res.activeTrack?.id).toBe('inani-beach');
    expect(res.distanceMeters).toBeLessThan(inani.geofenceRadiusMeters);

    const state = soundscapeService.getState();
    expect(state.activeGeofenceTrack?.id).toBe('inani-beach');
  });

  it('exits geofence when moving outside hysteresis radius', async () => {
    // Move user 60 km away
    const res = await soundscapeService.updateUserLocation({
      latitude: 22.5,
      longitude: 92.0,
      accuracy: 10,
    });

    expect(res.enteredGeofence).toBe(false);
    expect(res.activeTrack).toBeNull();

    const state = soundscapeService.getState();
    expect(state.activeGeofenceTrack).toBeNull();
  });

  it('supports volume adjustment and smooth ducking engine', async () => {
    await soundscapeService.setVolume(0.75);
    expect(soundscapeService.getState().volume).toBe(0.75);

    await soundscapeService.duckVolume(0.2, 50);
    expect(soundscapeService.getState().isDucked).toBe(true);
    expect(soundscapeService.getState().preDuckVolume).toBe(0.75);

    await soundscapeService.unduckVolume(50);
    expect(soundscapeService.getState().isDucked).toBe(false);
  });

  it('supports audio mode switching between ambient and regional music', async () => {
    await soundscapeService.setPlaybackMode('regional_music');
    expect(soundscapeService.getState().playbackMode).toBe('regional_music');

    await soundscapeService.setPlaybackMode('ambient');
    expect(soundscapeService.getState().playbackMode).toBe('ambient');
  });

  it('handles offline pre-caching metadata and summaries', async () => {
    const result = await soundscapeService.preCacheSoundscape('inani-beach', 'ambient');
    expect(result.success).toBe(true);

    const isCached = await soundscapeService.isSoundscapeCached('inani-beach', 'ambient');
    expect(isCached).toBe(true);

    const summary = await soundscapeService.getCacheStorageSummary();
    expect(summary.cachedTracksCount).toBeGreaterThanOrEqual(1);
  });
});
