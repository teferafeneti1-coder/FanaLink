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

    try {
      const res = await fetch(`${API}/api/referral`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      alert('Referral submitted successfully');

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

  return (
    <form onSubmit={handleSubmit} style={{ padding: 20 }}>
      <h2>Referral Form</h2>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <input
        name="patientName"
        placeholder="Patient Name"
        value={formData.patientName}
        onChange={handleChange}
      />

      <input
        name="age"
        placeholder="Age"
        value={formData.age}
        onChange={handleChange}
      />

      <input
        name="heartRate"
        placeholder="Heart Rate"
        value={formData.heartRate}
        onChange={handleChange}
      />

      <input
        name="respiratoryRate"
        placeholder="Respiratory Rate"
        value={formData.respiratoryRate}
        onChange={handleChange}
      />

      <input
        name="spo2"
        placeholder="SpO2"
        value={formData.spo2}
        onChange={handleChange}
      />

      <input
        name="temperature"
        placeholder="Temperature"
        value={formData.temperature}
        onChange={handleChange}
      />

      <textarea
        name="observations"
        placeholder="Observations"
        value={formData.observations}
        onChange={handleChange}
      />

      <input
        name="originKebele"
        placeholder="Origin Kebele"
        value={formData.originKebele}
        onChange={handleChange}
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Referral'}
      </button>
    </form>
  );
}