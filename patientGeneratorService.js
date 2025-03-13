import { startGenerator, stopGenerator, getGeneratorStats, updateGeneratorSettings, registerRandomPatient } from './randomgenerator.js';
import cron from 'node-cron';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let cronJob = null;

function configurePatientGenerator() {
  console.log('Configuring scheduled patient generator...');
  
  // 10 patients every 2 minutes = 120000ms
  const settings = updateGeneratorSettings({
    interval: 120000, // 2 minutes in milliseconds
    patientsPerBatch: 10 // Generate 10 patients each time
  });
  
  console.log('Generator configured with settings:', settings);
  return settings;
}

async function generatePatientBatch() {
  const startTime = new Date();
  console.log(`Starting patient generation batch at ${startTime.toISOString()}`);
  
  startGenerator();
  
  // Generate 10 patients in this batch
  const promises = Array(10).fill().map(() => registerRandomPatient());
  await Promise.all(promises);
  
  // Wait a short time to ensure all registrations complete
  await wait(1000);
  
  const stats = getGeneratorStats();
  console.log(`Batch generation stats:`, stats);
  
  stopGenerator();
  
  // Verify we generated 10 patients
  if (stats.patientsGenerated < 10) {
    console.log(`Generating ${10 - stats.patientsGenerated} additional patients to meet requirement...`);
    const additionalPromises = Array(10 - stats.patientsGenerated).fill().map(() => registerRandomPatient());
    await Promise.all(additionalPromises);
    console.log('Required patients generated successfully');
  }
}

function startPatientGeneratorService() {
  if (cronJob) {
    console.log('Patient generator service is already running');
    return false;
  }
  
  configurePatientGenerator();
  
  console.log('Starting scheduled patient generator service...');
  
  // Schedule to run every 2 minutes
  cronJob = cron.schedule('*/2 * * * *', async () => {
    try {
      await generatePatientBatch();
    } catch (error) {
      console.error('Error during scheduled patient generation:', error);
    }
  });
  
  console.log('Patient generator scheduled to run every 2 minutes (10 patients/batch)');
  
  generatePatientBatch()
    .catch(err => console.error('Error during initial patient generation:', err));
  
  return true;
}

function stopPatientGeneratorService() {
  if (!cronJob) {
    console.log('Patient generator service is not running');
    return false;
  }
  
  console.log('Stopping scheduled patient generator service...');
  cronJob.stop();
  stopGenerator();
  cronJob = null;
  
  console.log('Patient generator service stopped');
  return true;
}

export {
  startPatientGeneratorService,
  stopPatientGeneratorService,
  generatePatientBatch
};