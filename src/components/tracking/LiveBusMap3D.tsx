/**
 * LiveBusMap3D.tsx
 *
 * Ultra-high-performance 3D WebGL Bus Tracking Engine for Shopno Jatra.
 * Renders procedural Scania / Volvo multi-axle luxury coach on 4-lane national
 * highways, dual projector LED headlights, highway air horn synthesizer, and
 * a 64° cinematic highway chase camera.
 */

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { BusProfile, LiveBusPosition } from "../../services/busTrackingService";

export interface LiveBusMap3DProps {
  busProfile: BusProfile;
  livePosition: LiveBusPosition;
  is3DMode: boolean;
  onCameraChange?: (mode: "2D" | "3D") => void;
  style?: any;
}

export interface LiveBusMap3DRef {
  triggerBusAirHorn: () => void;
  triggerAirBrake: () => void;
  recenterCamera: () => void;
  toggleSatellite: () => void;
}

export const LiveBusMap3D = forwardRef<LiveBusMap3DRef, LiveBusMap3DProps>(
  ({ busProfile, livePosition, is3DMode, style }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const [isMapLoaded, setIsMapLoaded] = useState(false);

    useImperativeHandle(ref, () => ({
      triggerBusAirHorn: () => {
        webViewRef.current?.postMessage(JSON.stringify({ type: "PLAY_AIR_HORN" }));
      },
      triggerAirBrake: () => {
        webViewRef.current?.postMessage(JSON.stringify({ type: "PLAY_AIR_BRAKE" }));
      },
      recenterCamera: () => {
        webViewRef.current?.postMessage(JSON.stringify({ type: "RECENTER_CAMERA" }));
      },
      toggleSatellite: () => {
        webViewRef.current?.postMessage(JSON.stringify({ type: "TOGGLE_LAYER" }));
      },
    }));

    useEffect(() => {
      if (isMapLoaded && webViewRef.current && livePosition) {
        const payload = JSON.stringify({
          type: "UPDATE_POSITION",
          data: {
            lat: livePosition.latitude,
            lng: livePosition.longitude,
            bearing: livePosition.bearing,
            speed: livePosition.speedKmh,
          },
        });
        webViewRef.current.postMessage(payload);
      }
    }, [livePosition, isMapLoaded]);

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

    useEffect(() => {
      if (isMapLoaded && webViewRef.current && busProfile) {
        webViewRef.current.postMessage(
          JSON.stringify({
            type: "SET_ROUTE",
            route: busProfile.highwayGeometry,
            stops: busProfile.stops,
          })
        );
      }
    }, [busProfile, isMapLoaded]);

    const initialRoute = JSON.stringify(busProfile.highwayGeometry);
    const initialStops = JSON.stringify(busProfile.stops);
    const startCoord = busProfile.highwayGeometry[0] || [90.4265, 23.7185];

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
        
        .highway-marker {
          background: rgba(15, 23, 42, 0.92);
          border: 1.5px solid #F59E0B;
          border-radius: 8px;
          padding: 4px 8px;
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
          pointer-events: none;
        }
        .highway-marker.rest {
          border-color: #10B981;
        }
        .marker-icon {
          font-size: 13px;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>

      <script>
        let is3D = ${is3DMode ? "true" : "false"};
        let currentPos = { lat: ${startCoord[1]}, lng: ${startCoord[0]}, bearing: 0, speed: 84 };
        let currentRoute = ${initialRoute};
        let currentStops = ${initialStops};
        let isSatellite = true;
        let isUserInteracting = false;
        let customBusLayer = null;

        // =====================================================================
        // Procedural Audio: Musical Highway Air Horn & Air-Brake Exhaust
        // =====================================================================
        let audioCtx = null;
        function getAudioContext() {
          if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          }
          if (audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
          return audioCtx;
        }

        function playBusAirHorn() {
          try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            
            // Bangladeshi Highway Musical Multi-Tone Air Horn (F4, A4, C5 harmonic chime)
            const chords = [
              { f: 349.23, t: 0.0, d: 0.25 },
              { f: 440.00, t: 0.1, d: 0.35 },
              { f: 523.25, t: 0.22, d: 0.55 },
              { f: 440.00, t: 0.45, d: 0.40 },
              { f: 523.25, t: 0.65, d: 0.70 }
            ];

            chords.forEach(c => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();

              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(c.f, now + c.t);

              gain.gain.setValueAtTime(0.001, now + c.t);
              gain.gain.exponentialRampToValueAtTime(0.18, now + c.t + 0.04);
              gain.gain.exponentialRampToValueAtTime(0.0001, now + c.t + c.d);

              osc.connect(gain);
              gain.connect(ctx.destination);

              osc.start(now + c.t);
              osc.stop(now + c.t + c.d + 0.05);
            });
          } catch(e) {}
        }

        function playAirBrake() {
          try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // White noise burst for hydraulic air-brake exhaust ("Pshhh!")
            const bufferSize = ctx.sampleRate * 0.4;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
              data[i] = Math.random() * 2 - 1;
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1400, now);
            filter.Q.setValueAtTime(1.5, now);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.exponentialRampToValueAtTime(0.22, now + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noise.start(now);
            noise.stop(now + 0.4);
          } catch(e) {}
        }

        // =====================================================================
        // MapLibre Map Setup
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
          zoom: 16.6,
          pitch: is3D ? 64 : 0,
          bearing: 0,
          antialias: true
        });

        map.on('dragstart', () => { isUserInteracting = true; });
        map.on('rotatestart', () => { isUserInteracting = true; });

        // =====================================================================
        // Procedural 3D Scania Luxury Multi-Axle Bus Model (Three.js)
        // =====================================================================
        customBusLayer = {
          id: 'bd-bus-3d-model',
          type: 'custom',
          renderingMode: '3d',
          onAdd: function (mapInstance, gl) {
            this.camera = new THREE.Camera();
            this.scene = new THREE.Scene();
            this.map = mapInstance;

            // Natural Daylight Lighting
            const ambient = new THREE.AmbientLight(0xffffff, 0.95);
            this.scene.add(ambient);

            const sunLight = new THREE.DirectionalLight(0xfff6e5, 2.2);
            sunLight.position.set(40, -80, 120);
            this.scene.add(sunLight);

            // High-detail Bus Materials
            this.materials = {
              greenBody: new THREE.MeshStandardMaterial({ color: 0x006A4E, roughness: 0.35, metalness: 0.3 }),
              goldStripe: new THREE.MeshStandardMaterial({ color: 0xF59E0B, roughness: 0.3, metalness: 0.5 }),
              silverRoof: new THREE.MeshStandardMaterial({ color: 0xE2E8F0, roughness: 0.5, metalness: 0.4 }),
              chassis: new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.8 }),
              wheelTire: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.8 }),
              chromeHub: new THREE.MeshStandardMaterial({ color: 0xE5E7EB, roughness: 0.1, metalness: 0.95 }),
              glass: new THREE.MeshStandardMaterial({ color: 0x0F172A, roughness: 0.1, metalness: 0.85 }),
              ledHeadlight: new THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
                emissive: 0xFFFFFF,
                emissiveIntensity: 3.0
              }),
              rearTailLight: new THREE.MeshStandardMaterial({
                color: 0xEF4444,
                emissive: 0xDC2626,
                emissiveIntensity: 2.5
              }),
              shadow: new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.42,
                depthWrite: false
              })
            };

            this.busMeshGroup = this.createLuxuryBus();
            this.scene.add(this.busMeshGroup);

            this.renderer = new THREE.WebGLRenderer({
              canvas: mapInstance.getCanvas(),
              context: gl,
              antialias: true
            });
            this.renderer.autoClear = false;
          },

          createLuxuryBus: function() {
            const group = new THREE.Group();
            const M = this.materials;

            // 1. Ground Shadow Plane
            const shadowGeo = new THREE.PlaneGeometry(15.5, 4.2);
            const shadow = new THREE.Mesh(shadowGeo, M.shadow);
            shadow.position.z = 0.04;
            group.add(shadow);

            // 2. Chassis Underframe
            const frameGeo = new THREE.BoxGeometry(14.2, 2.55, 0.45);
            const frame = new THREE.Mesh(frameGeo, M.chassis);
            frame.position.z = 0.85;
            group.add(frame);

            // 3. Multi-Axle Wheels (1 Front Steering Axle + 2 Dual Rear Axles = 8 wheels)
            const wheelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.22, 18);
            wheelGeo.rotateZ(Math.PI / 2);

            const axlePositions = [-4.8, 3.8, 5.1]; // Front, Rear Drive, Rear Tag
            axlePositions.forEach(x => {
              [-1.25, 1.25].forEach(y => {
                const wheel = new THREE.Mesh(wheelGeo, M.wheelTire);
                wheel.position.set(x, y, 0.52);

                // Chrome Rim Hubcap
                const hubGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.23, 12);
                hubGeo.rotateZ(Math.PI / 2);
                const hub = new THREE.Mesh(hubGeo, M.chromeHub);
                hub.position.set(x, y, 0.52);
                group.add(wheel);
                group.add(hub);
              });
            });

            // 4. Main Aerodynamic Bus Coach Body
            const bodyGeo = new THREE.BoxGeometry(14.0, 2.55, 3.1);
            const body = new THREE.Mesh(bodyGeo, M.greenBody);
            body.position.set(0, 0, 2.2);
            group.add(body);

            // 5. Luxury Gold Speed Stripe
            const stripeGeo = new THREE.BoxGeometry(14.04, 2.57, 0.25);
            const stripe = new THREE.Mesh(stripeGeo, M.goldStripe);
            stripe.position.set(0, 0, 1.85);
            group.add(stripe);

            // 6. Aerodynamic Curved Front Windshield (Double Deck Glass)
            const windshieldGeo = new THREE.BoxGeometry(0.15, 2.4, 2.1);
            const windshield = new THREE.Mesh(windshieldGeo, M.glass);
            windshield.position.set(7.02, 0, 2.45);
            group.add(windshield);

            // 7. Panoramic Tinted Passenger Windows
            const winGeo = new THREE.BoxGeometry(1.4, 2.62, 0.95);
            for (let w = -5.5; w <= 5.5; w += 1.8) {
              const win = new THREE.Mesh(winGeo, M.glass);
              win.position.set(w, 0, 2.65);
              group.add(win);
            }

            // 8. Streamlined Rooftop A/C Unit
            const acGeo = new THREE.BoxGeometry(3.8, 1.8, 0.35);
            const ac = new THREE.Mesh(acGeo, M.silverRoof);
            ac.position.set(0, 0, 3.85);
            group.add(ac);

            // 9. Dual LED Projector Headlights
            const headlampGeo = new THREE.BoxGeometry(0.12, 0.35, 0.25);
            [-0.85, 0.85].forEach(y => {
              const headlamp = new THREE.Mesh(headlampGeo, M.ledHeadlight);
              headlamp.position.set(7.04, y, 1.4);
              group.add(headlamp);
            });

            // 10. Dynamic Forward High-Beam Light Cone
            const headLight = new THREE.PointLight(0xfffbe6, 3.2, 50, 1.2);
            headLight.position.set(9.5, 0, 2.2);
            group.add(headLight);

            // 11. Red Rear Taillights
            const tailGeo = new THREE.BoxGeometry(0.1, 0.3, 0.45);
            [-0.95, 0.95].forEach(y => {
              const tail = new THREE.Mesh(tailGeo, M.rearTailLight);
              tail.position.set(-7.02, y, 1.6);
              group.add(tail);
            });

            return group;
          },

          render: function(gl, matrix) {
            this.camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);

            const coord = maplibregl.MercatorCoordinate.fromLngLat(
              [currentPos.lng, currentPos.lat],
              0
            );
            const scale = coord.meterInMercatorCoordinateUnits();

            if (this.busMeshGroup) {
              this.busMeshGroup.position.set(coord.x, coord.y, coord.z);
              this.busMeshGroup.rotation.z = -(currentPos.bearing - 90) * (Math.PI / 180);
              this.busMeshGroup.scale.set(scale, scale, scale);
            }

            this.renderer.resetState();
            this.renderer.render(this.scene, this.camera);
            this.map.triggerRepaint();
          }
        };

        // =====================================================================
        // Map Load & Highway Road Layers
        // =====================================================================
        map.on('load', () => {
          map.addSource('highway-route', {
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

          // 1. Asphalt Road Base (4-Lane National Highway)
          map.addLayer({
            id: 'road-asphalt-base',
            type: 'line',
            source: 'highway-route',
            paint: {
              'line-color': '#0F172A',
              'line-width': 12,
              'line-opacity': 0.9
            }
          });

          // 2. Inner Paved Highway (Emerald / Dark Asphalt)
          map.addLayer({
            id: 'road-pavement',
            type: 'line',
            source: 'highway-route',
            paint: {
              'line-color': '#1E293B',
              'line-width': 9
            }
          });

          // 3. Central Dividing Yellow Line (Highway Marking)
          map.addLayer({
            id: 'road-dividing-line',
            type: 'line',
            source: 'highway-route',
            paint: {
              'line-color': '#F59E0B',
              'line-width': 3,
              'line-dasharray': [1, 2]
            }
          });

          // 4. White Shoulder Lines
          map.addLayer({
            id: 'road-shoulder-lines',
            type: 'line',
            source: 'highway-route',
            paint: {
              'line-color': '#FFFFFF',
              'line-width': 1.5,
              'line-opacity': 0.8
            }
          });

          // 5. Add 3D Procedural Bus Layer
          map.addLayer(customBusLayer);

          // 6. Render Highway Stop Markers
          renderHighwayMarkers(currentStops);

          window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'MAP_READY' }));
        });

        let activeHighwayMarkers = [];
        function renderHighwayMarkers(stops) {
          activeHighwayMarkers.forEach(m => m.remove());
          activeHighwayMarkers = [];

          stops.forEach(stop => {
            const el = document.createElement('div');
            const isRest = stop.type === 'rest_stop';
            el.className = 'highway-marker' + (isRest ? ' rest' : '');
            
            const icon = isRest ? '🍽️' : stop.type === 'toll_plaza' ? '🛂' : '📍';
            el.innerHTML = '<span class="marker-icon">' + icon + '</span><span>' + (stop.nameBn || stop.name) + '</span>';

            const marker = new maplibregl.Marker({ element: el })
              .setLngLat([stop.lng, stop.lat])
              .addTo(map);

            activeHighwayMarkers.push(marker);
          });
        }

        // =====================================================================
        // Event Listeners from React Native
        // =====================================================================
        window.addEventListener('message', (event) => {
          try {
            const msg = JSON.parse(event.data);

            if (msg.type === 'UPDATE_POSITION') {
              const { lat, lng, bearing, speed } = msg.data;
              currentPos.lat = lat;
              currentPos.lng = lng;
              currentPos.bearing = bearing;
              currentPos.speed = speed;

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
                zoom: is3D ? 16.6 : 14.5,
                duration: 900
              });
            }
            else if (msg.type === 'RECENTER_CAMERA') {
              isUserInteracting = false;
              map.easeTo({
                center: [currentPos.lng, currentPos.lat],
                pitch: is3D ? 64 : 0,
                bearing: is3D ? currentPos.bearing : 0,
                zoom: is3D ? 16.6 : 14.5,
                duration: 800
              });
            }
            else if (msg.type === 'PLAY_AIR_HORN') {
              playBusAirHorn();
            }
            else if (msg.type === 'PLAY_AIR_BRAKE') {
              playAirBrake();
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
              }, 'road-asphalt-base');
            }
            else if (msg.type === 'SET_ROUTE') {
              currentRoute = msg.route;
              currentStops = msg.stops;
              if (map.getSource('highway-route')) {
                map.getSource('highway-route').setData({
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: currentRoute
                  }
                });
              }
              renderHighwayMarkers(currentStops);
            }
          } catch(e) {}
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
            <ActivityIndicator size="large" color="#F59E0B" />
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
