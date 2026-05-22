// 1. MUST BE LINE 1: Load environment variables first!
require('dotenv').config(); 

// 2. Import core packages
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const http = require('http'); // Required to wrap socket instance bindings
const { Server } = require('socket.io');
const mongoose = require('mongoose'); // New core database integration driver

const app = express();
app.use(cors());

// Increase payload bounds for handling large base64 image data strings safely from React
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configure HTTP and Socket.io instances
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allows cross-origin sockets connections during dev simulation
    methods: ["GET", "POST"]
  }
});

// 3. DATABASE SETUP BLOCK: Connect to local or remote cloud atlas MongoDB cluster
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fanalink';
mongoose.connect(MONGO_URI)
  .then(() => console.log('💾 Success: Permanent MongoDB cloud deployment connected.'))
  .catch(err => console.error('❌ MongoDB Connection Error Failure:', err));

// 4. DEFINE PERMANENT DATA SCHEMAS 
const ReferralSchema = new mongoose.Schema({
  id: { type: Number, unique: true }, // Auto-increment matching key index
  patientName: String, age: String, sex: String,
  heartRate: Number, respiratoryRate: Number, spo2: Number, temperature: Number,
  observations: String, originKebele: String, mewsScore: Number, riskLevel: String,
  aiAnalysis: String,
  hospitalPrep: {
    priority: String, department: String,
    equipmentNeeded: [String], medicationsToPrep: [String], staffToCall: [String],
    immediateActions: String
  },
  timestamp: { type: Date, default: Date.now }
});
const Referral = mongoose.model('Referral', ReferralSchema);

const TransportSchema = new mongoose.Schema({
  referralId: { type: Number, unique: true },
  vehicleNumber: String, status: String, originName: String, lastUpdated: Date,
  originCoords: { lat: Number, lng: Number },
  currentLocation: { lat: Number, lng: Number },
  history: [{ lat: Number, lng: Number, timestamp: { type: Date, default: Date.now } }]
});
const Transport = mongoose.model('Transport', TransportSchema);

