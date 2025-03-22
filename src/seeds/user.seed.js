 // src/seeds/user.seed.js
import admin from 'firebase-admin';
import serviceAccount from '../config/order-smart-patient-firebase-adminsdk-fbsvc-5d1b3a05d4.json' assert { type: 'json' };

try {
  console.log('Service account project ID:', serviceAccount.project_id);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('Admin SDK initialized with project:', admin.app().options.credential.projectId);
} catch (error) {
  console.error('Initialization failed:', error.message, 'Code:', error.code);
  process.exit(1);
}

const db = admin.firestore();

// Expanded seed users with more variety
const seedUsers = [
  {
    email: 'admin@smartpatientorder.com',
    password: 'admin123',
    role: 'admin',
    fullName: 'Jean-Paul Mugisha',
    phoneNumber: '+250-788-123-456',
    nationalId: '1199000123456789',
    emergencyContact: 'Marie-Claire Uwimana - +250-788-987-654',
    medicalConditions: 'None',
  },
  {
    email: 'nurse1@smartpatientorder.com',
    password: 'nurse123',
    role: 'nurse',
    fullName: 'Aline Mukamana',
    phoneNumber: '+250-789-234-567',
    nationalId: '1199500234567890',
    emergencyContact: 'Pierre Nkurunziza - +250-788-456-789',
    medicalConditions: 'Asthma',
  },
  {
    email: 'doctor1@smartpatientorder.com',
    password: 'doctor123',
    role: 'doctor',
    fullName: 'Dr. Emmanuel Rukundo',
    phoneNumber: '+250-788-345-678',
    nationalId: '1198800345678901',
    emergencyContact: 'Grace Nyirahabimana - +250-789-567-890',
    medicalConditions: 'None',
    roomNumber: 'D101',
  },
  {
    email: 'nurse2@smartpatientorder.com',
    password: 'nurse456',
    role: 'nurse',
    fullName: 'Sophie Uwamahoro',
    phoneNumber: '+250-790-123-456',
    nationalId: '1199200456789012',
    emergencyContact: 'John Mugabo - +250-788-654-321',
    medicalConditions: 'None',
  },
  {
    email: 'doctor2@smartpatientorder.com',
    password: 'doctor456',
    role: 'doctor',
    fullName: 'Dr. Diane Gashumba',
    phoneNumber: '+250-788-567-890',
    nationalId: '1198700567890123',
    emergencyContact: 'Paul Kagame - +250-789-123-456',
    medicalConditions: 'Hypertension',
    roomNumber: 'D102',
  },
  {
    email: 'staff@smartpatientorder.com',
    password: 'staff123',
    role: 'staff',
    fullName: 'Peter Niyonkuru',
    phoneNumber: '+250-791-234-567',
    nationalId: '1199300678901234',
    emergencyContact: 'Annette Tumukunde - +250-788-789-012',
    medicalConditions: 'None',
  },
];

const seedDatabase = async () => {
  console.log('Starting user seeding...');

  for (const userData of seedUsers) {
    const { 
      email, 
      password, 
      role, 
      fullName, 
      phoneNumber, 
      nationalId, 
      emergencyContact, 
      medicalConditions,
      roomNumber 
    } = userData;

    try {
      console.log(`Attempting to create user: ${email}`);
      const userRecord = await admin.auth().createUser({
        email,
        password,
      });
      console.log(`User ${email} created with UID: ${userRecord.uid}`);

      const profileData = {
        email,
        role: role || 'staff',
        fullName: fullName || '',
        phoneNumber: phoneNumber || '',
        nationalId: nationalId || '',
        emergencyContact: emergencyContact || '',
        medicalConditions: medicalConditions || '',
        imageUrl: '', // Default empty image URL
        availability: role?.toLowerCase().includes('doctor') || 
                     role?.toLowerCase().includes('nurse') ? 
                     true : null,
        ...(roomNumber ? { roomNumber } : {}),
        createdAt: new Date().toISOString(),
      };

      await db.collection('users').doc(userRecord.uid).set(profileData);
      console.log(`User ${email} profile added to Firestore`);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log(`User ${email} already exists, updating...`);
        const user = await admin.auth().getUserByEmail(email);
        await db.collection('users').doc(user.uid).update({
          ...userData,
          updatedAt: new Date().toISOString()
        });
      } else {
        console.error(`Error seeding user ${email}: ${error.message} (Code: ${error.code})`);
      }
    }
  }

  console.log('User seeding completed!');
};

seedDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });