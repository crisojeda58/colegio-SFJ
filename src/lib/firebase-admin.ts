
// src/lib/firebase-admin.ts

import * as admin from 'firebase-admin';

// Esta configuración es para usar el Admin SDK de Firebase.
// Por ahora no es necesaria en el proyecto, pero la dejamos por si se necesita en el futuro
// para operaciones complejas en el backend.

// Para que funcione, se necesitan las variables de entorno:
// FIREBASE_PROJECT_ID
// FIREBASE_PRIVATE_KEY
// FIREBASE_CLIENT_EMAIL

if (!admin.apps.length) {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
      } catch (error) {
        console.error('Firebase admin initialization error', error);
      }
  }
}

export const authAdmin = admin.apps.length ? admin.auth() : undefined;
export const dbAdmin = admin.apps.length ? admin.firestore() : undefined;
