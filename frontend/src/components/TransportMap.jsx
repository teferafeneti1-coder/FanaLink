import { useState, useEffect, useRef } from 'react';

// ✅ CRA ENV
const API = process.env.REACT_APP_API_URL;

export default function TransportMap({ referralId }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayerRef = useRef(null);
  const ambulanceMarkerRef = useRef(null);

  const [roadPoints, setRoadPoints] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Step 1: Load route from OSRM ─────────────────────────
  useEffect(() => {
    if (!referralId) return;

    const loadRoute = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API}/api/transport/${referralId}`);
        const data = await res.json();

        const originLat = data?.originCoords?.lat || 9.2195;
        const originLng = data?.originCoords?.lng || 42.3314;

        // Save current ambulance location
        if (data?.currentLocation?.lat) {
          setCurrentLocation(data.currentLocation);
        } else {
          setCurrentLocation({ lat: originLat, lng: originLng });
        }

        const hospitalLat = 9.3139;
        const hospitalLng = 42.1192;

        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${originLng},${originLat};${hospitalLng},${hospitalLat}` +
          `?overview=full&geometries=geojson`;

        const resRoute = await fetch(url);
        const routeData = await resRoute.json();

        const coords = routeData?.routes?.[0]?.geometry?.coordinates || [];
        const points = coords.map(([lng, lat]) => ({ lat, lng }));
        setRoadPoints(points);
      } catch (err) {
        console.error('Route error:', err);
        setError('Failed to load route');
      } finally {
        setLoading(false);
      }
    };

    loadRoute();

    // Poll for live ambulance location every 5 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/transport/${referralId}`);
        const data = await res.json();
        if (data?.currentLocation?.lat) {
          setCurrentLocation({ ...data.currentLocation });
        }
      } catch (e) {
        // silent
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [referralId]);

  // ── Step 2: Initialize Leaflet map once route is loaded ───
  useEffect(() => {
    if (loading || roadPoints.length === 0 || !mapContainerRef.current) return;

    const L = window.L;
    if (!L) {
      setError('Leaflet not loaded. Check index.html.');
      return;
    }

    // Destroy old map instance if exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Create map centered on midpoint of route
    const mid = roadPoints[Math.floor(roadPoints.length / 2)];
    const map = L.map(mapContainerRef.current).setView([mid.lat, mid.lng], 10);
    mapInstanceRef.current = map;

    // OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Draw route polyline
    const latLngs = roadPoints.map((p) => [p.lat, p.lng]);
    routeLayerRef.current = L.polyline(latLngs, {
      color: '#007bff',
      weight: 4,
      opacity: 0.8,
    }).addTo(map);

    map.fitBounds(routeLayerRef.current.getBounds(), { padding: [30, 30] });

    // Origin marker (green)
    const origin = roadPoints[0];
    L.marker([origin.lat, origin.lng], {
      icon: L.divIcon({
        className: '',
        html: '<div style="background:#28a745;color:white;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:bold;white-space:nowrap;">🏥 Origin</div>',
        iconAnchor: [30, 10],
      }),
    })
      .addTo(map)
      .bindPopup('Origin Clinic');

    // Hospital marker (red)
    L.marker([9.3139, 42.1192], {
      icon: L.divIcon({
        className: '',
        html: '<div style="background:#dc3545;color:white;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:bold;white-space:nowrap;">🏥 Fana Hospital</div>',
        iconAnchor: [50, 10],
      }),
    })
      .addTo(map)
      .bindPopup('Fana Hospital — Destination');

    // Ambulance marker
    const ambLat = currentLocation?.lat || origin.lat;
    const ambLng = currentLocation?.lng || origin.lng;

    ambulanceMarkerRef.current = L.marker([ambLat, ambLng], {
      icon: L.divIcon({
        className: '',
        html: '<div style="font-size:28px;line-height:1;">🚑</div>',
        iconAnchor: [14, 14],
      }),
    })
      .addTo(map)
      .bindPopup('Ambulance — Live Position');

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadPoints, loading]);

  // ── Step 3: Update ambulance marker when location changes ─
  useEffect(() => {
    if (!ambulanceMarkerRef.current || !currentLocation) return;
    ambulanceMarkerRef.current.setLatLng([currentLocation.lat, currentLocation.lng]);
  }, [currentLocation]);

  return (
    <div style={{
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid #b3d7ff',
    }}>
      {/* Header */}
      <div style={{
        background: '#0056b3',
        color: 'white',
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <strong>🚑 Live Transport Map</strong>
        {currentLocation && (
          <span style={{ fontSize: '12px', opacity: 0.85 }}>
            📍 {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
          </span>
        )}
      </div>

      {/* Status bar */}
      {loading && (
        <div style={{ padding: '12px 16px', background: '#f0f7ff', color: '#555' }}>
          ⏳ Loading route...
        </div>
      )}
      {error && (
        <div style={{ padding: '12px 16px', background: '#fee', color: '#c00' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Map container */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '380px',
          display: loading || error ? 'none' : 'block',
        }}
      />

      {/* Footer */}
      {!loading && roadPoints.length > 0 && (
        <div style={{
          background: '#f8f9fa',
          padding: '8px 16px',
          fontSize: '12px',
          color: '#555',
          borderTop: '1px solid #ddd',
          display: 'flex',
          gap: 16,
        }}>
          <span>🔵 Route: {roadPoints.length} waypoints</span>
          <span>🟢 Origin → 🔴 Fana Hospital</span>
          <span style={{ color: '#28a745' }}>🔄 Updates every 5s</span>
        </div>
      )}
    </div>
  );
}