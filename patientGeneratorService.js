 import { startGenerator, stopGenerator, getGeneratorStats, updateGeneratorSettings, registerRandomPatient } from './randomgenerator.js';
import cron from 'node-cron';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let cronJob = null;

function configurePatientGenerator() {
  console.log('Configuring scheduled patient generator...');
  
  // 1 patient every hour = 3600000ms
  const settings = updateGeneratorSettings({
    interval: 36000000, // 1 hour in milliseconds
    patientsPerBatch: 1 // Generate 1 patient each time
  });
  
  console.log('Generator configured with settings:', settings);
  return settings;
}

async function generatePatientBatch() {
  const startTime = new Date();
  console.log(`Starting patient generation batch at ${startTime.toISOString()}`);
  
  startGenerator();
  
  // Generate 1 patient in this batch
  await registerRandomPatient();
  
  // Wait a short time to ensure registration completes
  await wait(1000);
  
  const stats = getGeneratorStats();
  console.log(`Batch generation stats:`, stats);
  
  stopGenerator();
  
  // Verify we generated 1 patient
  if (stats.patientsGenerated < 1) {
    console.log(`Patient generation failed, attempting again...`);
    await registerRandomPatient();
    console.log('Required patient generated successfully');
  }
}

function startPatientGeneratorService() {
  if (cronJob) {
    console.log('Patient generator service is already running');
    return false;
  }
  
  configurePatientGenerator();
  
  console.log('Starting scheduled patient generator service...');
  
  // Schedule to run every hour (at the beginning of each hour)
  cronJob = cron.schedule('0 * * * *', async () => {
    try {
      await generatePatientBatch();
    } catch (error) {
      console.error('Error during scheduled patient generation:', error);
    }
  });
  
  console.log('Patient generator scheduled to run every hour (1 patient/batch)');
  
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