
import { getDocuments } from "./actions";
import DocumentsClientPage from './client-page';
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { UserProfile } from '@/types/user';
import { cookies } from "next/headers";

// Este es un Server Component, se ejecuta en el servidor al construir la página.
export default async function DocumentsPage() {
  // 1. Llamamos a la Server Action para obtener los documentos de forma segura.
  const initialDocuments = await getDocuments();

  // 2. Pasamos los documentos iniciales al componente de cliente.
  // La lógica para determinar si se muestra el botón de subida se manejará en el cliente.
  return (
    <DocumentsClientPage initialDocuments={initialDocuments} />
  );
}
