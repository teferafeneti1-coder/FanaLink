import { useState } from 'react';

// ✅ CRA ENV
const API = process.env.REACT_APP_API_URL;

export default function ReferralForm() {
  const [formData, setFormData] = useState({
    patientName: '',
    age: '',
    sex: 'M',
    heartRate: '',
    respiratoryRate: '',
    spo2: '',
    temperature: '',
    observations: '',
    originKebele: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.patientName || !formData.age) {
      setError('Patient name and age required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch(`${API}/api/referral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          heartRate: Number(formData.heartRate),
          respiratoryRate: Number(formData.respiratoryRate),
          spo2: Number(formData.spo2),
          temperature: Number(formData.temperature),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');

      setSuccess(true);
      setFormData({
        patientName: '',
        age: '',
        sex: 'M',
        heartRate: '',
        respiratoryRate: '',
        spo2: '',
        temperature: '',
        observations: '',
        originKebele: '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    display: 'block',
    width: '100%',
    padding: '9px 12px',
    marginBottom: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: '480px', margin: '20px auto', padding: '24px', fontFamily: 'Arial, sans-serif', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0 }}>📋 Patient Referral Form</h2>

      {error && (
        <div style={{ background: '#fee', color: '#c00', padding: '10px', borderRadius: '4px', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '4px', marginBottom: '12px' }}>
          ✅ Referral submitted successfully!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Patient Name *</label>
        <input name="patientName" placeholder="Full name" value={formData.patientName} onChange={handleChange} style={inputStyle} />

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Age *</label>
            <input name="age" placeholder="Age" value={formData.age} onChange={handleChange} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Sex</label>
            <select name="sex" value={formData.sex} onChange={handleChange} style={inputStyle}>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Heart Rate</label>
            <input name="heartRate" placeholder="bpm" value={formData.heartRate} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Respiratory Rate</label>
            <input name="respiratoryRate" placeholder="breaths/min" value={formData.respiratoryRate} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>SpO2 (%)</label>
            <input name="spo2" placeholder="%" value={formData.spo2} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Temperature (°C)</label>
            <input name="temperature" placeholder="°C" value={formData.temperature} onChange={handleChange} style={inputStyle} />
          </div>
        </div>

        <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Observations</label>
        <textarea
          name="observations"
          placeholder="Clinical observations..."
          value={formData.observations}
          onChange={handleChange}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />

        <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Origin Kebele</label>
        <input name="originKebele" placeholder="Kebele / district" value={formData.originKebele} onChange={handleChange} style={inputStyle} />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: loading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '15px',
            cursor: loading ? 'default' : 'pointer',
            marginTop: '4px',
          }}
        >
          {loading ? 'Submitting...' : 'Submit Referral'}
        </button>
      </form>
    </div>
  );
}