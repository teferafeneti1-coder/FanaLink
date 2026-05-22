import { useState, useEffect } from 'react';

export default function AmbulanceDriver() {
  const API = import.meta.env.VITE_API_URL;

  const [referralId, setReferralId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('AMB-FANA-01');
  const [isTracking, setIsTracking] = useState(false);
  const [currentCoords, setCurrentCoords] = useState({ lat: null, lng: null });
  const [logMessages, setLogMessages] = useState([]);
  const [roadPoints, setRoadPoints] = useState([]);

  const [alertOpen, setAlertOpen] = useState(false);
  const [countdownLeft, setCountdownLeft] = useState(6.6);
  const [vitalsChecklist, setVitalsChecklist] = useState({
    airwayClear: false,
    pressureApplied: false,
    vitalsLogged: false
  });

  const addLog = (msg) => {
    setLogMessages((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 5)]);
  };

  const playAlertSiren = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {}
  };

  // ✅ FIXED OSRM FETCH
  useEffect(() => {
    if (!referralId || !isTracking) return;

    const fetchRouteGeometry = async () => {
      try {
        const res = await fetch(`${API}/api/transport/${referralId}`);
        if (!res.ok) return;

        const data = await res.json();

        const originLat = data.originCoords?.lat || 9.2195;
        const originLng = data.originCoords?.lng || 42.3314;

        const hospitalLat = 9.3139;
        const hospitalLng = 42.1192;

        // ✅ FIXED OSRM URL
        const osrmUrl =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${originLng},${originLat};${hospitalLng},${hospitalLat}?overview=full&geometries=geojson`;

        const osrmRes = await fetch(osrmUrl);
        const routeData = await osrmRes.json();

        const coords = routeData?.routes?.[0]?.geometry?.coordinates || [];

        // ✅ FIXED mapping (lng,lat → lat,lng)
        const points = coords.map(([lng, lat]) => ({
          lat,
          lng
        }));

        setRoadPoints(points);
        addLog("🗺️ Route loaded successfully");
      } catch (err) {
        console.error(err);
      }
    };

    fetchRouteGeometry();
  }, [isTracking, referralId]);

  const sendLocationPacket = async (lat, lng) => {
    setCurrentCoords({ lat, lng });

    try {
      await fetch(`${API}/api/transport/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralId: parseInt(referralId),
          lat,
          lng
        })
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Ambulance Driver Node</h2>

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