
import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {v4 as uuidv4} from 'uuid';

// Función para sanitizar el nombre del archivo
const sanitizeFileName = (fileName: string) => {
  // Reemplaza los espacios y caracteres especiales, excepto el punto y el guion bajo
  const cleaned = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Acorta el nombre si es muy largo, manteniendo la extensión
  const parts = cleaned.split('.');
  const extension = parts.pop();
  const name = parts.join('.');
  return `${name.substring(0, 50)}_${uuidv4()}.${extension}`;
};

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No estás autenticado." }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No se ha proporcionado ningún archivo." }, { status: 400 });
  }
  
  // Validar tipo de archivo (opcional pero recomendado)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de archivo no permitido. Solo se aceptan imágenes." }, { status: 400 });
  }

  // Validar tamaño del archivo (ej: 5MB máximo)
  const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSizeInBytes) {
    return NextResponse.json({ error: "El archivo es demasiado grande. El máximo es 5MB." }, { status: 400 });
  }
  
  const sanitizedFileName = sanitizeFileName(file.name);
  const filePath = `public/profile_img/${sanitizedFileName}`;

  // Usamos el cliente de admin para subir el archivo, así evitamos problemas de políticas RLS
  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin.storage
    .from('profile_img') // Nombre de tu bucket
    .upload(sanitizedFileName, file);

  if (error) {
    console.error("Error subiendo a Supabase:", error);
    return NextResponse.json({ error: `Error en el servidor: ${error.message}` }, { status: 500 });
  }

  // Construir la URL pública del archivo subido
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from("profile_img")
    .getPublicUrl(sanitizedFileName);

  return NextResponse.json({ 
    message: "Imagen de perfil subida con éxito.", 
    url: publicUrl 
  });
}
