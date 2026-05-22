import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API = process.env.REACT_APP_API_URL;

export default function TransportMap({ referralId }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const ambMarkerRef = useRef(null);
  const routeLayerRef = useRef(null);

  useEffect(() => {
    // Init map once
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, { zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstanceRef.current);
      mapInstanceRef.current.setView([9.265, 42.22], 11);
    }
  }, []);

  useEffect(() => {
    if (!referralId || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const loadRoute = async () => {
      try {
        const res = await fetch(`${API}/api/transport/${referralId}`);
        const data = await res.json();

        const originLat = data?.originCoords?.lat || 9.2195;
        const originLng = data?.originCoords?.lng || 42.3314;
        const hospitalLat = 9.3139;
        const hospitalLng = 42.1192;

        // Draw route
        const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${hospitalLng},${hospitalLat}?overview=full&geometries=geojson`;
        const routeRes = await fetch(url);
        const routeData = await routeRes.json();
        const coords = routeData?.routes?.[0]?.geometry?.coordinates || [];
        const latlngs = coords.map(([lng, lat]) => [lat, lng]);

        if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
        routeLayerRef.current = L.polyline(latlngs, { color: '#1a6fc4', weight: 4 }).addTo(map);

        // Ambulance marker (live position)
        const ambIcon = L.divIcon({
          html: `<div style="width:18px;height:18px;background:#dc3545;border:2px solid white;border-radius:50%"></div>`,
          iconSize: [18, 18], iconAnchor: [9, 9], className: ''
        });
        if (!ambMarkerRef.current) {
          ambMarkerRef.current = L.marker([originLat, originLng], { icon: ambIcon })
            .addTo(map)
            .bindTooltip('Ambulance', { permanent: true, direction: 'top' });
        } else {
          ambMarkerRef.current.setLatLng([originLat, originLng]);
        }

        // Hospital marker
        L.marker([hospitalLat, hospitalLng])
          .addTo(map)
          .bindTooltip('Fana Hospital', { permanent: true, direction: 'top' });

        map.fitBounds([[originLat, originLng], [hospitalLat, hospitalLng]], { padding: [40, 40] });
      } catch (err) {
        console.error('Route error:', err);
      }
    };

    // Poll live location from backend
    const pollLocation = async () => {
      try {
        const res = await fetch(`${API}/api/transport/${referralId}`);
        const data = await res.json();
        if (data?.currentLat && data?.currentLng && ambMarkerRef.current) {
          ambMarkerRef.current.setLatLng([data.currentLat, data.currentLng]);
          map.panTo([data.currentLat, data.currentLng]);
        }
      } catch (err) {}
    };

    loadRoute();
    const interval = setInterval(pollLocation, 3000); // poll every 3s
    return () => clearInterval(interval);
  }, [referralId]);

  return (
    <div>
      <h3>🚑 Transport Map</h3>
      <div ref={mapRef} style={{ height: '400px', width: '100%', borderRadius: 8 }} />
    </div>
  );
}