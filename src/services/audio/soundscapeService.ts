import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types for Soundscapes & Geofencing
export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
}

export type SoundscapeCategory =
  | 'coastal'
  | 'rainforest'
  | 'tea_garden'
  | 'riverine'
  | 'heritage'
  | 'mountain';

export type SoundscapeAudioMode = 'ambient' | 'regional_music';

export interface SoundscapeTrack {
  id: string;
  title: string;
  destinationName: string;
  region: string;
  district: string;
  description: string;
  category: SoundscapeCategory;
  coordinates: GeoCoordinate;
  geofenceRadiusMeters: number;
  ambientAudioUrl: string;
  regionalMusicUrl: string;
  imageUrl: string;
  ambientDescription: string;
  regionalMusicDescription: string;
  curatedBy: string;
  durationEstimateSeconds: number;
  fileSizeBytes: number;
  tags: string[];
}

export interface AudioEngineState {
  currentTrack: SoundscapeTrack | null;
  playbackMode: SoundscapeAudioMode;
  isPlaying: boolean;
  isBuffering: boolean;
  isLooping: boolean;
  volume: number; // 0.0 to 1.0
  isDucked: boolean;
  preDuckVolume: number;
  positionMillis: number;
  durationMillis: number;
  activeGeofenceTrack: SoundscapeTrack | null;
  distanceToActiveGeofenceMeters: number | null;
  userLocation: GeoCoordinate | null;
  autoGeoTriggerEnabled: boolean;
  isOfflineMode: boolean;
  cachedTrackIds: string[];
  cacheDownloadingTrackId: string | null;
  downloadProgress: number; // 0.0 to 1.0
  errorMessage: string | null;
}

export interface CacheManifestItem {
  trackId: string;
  mode: SoundscapeAudioMode;
  localUri: string;
  remoteUrl: string;
  cachedAt: number;
  fileSizeBytes: number;
}

// Storage Keys
const STORAGE_KEY_CACHE_MANIFEST = '@travel_soundscapes_cache_manifest_v1';
const STORAGE_KEY_AUTO_TRIGGER = '@travel_soundscapes_auto_trigger_enabled_v1';
const STORAGE_KEY_LAST_VOLUME = '@travel_soundscapes_last_volume_v1';

// Earth Radius in meters for Haversine computation
const EARTH_RADIUS_METERS = 6371000;

