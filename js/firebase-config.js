// 🌸 Antika Store - Firebase Configuration
// Firebase SDK Configuration - https://console.firebase.google.com/
// ⚠️ Firebase is OPTIONAL - the app works without it

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC9R59gNKm358btsIgHI1BHEKRdBoCRCsA",
    authDomain: "antika-store-88ae2.firebaseapp.com",
    projectId: "antika-store-88ae2",
    storageBucket: "antika-store-88ae2.firebasestorage.app",
    messagingSenderId: "547769482267",
    appId: "1:547769482267:web:5e107a7f08bd64efa58cbe",
    measurementId: "G-Y0PY63E1PY"
};

// Initialize Firebase when the script loads
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseStorage = null;

// Check if Firebase SDK is loaded
function initFirebase() {
    try {
        if (typeof firebase !== 'undefined' && firebase.apps) {
            // Initialize only if not already initialized
            if (firebase.apps.length === 0) {
                // Initialize Firebase
                firebaseApp = firebase.initializeApp(firebaseConfig);
                firebaseAuth = firebase.auth ? firebase.auth() : null;
                firebaseDb = firebase.firestore ? firebase.firestore() : null;
                // Note: storage may not be available in compat mode
                if (firebase.storage) {
                    try {
                        firebaseStorage = firebase.storage();
                    } catch (e) {
                        console.warn('⚠️ Firebase Storage not available (this is OK, it\'s optional)');
                        firebaseStorage = null;
                    }
                }
            } else {
                // Already initialized
                firebaseApp = firebase.app();
                firebaseAuth = firebase.auth ? firebase.auth() : null;
                firebaseDb = firebase.firestore ? firebase.firestore() : null;
            }
            
            console.log('✅ Firebase initialized successfully (Auth:' + (firebaseAuth ? '✓' : '✗') + ', DB:' + (firebaseDb ? '✓' : '✗') + ')');
            return true;
        } else {
            console.warn('⚠️ Firebase SDK not loaded yet');
            return false;
        }
    } catch (err) {
        console.warn('⚠️ Firebase initialization skipped (this is OK):', err.message);
        // Don't throw - Firebase is optional
        return false;
    }
}

// Try to initialize immediately if Firebase is already loaded
if (typeof firebase !== 'undefined') {
    initFirebase();
}

// Export for use in other files
window.firebaseConfig = firebaseConfig;
window.initFirebase = initFirebase;
window.getFirebaseAuth = () => firebaseAuth;
window.getFirebaseDb = () => firebaseDb;
window.getFirebaseStorage = () => firebaseStorage;
