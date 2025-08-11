import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
    apiKey: "AIzaSyDYj_YWDOAyTRuUX4QtGaR9REd9Ezu0c3c",
    authDomain: "lingoquesto-chat.firebaseapp.com",
    projectId: "lingoquesto-chat",
    storageBucket: "lingoquesto-chat.firebasestorage.app",
    messagingSenderId: "883904768988",
    appId: "1:883904768988:web:0086d23e9f4558cff73d19"
};

const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

// Export the app instance for connection status
export { app, db }