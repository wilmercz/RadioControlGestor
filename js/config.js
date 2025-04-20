// Configuración Firebase en modo compat
const firebaseConfig = {
  apiKey: "AIzaSyAdWnEkNfuJcQNSIIMHGfLb_HEcGQ9Ctw0",
  authDomain: "arki-service-autoridades.firebaseapp.com",
  databaseURL: "https://arki-service-autoridades.firebaseio.com",
  projectId: "arki-service-autoridades",
  storageBucket: "arki-service-autoridades.appspot.com",
  messagingSenderId: "829954736380",
  appId: "1:829954736380:web:97228b09bae0ea04d69779"
};

// Inicializar Firebase con compat
firebase.initializeApp(firebaseConfig);