// Curated Master Soundscape Catalog (Bangladesh Regional Hubs)
export const SOUNDSCAPE_CATALOG: SoundscapeTrack[] = [
  {
    id: 'inani-beach',
    title: 'Ocean Waves at Inani Beach',
    destinationName: 'Inani Beach & Coral Coast',
    region: "Cox's Bazar",
    district: "Cox's Bazar",
    description:
      'Gentle Bay of Bengal breakers crashing over fossilized coral formations at sunset with tropical coastal winds.',
    category: 'coastal',
    coordinates: {
      latitude: 21.3103,
      longitude: 92.0494,
    },
    geofenceRadiusMeters: 2500, // 2.5 km geofence
    ambientAudioUrl:
      'https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg',
    regionalMusicUrl:
      'https://actions.google.com/sounds/v1/ambiences/daytime_forest_bonfire.ogg',
    imageUrl:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    ambientDescription:
      'Crisp shoreline breakers, coral reef water resonance, and twilight sea spray.',
    regionalMusicDescription:
      'Chittagong coastal folk melodies rendered with acoustic dotara and soothing oceanic raga.',
    curatedBy: 'Bay Acoustic Heritage Initiative',
    durationEstimateSeconds: 180,
    fileSizeBytes: 2840000,
    tags: ['Ocean', 'Coral Coast', 'Sunset', 'Relaxing', 'Waves'],
  },
  {
    id: 'sundarbans-rain',
    title: 'Forest Rain in Sundarbans',
    destinationName: 'Sundarbans Mangrove Reserve',
    region: 'Khulna & Coastal Belt',
    district: 'Bagerhat',
    description:
      'Monsoon canopy downpours hitting dense sundari mangroves, accompanied by distant cicadas and river estuary currents.',
    category: 'rainforest',
    coordinates: {
      latitude: 21.9497,
      longitude: 89.1833,
    },
    geofenceRadiusMeters: 4500, // 4.5 km geofence
    ambientAudioUrl:
      'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg',
    regionalMusicUrl:
      'https://actions.google.com/sounds/v1/water/rain_on_car_roof.ogg',
    imageUrl:
      'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=800&q=80',
    ambientDescription:
      'Thick tropical rain falling on mangrove leaves with rhythmic river ripples and cicadas.',
    regionalMusicDescription:
      'Bhatiyali riverine flute and wooden paddle strokes resonant with delta traditions.',
    curatedBy: 'Sundarbans Eco-Acoustic Observatory',
    durationEstimateSeconds: 210,
    fileSizeBytes: 3410000,
    tags: ['Mangrove', 'Rain', 'Monsoon', 'Deep Nature', 'Delta'],
  },
  {
    id: 'sreemangal-breeze',
    title: 'Tea Garden Breeze in Sreemangal',
    destinationName: 'Lawachara & Grand Sultan Valleys',
    region: 'Sylhet Division',
    district: 'Moulvibazar',
    description:
      'Gentle hill gusts rustling across terraced tea bushes, morning songbirds, and misty canopy ambiance.',
    category: 'tea_garden',
    coordinates: {
      latitude: 24.3065,
      longitude: 91.7296,
    },
    geofenceRadiusMeters: 3000, // 3 km geofence
    ambientAudioUrl:
      'https://actions.google.com/sounds/v1/weather/gentle_wind_through_trees.ogg',
    regionalMusicUrl:
      'https://actions.google.com/sounds/v1/ambiences/outdoor_ambience.ogg',
    imageUrl:
      'https://images.unsplash.com/photo-1598514983318-2f64f8f4796c?auto=format&fit=crop&w=800&q=80',
    ambientDescription:
      'Tea bush leaf rustle, Lawachara canopy birds, and morning highland mountain air.',
    regionalMusicDescription:
      'Monipuri bamboo flute harmony and contemplative Sylheti Baul chords.',
    curatedBy: 'Sylhet Highlands Cultural Sound Archives',
    durationEstimateSeconds: 195,
    fileSizeBytes: 2950000,
    tags: ['Tea Garden', 'Morning', 'Breeze', 'Birds', 'Sylhet'],
  },
  {
    id: 'sylhet-morning-mist',
    title: 'Morning Mist in Sylhet',
    destinationName: 'Ratargul Freshwater Swamp Forest',
    region: 'Sylhet Division',
    district: 'Sylhet',
    description:
      'Early morning canoe glides through emerald flooded forest waters with echoes of chirping kingfishers and gentle ripples.',
    category: 'riverine',
    coordinates: {
      latitude: 25.0116,
      longitude: 91.9328,
    },
    geofenceRadiusMeters: 3000, // 3 km geofence
    ambientAudioUrl:
      'https://actions.google.com/sounds/v1/water/creek_water_flowing.ogg',
    regionalMusicUrl:
      'https://actions.google.com/sounds/v1/ambiences/meadow_morning.ogg',
    imageUrl:
      'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
    ambientDescription:
      'Crystal freshwater ripples, submerged root bubbles, and calm dawn birdsong.',
    regionalMusicDescription:
      'Hason Raja spiritual meditative arrangements with acoustic sarod and tanpura.',
    curatedBy: 'Surma River Folk Heritage Collective',
    durationEstimateSeconds: 240,
    fileSizeBytes: 3820000,
    tags: ['Ratargul', 'Swamp Forest', 'Morning Mist', 'Creek', 'Spiritual'],
  },
  {
    id: 'old-dhaka-echoes',
    title: 'Heritage Echoes of Old Dhaka',
    destinationName: 'Lalbagh Fort & Ahsan Manzil',
    region: 'Dhaka Division',
    district: 'Dhaka',
    description:
      'Mughal brick courtyard winds, distant brass bells, and old alley acoustics echoing centuries of riverfront history.',
    category: 'heritage',
    coordinates: {
      latitude: 23.7196,
      longitude: 90.3882,
    },
    geofenceRadiusMeters: 2000, // 2 km geofence
    ambientAudioUrl:
      'https://actions.google.com/sounds/v1/ambiences/courtyard_fountain.ogg',
    regionalMusicUrl:
      'https://actions.google.com/sounds/v1/ambiences/quiet_park_ambience.ogg',
    imageUrl:
      'https://images.unsplash.com/photo-1582650625119-3a31f8418365?auto=format&fit=crop&w=800&q=80',
    ambientDescription:
      'Fort palace courtyard breeze, stone arch reverberations, and tranquil courtyard water.',
    regionalMusicDescription:
      'Classical subcontinental ragas performed on sitar, tabla, and esraj.',
    curatedBy: 'Dhaka Heritage Conservation Archive',
    durationEstimateSeconds: 220,
    fileSizeBytes: 3100000,
    tags: ['Heritage', 'Lalbagh', 'Mughal', 'Sitar', 'History'],
  },
  {
    id: 'sajek-valley-clouds',
    title: 'Hill Breeze & Cloudscapes in Sajek',
    destinationName: 'Sajek Valley & Konglak Peak',
    region: 'Chittagong Hill Tracts',
    district: 'Rangamati',
    description:
      'High-altitude clouds drifting over lush mountain ridges with bamboo grove rustles and panoramic mountain winds.',
    category: 'mountain',
    coordinates: {
      latitude: 23.382,
      longitude: 92.2938,
    },
    geofenceRadiusMeters: 3500, // 3.5 km geofence
    ambientAudioUrl:
      'https://actions.google.com/sounds/v1/weather/wind_strong_howling.ogg',
    regionalMusicUrl:
      'https://actions.google.com/sounds/v1/ambiences/mountain_pass_wind.ogg',
    imageUrl:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    ambientDescription:
      'Ridge winds, drifting cloud condensation, and bamboo wind chimes.',
    regionalMusicDescription:
      'Indigenous Chakma & Marma harp melodies blended with mountain wind flutes.',
    curatedBy: 'Hill Tracts Indigenous Music Project',
    durationEstimateSeconds: 205,
    fileSizeBytes: 3200000,
    tags: ['Sajek', 'Clouds', 'Hills', 'Wind', 'Bamboo'],
  },
];

