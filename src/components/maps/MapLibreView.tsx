import React, {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { logger } from "../../utils/logger";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system";
import { useTheme } from "../../context/ThemeContext";

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export interface MapRegion extends MapCoordinate {
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapMarker {
  id: string;
  coordinate: MapCoordinate;
  title?: string;
  description?: string;
  color?: string;
}

export interface MapPolyline {
  id: string;
  coordinates: MapCoordinate[];
  strokeColor?: string;
  strokeWidth?: number;
}

export interface MapLibreViewProps {
  region?: MapRegion;
  markers?: MapMarker[];
  polylines?: MapPolyline[];
  onRegionChange?: (region: MapRegion) => void;
  onMarkerPress?: (markerId: string) => void;
  showUserLocation?: boolean;
  followUserLocation?: boolean;
  mapType?: "standard" | "satellite" | "terrain";
  style?: any;
  offlineEnabled?: boolean;
  offlineTileSource?: string;
}

export interface MapLibreViewRef {
  animateToRegion: (region: MapRegion, duration?: number) => void;
  animateToCoordinate: (coordinate: MapCoordinate, duration?: number) => void;
  fitToCoordinates: (coordinates: MapCoordinate[], animated?: boolean) => void;
  addMarker: (marker: MapMarker) => void;
  removeMarker: (markerId: string) => void;
  addPolyline: (polyline: MapPolyline) => void;
  removePolyline: (polylineId: string) => void;
}

const MapLibreView = forwardRef<MapLibreViewRef, MapLibreViewProps>(
  (
    {
      region,
      markers = [],
      polylines = [],
      onRegionChange,
      onMarkerPress,
      showUserLocation = false,
      followUserLocation = false,
      mapType = "standard",
      style,
      offlineEnabled = true,
      offlineTileSource,
    },
    ref
  ) => {
    const webViewRef = useRef<WebView>(null);
    const { colors, isDark } = useTheme();
    const [mapHtml, setMapHtml] = useState<string>("");
    const [isMapReady, setIsMapReady] = useState(false);

    useImperativeHandle(ref, () => ({
      animateToRegion: (region: MapRegion, duration = 1000) => {
        if (isMapReady) {
          webViewRef.current?.postMessage(
            JSON.stringify({
              type: "animateToRegion",
              data: { region, duration },
            })
          );
        }
      },
      animateToCoordinate: (coordinate: MapCoordinate, duration = 1000) => {
        if (isMapReady) {
          webViewRef.current?.postMessage(
            JSON.stringify({
              type: "animateToCoordinate",
              data: { coordinate, duration },
            })
          );
        }
      },
      fitToCoordinates: (coordinates: MapCoordinate[], animated = true) => {
        if (isMapReady) {
          webViewRef.current?.postMessage(
            JSON.stringify({
              type: "fitToCoordinates",
              data: { coordinates, animated },
            })
          );
        }
      },
      addMarker: (marker: MapMarker) => {
        if (isMapReady) {
          webViewRef.current?.postMessage(
            JSON.stringify({
              type: "addMarker",
              data: { marker },
            })
          );
        }
      },
      removeMarker: (markerId: string) => {
        if (isMapReady) {
          webViewRef.current?.postMessage(
            JSON.stringify({
              type: "removeMarker",
              data: { markerId },
            })
          );
        }
      },
      addPolyline: (polyline: MapPolyline) => {
        if (isMapReady) {
          webViewRef.current?.postMessage(
            JSON.stringify({
              type: "addPolyline",
              data: { polyline },
            })
          );
        }
      },
      removePolyline: (polylineId: string) => {
        if (isMapReady) {
          webViewRef.current?.postMessage(
            JSON.stringify({
              type: "removePolyline",
              data: { polylineId },
            })
          );
        }
      },
    }));

    useEffect(() => {
      generateMapHtml();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDark, mapType, offlineEnabled, offlineTileSource]);

    useEffect(() => {
      if (isMapReady && region) {
        webViewRef.current?.postMessage(
          JSON.stringify({
            type: "updateRegion",
            data: { region },
          })
        );
      }
    }, [region, isMapReady]);

    useEffect(() => {
      if (isMapReady) {
        webViewRef.current?.postMessage(
          JSON.stringify({
            type: "updateMarkers",
            data: { markers },
          })
        );
      }
    }, [markers, isMapReady]);

    useEffect(() => {
      if (isMapReady) {
        webViewRef.current?.postMessage(
          JSON.stringify({
            type: "updatePolylines",
            data: { polylines },
          })
        );
      }
    }, [polylines, isMapReady]);

    const generateMapHtml = () => {
      const mapStyleUrl = getMapStyleUrl();

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script src="https://unpkg.com/maplibre-gl@4.0.0/dist/maplibre-gl.js"></script>
          <link href="https://unpkg.com/maplibre-gl@4.0.0/dist/maplibre-gl.css" rel="stylesheet" />
          <style>
            body { margin: 0; padding: 0; }
            #map { position: absolute; top: 0; bottom: 0; width: 100%; }
            .maplibregl-popup-content {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .marker-custom {
              display: block;
              border: none;
              border-radius: 50%;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            let map;
            let markers = {};
            let polylines = {};
            let userLocationMarker = null;
            
            // Initialize map
            function initMap() {
              map = new maplibregl.Map({
                container: 'map',
                style: '${mapStyleUrl}',
                center: [${region?.longitude || 10.0}, ${region?.latitude || 60.0}],
                zoom: ${region ? Math.max(0, 15 - Math.log2(Math.max(region.latitudeDelta, region.longitudeDelta) * 100)) : 10},
                antialias: true,
                maxPitch: 60,
                maxZoom: 18,
                minZoom: 1
              });

              // Store event handlers for cleanup
              const mapLoadHandler = function() {
                logger.debug('Map loaded');
                window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'mapReady' }));
                
                // Add user location if enabled
                if (${showUserLocation}) {
                  addUserLocationControl();
                }
                
                // Add navigation controls
                map.addControl(new maplibregl.NavigationControl(), 'top-right');
                
                // Add scale control
                map.addControl(new maplibregl.ScaleControl(), 'bottom-left');
              };
              
              const mapMoveEndHandler = function() {
                const center = map.getCenter();
                const bounds = map.getBounds();
                const latitudeDelta = bounds.getNorth() - bounds.getSouth();
                const longitudeDelta = bounds.getEast() - bounds.getWest();
                
                window.ReactNativeWebView?.postMessage(JSON.stringify({
                  type: 'regionChanged',
                  data: {
                    latitude: center.lat,
                    longitude: center.lng,
                    latitudeDelta: latitudeDelta,
                    longitudeDelta: longitudeDelta
                  }
                }));
              };
              
              map.on('load', mapLoadHandler);
              map.on('moveend', mapMoveEndHandler);
              
              // Store handlers for cleanup
              map._loadHandler = mapLoadHandler;
              map._moveEndHandler = mapMoveEndHandler;
            }

            function addUserLocationControl() {
              if (navigator.geolocation) {
                map.addControl(
                  new maplibregl.GeolocateControl({
                    positionOptions: {
                      enableHighAccuracy: true
                    },
                    trackUserLocation: ${followUserLocation},
                    showUserHeading: true
                  }),
                  'top-right'
                );
              }
            }

            function updateRegion(region) {
              if (map && region) {
                map.flyTo({
                  center: [region.longitude, region.latitude],
                  zoom: Math.max(0, 15 - Math.log2(Math.max(region.latitudeDelta, region.longitudeDelta) * 100))
                });
              }
            }

            function animateToRegion(region, duration) {
              if (map && region) {
                map.flyTo({
                  center: [region.longitude, region.latitude],
                  zoom: Math.max(0, 15 - Math.log2(Math.max(region.latitudeDelta, region.longitudeDelta) * 100)),
                  duration: duration
                });
              }
            }

            function animateToCoordinate(coordinate, duration) {
              if (map && coordinate) {
                map.flyTo({
                  center: [coordinate.longitude, coordinate.latitude],
                  duration: duration
                });
              }
            }

            function fitToCoordinates(coordinates, animated) {
              if (map && coordinates.length > 0) {
                const bounds = new maplibregl.LngLatBounds();
                coordinates.forEach(coord => {
                  bounds.extend([coord.longitude, coord.latitude]);
                });
                
                map.fitBounds(bounds, {
                  padding: 50,
                  duration: animated ? 1000 : 0
                });
              }
            }

            function updateMarkers(newMarkers) {
              // Remove existing markers
              Object.values(markers).forEach(marker => marker.remove());
              markers = {};
              
              // Add new markers
              newMarkers.forEach(markerData => {
                addMarker(markerData);
              });
            }

            function addMarker(markerData) {
              const el = document.createElement('div');
              el.className = 'marker-custom';
              el.style.backgroundColor = markerData.color || '${colors.primary}';
              el.style.width = '20px';
              el.style.height = '20px';
              el.style.borderRadius = '50%';
              el.style.border = '2px solid white';
              el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

              const marker = new maplibregl.Marker(el)
                .setLngLat([markerData.coordinate.longitude, markerData.coordinate.latitude]);

              if (markerData.title || markerData.description) {
                const popup = new maplibregl.Popup({ offset: 25 })
                  .setHTML('<h3>' + (markerData.title || '') + '</h3><p>' + (markerData.description || '') + '</p>');
                marker.setPopup(popup);
              }

              const markerClickHandler = () => {
                window.ReactNativeWebView?.postMessage(JSON.stringify({
                  type: 'markerPress',
                  data: { markerId: markerData.id }
                }));
              };
              
              marker.getElement().addEventListener('click', markerClickHandler);
              
              // Store reference to cleanup later
              marker._clickHandler = markerClickHandler;

              marker.addTo(map);
              markers[markerData.id] = marker;
            }

            function removeMarker(markerId) {
              if (markers[markerId]) {
                const marker = markers[markerId];
                
                // Clean up event listeners
                if (marker._clickHandler) {
                  marker.getElement().removeEventListener('click', marker._clickHandler);
                  delete marker._clickHandler;
                }
                
                marker.remove();
                delete markers[markerId];
              }
            }

            function updatePolylines(newPolylines) {
              // Remove existing polylines
              Object.keys(polylines).forEach(id => {
                removePolyline(id);
              });
              
              // Add new polylines
              newPolylines.forEach(polylineData => {
                addPolyline(polylineData);
              });
            }

            function addPolyline(polylineData) {
              const coordinates = polylineData.coordinates.map(coord => [coord.longitude, coord.latitude]);
              
              const sourceId = 'polyline-' + polylineData.id;
              const layerId = 'polyline-layer-' + polylineData.id;

              map.addSource(sourceId, {
                'type': 'geojson',
                'data': {
                  'type': 'Feature',
                  'properties': {},
                  'geometry': {
                    'type': 'LineString',
                    'coordinates': coordinates
                  }
                }
              });

              map.addLayer({
                'id': layerId,
                'type': 'line',
                'source': sourceId,
                'layout': {
                  'line-join': 'round',
                  'line-cap': 'round'
                },
                'paint': {
                  'line-color': polylineData.strokeColor || '${colors.primary}',
                  'line-width': polylineData.strokeWidth || 3
                }
              });

              polylines[polylineData.id] = { sourceId, layerId };
            }

            function removePolyline(polylineId) {
              const polyline = polylines[polylineId];
              if (polyline) {
                if (map.getLayer(polyline.layerId)) {
                  map.removeLayer(polyline.layerId);
                }
                if (map.getSource(polyline.sourceId)) {
                  map.removeSource(polyline.sourceId);
                }
                delete polylines[polylineId];
              }
            }

            // Store message handler for cleanup
            let messageHandler = function(event) {
              const message = JSON.parse(event.data);
              
              switch (message.type) {
                case 'updateRegion':
                  updateRegion(message.data.region);
                  break;
                case 'animateToRegion':
                  animateToRegion(message.data.region, message.data.duration);
                  break;
                case 'animateToCoordinate':
                  animateToCoordinate(message.data.coordinate, message.data.duration);
                  break;
                case 'fitToCoordinates':
                  fitToCoordinates(message.data.coordinates, message.data.animated);
                  break;
                case 'updateMarkers':
                  updateMarkers(message.data.markers);
                  break;
                case 'addMarker':
                  addMarker(message.data.marker);
                  break;
                case 'removeMarker':
                  removeMarker(message.data.markerId);
                  break;
                case 'updatePolylines':
                  updatePolylines(message.data.polylines);
                  break;
                case 'addPolyline':
                  addPolyline(message.data.polyline);
                  break;
                case 'removePolyline':
                  removePolyline(message.data.polylineId);
                  break;
              }
            };
            
            // Handle messages from React Native
            window.addEventListener('message', messageHandler);
            
            // Cleanup function for when page unloads
            window.addEventListener('beforeunload', function() {
              window.removeEventListener('message', messageHandler);
              
              if (map) {
                // Clean up map event listeners
                if (map._loadHandler) {
                  map.off('load', map._loadHandler);
                }
                if (map._moveEndHandler) {
                  map.off('moveend', map._moveEndHandler);
                }
                
                // Clean up all markers
                Object.keys(markers).forEach(markerId => {
                  removeMarker(markerId);
                });
                
                // Remove map instance
                map.remove();
              }
            });

            // Initialize map when page loads
            initMap();
          </script>
        </body>
        </html>
      `;

      setMapHtml(html);
    };

    const getMapStyleUrl = (): string => {
      if (offlineTileSource) {
        return offlineTileSource;
      }

      // Use different styles based on mapType and theme
      switch (mapType) {
        case "satellite":
          return "https://api.maptiler.com/maps/satellite/style.json?key=demo";
        case "terrain":
          return isDark
            ? "https://api.maptiler.com/maps/outdoor-dark/style.json?key=demo"
            : "https://api.maptiler.com/maps/outdoor/style.json?key=demo";
        default: // 'standard'
          return isDark
            ? "https://api.maptiler.com/maps/streets-dark/style.json?key=demo"
            : "https://api.maptiler.com/maps/streets/style.json?key=demo";
      }
    };

    const handleMessage = (event: any) => {
      try {
        const message = JSON.parse(event.nativeEvent.data);

        switch (message.type) {
          case "mapReady":
            setIsMapReady(true);
            break;
          case "regionChanged":
            onRegionChange?.(message.data);
            break;
          case "markerPress":
            onMarkerPress?.(message.data.markerId);
            break;
        }
      } catch (error) {
        logger.warn("Error handling WebView message:", error);
      }
    };

    if (!mapHtml) {
      return (
        <View
          style={[styles.container, { backgroundColor: colors.surface }, style]}
        />
      );
    }

    return (
      <View style={[styles.container, style]}>
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={styles.webview}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowsBackForwardNavigationGestures={false}
          bounces={false}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            logger.warn("WebView error: ", nativeEvent);
          }}
          renderLoading={() => (
            <View
              style={[
                styles.loadingContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              {/* Loading indicator could go here */}
            </View>
          )}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
});

MapLibreView.displayName = "MapLibreView";

export default MapLibreView;
