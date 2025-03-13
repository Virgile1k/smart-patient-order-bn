import { registerPatient } from './src/services/patient/patient.service.js';

// Configuration for the generator
const GENERATOR_CONFIG = {
  interval: 1000, // 10 seconds between patient generation
  enabled: false,  // Start disabled
  maxPatientsPerHour: 100, // Maximum patients to generate per hour
  generatedCount: 0,
  startTime: null,
  timerId: null
};

// Data for random patient generation
const RANDOM_DATA = {
  firstNames: ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 
              'William', 'Susan', 'Richard', 'Jessica', 'Joseph', 'Sarah', 'Thomas', 'Karen', 'Charles', 'Nancy',
              'Sofia', 'Aiden', 'Olivia', 'Jackson', 'Emma', 'Lucas', 'Ava', 'Liam', 'Mia', 'Noah',
              'Raj', 'Priya', 'Wei', 'Mei', 'Carlos', 'Maria', 'Hassan', 'Fatima', 'Kwame', 'Ama'],
  
  lastNames: ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor',
             'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson',
             'Patel', 'Kim', 'Singh', 'Wang', 'Lopez', 'Gonzalez', 'Nguyen', 'Ali', 'Chen', 'Rodriguez',
             'Lee', 'Khan', 'Sharma', 'Hernandez', 'Mitchell', 'Brooks', 'Gupta', 'Choi', 'Okafor', 'Diaz'],
  
  streets: ['Main St', 'Oak Ave', 'Maple Rd', 'Cedar Ln', 'Pine St', 'Elm Dr', 'Washington Ave', 'Jefferson Blvd',
            'Lincoln Rd', 'Park Place', 'Sunset Blvd', 'Lake View Dr', 'River Rd', 'Valley Way', 'Mountain View',
            'Orchard Lane', 'Forest Ave', 'Meadow Ln', 'Highland Dr', 'Willow Way'],
  
  cities: ['Springfield', 'Riverdale', 'Oakville', 'Fairview', 'Lakeside', 'Milltown', 'Centerville', 'Greenfield',
          'Newport', 'Kingston', 'Burlington', 'Salem', 'Madison', 'Georgetown', 'Franklin', 'Arlington',
          'Clayton', 'Bristol', 'Oxford', 'Ashland']
};

// Generate random integer between min and max (inclusive)
const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Generate random formatted phone number
const generatePhoneNumber = () => {
  const area = getRandomInt(100, 999);
  const exchange = getRandomInt(100, 999);
  const subscriber = getRandomInt(1000, 9999);
  return `${area}-${exchange}-${subscriber}`;
};

