import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

// La configuración web de Firebase es pública por diseño: identifica al
// proyecto, no autoriza nada. El control de acceso vive en firestore.rules.
const app = initializeApp({
  apiKey: "AIzaSyB40n3UJdh2FO-x1NUH29n5ndnPE9heFL8",
  authDomain: "mi-entrenamiento-fv.firebaseapp.com",
  projectId: "mi-entrenamiento-fv",
  storageBucket: "mi-entrenamiento-fv.firebasestorage.app",
  messagingSenderId: "482651561760",
  appId: "1:482651561760:web:4353f1ccc9984ed79d4145",
});

export const auth = getAuth(app);
// Caché persistente: registrar una sesión sin señal escribe en IndexedDB y
// sincroniza al volver la conexión. El tabManager permite varias pestañas.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export const proveedorGoogle = new GoogleAuthProvider();
