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
  const [imageBase64, setImageBase64] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [aiResult, setAiResult] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Only allow images
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageBase64(reader.result);       // full base64 with data:image/... prefix
      setImagePreview(reader.result);      // shown as preview
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageBase64('');
    setImagePreview('');
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
    setAiResult('');

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
          image: imageBase64 || null,   // send base64 image to backend → Groq
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');

      setSuccess(true);
      setAiResult(data.aiGuidance || '');

      // Reset form
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
      setImageBase64('');
      setImagePreview('');

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

  const labelStyle = { fontWeight: 'bold', fontSize: '13px' };

  return (
    <div style={{ maxWidth: '520px', margin: '20px auto', padding: '24px', fontFamily: 'Arial, sans-serif', border: '1px solid #ddd', borderRadius: '8px' }}>
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

        {/* Patient Name */}
        <label style={labelStyle}>Patient Name *</label>
        <input name="patientName" placeholder="Full name" value={formData.patientName} onChange={handleChange} style={inputStyle} />

        {/* Age + Sex */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Age *</label>
            <input name="age" placeholder="Age" value={formData.age} onChange={handleChange} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Sex</label>
            <select name="sex" value={formData.sex} onChange={handleChange} style={inputStyle}>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
        </div>

        {/* Vitals Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>Heart Rate</label>
            <input name="heartRate" placeholder="bpm" value={formData.heartRate} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Respiratory Rate</label>
            <input name="respiratoryRate" placeholder="breaths/min" value={formData.respiratoryRate} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>SpO2 (%)</label>
            <input name="spo2" placeholder="%" value={formData.spo2} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Temperature (°C)</label>
            <input name="temperature" placeholder="°C" value={formData.temperature} onChange={handleChange} style={inputStyle} />
          </div>
        </div>

        {/* Observations */}
        <label style={labelStyle}>Observations</label>
        <textarea
          name="observations"
          placeholder="Clinical observations..."
          value={formData.observations}
          onChange={handleChange}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />

        {/* Origin Kebele */}
        <label style={labelStyle}>Origin Kebele</label>
        <input name="originKebele" placeholder="Kebele / district" value={formData.originKebele} onChange={handleChange} style={inputStyle} />

        {/* ── IMAGE UPLOAD ─────────────────────────────────── */}
        <label style={labelStyle}>📷 Patient Image (optional — for AI analysis)</label>
        <div style={{
          border: '2px dashed #ccc',
          borderRadius: '6px',
          padding: '16px',
          textAlign: 'center',
          marginBottom: '12px',
          background: '#fafafa',
        }}>
          {imagePreview ? (
            <div>
              <img
                src={imagePreview}
                alt="Patient"
                style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '6px', marginBottom: '8px' }}
              />
              <br />
              <button
                type="button"
                onClick={handleRemoveImage}
                style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}
              >
                ✕ Remove Image
              </button>
            </div>
          ) : (
            <div>
              <p style={{ color: '#888', margin: '0 0 8px 0', fontSize: '13px' }}>
                Upload a photo of the patient or injury
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ fontSize: '13px' }}
              />
            </div>
          )}
        </div>

        {/* Submit */}
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
          {loading ? '🤖 Analyzing & Submitting...' : 'Submit Referral'}
        </button>
      </form>

      {/* ── AI RESULT ────────────────────────────────────── */}
      {aiResult && (
        <div style={{
          marginTop: '20px',
          background: '#f0f7ff',
          border: '1px solid #b3d7ff',
          borderRadius: '8px',
          padding: '16px',
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#0056b3' }}>🩺 AI Analysis Result</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
            {aiResult}
          </pre>
        </div>
      )}
    </div>
  );
}