// 5. Initialize Groq SDK Client with your active API key
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Socket.io Real-time Pipeline Connection Listener
io.on('connection', (socket) => {
  console.log(`🔌 New workstation linked to real-time Socket stream: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`❌ Workstation disconnected from socket stream: ${socket.id}`);
  });
});

// SEED DATA CONFIGURATION: Force seed data row Case ID #1 into collection if empty on startup
async function seedFallbackDatabaseRecord() {
  try {
    const hasRecord = await Referral.findOne({ id: 1 });
    if (!hasRecord) {
      const mockCase = new Referral({
        id: 1, patientName: "Simulation Patient", age: "30", sex: "M", originKebele: "Babile",
        heartRate: 110, respiratoryRate: 24, spo2: 95, temperature: 37.2,
        observations: "Simulated active bleeding tracking case setup profile", riskLevel: "Yellow", mewsScore: 3,
        aiAnalysis: "Simulated clinical overview metrics active during transport.",
        hospitalPrep: {
          priority: "HIGH", department: "Emergency",
          equipmentNeeded: ["Oxygen setup", "Trauma Bay lines", "Pressure Dressings"],
          medicationsToPrep: ["Normal Saline IV Fluids", "Tranexamic Acid (TXA)"],
          staffToCall: ["Emergency Physician", "Triage Nurse"],
          immediateActions: "Clear trauma bay 1 and prepare blood transfusion products immediately."
        }
      });
      await mockCase.save();
      console.log("📝 Seed Notice: Default Simulation Case #1 pre-injected into database collection.");
    }
  } catch (err) {
    console.log("Database baseline lookup holding...", err.message);
  }
}
seedFallbackDatabaseRecord();

// FUNCTION 1: Analyze Patient with Groq Active Vision Model
async function analyzePatientWithAI(patientData) {
  try {
    console.log('🤖 Invoking Active Llama Vision Model for analysis...');
    
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

    const messageContent = [
      {
        type: "text",
        text: userPromptText
      }
    ];

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
      messages: [{ role: 'user', content: messageContent }],
      model: 'meta-llama/llama-4-scout-17b-16e-instruct', 
      max_tokens: 1024,
    });

    if (response && response.choices && response.choices[0] && response.choices[0].message) {
      const aiAnalysis = response.choices[0].message.content;
      console.log('✓ Success: Analysis received from Vision model.');
      return aiAnalysis;
    }
    
    throw new Error("Invalid format in Groq Vision Response Object.");

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
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: 512,
    });

    if (response && response.choices && response.choices[0] && response.choices[0].message) {
      const text = response.choices[0].message.content;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        console.log('✓ Hospital preparations parsed correctly.');
        return JSON.parse(jsonMatch[0]);
      }
    }
    
    throw new Error("Unable to parse standard JSON response notation boundary.");

  } catch (error) {
    console.error('Hospital Prep Processing Error:', error.message);
    
    const priorityMap = { 'Red': 'CRITICAL', 'Yellow': 'HIGH', 'Green': 'MEDIUM' };
    const containsBleeding = patientData.observations.toLowerCase().includes('bleed');
    
    return {
      priority: containsBleeding ? 'CRITICAL' : (priorityMap[patientData.riskLevel] || 'HIGH'),
      estimatedArrival: 45,
      department: containsBleeding ? 'Emergency' : (patientData.riskLevel === 'Red' ? 'ICU' : 'Emergency'),
      equipmentNeeded: containsBleeding 
        ? ['Trauma Bay Setup', 'Oxygen lines', 'Pressure Dressings', 'Suture kits'] 
        : ['Oxygen setup', 'Vitals monitor', 'IV Access line kit'],
      medicationsToPrep: containsBleeding 
        ? ['Tranexamic Acid (TXA)', 'Normal Saline IV Fluids', 'Emergency Blood Products'] 
        : ['Normal Saline', 'Emergency drug tray'],
      staffToCall: containsBleeding 
        ? ['Trauma Surgeon', 'Emergency Physician', 'Triage Nurse'] 
        : ['Emergency Physician', 'Triage Nurse'],
      immediateActions: containsBleeding 
        ? 'Direct admission to Trauma Bay 1. Prepare for massive transfusion protocol and surgical pressure dressing setup.'
        : 'Clear triage room 1 and secure airway immediately upon arrival.'
    };
  }
}

// ENDPOINT 1: Submit New Emergency Referral Case
app.post('/api/referral', async (req, res) => {
  try {
    const { 
      patientName, age, sex, heartRate, respiratoryRate, 
      spo2, temperature, observations, originKebele, 
      mewsScore, riskLevel, image 
    } = req.body;

    console.log(`\n🚨 NEW INCOMING PATIENT CASE ADMISSION`);
    console.log(`Patient: ${patientName} | Origin Clinic Kebele: ${originKebele}`);

    const aiAnalysis = await analyzePatientWithAI({
      patientName, age, sex, heartRate, respiratoryRate, spo2, temperature, observations, originKebele, mewsScore, riskLevel, image
    });

    const hospitalPrep = await getHospitalPreparations({
      patientName, age, sex, heartRate, respiratoryRate, spo2, temperature, observations, originKebele, mewsScore, riskLevel
    }, aiAnalysis);

    // Dynamic database document incremental indexing sequence calculation
    const totalCount = await Referral.countDocuments();

    // FIXED: Formulates document entry properties and performs the Mongoose save sequence securely
    const referral = new Referral({
      id: totalCount + 1,
      patientName, age, sex, heartRate, respiratoryRate, spo2, temperature, observations, originKebele, mewsScore, riskLevel, aiAnalysis, hospitalPrep,
      timestamp: new Date().toISOString()
    });
    await referral.save();

    // ⚡ SOCKET BROADCAST: Push fresh profile down tracking streams instantly
    io.emit('newReferral', referral);
    console.log(`💾 DATABASE LOGGED: Case #${referral.id} saved permanently to Cloud Collection.`);

    res.json({
      success: true,
      referralId: referral.id,
      message: '✓ Referral compiled and routed to Fana Hospital successfully.',
      aiGuidance: aiAnalysis,
      hospitalPrep: hospitalPrep
    });

  } catch (error) {
    console.error('Referral Routing Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ENDPOINT 2: Get All Referral Logs for Dashboard Panel
app.get('/api/referrals', async (req, res) => {
  try {
    const dataLogs = await Referral.find();
    res.json(dataLogs);
  } catch (err) {
    res.status(500).json([]);
  }
});

// ENDPOINT 3: Initialize tracking dynamically detecting Babile vs Gursum
app.post('/api/transport/start', async (req, res) => {
  try {
    const { referralId, vehicleNumber } = req.body;
    if (!referralId) return res.status(400).json({ error: 'Missing referral reference link' });

    const patientCase = await Referral.findOne({ id: parseInt(referralId) });
    if (!patientCase) return res.status(404).json({ error: 'Referral data profile not found.' });

    const locationCoordinates = {
      'babile': { lat: 9.2195, lng: 42.3314 },
      'gursum': { lat: 9.3514, lng: 42.3941 } 
    };

    const originKey = (patientCase.originKebele || '').toLowerCase().trim();
    const originSelection = locationCoordinates[originKey] || locationCoordinates['babile'];

    // 💾 MONGODB UPSERT TRANSACTION: Overwrite matching profile trackers or instantiate a new model log
    const activeRoute = await Transport.findOneAndUpdate(
      { referralId: parseInt(referralId) },
      {
        referralId: parseInt(referralId), vehicleNumber: vehicleNumber || 'AMB-FANA-01', status: 'EN_ROUTE',
        originName: originKey.toUpperCase() || 'BABILE', lastUpdated: new Date(),
        originCoords: originSelection, currentLocation: originSelection, history: [originSelection]
      },
      { upsert: true, new: true }
    );

    io.emit('transportStatusUpdate', activeRoute);
    console.log(`\n🚑 Live Transport Tracking activated from ${activeRoute.originName} heading to Fana Hospital.`);
    
    res.json({ success: true, transport: activeRoute });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ENDPOINT 4: Receive real-time GPS streaming updates from driver phone
app.post('/api/transport/location', async (req, res) => {
  try {
    const { referralId, lat, lng } = req.body;
    if (!referralId || !lat || !lng) return res.status(400).json({ error: 'Missing required coordinate metrics.' });

    // 💾 MONGODB SUB-ARRAY CONCURRENT PUSH: Adjust tracker sets and insert geolocation points into array history
    const updatedRoute = await Transport.findOneAndUpdate(
      { referralId: parseInt(referralId) },
      {
        $set: { currentLocation: { lat: parseFloat(lat), lng: parseFloat(lng) }, lastUpdated: new Date() },
        $push: { history: { lat: parseFloat(lat), lng: parseFloat(lng) } }
      },
      { new: true }
    );

    if (!updatedRoute) return res.status(404).json({ error: 'No tracker profile found.' });

    io.emit('locationUpdate', { referralId: parseInt(referralId), currentLocation: updatedRoute.currentLocation });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ENDPOINT 5: Fetch live coordinates update payload details for Leaflet Map
app.get('/api/transport/:referralId', async (req, res) => {
  try {
    const activeRoute = await Transport.findOne({ referralId: parseInt(req.params.referralId) });
    res.json(activeRoute || {});
  } catch (err) {
    res.status(500).json({});
  }
});

// Start network server listener configurations
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Sockets & Database engine live on port ${PORT}`));
