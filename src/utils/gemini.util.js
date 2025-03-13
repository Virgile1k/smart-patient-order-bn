import axios from 'axios';

const GEMINI_API_KEY = 'AIzaSyApNQiQ0Dzh9YQdQ92GjJWFR5iqTHAovg0';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Utility function to calculate BMI
const calculateBMI = (heightCm, weightKg) => {
  if (!heightCm || !weightKg) return null;
  const heightM = heightCm / 100;
  return (weightKg / (heightM * heightM)).toFixed(1);
};

// Process vitals and add derived metrics
const processVitals = (vitals) => {
  // Extract blood pressure components if in format "120/80"
  let systolic = null;
  let diastolic = null;
  
  if (typeof vitals.bloodPressure === 'string' && vitals.bloodPressure.includes('/')) {
    const [sys, dia] = vitals.bloodPressure.split('/').map(v => parseInt(v.trim(), 10));
    systolic = sys;
    diastolic = dia;
  } else if (vitals.bp_sys && vitals.bp_dia) {
    systolic = vitals.bp_sys;
    diastolic = vitals.bp_dia;
  }

  // Calculate BMI if height and weight are available
  const bmi = calculateBMI(vitals.height, vitals.weight);
  
  return {
    heartRate: vitals.heartRate,
    bodyTemperature: vitals.bodyTemperature,
    height: vitals.height,
    weight: vitals.weight,
    bmi,
    systolic,
    diastolic,
    age: vitals.age || null
  };
};

// Fallback severity classifier based on medical standards
const classifySeverityLocally = (processedVitals) => {
  const {
    heartRate,
    bodyTemperature,
    bmi,
    systolic,
    diastolic,
    age
  } = processedVitals;

  // Critical conditions (any of these means critical)
  if (
    heartRate < 40 || heartRate > 120 ||
    bodyTemperature < 35 || bodyTemperature > 39 ||
    (bmi && (bmi < 17 || bmi > 30)) ||
    (systolic && (systolic < 80 || systolic > 180)) ||
    (diastolic && (diastolic < 50 || diastolic > 120))
  ) {
    return 'Critical';
  }

  // Moderate conditions
  if (
    heartRate < 50 || heartRate > 100 ||
    bodyTemperature < 36 || bodyTemperature > 38 ||
    (bmi && (bmi < 18.5 || bmi > 25)) ||
    (systolic && (systolic < 90 || systolic > 140)) ||
    (diastolic && (diastolic < 60 || diastolic > 90)) ||
    (age && (age < 10 || age > 55))
  ) {
    return 'Moderate';
  }

  // Otherwise normal
  return 'Normal';
};

// Main function to analyze vitals with Gemini or fallback
export const analyzeVitalsWithGemini = async (vitals) => {
  try {
    // Process and enrich vitals data
    const processedVitals = processVitals(vitals);
    
    // Prepare blood pressure string for the prompt
    let bpString = vitals.bloodPressure;
    if (processedVitals.systolic && processedVitals.diastolic) {
      bpString = `${processedVitals.systolic}/${processedVitals.diastolic} mmHg`;
    }

    // Comprehensive prompt including all available data
    const prompt = `
      Analyze the following patient vitals using standard medical thresholds and classify severity as "Critical", "Moderate", or "Normal":
      
      - Heart Rate: ${vitals.heartRate} bpm (Normal: 60-100, Moderate: 50-59 or 101-120, Critical: <50 or >120)
      - Blood Pressure: ${bpString} (Normal: 90-140/60-90, Moderate: 140-159/90-99, Critical: >160/100 or <90/60)
      - Body Temperature: ${vitals.bodyTemperature} °C (Normal: 36.1-37.2, Moderate: 37.3-38, Critical: >38 or <36)
      ${processedVitals.bmi ? `- BMI: ${processedVitals.bmi} (Normal: 18.5-25, Moderate: 25-30 or 17-18.5, Critical: >30 or <17)` : ''}
      ${processedVitals.age ? `- Age: ${processedVitals.age} years (consider more careful monitoring for ages <10 or >55)` : ''}
      
      Return only a single word classification as "Severity: [Critical/Moderate/Normal]" based on the most severe condition present.
    `;

    // Call Gemini API
    const response = await axios.post(
      GEMINI_API_URL,
      { contents: [{ parts: [{ text: prompt }] }] },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        timeout: 5000, // 5 second timeout to ensure fallback happens quickly
      }
    );

    // Extract severity from response
    const result = response.data.candidates[0].content.parts[0].text;
    const severityMatch = result.match(/Severity:\s*(\w+)/i);
    
    if (severityMatch && ['Critical', 'Moderate', 'Normal'].includes(severityMatch[1])) {
      return severityMatch[1];
    }
    
    // If Gemini response doesn't contain a valid classification, use fallback
    console.log('Gemini response did not contain valid classification, using fallback');
    return classifySeverityLocally(processedVitals);
    
  } catch (error) {
    console.error('Gemini API error:', error.message);
    
    // Use our local classification function as fallback
    const processedVitals = processVitals(vitals);
    return classifySeverityLocally(processedVitals);
  }
};

