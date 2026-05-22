const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const Groq = require('groq-sdk');

dotenv.config();

const app = express();
app.use(cors());

// Increase JSON parsing limits to safely transmit base64 images from React
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Groq SDK Client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// In-memory data store for referrals
let referrals = [];

// FUNCTION 1: Analyze Patient with Groq Llama 3.2 Vision Model
async function analyzePatientWithAI(patientData) {
  try {
    console.log('🤖 Invoking Llama Vision Model for analysis...');
    
    const userPromptText = `You are an emergency medicine doctor in Ethiopia. A rural health worker is transporting this patient to Fana Hospital.

PATIENT DETAILS:
- Name: ${patientData.patientName}
- Age: ${patientData.age} years
- Sex: ${patientData.sex}
- From: ${patientData.originKebele}
- Heart Rate: ${patientData.heartRate} bpm (Normal: 100-160)
- Respiratory Rate: ${patientData.respiratoryRate} breaths/min (Normal: 30-60)
- Oxygen Saturation: ${patientData.spo2}% (Normal: 92-98)
- Temperature: ${patientData.temperature}°C (Normal: 36.5-37.5)
- Clinical Observations: ${patientData.observations}
- MEWS Score: ${patientData.mewsScore} out of 5
- Risk Level: ${patientData.riskLevel}

IMAGE EVALUATION GUIDANCE:
Carefully inspect the attached image for clinical findings matching the observations (e.g., specific injuries, rashes, bleeding sites, swelling, cyanosis, or medical configurations).

IMPORTANT DIAGNOSTIC DIRECTIVES:
- If observations or the image indicate ACTIVE BLEEDING, treat as a hemorrhage emergency.
- If they indicate SEIZURES, prepare for neurological emergency.
- If they indicate DIFFICULTY BREATHING, prepare for respiratory failure.
- If they indicate UNCONSCIOUSNESS, prepare for immediate critical care.

PROVIDE SPECIFIC, ACTIONABLE GUIDANCE OUTLINED IN THESE 5 POINTS:
1. LIKELY DIAGNOSIS: Based on vitals, image, and observations, what is this patient suffering from?
2. IMMEDIATE ACTIONS DURING 45-MINUTE TRANSPORT: What specific procedures must the health worker do right now?
3. CRITICAL MONITORING (check every 5 minutes): What specific signs to watch for?
4. RED FLAGS - STOP AND CALL DOCTOR IF: Specific danger metrics.
5. HOSPITAL EQUIPMENT - TELL FANA HOSPITAL TO PREPARE: Ventilators, specific drugs, blood transfusion units, etc.

Be EXTREMELY SPECIFIC. Do not give general advice.`;

    // Construct the structured multimodal array payload
    const messageContent = [
      {
        type: "text",
        text: userPromptText
      }
    ];

    // Check if base64 string exists and inject into context stack
    if (patientData.image) {
      console.log('🖼️ Attaching image payload to API compilation block...');
      messageContent.push({
        type: "image_url",
        image_url: {
          url: patientData.image 
        }
      });
    } else {
      console.log('⚠️ No image data provided; proceeding with text parameters only.');
    }

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
      model: 'llama-3.2-11b-vision-preview', 
      max_tokens: 1024,
    });

    const aiAnalysis = response.choices.message.content;
    console.log('✓ Success: Analysis received from Vision model.');
    return aiAnalysis;

  } catch (error) {
    console.error('❌ CRITICAL ERROR IN AI EXECUTION BLOCK:', error);
    return `EMERGENCY FALLBACK - Transport to Fana Hospital immediately.
    
Keep patient stable:
- Monitor breathing and oxygenation status
- Maintain core body temperature
- Clear and support patent airway
- Continuously monitor neurological status`;
  }
}

