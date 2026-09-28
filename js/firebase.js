import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
    createUserWithEmailAndPassword,
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    deleteUser,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
    addDoc,
    collection,
    getDocs,
    getFirestore,
    serverTimestamp,
    setDoc,
    doc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
    getDownloadURL,
    getStorage,
    ref,
    uploadBytes
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

const firebaseConfig = {
    apiKey: 'AIzaSyAOhlKTy1ohANEuZij2WTLa66AkDKM5CsY',
    authDomain: 'noteshub-91fd8.firebaseapp.com',
    projectId: 'noteshub-91fd8',
    storageBucket: 'noteshub-91fd8.firebasestorage.app',
    messagingSenderId: '462087411783',
    appId: '1:462087411783:web:2822b5e29d99958a40f962',
    measurementId: 'G-X3HJBMKPKH'
};

export const isFirebaseConfigured = !Object.values(firebaseConfig).some((value) => value.includes('YOUR_'));

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;

export async function registerWithFirebase(name, email, password) {
    const credentials = await createUserWithEmailAndPassword(auth, email, password);
    try {
        await updateProfile(credentials.user, { displayName: name });
        await setDoc(doc(db, 'users', credentials.user.uid), {
            name,
            email: email.toLowerCase(),
            role: 'student',
            createdAt: serverTimestamp()
        });
    } catch (error) {
        await deleteUser(credentials.user).catch(() => {});
        throw error;
    }
    return { name, email: email.toLowerCase(), uid: credentials.user.uid };
}

export async function loginWithFirebase(email, password) {
    const credentials = await signInWithEmailAndPassword(auth, email, password);
    return {
        name: credentials.user.displayName || 'Student',
        email: credentials.user.email,
        uid: credentials.user.uid
    };
}

export function logoutFromFirebase() {
    return signOut(auth);
}

export async function getFirebaseNotes() {
    const snapshot = await getDocs(collection(db, 'notes'));
    return snapshot.docs.map((note) => ({ id: note.id, ...note.data() }));
}

export async function getFirebaseUsers() {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map((user) => ({ id: user.id, ...user.data() }));
}

export async function uploadNoteToFirebase(note, file, user) {
    const fileRef = ref(storage, `notes/${user.uid}/${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    const fileUrl = await getDownloadURL(fileRef);
    const noteReference = await addDoc(collection(db, 'notes'), {
        ...note,
        fileName: file.name,
        fileUrl,
        uploadedBy: user.email,
        uploadedByName: user.name,
        uploadedAt: serverTimestamp(),
        status: 'pending',
        rating: 0,
        reviews: 0,
        downloads: 0
    });
    return noteReference.id;
}