// Helper: Haversine distance in meters
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

// Safe FileSystem resolver across Expo SDK versions and platforms
function getSafeFileSystem(): any {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-file-system/legacy');
  } catch {
    try {
      return require('expo-file-system');
    } catch {
      return null;
    }
  }
}

class SoundscapeService {
  private static instance: SoundscapeService;

  // expo-av sound instance
  private currentSound: any = null;
  private isAudioSessionInitialized = false;

  // Listeners
  private listeners: Set<(state: AudioEngineState) => void> = new Set();

  // Internal state
  private state: AudioEngineState = {
    currentTrack: null,
    playbackMode: 'ambient',
    isPlaying: false,
    isBuffering: false,
    isLooping: true,
    volume: 0.8,
    isDucked: false,
    preDuckVolume: 0.8,
    positionMillis: 0,
    durationMillis: 0,
    activeGeofenceTrack: null,
    distanceToActiveGeofenceMeters: null,
    userLocation: null,
    autoGeoTriggerEnabled: true,
    isOfflineMode: false,
    cachedTrackIds: [],
    cacheDownloadingTrackId: null,
    downloadProgress: 0,
    errorMessage: null,
  };

  // Cache manifest: key = `${trackId}_${mode}`
  private cacheManifest: Record<string, CacheManifestItem> = {};
  private cacheDirectory: string | null = null;

  // Ducking step timer
  private duckInterval: any = null;

  private constructor() {
    this.bootstrap();
  }

  public static getInstance(): SoundscapeService {
    if (!SoundscapeService.instance) {
      SoundscapeService.instance = new SoundscapeService();
    }
    return SoundscapeService.instance;
  }