// FUNCTION 2: Determine Hospital Preparation Checklist
async function getHospitalPreparations(patientData, aiAnalysis) {
  try {
    console.log('📋 Compiling preparation checklist metrics...');
    
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: `Based on this patient case, give Fana Hospital specific preparation instructions.

PATIENT: ${patientData.patientName}, ${patientData.age} years old
RISK LEVEL: ${patientData.riskLevel}
MEWS SCORE: ${patientData.mewsScore}/5
VITALS: HR ${patientData.heartRate}, RR ${patientData.respiratoryRate}, SpO2 ${patientData.spo2}%, Temp ${patientData.temperature}°C
SYMPTOMS: ${patientData.observations}

AI ANALYSIS SUMMARY:
${aiAnalysis.substring(0, 300)}

RESPOND WITH ONLY A RAW JSON OBJECT (No markdown blocks, no text wrapper blocks):
{
  "priority": "CRITICAL/HIGH/MEDIUM/LOW",
  "estimatedArrival": 45,
  "department": "ICU/Pediatric/General/Emergency",
  "equipmentNeeded": ["list", "of", "specific", "equipment"],
  "medicationsToPrep": ["medication1", "medication2"],
  "staffToCall": ["specialist1", "specialist2"],
  "immediateActions": "What should staff do first when patient arrives?"
}`,
        },
      ],
      model: 'llama-3.2-11b-vision-preview',
      max_tokens: 512,
    });

    const text = response.choices.message.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      console.log('✓ Hospital preparations parsed correctly.');
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Unable to capture standard JSON notation boundary.");

  } catch (error) {
    console.error('Hospital Prep Processing Error:', error.message);
    
    const priorityMap = { 'Red': 'CRITICAL', 'Yellow': 'HIGH', 'Green': 'MEDIUM' };
    return {
      priority: priorityMap[patientData.riskLevel] || 'HIGH',
      estimatedArrival: 45,
      department: patientData.riskLevel === 'Red' ? 'ICU' : 'Emergency',
      equipmentNeeded: ['Oxygen setup', 'Vitals monitor', 'IV Access line kit'],
      medicationsToPrep: ['Normal Saline', 'Emergency drug tray'],
      staffToCall: ['Emergency Physician', 'Triage Nurse'],
      immediateActions: 'Clear triage room 1 and secure airway immediately upon arrival.'
    };
  }
}

// ENDPOINT 1: Submit Referral Case
app.post('/api/referral', async (req, res) => {
  try {
    const { 
      patientName, age, sex, heartRate, respiratoryRate, 
      spo2, temperature, observations, originKebele, 
      mewsScore, riskLevel, image 
    } = req.body;

    console.log(`\n🚨 NEW INCOMING PATIENT CASE ADMISSION`);
    console.log(`Patient: ${patientName} | Observations: ${observations}`);

    // Call analysis modules
    const aiAnalysis = await analyzePatientWithAI({
      patientName, age, sex, heartRate, respiratoryRate, spo2, temperature, observations, originKebele, mewsScore, riskLevel, image
    });

    const hospitalPrep = await getHospitalPreparations({
      patientName, age, sex, heartRate, respiratoryRate, spo2, temperature, observations, originKebele, mewsScore, riskLevel
    }, aiAnalysis);

    const referral = {
      id: referrals.length + 1,
      patientName, age, sex, heartRate, respiratoryRate, spo2, temperature, observations, originKebele, mewsScore, riskLevel, aiAnalysis, hospitalPrep,
      timestamp: new Date().toISOString(),
    };

    referrals.push(referral);

    res.json({
      success: true,
      referralId: referral.id,
      message: '✓ Referral compiled and routed to Fana Hospital.',
      aiGuidance: aiAnalysis,
      hospitalPrep: hospitalPrep
    });

  } catch (error) {
    console.error('Referral Routing Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ENDPOINT 2: Get All Referrals
app.get('/api/referrals', (req, res) => {
  res.json(referrals);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Production engine live on port ${PORT}`));