// -------------------- NEW QUEUE ALLOCATION SYSTEM --------------------

// Priority values for severity levels (higher number = higher priority)
const SEVERITY_PRIORITY = {
  'Critical': 100,
  'Moderate': 50,
  'Normal': 10
};

// Maximum wait time thresholds (in minutes) before priority boost
const MAX_WAIT_TIME = {
  'Critical': 10,  // Critical patients shouldn't wait more than 10 minutes
  'Moderate': 30,  // Moderate patients shouldn't wait more than 30 minutes
  'Normal': 60     // Normal patients shouldn't wait more than 60 minutes
};

// Priority boost per minute of waiting (increases over time)
const WAIT_TIME_BOOST = {
  'Critical': 2.0,  // Priority boost per minute for critical patients
  'Moderate': 1.0,  // Priority boost per minute for moderate patients
  'Normal': 0.5     // Priority boost per minute for normal patients
};

// Patient queue class
export class PatientQueue {
  constructor() {
    this.queue = [];
    this.resourcePool = {
      doctors: 0,
      nurses: 0,
      rooms: 0
    };
  }

  // Set available resources
  setResources(doctors, nurses, rooms) {
    this.resourcePool = { doctors, nurses, rooms };
    return this.resourcePool;
  }

  // Add a patient to the queue
  async addPatient(patient) {
    // Make sure patient has basic required fields
    if (!patient.id || !patient.vitals) {
      throw new Error('Patient must have id and vitals');
    }

    // Analyze vitals to get severity
    const severity = await analyzeVitalsWithGemini(patient.vitals);
    
    // Create queue entry with initial priority based on severity
    const queueEntry = {
      patient,
      severity,
      entryTime: new Date(),
      priorityScore: SEVERITY_PRIORITY[severity] || 0
    };
    
    // Add to queue
    this.queue.push(queueEntry);
    
    // Sort queue by priority score (higher = higher priority)
    this.sortQueue();
    
    return {
      queuePosition: this.getPatientPosition(patient.id),
      estimatedWaitTime: this.estimateWaitTime(queueEntry),
      severity
    };
  }

  // Get current queue length
  getQueueLength() {
    return this.queue.length;
  }

  // Find patient position in queue (1-based index)
  getPatientPosition(patientId) {
    const index = this.queue.findIndex(entry => entry.patient.id === patientId);
    return index === -1 ? null : index + 1;
  }

