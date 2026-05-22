import { useState, useEffect } from 'react';

// ✅ CRA ENV
const API = process.env.REACT_APP_API_URL;

export default function TransportMap({ referralId }) {
  const [roadPoints, setRoadPoints] = useState([]);
  const [currentCoords, setCurrentCoords] = useState(null);

  useEffect(() => {
    if (!referralId) return;

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
          `${originLng},${originLat};${hospitalLng},${hospitalLat}?overview=full&geometries=geojson`;

        const resRoute = await fetch(url);
        const routeData = await resRoute.json();

        const coords = routeData?.routes?.[0]?.geometry?.coordinates || [];

        const points = coords.map(([lng, lat]) => ({
          lat,
          lng,
        }));

        setRoadPoints(points);
      } catch (err) {
        console.error('Route error:', err);
      }
    };

    loadRoute();
  }, [referralId]);

  return (
    <div style={{ padding: 10 }}>
      <h3>🚑 Transport Map</h3>

      {roadPoints.length === 0 ? (
        <p>Loading route...</p>
      ) : (
        <p>Route loaded: {roadPoints.length} points</p>
      )}
    </div>
  );
}