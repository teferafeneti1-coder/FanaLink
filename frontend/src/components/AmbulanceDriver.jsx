import { useState, useEffect } from 'react';

// ✅ CRA FIXED ENV
const API = process.env.REACT_APP_API_URL;

export default function AmbulanceDriver() {
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
    setLogMessages((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 5)
    ]);
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
    } catch (e) {
      console.log("Audio blocked");
    }
  };

  useEffect(() => {
    if (!referralId || !isTracking) return;

    const fetchRouteGeometry = async () => {
      try {
        const res = await fetch(`${API}/api/transport/${referralId}`);
        const transportData = await res.json();

        const originLat = transportData.originCoords?.lat || 9.2195;
        const originLng = transportData.originCoords?.lng || 42.3314;

        const hospitalLat = 9.3139;
        const hospitalLng = 42.1192;

        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${originLng},${originLat};${hospitalLng},${hospitalLat}` +
          `?overview=full&geometries=geojson`;

        const osrmRes = await fetch(url);
        const routeData = await osrmRes.json();

        if (routeData?.routes?.[0]?.geometry?.coordinates) {
          const coords = routeData.routes[0].geometry.coordinates.map((coord) => ({
            lat: coord[1],
            lng: coord[0]
          }));

          setRoadPoints(coords);
          addLog("🗺️ Route loaded successfully");
        }
      } catch (err) {
        console.error("OSRM error:", err);
      }
    };

    fetchRouteGeometry();
  }, [isTracking, referralId]);

  useEffect(() => {
    let watchId;

    if (isTracking && referralId) {
      if (!navigator.geolocation) {
        addLog("Geolocation not supported");
        setIsTracking(false);
        return;
      }

      const sendLocationPacket = async (lat, lng) => {
        setCurrentCoords({ lat, lng });

        try {
          await fetch(`${API}/api/transport/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referralId: Number(referralId),
              lat,
              lng
            })
          });
        } catch (err) {
          console.error("Upload error:", err);
        }
      };

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          sendLocationPacket(pos.coords.latitude, pos.coords.longitude);
        },
        () => addLog("GPS error"),
        { enableHighAccuracy: true }
      );

      return () => {
        if (watchId) navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [isTracking, referralId]);

  const handleToggleTracking = async () => {
    if (!referralId) {
      alert("Enter Referral ID");
      return;
    }

    try {
      const res = await fetch(`${API}/api/transport/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralId: Number(referralId),
          vehicleNumber
        })
      });

      if (res.ok) {
        setIsTracking(true);
        addLog("🚀 Tracking started");
      }
    } catch (err) {
      addLog("Network error");
    }
  };

  return (
    <div style={{ maxWidth: '450px', margin: '20px auto', padding: '20px' }}>
      {alertOpen && (
        <div style={{ background: 'red', color: 'white', padding: 20 }}>
          ALERT ACTIVE
        </div>
      )}

      <h2>🚑 Ambulance Driver</h2>

      <input
        value={referralId}
        onChange={(e) => setReferralId(e.target.value)}
        placeholder="Referral ID"
      />

      <button onClick={handleToggleTracking}>
        {isTracking ? "Running..." : "Start Tracking"}
      </button>

      {currentCoords.lat && (
        <p>{currentCoords.lat}, {currentCoords.lng}</p>
      )}

      <div>
        {logMessages.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}