  // Update priority scores for all patients based on wait time
  updatePriorities() {
    const now = new Date();
    
    this.queue.forEach(entry => {
      // Calculate wait time in minutes
      const waitTimeMinutes = (now - entry.entryTime) / (1000 * 60);
      
      // Base priority from severity
      let newPriority = SEVERITY_PRIORITY[entry.severity] || 0;
      
      // Add wait time boost that increases with time
      const timeBoost = waitTimeMinutes * WAIT_TIME_BOOST[entry.severity];
      newPriority += timeBoost;
      
      // Add extra boost if patient has waited beyond the maximum recommended time
      if (waitTimeMinutes > MAX_WAIT_TIME[entry.severity]) {
        const overageMinutes = waitTimeMinutes - MAX_WAIT_TIME[entry.severity];
        // Exponential boost for waiting beyond the maximum time
        newPriority += (overageMinutes * overageMinutes) / 10;
      }
      
      // Update priority score
      entry.priorityScore = newPriority;
    });
    
    // Re-sort queue after updating priorities
    this.sortQueue();
  }

  // Sort queue by priority score (descending)
  sortQueue() {
    this.queue.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  // Estimate wait time for a patient in minutes
  estimateWaitTime(queueEntry) {
    // Get patient position
    const position = this.getPatientPosition(queueEntry.patient.id);
    if (!position) return null;
    
    // Base calculation on available resources and queue position
    const availableResources = Math.max(1, 
      this.resourcePool.doctors + 
      Math.floor(this.resourcePool.nurses / 2)
    );
    
    // Estimate patients that can be seen per hour based on severity
    const patientsPerHour = {
      'Critical': 1,    // Critical patients take about 60 minutes
      'Moderate': 2,    // Moderate patients take about 30 minutes
      'Normal': 4       // Normal patients take about 15 minutes
    };
    
    // Calculate position-based wait time
    const positionWaitFactor = Math.ceil(position / availableResources);
    const severityTimeMultiplier = 60 / patientsPerHour[queueEntry.severity];
    
    // Calculate estimated wait time in minutes, accounting for patients ahead
    let estimatedWait = 0;
    for (let i = 0; i < position - 1; i++) {
      const patientAhead = this.queue[i];
      const patientServiceTime = 60 / patientsPerHour[patientAhead.severity];
      // Only add partial time for patients that can be handled in parallel
      estimatedWait += patientServiceTime / Math.min(i + 1, availableResources);
    }
    
    // Add the time for the current patient
    estimatedWait += severityTimeMultiplier;
    
    return Math.round(estimatedWait);
  }

  // Get next patient(s) to be served
  getNextPatients(count = 1) {
    // Update priorities before selecting next patients
    this.updatePriorities();
    
    // Return the requested number of patients from the top of the queue
    return this.queue.slice(0, count);
  }

  // Remove patient from queue (when they're being served)
  removePatient(patientId) {
    const index = this.queue.findIndex(entry => entry.patient.id === patientId);
    if (index !== -1) {
      const removed = this.queue.splice(index, 1)[0];
      return removed;
    }
    return null;
  }

  // Get all patients in queue with their current status
  getAllPatients() {
    // Update priorities first
    this.updatePriorities();
    
    // Return queue with additional information
    return this.queue.map((entry, index) => ({
      ...entry,
      position: index + 1,
      waitTime: Math.round((new Date() - entry.entryTime) / (1000 * 60)),
      estimatedRemainingWait: this.estimateWaitTime(entry)
    }));
  }

  // Get statistics about current queue state
  getQueueStats() {
    if (this.queue.length === 0) {
      return {
        totalPatients: 0,
        averageWaitTime: 0,
        bySeverity: {
          Critical: 0,
          Moderate: 0,
          Normal: 0
        }
      };
    }

    // Calculate current wait times
    const now = new Date();
    const waitTimes = this.queue.map(entry => (now - entry.entryTime) / (1000 * 60));
    
    // Count patients by severity
    const counts = {
      Critical: 0,
      Moderate: 0,
      Normal: 0
    };
    
    this.queue.forEach(entry => {
      counts[entry.severity] = (counts[entry.severity] || 0) + 1;
    });
    
    return {
      totalPatients: this.queue.length,
      averageWaitTime: waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length,
      longestWait: Math.max(...waitTimes),
      shortestWait: Math.min(...waitTimes),
      bySeverity: counts
    };
  }
}
