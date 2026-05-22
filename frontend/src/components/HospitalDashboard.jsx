import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import TransportMap from './TransportMap';

// ✅ CRA ENV
const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function HospitalDashboard() {
  const [referrals, setReferrals] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const playEmergencyChime = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.6);
    } catch (e) {
      console.log('Audio alert blocked.');
    }
  };

  useEffect(() => {
    const fetchActiveReferrals = async () => {
      try {
        const res = await fetch(`${API}/api/referrals`);
        if (!res.ok) throw new Error('Server error');

        const data = await res.json();
        setReferrals(data.reverse());
        setError('');
      } catch (err) {
        setError('Connection to hospital server lost...');
      } finally {
        setLoading(false);
      }
    };

    fetchActiveReferrals();

    const socket = io(API);

    socket.on('newReferral', (newCase) => {
      playEmergencyChime();
      setReferrals((prev) => [newCase, ...prev]);
    });

    return () => socket.disconnect();
  }, []);  // ✅ removed API from deps — it's a module-level constant now

  if (loading) {
    return (
      <div style={{ padding: '30px', fontFamily: 'Arial' }}>
        Loading Fana Hospital Dashboard...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>

      {/* HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '3px solid #007bff',
        paddingBottom: '15px',
        marginBottom: '20px',
      }}>
        <div>
          <h1 style={{ color: '#007bff', margin: 0 }}>
            🏥 Fana Hospital Central Hub
          </h1>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>
            Harar Emergency Admission Dashboard
          </p>
        </div>

        <div style={{
          background: '#28a745',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '20px',
          fontWeight: 'bold',
        }}>
          ⚡ Live WebSocket Active
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div style={{
          background: '#fee',
          color: '#c00',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '20px',
        }}>
          {error}
        </div>
      )}

      {/* ✅ FIXED: was gridTemplateGridColumns (typo) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: referrals.length > 0 ? '1fr 1.5fr' : '1fr',
        gap: '25px',
      }}>

        {/* LEFT PANEL */}
        <section>
          <h2>🚨 Active Referrals ({referrals.length})</h2>

          {referrals.length === 0 ? (
            <div style={{
              background: '#f8f9fa',
              padding: '30px',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#666',
            }}>
              No active ambulance cases
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '75vh',
              overflowY: 'auto',
            }}>
              {referrals.map((item) => {
                const isCritical =
                  item.hospitalPrep?.priority === 'CRITICAL' ||
                  item.riskLevel === 'Red';

                const isSelected = selectedCase?.id === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedCase(item)}
                    style={{
                      padding: '15px',
                      background: isSelected ? '#e6f2ff' : '#fff',
                      border: isSelected ? '2px solid #007bff' : '1px solid #ddd',
                      borderLeft: `6px solid ${isCritical ? '#dc3545' : '#ffc107'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <strong>
                      {item.patientName} ({item.age})
                    </strong>

                    <p style={{ margin: '5px 0', fontSize: '0.9em' }}>
                      From: {item.originKebele || 'Unknown'}
                    </p>

                    <p style={{ fontSize: '0.85em', color: '#777' }}>
                      {item.observations}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* RIGHT PANEL */}
        <section>
          {selectedCase ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* MAP */}
              <TransportMap referralId={selectedCase.id} />

              {/* PREP */}
              <div style={{
                background: '#fff3cd',
                border: '1px solid #ffeeba',
                padding: '20px',
                borderRadius: '8px',
              }}>
                <h3 style={{ color: '#856404' }}>📋 ER Preparation Checklist</h3>

                <p><strong>Department:</strong> {selectedCase.hospitalPrep?.department || 'Emergency'}</p>
                <p><strong>Priority:</strong> {selectedCase.hospitalPrep?.priority || 'STANDARD'}</p>
                <p><strong>Equipment:</strong> {selectedCase.hospitalPrep?.equipmentNeeded?.join(', ') || 'Basic ER Setup'}</p>
                <p><strong>Medications:</strong> {selectedCase.hospitalPrep?.medicationsToPrep?.join(', ') || 'Standard meds'}</p>
                <p><strong>Staff:</strong> {selectedCase.hospitalPrep?.staffToCall?.join(', ') || 'ER team'}</p>
                <p><strong>Instructions:</strong> {selectedCase.hospitalPrep?.immediateActions || 'Prepare patient arrival'}</p>
              </div>

              {/* AI */}
              <div style={{
                background: '#f0f7ff',
                border: '1px solid #b3d7ff',
                padding: '20px',
                borderRadius: '8px',
              }}>
                <h3>🩺 AI Guidance</h3>
                <pre style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedCase.aiAnalysis || 'No AI analysis yet'}
                </pre>
              </div>

            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '50px',
              color: '#666',
              border: '1px dashed #ccc',
            }}>
              Select a patient case to view details
            </div>
          )}
        </section>

      </div>
    </div>
  );
}