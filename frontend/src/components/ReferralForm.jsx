import { useState } from 'react';

export default function ReferralForm() {
  const API = import.meta.env.VITE_API_URL;

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

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mewsScore, setMewsScore] = useState(null);
  const [riskLevel, setRiskLevel] = useState(null);
  const [photoBase64, setPhotoBase64] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [aiGuidance, setAiGuidance] = useState(null);
  const [hospitalPrep, setHospitalPrep] = useState(null);

  const calculateMEWS = (vitals) => {
    let score = 0;

    const hr = Number(vitals.heartRate);
    const rr = Number(vitals.respiratoryRate);
    const spo2 = Number(vitals.spo2);
    const temp = Number(vitals.temperature);

    if (hr < 100 || hr > 160) score += 1;
    if (rr < 30 || rr > 60) score += 1;
    if (spo2 < 92 || spo2 > 98) score += 1;
    if (temp < 36.5 || temp > 37.5) score += 1;

    return score;
  };

  const getRiskLevel = (score) => {
    if (score <= 2) return { level: 'Green', label: 'Low Risk', color: '#10b981' };
    if (score <= 4) return { level: 'Yellow', label: 'Medium Risk', color: '#f59e0b' };
    return { level: 'Red', label: 'Critical', color: '#ef4444' };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newData = { ...formData, [name]: value };
    setFormData(newData);

    if (
      newData.heartRate &&
      newData.respiratoryRate &&
      newData.spo2 &&
      newData.temperature
    ) {
      const score = calculateMEWS({
        heartRate: newData.heartRate,
        respiratoryRate: newData.respiratoryRate,
        spo2: newData.spo2,
        temperature: newData.temperature,
      });

      setMewsScore(score);
      setRiskLevel(getRiskLevel(score));
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoBase64(event.target.result);
      setPhotoPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoBase64(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.patientName || !formData.age || !formData.heartRate) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);
    setError('');
    setAiGuidance(null);
    setHospitalPrep(null);

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
          mewsScore,
          riskLevel: riskLevel?.level,
          image: photoBase64,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit');

      setSubmitted(true);
      setAiGuidance(data.aiGuidance);
      setHospitalPrep(data.hospitalPrep);

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

      setPhotoBase64(null);
      setPhotoPreview(null);
      setMewsScore(null);
      setRiskLevel(null);

      setTimeout(() => setSubmitted(false), 15000);
    } catch (err) {
      setError(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* UI unchanged */}
    </div>
  );
}