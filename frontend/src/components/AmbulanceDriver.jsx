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

  // ── Vitals checklist (rendered in UI below) ──────────────────────────────
  const [alertOpen, setAlertOpen] = useState(false);
  const [vitalsChecklist, setVitalsChecklist] = useState({
    airwayClear: false,
    pressureApplied: false,
    vitalsLogged: false,
  });

  const addLog = (msg) => {
    setLogMessages((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 5),
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
      console.log('Audio blocked');
    }
  };

  // ── Fetch road route once tracking starts ────────────────────────────────
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
            lng: coord[0],
          }));

          setRoadPoints(coords);
          addLog('🗺️ Route loaded successfully');
        }
      } catch (err) {
        console.error('OSRM error:', err);
      }
    };

    fetchRouteGeometry();
  }, [isTracking, referralId]);

  // ── Watch GPS and stream location to backend ─────────────────────────────
  useEffect(() => {
    let watchId;

    if (isTracking && referralId) {
      if (!navigator.geolocation) {
        addLog('Geolocation not supported');
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
              lng,
            }),
          });
        } catch (err) {
          console.error('Upload error:', err);
        }
      };

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          sendLocationPacket(pos.coords.latitude, pos.coords.longitude);
        },
        () => addLog('GPS error'),
        { enableHighAccuracy: true }
      );

      return () => {
        if (watchId) navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [isTracking, referralId]);

  const handleToggleTracking = async () => {
    if (!referralId) {
      alert('Enter Referral ID');
      return;
    }

    try {
      const res = await fetch(`${API}/api/transport/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralId: Number(referralId),
          vehicleNumber,
        }),
      });

      if (res.ok) {
        setIsTracking(true);
        addLog('🚀 Tracking started');
      }
    } catch (err) {
      addLog('Network error');
    }
  };

  const handleVitalToggle = (key) => {
    setVitalsChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div style={{ maxWidth: '450px', margin: '20px auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>

      {/* ── Emergency Alert Banner ─────────────────────────── */}
      {alertOpen && (
        <div style={{ background: 'red', color: 'white', padding: 20, borderRadius: 6, marginBottom: 12 }}>
          🚨 ALERT ACTIVE
          <button
            onClick={() => setAlertOpen(false)}
            style={{ marginLeft: 16, background: 'white', color: 'red', border: 'none', borderRadius: 4, padding: '2px 10px', cursor: 'pointer' }}
          >
            Dismiss
          </button>
        </div>
      )}

      <h2>🚑 Ambulance Driver</h2>

      {/* ── Referral ID + Vehicle ──────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          value={referralId}
          onChange={(e) => setReferralId(e.target.value)}
          placeholder="Referral ID"
          style={{ flex: 1, padding: '8px', borderRadius: 4, border: '1px solid #ccc' }}
        />
        <input
          value={vehicleNumber}
          onChange={(e) => setVehicleNumber(e.target.value)}
          placeholder="Vehicle No."
          style={{ flex: 1, padding: '8px', borderRadius: 4, border: '1px solid #ccc' }}
        />
      </div>

      {/* ── Start / Stop Tracking ─────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={handleToggleTracking}
          disabled={isTracking}
          style={{
            flex: 1,
            padding: '10px',
            background: isTracking ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: isTracking ? 'default' : 'pointer',
          }}
        >
          {isTracking ? '📡 Tracking Active...' : 'Start Tracking'}
        </button>

        <button
          onClick={() => { setAlertOpen(true); playAlertSiren(); }}
          style={{ padding: '10px 14px', background: '#dc3545', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          🔔 Alert
        </button>
      </div>

      {/* ── Current GPS Coords ────────────────────────────── */}
      {currentCoords.lat && (
        <p style={{ fontSize: '0.85em', color: '#555' }}>
          📍 {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
        </p>
      )}

      {/* ── Route Info ───────────────────────────────────── */}
      {roadPoints.length > 0 && (
        <p style={{ fontSize: '0.85em', color: '#007bff' }}>
          🗺️ Route: {roadPoints.length} points loaded
        </p>
      )}

      {/* ── Vitals Checklist ─────────────────────────────── */}
      <div style={{ background: '#f8f9fa', padding: 14, borderRadius: 6, marginBottom: 12 }}>
        <strong>✅ Vitals Checklist</strong>
        {Object.entries(vitalsChecklist).map(([key, checked]) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => handleVitalToggle(key)}
            />
            {key === 'airwayClear' && 'Airway Clear'}
            {key === 'pressureApplied' && 'Pressure Applied'}
            {key === 'vitalsLogged' && 'Vitals Logged'}
          </label>
        ))}
      </div>

      {/* ── Activity Log ─────────────────────────────────── */}
      <div style={{ background: '#212529', color: '#00ff88', padding: 12, borderRadius: 6, fontSize: '0.8em', minHeight: 80 }}>
        {logMessages.length === 0 ? (
          <span style={{ color: '#555' }}>No activity yet...</span>
        ) : (
          logMessages.map((l, i) => (
            <div key={i}>{l}</div>
          ))
        )}
      </div>

    </div>
  );
}