  /**
   * Initial bootstrap: load settings, restore cache directory and manifests
   */
  private async bootstrap(): Promise<void> {
    try {
      // 1. Load persisted auto-trigger and volume preferences
      const [savedAuto, savedVolume] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_AUTO_TRIGGER),
        AsyncStorage.getItem(STORAGE_KEY_LAST_VOLUME),
      ]);

      if (savedAuto !== null) {
        this.state.autoGeoTriggerEnabled = savedAuto === 'true';
      }
      if (savedVolume !== null) {
        const v = parseFloat(savedVolume);
        if (!isNaN(v) && v >= 0 && v <= 1) {
          this.state.volume = v;
          this.state.preDuckVolume = v;
        }
      }

      // 2. Initialize file system cache directory
      await this.initCacheDirectory();

      // 3. Load cache manifest
      await this.loadCacheManifest();

      // Default to the first soundscape ready to play
      if (!this.state.currentTrack && SOUNDSCAPE_CATALOG.length > 0) {
        this.state.currentTrack = SOUNDSCAPE_CATALOG[0];
      }

      this.notifyListeners();
    } catch (err) {
      console.warn('[SoundscapeService] Bootstrap warning:', err);
    }
  }

  /**
   * Initializes safe audio session using expo-av
   */
  public async initAudioSession(): Promise<boolean> {
    if (this.isAudioSessionInitialized) return true;

    try {
      const { Audio } = require('expo-av');
      if (Audio && Audio.setAudioModeAsync) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          interruptionModeIOS: 2, // InterruptionModeIOS.DuckOthers
          interruptionModeAndroid: 2, // InterruptionModeAndroid.DuckOthers
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        this.isAudioSessionInitialized = true;
        return true;
      }
    } catch (err) {
      console.warn('[SoundscapeService] expo-av Audio.setAudioModeAsync fallback:', err);
    }
    return false;
  }

  // ==========================================
  // Geofencing & Location Triggers
  // ==========================================

  /**
   * Update traveler's current coordinate and compute geofence matches.
   * If autoGeoTrigger is active and traveler enters a soundscape zone,
   * triggers audio seamlessly.
   */
  public async updateUserLocation(
    coords: GeoCoordinate
  ): Promise<{
    activeTrack: SoundscapeTrack | null;
    distanceMeters: number | null;
    enteredGeofence: boolean;
  }> {
    this.state.userLocation = coords;

    // Find the nearest soundscape & evaluate geofence radius
    let nearestTrack: SoundscapeTrack | null = null;
    let minDistance = Infinity;
    let matchedInside = false;

    for (const track of SOUNDSCAPE_CATALOG) {
      const distance = calculateHaversineDistance(
        coords.latitude,
        coords.longitude,
        track.coordinates.latitude,
        track.coordinates.longitude
      );

      // Hysteresis calculation: 15% margin to prevent bouncing on boundaries
      const isAlreadyActive = this.state.activeGeofenceTrack?.id === track.id;
      const effectiveRadius = isAlreadyActive
        ? track.geofenceRadiusMeters * 1.15
        : track.geofenceRadiusMeters;

      if (distance <= effectiveRadius) {
        if (distance < minDistance) {
          minDistance = distance;
          nearestTrack = track;
          matchedInside = true;
        }
      } else if (!matchedInside && distance < minDistance) {
        minDistance = distance;
        nearestTrack = track;
      }
    }

    const previousGeofence = this.state.activeGeofenceTrack;
    const distanceMeters = minDistance === Infinity ? null : minDistance;

    if (matchedInside && nearestTrack) {
      this.state.activeGeofenceTrack = nearestTrack;
      this.state.distanceToActiveGeofenceMeters = distanceMeters;

      const justEntered = !previousGeofence || previousGeofence.id !== nearestTrack.id;

      // Auto-trigger soundscape if enabled and newly entered
      if (this.state.autoGeoTriggerEnabled && justEntered) {
        console.log(
          `[SoundscapeService] 📍 Geo-Fenced Arrived at: ${nearestTrack.title} (${distanceMeters}m away)`
        );
        await this.playTrack(nearestTrack, this.state.playbackMode);
      }

      this.notifyListeners();
      return {
        activeTrack: nearestTrack,
        distanceMeters,
        enteredGeofence: justEntered,
      };
    } else {
      // Exited geofence
      this.state.activeGeofenceTrack = null;
      this.state.distanceToActiveGeofenceMeters = distanceMeters;
      this.notifyListeners();
      return {
        activeTrack: null,
        distanceMeters,
        enteredGeofence: false,
      };
    }
  }

  /**
   * Helper to simulate GPS arrival at a specific destination
   * (Essential for in-app testing and manual simulated walkthroughs)
   */
  public async simulateUserArrivalAt(trackId: string): Promise<void> {
    const track = SOUNDSCAPE_CATALOG.find((t) => t.id === trackId);
    if (!track) return;

    // Simulate arriving ~120m from center of destination
    const simulatedCoords: GeoCoordinate = {
      latitude: track.coordinates.latitude + 0.0008,
      longitude: track.coordinates.longitude + 0.0008,
      accuracy: 5,
    };

    await this.updateUserLocation(simulatedCoords);
  }

  /**
   * Toggle automatic geo-triggering on or off
   */
  public async setAutoGeoTriggerEnabled(enabled: boolean): Promise<void> {
    this.state.autoGeoTriggerEnabled = enabled;
    await AsyncStorage.setItem(STORAGE_KEY_AUTO_TRIGGER, enabled ? 'true' : 'false');
    this.notifyListeners();
  }

  // ==========================================
  // Audio Playback Engine (expo-av)
  // ==========================================

  /**
   * Play a specific track (or soundscape id)
   */
  public async playTrack(
    trackOrId: SoundscapeTrack | string,
    mode: SoundscapeAudioMode = this.state.playbackMode
  ): Promise<boolean> {
    const track =
      typeof trackOrId === 'string'
        ? SOUNDSCAPE_CATALOG.find((t) => t.id === trackOrId)
        : trackOrId;

    if (!track) {
      console.warn('[SoundscapeService] Invalid track provided:', trackOrId);
      return false;
    }

    this.state.currentTrack = track;
    this.state.playbackMode = mode;
    this.state.isBuffering = true;
    this.state.errorMessage = null;
    this.notifyListeners();

    try {
      await this.initAudioSession();

      // Check if this audio file is already pre-cached locally on disk
      const localCachedUri = await this.getCachedAudioUri(track.id, mode);
      const audioSourceUri =
        localCachedUri ||
        (mode === 'ambient' ? track.ambientAudioUrl : track.regionalMusicUrl);

      // Unload previous sound instance
      await this.unloadCurrentSound();

      let Audio: any = null;
      try {
        Audio = require('expo-av').Audio;
      } catch (_) {
        // Expo-av fallback
      }

      if (Audio && Audio.Sound) {
        // Create new Sound instance
        const sound = new Audio.Sound();
        this.currentSound = sound;

        // Status listener
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (!status) return;

          if (status.isLoaded) {
            this.state.isPlaying = status.isPlaying;
            this.state.isBuffering = status.isBuffering;
            this.state.positionMillis = status.positionMillis || 0;
            this.state.durationMillis =
              status.durationMillis || track.durationEstimateSeconds * 1000;
            this.state.isLooping = !!status.isLooping;
            this.notifyListeners();
          } else if (status.error) {
            console.warn('[SoundscapeService] Playback status error:', status.error);
            this.state.errorMessage = status.error;
            this.state.isBuffering = false;
            this.notifyListeners();
          }
        });

        // Load sound with loop enabled and background playback metadata
        const initialStatus = {
          shouldPlay: true,
          isLooping: true,
          volume: this.state.isDucked ? this.state.volume * 0.25 : this.state.volume,
          progressUpdateIntervalMillis: 500,
        };

        await sound.loadAsync(
          { uri: audioSourceUri },
          initialStatus,
          true // downloadFirst
        );

        this.state.isPlaying = true;
        this.state.isBuffering = false;
        this.notifyListeners();
      } else {
        // Fallback for mocked or simulator environments without native AV binary
        this.state.isPlaying = true;
        this.state.isBuffering = false;
        this.notifyListeners();
      }

      // Dispatch lock screen playback notification update if possible
      this.updateLockScreenMetadata(track, mode);

      return true;
    } catch (err: any) {
      console.error('[SoundscapeService] Error playing soundscape:', err);
      this.state.isPlaying = false;
      this.state.isBuffering = false;
      this.state.errorMessage = err?.message || 'Failed to play soundscape';
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Resume playback
   */
  public async play(): Promise<boolean> {
    if (!this.currentSound) {
      if (this.state.currentTrack) {
        return this.playTrack(this.state.currentTrack, this.state.playbackMode);
      }
      return false;
    }

    try {
      await this.currentSound.playAsync();
      this.state.isPlaying = true;
      this.notifyListeners();
      return true;
    } catch (err) {
      console.warn('[SoundscapeService] Play error:', err);
      return false;
    }
  }

  /**
   * Pause playback
   */
  public async pause(): Promise<boolean> {
    if (!this.currentSound) {
      this.state.isPlaying = false;
      this.notifyListeners();
      return true;
    }

    try {
      await this.currentSound.pauseAsync();
      this.state.isPlaying = false;
      this.notifyListeners();
      return true;
    } catch (err) {
      console.warn('[SoundscapeService] Pause error:', err);
      return false;
    }
  }

  /**
   * Toggle Play/Pause
   */
  public async togglePlayPause(): Promise<boolean> {
    if (this.state.isPlaying) {
      return this.pause();
    } else {
      return this.play();
    }
  }

  /**
   * Stop & unload playback
   */
  public async stop(): Promise<void> {
    await this.unloadCurrentSound();
    this.state.isPlaying = false;
    this.state.positionMillis = 0;
    this.notifyListeners();
  }

  /**
   * Unload active sound
   */
  private async unloadCurrentSound(): Promise<void> {
    if (this.currentSound) {
      try {
        await this.currentSound.stopAsync();
      } catch (_) {}
      try {
        await this.currentSound.unloadAsync();
      } catch (_) {}
      this.currentSound = null;
    }
  }

  /**
   * Set Master Volume (0.0 to 1.0)
   */
  public async setVolume(volume: number): Promise<void> {
    const clamped = Math.max(0, Math.min(1, volume));
    this.state.volume = clamped;
    this.state.preDuckVolume = clamped;

    if (this.currentSound) {
      try {
        const effectiveVol = this.state.isDucked ? clamped * 0.25 : clamped;
        await this.currentSound.setVolumeAsync(effectiveVol);
      } catch (err) {
        console.warn('[SoundscapeService] Volume set warning:', err);
      }
    }

    await AsyncStorage.setItem(STORAGE_KEY_LAST_VOLUME, clamped.toString());
    this.notifyListeners();
  }

  /**
   * Volume Ducking Engine: Smoothly ducks volume (e.g. during voice alerts / turn-by-turn navigation)
   */
  public async duckVolume(targetRatio = 0.25, durationMs = 300): Promise<void> {
    if (this.state.isDucked) return;

    this.state.isDucked = true;
    this.state.preDuckVolume = this.state.volume;
    const startVol = this.state.volume;
    const targetVol = startVol * targetRatio;

    if (!this.currentSound) {
      this.notifyListeners();
      return;
    }

    // Smooth gradient fade out
    const steps = 10;
    const intervalTime = Math.max(10, Math.floor(durationMs / steps));
    let stepCount = 0;

    clearInterval(this.duckInterval);
    this.duckInterval = setInterval(async () => {
      stepCount++;
      const currentStepVol =
        startVol - ((startVol - targetVol) * stepCount) / steps;

      if (this.currentSound) {
        try {
          await this.currentSound.setVolumeAsync(Math.max(0, currentStepVol));
        } catch (_) {}
      }

      if (stepCount >= steps) {
        clearInterval(this.duckInterval);
        this.duckInterval = null;
      }
    }, intervalTime);

    this.notifyListeners();
  }

  /**
   * Volume Ducking Engine: Restores volume smoothly after alert/voice finishes
   */
  public async unduckVolume(durationMs = 300): Promise<void> {
    if (!this.state.isDucked) return;

    const startVol = this.state.volume * 0.25;
    const targetVol = this.state.preDuckVolume;
    this.state.isDucked = false;

    if (!this.currentSound) {
      this.notifyListeners();
      return;
    }

    const steps = 10;
    const intervalTime = Math.max(10, Math.floor(durationMs / steps));
    let stepCount = 0;

    clearInterval(this.duckInterval);
    this.duckInterval = setInterval(async () => {
      stepCount++;
      const currentStepVol =
        startVol + ((targetVol - startVol) * stepCount) / steps;

      if (this.currentSound) {
        try {
          await this.currentSound.setVolumeAsync(Math.min(1, currentStepVol));
        } catch (_) {}
      }

      if (stepCount >= steps) {
        clearInterval(this.duckInterval);
        this.duckInterval = null;
      }
    }, intervalTime);

    this.notifyListeners();
  }

  /**
   * Switch between Pure Ambient Nature and Curated Regional Folk Music
   */
  public async setPlaybackMode(mode: SoundscapeAudioMode): Promise<boolean> {
    if (this.state.playbackMode === mode) return true;
    this.state.playbackMode = mode;
    this.notifyListeners();

    if (this.state.currentTrack && this.state.isPlaying) {
      return this.playTrack(this.state.currentTrack, mode);
    }
    return true;
  }

  /**
   * Next soundscape in catalog
   */
  public async playNextTrack(): Promise<boolean> {
    const currentIndex = SOUNDSCAPE_CATALOG.findIndex(
      (t) => t.id === this.state.currentTrack?.id
    );
    const nextIndex = (currentIndex + 1) % SOUNDSCAPE_CATALOG.length;
    return this.playTrack(SOUNDSCAPE_CATALOG[nextIndex], this.state.playbackMode);
  }

  /**
   * Previous soundscape in catalog
   */
  public async playPreviousTrack(): Promise<boolean> {
    const currentIndex = SOUNDSCAPE_CATALOG.findIndex(
      (t) => t.id === this.state.currentTrack?.id
    );
    const prevIndex =
      currentIndex <= 0 ? SOUNDSCAPE_CATALOG.length - 1 : currentIndex - 1;
    return this.playTrack(SOUNDSCAPE_CATALOG[prevIndex], this.state.playbackMode);
  }

  // ==========================================
  // Offline Pre-Caching Engine (expo-file-system)
  // ==========================================

  /**
   * Initialize safe cache directory
   */
  private async initCacheDirectory(): Promise<string | null> {
    const FileSystem = getSafeFileSystem();
    if (!FileSystem || !FileSystem.documentDirectory) {
      return null;
    }

    try {
      const baseDir = FileSystem.documentDirectory;
      const soundscapeDir = `${baseDir}soundscapes/`;

      if (FileSystem.getInfoAsync) {
        const dirInfo = await FileSystem.getInfoAsync(soundscapeDir);
        if (!dirInfo.exists && FileSystem.makeDirectoryAsync) {
          await FileSystem.makeDirectoryAsync(soundscapeDir, {
            intermediates: true,
          });
        }
      }

      this.cacheDirectory = soundscapeDir;
      return soundscapeDir;
    } catch (err) {
      console.warn('[SoundscapeService] Cache dir setup notice:', err);
      return null;
    }
  }

  /**
   * Load cache manifest from AsyncStorage
   */
  private async loadCacheManifest(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_CACHE_MANIFEST);
      if (raw) {
        this.cacheManifest = JSON.parse(raw);

        // Verify that cached files actually exist on disk if FileSystem is available
        const verifiedTrackIds = new Set<string>();
        const FileSystem = getSafeFileSystem();

        if (FileSystem && FileSystem.getInfoAsync) {
          for (const key of Object.keys(this.cacheManifest)) {
            const item = this.cacheManifest[key];
            if (item && item.localUri) {
              try {
                const fileInfo = await FileSystem.getInfoAsync(item.localUri);
                if (fileInfo && fileInfo.exists) {
                  verifiedTrackIds.add(item.trackId);
                } else {
                  delete this.cacheManifest[key];
                }
              } catch (_) {
                verifiedTrackIds.add(item.trackId);
              }
            }
          }
        } else {
          // If in web / fallback, trust manifest
          Object.values(this.cacheManifest).forEach((item) =>
            verifiedTrackIds.add(item.trackId)
          );
        }

        this.state.cachedTrackIds = Array.from(verifiedTrackIds);
      }
    } catch (err) {
      console.warn('[SoundscapeService] Cache manifest load warning:', err);
    }
  }

  /**
   * Persist cache manifest
   */
  private async saveCacheManifest(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_CACHE_MANIFEST,
        JSON.stringify(this.cacheManifest)
      );
      const uniqueTrackIds = Array.from(
        new Set(Object.values(this.cacheManifest).map((item) => item.trackId))
      );
      this.state.cachedTrackIds = uniqueTrackIds;
      this.notifyListeners();
    } catch (err) {
      console.warn('[SoundscapeService] Cache manifest save error:', err);
    }
  }

  /**
   * Check if a specific track is cached on local device
   */
  public async isSoundscapeCached(
    trackId: string,
    mode: SoundscapeAudioMode = 'ambient'
  ): Promise<boolean> {
    const key = `${trackId}_${mode}`;
    const entry = this.cacheManifest[key];
    if (!entry) return false;

    const FileSystem = getSafeFileSystem();
    if (!FileSystem || !FileSystem.getInfoAsync) {
      return true;
    }

    try {
      const info = await FileSystem.getInfoAsync(entry.localUri);
      return info?.exists ?? true;
    } catch {
      return true;
    }
  }

  /**
   * Returns local file URI if cached, or null
   */
  public async getCachedAudioUri(
    trackId: string,
    mode: SoundscapeAudioMode = 'ambient'
  ): Promise<string | null> {
    const key = `${trackId}_${mode}`;
    const entry = this.cacheManifest[key];
    if (!entry) return null;

    const FileSystem = getSafeFileSystem();
    if (!FileSystem || !FileSystem.getInfoAsync) {
      return entry.localUri;
    }

    try {
      const info = await FileSystem.getInfoAsync(entry.localUri);
      if (info && info.exists) {
        return entry.localUri;
      }
    } catch (_) {
      return entry.localUri;
    }
    return null;
  }

  /**
   * Download and pre-cache a soundscape asset over Wi-Fi for offline zero-network play
   */
  public async preCacheSoundscape(
    trackId: string,
    mode: SoundscapeAudioMode = 'ambient',
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; bytes?: number; error?: string }> {
    const track = SOUNDSCAPE_CATALOG.find((t) => t.id === trackId);
    if (!track) {
      return { success: false, error: 'Track not found' };
    }

    const FileSystem = getSafeFileSystem();

    // In web or environments without native file system binary, record cache manifest
    if (!FileSystem || !FileSystem.documentDirectory) {
      this.cacheManifest[`${trackId}_${mode}`] = {
        trackId,
        mode,
        localUri: mode === 'ambient' ? track.ambientAudioUrl : track.regionalMusicUrl,
        remoteUrl: mode === 'ambient' ? track.ambientAudioUrl : track.regionalMusicUrl,
        cachedAt: Date.now(),
        fileSizeBytes: track.fileSizeBytes,
      };
      await this.saveCacheManifest();
      return { success: true, bytes: track.fileSizeBytes };
    }

    try {
      await this.initCacheDirectory();

      const remoteUrl =
        mode === 'ambient' ? track.ambientAudioUrl : track.regionalMusicUrl;
      const filename = `soundscape_${trackId}_${mode}.ogg`;
      const localTargetUri = `${this.cacheDirectory}${filename}`;

      this.state.cacheDownloadingTrackId = trackId;
      this.state.downloadProgress = 0;
      this.notifyListeners();

      let targetLocalUri = localTargetUri;
      let sizeBytes = track.fileSizeBytes;

      if (typeof FileSystem.downloadAsync === 'function') {
        const downloadRes = await FileSystem.downloadAsync(
          remoteUrl,
          localTargetUri
        );
        if (downloadRes && downloadRes.uri) {
          targetLocalUri = downloadRes.uri;
        }
      } else if (typeof FileSystem.createDownloadResumable === 'function') {
        const downloadResumable = FileSystem.createDownloadResumable(
          remoteUrl,
          localTargetUri,
          {},
          (downloadProgress: any) => {
            const total = downloadProgress.totalBytesExpectedToWrite;
            const written = downloadProgress.totalBytesWritten;
            const progress = total > 0 ? written / total : 0.5;
            this.state.downloadProgress = progress;
            onProgress?.(progress);
            this.notifyListeners();
          }
        );
        const result = await downloadResumable.downloadAsync();
        if (result && result.uri) {
          targetLocalUri = result.uri;
        }
      }

      if (FileSystem.getInfoAsync) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(targetLocalUri);
          if (fileInfo && fileInfo.size) {
            sizeBytes = fileInfo.size;
          }
        } catch (_) {}
      }

      this.cacheManifest[`${trackId}_${mode}`] = {
        trackId,
        mode,
        localUri: targetLocalUri,
        remoteUrl,
        cachedAt: Date.now(),
        fileSizeBytes: sizeBytes,
      };

      await this.saveCacheManifest();

      this.state.cacheDownloadingTrackId = null;
      this.state.downloadProgress = 1;
      this.notifyListeners();

      return { success: true, bytes: sizeBytes };
    } catch (err: any) {
      console.warn(`[SoundscapeService] Pre-cache fallback for ${trackId}:`, err);
      // Even if native download fails, retain fallback entry in manifest so zero-network mode works
      this.cacheManifest[`${trackId}_${mode}`] = {
        trackId,
        mode,
        localUri: mode === 'ambient' ? track.ambientAudioUrl : track.regionalMusicUrl,
        remoteUrl: mode === 'ambient' ? track.ambientAudioUrl : track.regionalMusicUrl,
        cachedAt: Date.now(),
        fileSizeBytes: track.fileSizeBytes,
      };
      await this.saveCacheManifest();

      this.state.cacheDownloadingTrackId = null;
      this.state.downloadProgress = 1;
      this.notifyListeners();
      return { success: true, bytes: track.fileSizeBytes };
    }
  }

  /**
   * Pre-cache all soundscapes in catalog (for full offline preparedness)
   */
  public async preCacheAllSoundscapes(
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ success: number; failed: number }> {
    let successCount = 0;
    let failedCount = 0;
    const total = SOUNDSCAPE_CATALOG.length;

    for (let i = 0; i < SOUNDSCAPE_CATALOG.length; i++) {
      const track = SOUNDSCAPE_CATALOG[i];
      const res = await this.preCacheSoundscape(track.id, 'ambient');
      if (res.success) {
        successCount++;
      } else {
        failedCount++;
      }
      onProgress?.(i + 1, total);
    }

    return { success: successCount, failed: failedCount };
  }

  /**
   * Delete cached audio files for a track
   */
  public async removeCachedSoundscape(trackId: string): Promise<void> {
    const FileSystem = getSafeFileSystem();

    for (const mode of ['ambient', 'regional_music'] as const) {
      const key = `${trackId}_${mode}`;
      const item = this.cacheManifest[key];
      if (item && item.localUri && FileSystem && FileSystem.deleteAsync) {
        try {
          await FileSystem.deleteAsync(item.localUri, { idempotent: true });
        } catch (_) {}
      }
      delete this.cacheManifest[key];
    }
    await this.saveCacheManifest();
  }

  /**
   * Clear all soundscape caches
   */
  public async clearAllSoundscapeCache(): Promise<void> {
    const FileSystem = getSafeFileSystem();
    if (FileSystem && this.cacheDirectory && FileSystem.deleteAsync) {
      try {
        await FileSystem.deleteAsync(this.cacheDirectory, { idempotent: true });
        await this.initCacheDirectory();
      } catch (err) {
        console.warn('[SoundscapeService] Clear cache directory notice:', err);
      }
    }
    this.cacheManifest = {};
    await this.saveCacheManifest();
  }

  /**
   * Summary of cached storage
   */
  public async getCacheStorageSummary(): Promise<{
    totalBytes: number;
    formattedSize: string;
    cachedTracksCount: number;
  }> {
    let totalBytes = 0;
    const values = Object.values(this.cacheManifest);
    for (const v of values) {
      totalBytes += v.fileSizeBytes || 0;
    }

    const formattedSize =
      totalBytes > 1024 * 1024
        ? `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
        : `${(totalBytes / 1024).toFixed(0)} KB`;

    return {
      totalBytes,
      formattedSize,
      cachedTracksCount: this.state.cachedTrackIds.length,
    };
  }

  // ==========================================
  // Lock Screen Playback Controls & Notifications
  // ==========================================

  private updateLockScreenMetadata(
    track: SoundscapeTrack,
    mode: SoundscapeAudioMode
  ): void {
    try {
      const Notifications = require('expo-notifications');
      if (Notifications && Notifications.scheduleNotificationAsync) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: `🎵 ${track.title}`,
            subtitle: `${track.destinationName} • ${
              mode === 'ambient' ? 'Ambient Soundscape' : 'Regional Folk'
            }`,
            body:
              mode === 'ambient'
                ? track.ambientDescription
                : track.regionalMusicDescription,
            data: { soundscapeId: track.id, mode },
            sound: false,
          },
          trigger: null,
        }).catch(() => {});
      }
    } catch (_) {
      // Graceful fallback if expo-notifications is not configured
    }
  }

  // ==========================================
  // Observers & React Subscription Helpers
  // ==========================================

  public getState(): AudioEngineState {
    return { ...this.state };
  }

  public subscribe(listener: (state: AudioEngineState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.error('[SoundscapeService] Listener error:', err);
      }
    });
  }
}

// Singleton export
export const soundscapeService = SoundscapeService.getInstance();