// Generate random email based on name
const generateEmail = (firstName, lastName) => {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'example.com'];
  const randomDomain = domains[Math.floor(Math.random() * domains.length)];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomDomain}`;
};

// Generate random address
const generateAddress = () => {
  const number = getRandomInt(100, 9999);
  const street = RANDOM_DATA.streets[Math.floor(Math.random() * RANDOM_DATA.streets.length)];
  const city = RANDOM_DATA.cities[Math.floor(Math.random() * RANDOM_DATA.cities.length)];
  const zip = getRandomInt(10000, 99999);
  return `${number} ${street}, ${city}, ${zip}`;
};

// Generate random vitals data with reasonable medical values
const generateVitals = (age, gender) => {
  // Base values that will be adjusted by age and gender
  let baseHeartRate = 75;
  let baseBloodPressureSystolic = 120;
  let baseBloodPressureDiastolic = 80;
  let baseTemperature = 37.0;
  
  // Adjust for age
  if (age < 12) {
    baseHeartRate += 15;
    baseBloodPressureSystolic -= 20;
    baseBloodPressureDiastolic -= 10;
    baseTemperature += 0.2;
  } else if (age > 65) {
    baseHeartRate -= 5;
    baseBloodPressureSystolic += 15;
    baseBloodPressureDiastolic += 5;
  }
  
  // Minor adjustment for gender
  if (gender === 'Female') {
    baseHeartRate += 3;
  }
  
  // Add randomness to values to simulate variability
  // Heart rate: normal (60-100 bpm)
  const heartRate = baseHeartRate + getRandomInt(-15, 15);
  
  // Blood pressure: normal (~120/80 mmHg)
  const bloodPressureSystolic = baseBloodPressureSystolic + getRandomInt(-20, 30);
  const bloodPressureDiastolic = baseBloodPressureDiastolic + getRandomInt(-10, 15);
  const bloodPressure = `${bloodPressureSystolic}/${bloodPressureDiastolic}`;
  
  // Temperature: normal (~37°C / 98.6°F)
  const bodyTemperature = +(baseTemperature + (Math.random() * 1.4 - 0.7)).toFixed(1);
  
  // Height based on age and gender (in cm)
  let baseHeight = 170;
  if (age < 12) {
    baseHeight = 120 + (age * 5);
  } else if (age < 18) {
    baseHeight = 150 + ((age - 12) * 3);
  }
  if (gender === 'Female') {
    baseHeight -= 10;
  }
  const height = baseHeight + getRandomInt(-10, 10);
  
  // Weight based on height and age (roughly following BMI trends)
  const idealWeight = ((height / 100) * (height / 100) * 22);
  const weight = Math.round(idealWeight + getRandomInt(-10, 15));
  
  return {
    heartRate,
    bloodPressure,
    bodyTemperature,
    height,
    weight,
    age
  };
};

// Generate completely random patient data
const generateRandomPatient = () => {
  const firstName = RANDOM_DATA.firstNames[Math.floor(Math.random() * RANDOM_DATA.firstNames.length)];
  const lastName = RANDOM_DATA.lastNames[Math.floor(Math.random() * RANDOM_DATA.lastNames.length)];
  const fullName = `${firstName} ${lastName}`;
  
  // Generate random age, weighted toward adult range
  let age;
  const ageGroup = Math.random();
  if (ageGroup < 0.15) {
    // Children (0-12)
    age = getRandomInt(1, 12);
  } else if (ageGroup < 0.25) {
    // Teenagers (13-19)
    age = getRandomInt(13, 19);
  } else if (ageGroup < 0.65) {
    // Adults (20-65)
    age = getRandomInt(20, 65);
  } else {
    // Seniors (66-95)
    age = getRandomInt(66, 95);
  }
  
  // Gender
  const gender = Math.random() > 0.5 ? 'Male' : 'Female';
  
  // Create contact information
  const contact = {
    name: fullName,
    contactNumber: generatePhoneNumber(),
    email: generateEmail(firstName, lastName),
    address: generateAddress(),
    gender
  };
  
  // Generate vitals data
  const vitals = generateVitals(age, gender);
  
  // Add some abnormal vitals based on various probabilities
  const abnormalFactor = Math.random();
  if (abnormalFactor < 0.05) {
    // 5% chance of critical vitals
    if (Math.random() > 0.5) {
      vitals.heartRate = getRandomInt(120, 150); // Very high heart rate
    } else {
      vitals.bodyTemperature = getRandomInt(39, 41) + Math.random(); // High fever
    }
  } else if (abnormalFactor < 0.25) {
    // 20% chance of moderate abnormality
    if (Math.random() > 0.5) {
      const systolic = getRandomInt(140, 160);
      const diastolic = getRandomInt(90, 100);
      vitals.bloodPressure = `${systolic}/${diastolic}`; // Elevated blood pressure
    } else {
      vitals.heartRate = getRandomInt(100, 119); // Elevated heart rate
    }
  }
  
  // Generate random notes
  const symptomsPool = [
    'headache', 'dizziness', 'nausea', 'fatigue', 'fever', 'cough', 'sore throat', 
    'shortness of breath', 'chest pain', 'abdominal pain', 'back pain', 'joint pain', 
    'muscle aches', 'rash', 'swelling', 'blurred vision', 'ear pain'
  ];
  
  // Select 0-3 random symptoms
  const symptomCount = Math.floor(Math.random() * 4);
  const symptoms = [];
  for (let i = 0; i < symptomCount; i++) {
    const symptom = symptomsPool[Math.floor(Math.random() * symptomsPool.length)];
    if (!symptoms.includes(symptom)) {
      symptoms.push(symptom);
    }
  }
  
  // Format notes
  let additionalNotes = '';
  if (symptoms.length > 0) {
    additionalNotes = `Patient complains of ${symptoms.join(', ')}.`;
    
    // Add duration for first symptom
    if (symptoms.length > 0) {
      const durations = ['since yesterday', 'for the past week', 'for several days', 'for about an hour'];
      const duration = durations[Math.floor(Math.random() * durations.length)];
      additionalNotes += ` ${symptoms[0].charAt(0).toUpperCase() + symptoms[0].slice(1)} ${duration}.`;
    }
  }
  
  // Complete patient data
  return {
    contact,
    vitals,
    additionalNotes
  };
};

// Register a random patient
const registerRandomPatient = async () => {
  try {
    // Generate random patient data
    const patientData = generateRandomPatient();
    
    // Register the patient
    const result = await registerPatient(patientData);
    
    console.log(`Registered random patient ${patientData.contact.name} with ID ${result.patientId}`);
    GENERATOR_CONFIG.generatedCount++;
    
    return result;
  } catch (error) {
    console.error(`Error registering random patient: ${error.message}`);
    return null;
  }
};

// Start the generator
const startGenerator = () => {
  if (GENERATOR_CONFIG.enabled) {
    console.log('Generator is already running');
    return false;
  }
  
  GENERATOR_CONFIG.enabled = true;
  GENERATOR_CONFIG.generatedCount = 0;
  GENERATOR_CONFIG.startTime = new Date();
  
  console.log(`Starting random patient generator at interval of ${GENERATOR_CONFIG.interval}ms`);
  
  // Schedule the first patient immediately
  registerRandomPatient();
  
  // Schedule recurring generation
  GENERATOR_CONFIG.timerId = setInterval(async () => {
    // Check if we're exceeding the max patients per hour
    const elapsedHours = (new Date() - GENERATOR_CONFIG.startTime) / (1000 * 60 * 60);
    const hourlyRate = GENERATOR_CONFIG.generatedCount / (elapsedHours || 0.01); // Avoid division by zero
    
    if (hourlyRate < GENERATOR_CONFIG.maxPatientsPerHour) {
      await registerRandomPatient();
    } else {
      console.log(`Skipping generation: Max hourly rate of ${GENERATOR_CONFIG.maxPatientsPerHour} reached`);
    }
  }, GENERATOR_CONFIG.interval);
  
  return true;
};

// Stop the generator
const stopGenerator = () => {
  if (!GENERATOR_CONFIG.enabled) {
    console.log('Generator is not running');
    return false;
  }
  
  clearInterval(GENERATOR_CONFIG.timerId);
  GENERATOR_CONFIG.enabled = false;
  GENERATOR_CONFIG.timerId = null;
  
  const elapsedTime = (new Date() - GENERATOR_CONFIG.startTime) / 1000;
  console.log(`Stopped generator after ${elapsedTime.toFixed(1)} seconds. Generated ${GENERATOR_CONFIG.generatedCount} patients.`);
  
  return true;
};

// Get generator stats
const getGeneratorStats = () => {
  if (!GENERATOR_CONFIG.enabled || !GENERATOR_CONFIG.startTime) {
    return {
      status: 'stopped',
      patientsGenerated: 0,
      runTime: 0
    };
  }
  
  const elapsedMs = new Date() - GENERATOR_CONFIG.startTime;
  const elapsedMinutes = elapsedMs / (1000 * 60);
  
  return {
    status: 'running',
    patientsGenerated: GENERATOR_CONFIG.generatedCount,
    runTime: elapsedMinutes.toFixed(2),
    runTimeSeconds: Math.round(elapsedMs / 1000),
    patientsPerHour: (GENERATOR_CONFIG.generatedCount / (elapsedMinutes / 60)).toFixed(2),
    interval: GENERATOR_CONFIG.interval / 1000
  };
};

// Update generator settings
const updateGeneratorSettings = (settings) => {
  // Stop generator if it's running
  const wasRunning = GENERATOR_CONFIG.enabled;
  if (wasRunning) {
    stopGenerator();
  }
  
  // Update settings
  if (settings.interval) {
    GENERATOR_CONFIG.interval = Math.max(2000, settings.interval); // Minimum 2 seconds
  }
  
  if (settings.maxPatientsPerHour) {
    GENERATOR_CONFIG.maxPatientsPerHour = Math.max(1, settings.maxPatientsPerHour);
  }
  
  // Restart if it was running
  if (wasRunning) {
    startGenerator();
  }
  
  return GENERATOR_CONFIG;
};

export {
  startGenerator,
  stopGenerator,
  getGeneratorStats,
  updateGeneratorSettings,
  registerRandomPatient
};