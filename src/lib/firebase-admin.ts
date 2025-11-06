
import admin from 'firebase-admin';

// Verifica si ya existe una app de Firebase inicializada.
// Esto previene errores de "doble inicialización" en entornos de desarrollo.
if (!admin.apps.length) {
  try {
    // Inicializa el SDK de Firebase Admin con las credenciales del entorno.
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Reemplazamos los caracteres \n (escapados en .env) por saltos de línea reales.
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error: any) {
    console.error("Error initializing Firebase Admin SDK:", error.message);
  }
}

export default admin;
