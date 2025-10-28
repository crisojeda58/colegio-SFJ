# Portal Interno - Comunidad Educativa

Esta es una aplicación web desarrollada con Next.js y Firebase, diseñada para funcionar como un portal interno para una comunidad educativa. La plataforma permite a los usuarios autenticados acceder a diversas secciones y gestionar contenido de manera centralizada.

## Funcionalidades Principales

*   **Autenticación de Usuarios:** Sistema de inicio de sesión para acceder a los recursos del portal.
*   **Inicio (Noticias):** Una sección principal donde se publican y visualizan noticias y anuncios importantes.
*   **Gestor de Documentos:** Permite organizar y compartir archivos en una estructura de carpetas.
*   **Galería de Fotos:** Muestra álbumes de eventos importantes como el aniversario o ferias científicas.
*   **Secciones Informativas:** Incluye apartados para:
    *   Contactos
    *   Cumpleaños
    *   Sitios de Interés
    *   Información de Jefaturas de Curso
    *   ¡Y más!

## Tecnologías Utilizadas

*   **Framework:** [Next.js](https://nextjs.org/)
*   **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
*   **Backend y Base de Datos:** [Firebase](https://firebase.google.com/) (Firestore, Authentication)
*   **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
*   **Componentes:** [Shadcn/UI](https://ui.shadcn.com/)

## Cómo Empezar

Sigue estos pasos para configurar y ejecutar el proyecto en tu entorno de desarrollo local.

### 1. Prerrequisitos

- Node.js (versión 18 o superior)
- `npm` o `yarn`

### 2. Clonar el Repositorio

```bash
git clone <https://github.com/crisojeda58/colegio-SFJ.git>
cd <nombre-del-directorio>
```

### 3. Instalar Dependencias

```bash
npm install
```

### 4. Configurar Variables de Entorno

Crea un archivo llamado `.env.local` en la raíz del proyecto y añade tus credenciales de configuración de Firebase. Puedes obtenerlas desde la consola de tu proyecto de Firebase.

```env
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=TU_UPLOAD_PRESET
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=NOMBRE_DE_CLOUD
CLOUDINARY_API_KEY=TU_API_KEY
CLOUDINARY_API_SECRET=TU_API_KEY_SECRET

NEXT_PUBLIC_FIREBASE_API_KEY=TU_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=TU_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=TU_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=TU_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=TU_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=TU_APP_ID
```

### 5. Ejecutar la Aplicación

Una vez configurado, puedes iniciar el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación en funcionamiento.
