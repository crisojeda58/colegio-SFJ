import { NextResponse } from 'next/server';
import admin from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: Request) {
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];

    if (!idToken) {
        return NextResponse.json({ message: 'Acceso no autorizado.' }, { status: 401 });
    }

    try {
        const body = await request.json();
        // Log para depuración, para ver exactamente lo que llega
        console.log('Request body received:', body);

        // 1. Verificar el token y los permisos del administrador
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const requesterDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
        if (requesterDoc.data()?.role !== 'Admin Intranet') {
            return NextResponse.json({ message: 'No tienes permisos para realizar esta acción.' }, { status: 403 });
        }

        // 2. Obtener y validar los datos del cuerpo de la petición
        const {
            email, password, name, role, phone, 
            department, status, birthdate, jobTitle, course, avatarUrl
        } = body;

        const requiredFields = { name, email, password, role, phone, department, status, birthdate, jobTitle };
        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value) {
                return NextResponse.json({ message: `El campo '${key}' es obligatorio.` }, { status: 400 });
            }
        }
        if (role === 'Profesor Jefe' && !course) {
            return NextResponse.json({ message: 'El campo curso es obligatorio para el rol de Profesor Jefe.' }, { status: 400 });
        }

        // 3. Crear el usuario en Firebase Authentication
        const newUserRecord = await admin.auth().createUser({
            email,
            password,
            displayName: name,
        });

        // 4. Preparar el documento del usuario para Firestore con MANEJO ROBUSTO DE FECHA
        // El frontend envía la fecha como un string ISO 8601 (ej: "1990-05-15T12:00:00")
        // Creamos un objeto Date directamente desde este string, que es un formato estándar.
        const birthdateObject = new Date(birthdate);

        // Verificamos que el objeto Date sea válido
        if (isNaN(birthdateObject.getTime())) {
            return NextResponse.json({ message: 'La fecha de nacimiento proporcionada no es válida. Se esperaba un formato ISO 8601.' }, { status: 400 });
        }

        const userData: any = {
            name,
            email,
            role,
            phone,
            department,
            status,
            jobTitle,
            avatarUrl: avatarUrl || '',
            // Convertimos el objeto Date a un Timestamp de Firestore
            birthdate: Timestamp.fromDate(birthdateObject),
        };

        if (role === 'Profesor Jefe') {
            userData.course = course;
        }

        // 5. Crear el documento en Firestore
        await admin.firestore().collection('users').doc(newUserRecord.uid).set(userData);

        return NextResponse.json({ message: 'Usuario creado exitosamente', uid: newUserRecord.uid }, { status: 201 });

    } catch (error: any) {
        console.error('Error detallado al crear usuario:', error);

        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ message: 'El correo electrónico ya está en uso.' }, { status: 409 });
        }
        if (error.code === 'auth/invalid-password') {
            return NextResponse.json({ message: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
        }
        if (error.code === 'auth/id-token-expired') {
            return NextResponse.json({ message: 'Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.' }, { status: 401 });
        }

        return NextResponse.json({ message: 'Ocurrió un error interno en el servidor.', error: error.message }, { status: 500 });
    }
}
