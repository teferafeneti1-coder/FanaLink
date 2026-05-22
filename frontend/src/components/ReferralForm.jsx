import { useState } from 'react';

// ✅ CRA FIXED ENV
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API}/api/referral`, {
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

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed');

      alert("Referral submitted successfully!");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        placeholder="Patient Name"
        onChange={(e) =>
          setFormData({ ...formData, patientName: e.target.value })
        }
      />

      <input
        placeholder="Age"
        onChange={(e) =>
          setFormData({ ...formData, age: e.target.value })
        }
      />

      <button type="submit">Submit Referral</button>
    </form>
  );
}