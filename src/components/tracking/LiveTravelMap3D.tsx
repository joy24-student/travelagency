/**
 * LiveTravelMap3D.tsx
 *
 * High-performance 3D WebGL Train Tracking Engine for Shopno Jatra.
 * Recreates TrainKothay-style procedural 3D Bangladesh Railway trains,
 * articulated snaking carriages along railway tracks, satellite imagery,
 * and a 64° cinematic chase camera.
 */

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { LiveTrainPosition, TrainProfile } from "../../services/trainTrackingService";

export interface LiveTravelMap3DProps {
  trainProfile: TrainProfile;
  livePosition: LiveTrainPosition;
  is3DMode: boolean;
  onCameraChange?: (mode: "2D" | "3D") => void;
  style?: any;
}

export interface LiveTravelMap3DRef {
  triggerTrainHorn: () => void;
  recenterCamera: () => void;
  toggleSatellite: () => void;
  toggleAudio: (enable: boolean) => void;
}

export const LiveTravelMap3D = forwardRef<LiveTravelMap3DRef, LiveTravelMap3DProps>(
  ({ trainProfile, livePosition, is3DMode, style }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const [isMapLoaded, setIsMapLoaded] = useState(false);

    // Expose methods to parent screen via ref
    useImperativeHandle(ref, () => ({
      triggerTrainHorn: () => {
        webViewRef.current?.postMessage(JSON.stringify({ type: "PLAY_HORN" }));
      },
      recenterCamera: () => {
        webViewRef.current?.postMessage(JSON.stringify({ type: "RECENTER_CAMERA" }));
      },
      toggleSatellite: () => {
        webViewRef.current?.postMessage(JSON.stringify({ type: "TOGGLE_LAYER" }));
      },
      toggleAudio: (enable: boolean) => {
        webViewRef.current?.postMessage(
          JSON.stringify({ type: "TOGGLE_AUDIO", enabled: enable })
        );
      },
    }));

    // Send updated train coordinates to WebView
    useEffect(() => {
      if (isMapLoaded && webViewRef.current && livePosition) {
        const payload = JSON.stringify({
          type: "UPDATE_POSITION",
          data: {
            lat: livePosition.latitude,
            lng: livePosition.longitude,
            bearing: livePosition.bearing,
            speed: livePosition.speedKmh,
            coaches: livePosition.coachPoses,
          },
        });
        webViewRef.current.postMessage(payload);
      }
    }, [livePosition, isMapLoaded]);

    // Handle 2D / 3D camera mode changes
    useEffect(() => {
      if (isMapLoaded && webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({
            type: "SET_CAMERA_MODE",
            mode: is3DMode ? "3D" : "2D",
          })
        );
      }
    }, [is3DMode, isMapLoaded]);

    // Switch route if trainProfile changes
    useEffect(() => {
      if (isMapLoaded && webViewRef.current && trainProfile) {
        webViewRef.current.postMessage(
          JSON.stringify({
            type: "SET_ROUTE",
            route: trainProfile.trackGeometry,
            stops: trainProfile.stops,
          })
        );
      }
    }, [trainProfile, isMapLoaded]);

    const initialRoute = JSON.stringify(trainProfile.trackGeometry);
    const initialStops = JSON.stringify(trainProfile.stops);
    const startCoord = trainProfile.trackGeometry[0] || [90.4257, 23.7317];

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
      <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
      <style>
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #0b131e; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        
        .station-marker {
          background: rgba(15, 23, 42, 0.88);
          border: 1.5px solid #006A4E;
          border-radius: 8px;
          padding: 4px 8px;
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
          pointer-events: none;
        }
        .station-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10B981;
          border: 1.5px solid #ffffff;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>

      <script>
        let is3D = ${is3DMode ? "true" : "false"};
        let currentPos = { lat: ${startCoord[1]}, lng: ${startCoord[0]}, bearing: 0, speed: 80 };
        let currentRoute = ${initialRoute};
        let currentStops = ${initialStops};
        let isSatellite = true;
        let isAudioEnabled = true;
        let isUserInteracting = false;
        let custom3DLayer = null;

        // =====================================================================
        // Procedural Audio Engine (Dual-Tone Diesel Train Horn)
        // =====================================================================
        let audioCtx = null;
        function initAudio() {
          if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          }
          if (audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
        }

        function playLocomotiveHorn() {
          try {
            initAudio();
            if (!audioCtx) return;

            const now = audioCtx.currentTime;
            // Dual chord frequencies of authentic EMD / GE Bangladesh Railway locomotive horn
            const freqs = [311.13, 370.0, 440.0]; // Eb4, F#4, A4 chord
            
            freqs.forEach((freq, idx) => {
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();

              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(freq, now);
              // Slight vibrato for realistic brass horn acoustic
              osc.frequency.linearRampToValueAtTime(freq + (idx === 0 ? 3 : -2), now + 0.8);

              gain.gain.setValueAtTime(0.001, now);
              gain.gain.exponentialRampToValueAtTime(0.2, now + 0.08);
              gain.gain.linearRampToValueAtTime(0.18, now + 0.6);
              gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

              osc.connect(gain);
              gain.connect(audioCtx.destination);

              osc.start(now);
              osc.stop(now + 1.25);
            });
          } catch(e) {
            console.error("Audio error", e);
          }
        }

        // =====================================================================
        // MapLibre GL 3D Map Setup with ArcGIS Satellite
        // =====================================================================
        const satelliteSource = {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          maxzoom: 19
        };

        const osmSource = {
          type: 'raster',
          tiles: [
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          maxzoom: 19
        };

        const map = new maplibregl.Map({
          container: 'map',
          style: {
            version: 8,
            sources: {
              'satellite': satelliteSource,
              'osm': osmSource
            },
            layers: [
              {
                id: 'base-tiles',
                type: 'raster',
                source: 'satellite',
                paint: { 'raster-fade-duration': 300 }
              }
            ]
          },
          center: [currentPos.lng, currentPos.lat],
          zoom: 16.8,
          pitch: is3D ? 64 : 0,
          bearing: 0,
          antialias: true
        });

        // User drag/zoom detection
        map.on('dragstart', () => { isUserInteracting = true; });
        map.on('rotatestart', () => { isUserInteracting = true; });

        // =====================================================================
        // Custom 3D Procedural Bangladesh Railway Train Layer (Three.js)
        // =====================================================================
        custom3DLayer = {
          id: 'bd-train-3d-model',
          type: 'custom',
          renderingMode: '3d',
          onAdd: function (mapInstance, gl) {
            this.camera = new THREE.Camera();
            this.scene = new THREE.Scene();
            this.map = mapInstance;

            // Lights
            const ambient = new THREE.AmbientLight(0xffffff, 0.9);
            this.scene.add(ambient);

            const sunLight = new THREE.DirectionalLight(0xfffaed, 2.0);
            sunLight.position.set(50, -100, 150);
            this.scene.add(sunLight);

            // Bangladesh Railway Theme Materials
            this.materials = {
              green: new THREE.MeshStandardMaterial({ color: 0x006A4E, roughness: 0.45, metalness: 0.2 }),
              greenDark: new THREE.MeshStandardMaterial({ color: 0x004532, roughness: 0.55 }),
              red: new THREE.MeshStandardMaterial({ color: 0xD32F2F, roughness: 0.4 }),
              cream: new THREE.MeshStandardMaterial({ color: 0xF3EFE6, roughness: 0.5 }),
              glass: new THREE.MeshStandardMaterial({ color: 0x1A2530, roughness: 0.15, metalness: 0.8 }),
              roof: new THREE.MeshStandardMaterial({ color: 0x4B5563, roughness: 0.6, metalness: 0.4 }),
              frame: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 }),
              wheel: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.8 }),
              lightGlow: new THREE.MeshStandardMaterial({
                color: 0xFFF176,
                emissive: 0xFFFF8D,
                emissiveIntensity: 2.8
              }),
              shadow: new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.38,
                depthWrite: false
              })
            };

            // Build Procedural Locomotive (Class 2900 / 3000 EMD)
            this.locoGroup = this.createLocomotive();
            this.scene.add(this.locoGroup);

            // Pool of 8 Articulated Coaches
            this.coaches = [];
            for (let i = 0; i < 8; i++) {
              const coach = this.createCoach(i % 2 === 0 ? "ac" : "shovon");
              this.coaches.push(coach);
              this.scene.add(coach);
            }

            this.renderer = new THREE.WebGLRenderer({
              canvas: mapInstance.getCanvas(),
              context: gl,
              antialias: true
            });
            this.renderer.autoClear = false;
          },

          createLocomotive: function() {
            const group = new THREE.Group();
            const M = this.materials;

            // Ground Shadow
            const shadowGeo = new THREE.PlaneGeometry(18, 4.2);
            const shadow = new THREE.Mesh(shadowGeo, M.shadow);
            shadow.position.z = 0.05;
            group.add(shadow);

            // Underframe & Bogies
            const frameGeo = new THREE.BoxGeometry(16, 2.9, 0.4);
            const frame = new THREE.Mesh(frameGeo, M.frame);
            frame.position.z = 0.9;
            group.add(frame);

            // 6-axle Wheels
            const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.18, 16);
            wheelGeo.rotateZ(Math.PI / 2);
            [-5.5, -4.2, -2.9, 2.9, 4.2, 5.5].forEach(x => {
              [-1.15, 1.15].forEach(y => {
                const wheel = new THREE.Mesh(wheelGeo, M.wheel);
                wheel.position.set(x, y, 0.5);
                group.add(wheel);
              });
            });

            // Locomotive Body (Signature Green Hood)
            const bodyGeo = new THREE.BoxGeometry(12, 2.8, 2.4);
            const body = new THREE.Mesh(bodyGeo, M.green);
            body.position.set(-1.0, 0, 2.1);
            group.add(body);

            // Driver's Cab (Elevated Front)
            const cabGeo = new THREE.BoxGeometry(3.6, 2.95, 2.6);
            const cab = new THREE.Mesh(cabGeo, M.green);
            cab.position.set(4.8, 0, 2.2);
            group.add(cab);

            // Red Speed Stripe
            const stripeGeo = new THREE.BoxGeometry(15.9, 2.92, 0.22);
            const stripe = new THREE.Mesh(stripeGeo, M.red);
            stripe.position.set(0.1, 0, 1.85);
            group.add(stripe);

            // Cream Belt
            const creamGeo = new THREE.BoxGeometry(15.92, 2.94, 0.12);
            const cream = new THREE.Mesh(creamGeo, M.cream);
            cream.position.set(0.1, 0, 2.0);
            group.add(cream);

            // Front Windshield Glass
            const windshieldGeo = new THREE.BoxGeometry(0.1, 2.4, 0.85);
            const windshield = new THREE.Mesh(windshieldGeo, M.glass);
            windshield.position.set(6.62, 0, 2.7);
            group.add(windshield);

            // High-Beam Headlights
            const headlampGeo = new THREE.SphereGeometry(0.25, 16, 16);
            const headlamp = new THREE.Mesh(headlampGeo, M.lightGlow);
            headlamp.position.set(6.65, 0, 3.1);
            group.add(headlamp);

            // Dynamic Pointlight beam ahead
            const headLight = new THREE.PointLight(0xfff7c2, 3.5, 45, 1.2);
            headLight.position.set(9.0, 0, 3.0);
            group.add(headLight);

            // Exhaust Stack on Hood
            const exhaustGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.5, 12);
            const exhaust = new THREE.Mesh(exhaustGeo, M.roof);
            exhaust.position.set(1.5, 0, 3.4);
            group.add(exhaust);

            return group;
          },

          createCoach: function(type) {
            const group = new THREE.Group();
            const M = this.materials;

            // Ground Shadow
            const shadowGeo = new THREE.PlaneGeometry(21.5, 4.0);
            const shadow = new THREE.Mesh(shadowGeo, M.shadow);
            shadow.position.z = 0.05;
            group.add(shadow);

            // Bogies and Wheels
            const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.16, 16);
            wheelGeo.rotateZ(Math.PI / 2);
            [-7.5, -5.8, 5.8, 7.5].forEach(x => {
              [-1.15, 1.15].forEach(y => {
                const wheel = new THREE.Mesh(wheelGeo, M.wheel);
                wheel.position.set(x, y, 0.46);
                group.add(wheel);
              });
            });

            // Underframe
            const frameGeo = new THREE.BoxGeometry(21.0, 2.8, 0.5);
            const frame = new THREE.Mesh(frameGeo, M.frame);
            frame.position.z = 0.85;
            group.add(frame);

            // Coach Main Body
            const bodyGeo = new THREE.BoxGeometry(20.5, 2.9, 2.6);
            const body = new THREE.Mesh(bodyGeo, type === "ac" ? M.greenDark : M.green);
            body.position.z = 2.2;
            group.add(body);

            // Red Stripe
            const redStripe = new THREE.Mesh(
              new THREE.BoxGeometry(20.54, 2.94, 0.18),
              M.red
            );
            redStripe.position.z = 1.7;
            group.add(redStripe);

            // Cream Center Band
            const creamBand = new THREE.Mesh(
              new THREE.BoxGeometry(20.56, 2.96, 1.1),
              M.cream
            );
            creamBand.position.z = 2.38;
            group.add(creamBand);

            // Tinted Passenger Windows (Row of 10 windows)
            const winGeo = new THREE.BoxGeometry(1.2, 3.02, 0.65);
            for (let w = -8.0; w <= 8.0; w += 1.8) {
              const win = new THREE.Mesh(winGeo, M.glass);
              win.position.set(w, 0, 2.45);
              group.add(win);
            }

            // Curved Roof
            const roofGeo = new THREE.CylinderGeometry(1.6, 1.6, 20.6, 24, 1, false, 0, Math.PI);
            roofGeo.rotateZ(Math.PI / 2);
            roofGeo.rotateY(Math.PI / 2);
            const roof = new THREE.Mesh(roofGeo, M.roof);
            roof.position.z = 3.35;
            group.add(roof);

            return group;
          },

          render: function(gl, matrix) {
            this.camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);

            // Update Locomotive Position in Mercator coordinates
            const locoCoord = maplibregl.MercatorCoordinate.fromLngLat(
              [currentPos.lng, currentPos.lat],
              0
            );
            const scale = locoCoord.meterInMercatorCoordinateUnits();

            if (this.locoGroup) {
              this.locoGroup.position.set(locoCoord.x, locoCoord.y, locoCoord.z);
              this.locoGroup.rotation.z = -(currentPos.bearing - 90) * (Math.PI / 180);
              this.locoGroup.scale.set(scale, scale, scale);
            }

            // Update Articulated Coaches along rail track curves
            if (currentPos.coaches && currentPos.coaches.length > 0) {
              this.coaches.forEach((coachMesh, idx) => {
                const pose = currentPos.coaches[idx];
                if (pose) {
                  coachMesh.visible = true;
                  const cCoord = maplibregl.MercatorCoordinate.fromLngLat([pose.lng, pose.lat], 0);
                  coachMesh.position.set(cCoord.x, cCoord.y, cCoord.z);
                  coachMesh.rotation.z = -(pose.bearing - 90) * (Math.PI / 180);
                  coachMesh.scale.set(scale, scale, scale);
                } else {
                  coachMesh.visible = false;
                }
              });
            }

            this.renderer.resetState();
            this.renderer.render(this.scene, this.camera);
            this.map.triggerRepaint();
          }
        };

        // =====================================================================
        // Map Load & Layers Construction
        // =====================================================================
        map.on('load', () => {
          // 1. Add Railway Track Line Source
          map.addSource('rail-track', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: currentRoute
              }
            }
          });

          // 2. High-contrast railway bed
          map.addLayer({
            id: 'rail-bed',
            type: 'line',
            source: 'rail-track',
            paint: {
              'line-color': '#111827',
              'line-width': 9,
              'line-opacity': 0.85
            }
          });

          // 3. Bangladesh Railway signature emerald track
          map.addLayer({
            id: 'rail-track-main',
            type: 'line',
            source: 'rail-track',
            paint: {
              'line-color': '#006A4E',
              'line-width': 6
            }
          });

          // 4. Railway Sleepers / Cross-ties dashed pattern
          map.addLayer({
            id: 'rail-ties',
            type: 'line',
            source: 'rail-track',
            paint: {
              'line-color': '#FFFFFF',
              'line-width': 3.5,
              'line-dasharray': [0.4, 1.4]
            }
          });

          // 5. Add 3D Procedural Train Layer
          map.addLayer(custom3DLayer);

          // 6. Add Station Markers
          renderStationMarkers(currentStops);

          // Notify React Native that Map is ready
          window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'MAP_READY' }));
        });

        // Function to render HTML Station Markers
        let activeMarkers = [];
        function renderStationMarkers(stops) {
          activeMarkers.forEach(m => m.remove());
          activeMarkers = [];

          stops.forEach(stop => {
            const el = document.createElement('div');
            el.className = 'station-marker';
            el.innerHTML = '<span class="station-dot"></span><span>' + (stop.nameBn || stop.name) + '</span>';

            const marker = new maplibregl.Marker({ element: el })
              .setLngLat([stop.lng, stop.lat])
              .addTo(map);

            activeMarkers.push(marker);
          });
        }

        // =====================================================================
        // Inbound React Native Event Handlers
        // =====================================================================
        window.addEventListener('message', (event) => {
          try {
            const msg = JSON.parse(event.data);
            
            if (msg.type === 'UPDATE_POSITION') {
              const { lat, lng, bearing, speed, coaches } = msg.data;
              currentPos.lat = lat;
              currentPos.lng = lng;
              currentPos.bearing = bearing;
              currentPos.speed = speed;
              currentPos.coaches = coaches;

              // Camera Chase Motion
              if (!isUserInteracting) {
                map.easeTo({
                  center: [lng, lat],
                  pitch: is3D ? 64 : 0,
                  bearing: is3D ? bearing : 0,
                  duration: 800,
                  easing: (t) => t
                });
              }
            }
            else if (msg.type === 'SET_CAMERA_MODE') {
              is3D = msg.mode === '3D';
              isUserInteracting = false;
              map.easeTo({
                center: [currentPos.lng, currentPos.lat],
                pitch: is3D ? 64 : 0,
                bearing: is3D ? currentPos.bearing : 0,
                zoom: is3D ? 16.8 : 14.5,
                duration: 900
              });
            }
            else if (msg.type === 'RECENTER_CAMERA') {
              isUserInteracting = false;
              map.easeTo({
                center: [currentPos.lng, currentPos.lat],
                pitch: is3D ? 64 : 0,
                bearing: is3D ? currentPos.bearing : 0,
                zoom: is3D ? 16.8 : 14.5,
                duration: 800
              });
            }
            else if (msg.type === 'PLAY_HORN') {
              playLocomotiveHorn();
            }
            else if (msg.type === 'TOGGLE_LAYER') {
              isSatellite = !isSatellite;
              const source = isSatellite ? 'satellite' : 'osm';
              if (map.getLayer('base-tiles')) {
                map.removeLayer('base-tiles');
              }
              map.addLayer({
                id: 'base-tiles',
                type: 'raster',
                source: source
              }, 'rail-bed');
            }
            else if (msg.type === 'SET_ROUTE') {
              currentRoute = msg.route;
              currentStops = msg.stops;
              if (map.getSource('rail-track')) {
                map.getSource('rail-track').setData({
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: currentRoute
                  }
                });
              }
              renderStationMarkers(currentStops);
            }
          } catch(e) {
            console.error("Message processing error", e);
          }
        });
      </script>
    </body>
    </html>
    `;

    return (
      <View style={[styles.container, style]}>
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          style={styles.webview}
          scrollEnabled={false}
          bounces={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={["*"]}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === "MAP_READY") {
                setIsMapLoaded(true);
              }
            } catch (err) {}
          }}
        />

        {!isMapLoaded && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color="#006A4E" />
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B131E",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0B131E",
    justifyContent: "center",
    alignItems: "center",
  },
});
