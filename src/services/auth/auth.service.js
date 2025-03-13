import { auth, db, storage } from '../../firebase.config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, updateDoc, getDoc, getDocs, collection } from 'firebase/firestore'; // Added getDocs, collection
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createUser, getUserById } from '../../models/user.model.js';

const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    let userData = await getUserById(user.uid);
    if (!userData) {
      await createUser(user.uid, { email });
      userData = await getUserById(user.uid);
    }

    return {
    uid: user.uid,
      email: user.email,
      role: userData.role,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

const addUser = async (userData) => {
  const { email, password, role = 'staff', fullName, phoneNumber, nationalId, emergencyContact, medicalConditions, image } = userData;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const profileData = {
      email,
      role,
      fullName: fullName || '',
      phoneNumber: phoneNumber || '',
      nationalId: nationalId || '',
      emergencyContact: emergencyContact || '',
      medicalConditions: medicalConditions || '',
      createdAt: new Date().toISOString(),
    };

    if (image) {
      const imageRef = ref(storage, `user-images/${user.uid}/${Date.now()}.jpg`);
      await uploadBytes(imageRef, image);
      profileData.imageUrl = await getDownloadURL(imageRef);
    }

    await setDoc(doc(db, 'users', user.uid), profileData);

    return {
      uid: user.uid,
      ...profileData,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

const updateUserProfile = async (uid, profileData) => {
  const { fullName, phoneNumber, nationalId, emergencyContact, medicalConditions, image } = profileData;

  try {
    const userRef = doc(db, 'users', uid);
    const updateData = {};

    if (fullName !== undefined) updateData.fullName = fullName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (nationalId !== undefined) updateData.nationalId = nationalId;
    if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
    if (medicalConditions !== undefined) updateData.medicalConditions = medicalConditions;

    if (image) {
      const imageRef = ref(storage, `user-images/${uid}/${Date.now()}.jpg`);
      await uploadBytes(imageRef, image);
      updateData.imageUrl = await getDownloadURL(imageRef);
    }

    if (Object.keys(updateData).length > 0) updateData.updatedAt = new Date().toISOString();

    await updateDoc(userRef, updateData);

    const updatedUser = await getUserById(uid);
    return updatedUser;
  } catch (error) {
    throw new Error(`Failed to update user profile: ${error.message}`);
  }
};

const getUserProfile = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    return { uid, ...userDoc.data() };
  } catch (error) {
    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }
};

const getAllUsers = async () => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const usersList = usersSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
    }));
    return usersList;
  } catch (error) {
    throw new Error(`Failed to fetch all users: ${error.message}`);
  }
};

export { loginUser, addUser, updateUserProfile, getUserProfile, getAllUsers };