import { useState, useEffect } from 'react';

// ✅ CRA FIXED ENV
const API = process.env.REACT_APP_API_URL;

export default function AmbulanceDriver() {
  const [referralId, setReferralId] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [currentCoords, setCurrentCoords] = useState({ lat: null, lng: null });
  const [logMessages, setLogMessages] = useState([]);
  const [roadPoints, setRoadPoints] = useState([]);

  const addLog = (msg) => {
    setLogMessages((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 5)
    ]);
  };

  useEffect(() => {
    if (!referralId || !isTracking) return;

    const fetchRouteGeometry = async () => {
      try {
        const res = await fetch(`${API}/api/transport/${referralId}`);
        const data = await res.json();

        const originLat = data.originCoords?.lat || 9.2195;
        const originLng = data.originCoords?.lng || 42.3314;

        const hospitalLat = 9.3139;
        const hospitalLng = 42.1192;

        const osrmUrl =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${originLng},${originLat};${hospitalLng},${hospitalLat}` +
          `?overview=full&geometries=geojson`;

        const osrmRes = await fetch(osrmUrl);
        const routeData = await osrmRes.json();

        const coords = routeData?.routes?.[0]?.geometry?.coordinates || [];

        const points = coords.map(([lng, lat]) => ({ lat, lng }));

        setRoadPoints(points);
        addLog("Route loaded");
      } catch (err) {
        console.error(err);
      }
    };

    fetchRouteGeometry();
  }, [isTracking, referralId]);

  const sendLocationPacket = async (lat, lng) => {
    setCurrentCoords({ lat, lng });

    await fetch(`${API}/api/transport/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referralId: Number(referralId),
        lat,
        lng
      })
    });
  };

  return (
    <div>
      <h2>Transport Tracking</h2>

      <input
        value={referralId}
        onChange={(e) => setReferralId(e.target.value)}
        placeholder="Referral ID"
      />

      <button onClick={() => setIsTracking(!isTracking)}>
        {isTracking ? "Stop" : "Start"}
      </button>
    </div>
  );
}