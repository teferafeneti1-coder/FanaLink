import React, { useState } from 'react';
import ReferralForm from './components/ReferralForm';
import HospitalDashboard from './components/HospitalDashboard';
import AmbulanceDriver from './components/AmbulanceDriver'; // Import new driver module
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('clinic');

  return (
    <div className="App" style={{ minHeight: '100vh', backgroundColor: '#f5f7fb' }}>
      <nav style={{ backgroundColor: '#1e293b', padding: '12px 20px', display: 'flex', gap: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <button onClick={() => setCurrentView('clinic')} style={{ padding: '10px 18px', backgroundColor: currentView === 'clinic' ? '#007bff' : '#334155', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          📍 Babile/Gursum Clinic Form
        </button>
        <button onClick={() => setCurrentView('driver')} style={{ padding: '10px 18px', backgroundColor: currentView === 'driver' ? '#dc3545' : '#334155', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          📲 Ambulance Driver Node
        </button>
        <button onClick={() => setCurrentView('hospital')} style={{ padding: '10px 18px', backgroundColor: currentView === 'hospital' ? '#28a745' : '#334155', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          📊 Harar Hospital Monitor Panel
        </button>
      </nav>

      <main style={{ padding: '20px' }}>
        {currentView === 'clinic' && <ReferralForm />}
        {currentView === 'driver' && <AmbulanceDriver />}
        {currentView === 'hospital' && <HospitalDashboard />}
      </main>
    </div>
  );
}

export default App;
