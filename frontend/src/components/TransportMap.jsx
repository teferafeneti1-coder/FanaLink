import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API = process.env.REACT_APP_API_URL;

export default function TransportMap({ referralId }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const ambMarkerRef = useRef(null);
  const routeLayerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, { zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 18,
      }).addTo(mapInstanceRef.current);
      mapInstanceRef.current.setView([9.265, 42.22], 11);

      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 100);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        ambMarkerRef.current = null;
        routeLayerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!referralId) return;

    const waitForMap = setInterval(() => {
      if (!mapInstanceRef.current) return;
      clearInterval(waitForMap);

      const map = mapInstanceRef.current;

      const loadRoute = async () => {
        try {
          const res = await fetch(`${API}/api/transport/${referralId}`);
          const data = await res.json();

          const originLat = data?.originCoords?.lat || 9.2195;
          const originLng = data?.originCoords?.lng || 42.3314;
          const hospitalLat = 9.3139;
          const hospitalLng = 42.1192;

          const url =
            `https://router.project-osrm.org/route/v1/driving/` +
            `${originLng},${originLat};${hospitalLng},${hospitalLat}` +
            `?overview=full&geometries=geojson`;

          const routeRes = await fetch(url);
          const routeData = await routeRes.json();
          const coords = routeData?.routes?.[0]?.geometry?.coordinates || [];
          const latlngs = coords.map(([lng, lat]) => [lat, lng]);

          if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
          routeLayerRef.current = L.polyline(latlngs, {
            color: '#1a6fc4',
            weight: 4,
            opacity: 0.85,
          }).addTo(map);

          const ambIcon = L.divIcon({
            html: `<div style="width:18px;height:18px;background:#dc3545;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
            className: '',
          });

          if (!ambMarkerRef.current) {
            ambMarkerRef.current = L.marker([originLat, originLng], { icon: ambIcon })
              .addTo(map)
              .bindTooltip('🚑 Ambulance', { permanent: true, direction: 'top' });
          } else {
            ambMarkerRef.current.setLatLng([originLat, originLng]);
          }

          const hospitalIcon = L.divIcon({
            html: `<div style="width:16px;height:16px;background:#28a745;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
            className: '',
          });

          L.marker([hospitalLat, hospitalLng], { icon: hospitalIcon })
            .addTo(map)
            .bindTooltip('🏥 Fana Hospital', { permanent: true, direction: 'top' });

          map.fitBounds(
            [[originLat, originLng], [hospitalLat, hospitalLng]],
            { padding: [50, 50] }
          );
        } catch (err) {
          console.error('Route load error:', err);
        }
      };

      const pollLocation = async () => {
        try {
          const res = await fetch(`${API}/api/transport/${referralId}`);
          const data = await res.json();
          if (data?.currentLat && data?.currentLng && ambMarkerRef.current) {
            ambMarkerRef.current.setLatLng([data.currentLat, data.currentLng]);
            mapInstanceRef.current.panTo([data.currentLat, data.currentLng]);
          }
        } catch (err) {
          console.error('Poll error:', err);
        }
      };

      loadRoute();
      const interval = setInterval(pollLocation, 3000);

      return () => clearInterval(interval);
    }, 100);

    return () => clearInterval(waitForMap);
  }, [referralId]);

  return (
    <div>
      <h3>🚑 Transport Map</h3>
      <div
        ref={mapRef}
        style={{
          height: '420px',
          width: '100%',
          borderRadius: '8px',
          border: '1px solid #ddd',
          overflow: 'hidden',
        }}
      />
    </div>
  );
}