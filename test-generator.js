import { startGenerator, stopGenerator, getGeneratorStats, updateGeneratorSettings, registerRandomPatient } from './randomgenerator.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Function to wait for specified milliseconds
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test function to run the generator
async function runGeneratorTest() {
  console.log('Starting accelerated patient generator test...');
  
  // Generate a single patient
  console.log('\n--- Generating single random patient ---');
  const patient = await registerRandomPatient();
  console.log('Generated patient:', patient);
  
  // Update generator settings for much faster testing
  console.log('\n--- Updating generator settings for high-speed generation ---');
  const settings = updateGeneratorSettings({
    interval: 200, // Generate a patient every 200ms
    maxPatientsPerHour: 20000 // Increase limit to allow high generation rate
  });
  console.log('New settings:', settings);
  
  // Start automated generation
  console.log('\n--- Starting high-speed patient generation ---');
  startGenerator();
  
  // Check stats every 5 seconds
  console.log('\n--- Monitoring generation progress ---');
  
  // First check after 5 seconds
  await wait(5000);
  let stats = getGeneratorStats();
  console.log('Stats after 5 seconds:', stats);
  
  // Second check after 10 seconds
  await wait(5000);
  stats = getGeneratorStats();
  console.log('Stats after 10 seconds:', stats);
  
  // Third check after 15 seconds
  await wait(5000);
  stats = getGeneratorStats();
  console.log('Stats after 15 seconds:', stats);
  
  // Final check after 20 seconds
  await wait(5000);
  stats = getGeneratorStats();
  console.log('\n--- Final stats after 20 seconds ---');
  console.log(stats);
  
  // Stop the generator
  console.log('\n--- Stopping generator ---');
  stopGenerator();
  
  // Verify we've generated enough patients
  if (stats.patientsGenerated >= 100) {
    console.log(`\nSUCCESS: Generated ${stats.patientsGenerated} patients in 20 seconds!`);
  } else {
    console.log(`\nWARNING: Only generated ${stats.patientsGenerated} patients. Target was 100+`);
  }
  
  console.log('\nTest completed!');
}

// Run the test
runGeneratorTest()
  .then(() => {
    console.log('High-speed generator test completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error during test:', err);
    process.exit(1);
  });