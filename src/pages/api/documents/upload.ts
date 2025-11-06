
import { type NextApiRequest, type NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";
import admin from "@/lib/firebase-admin";
import formidable from "formidable";
import fs from "fs/promises";

// Deshabilitamos el bodyParser de Next.js para poder procesar el formulario con formidable.
export const config = {
  api: {
    bodyParser: false,
  },
};

const sanitizeFilename = (filename: string): string => {
  // Normaliza a NFD (Canonical Decomposition) para separar los caracteres base de los diacríticos.
  const normalized = filename.normalize('NFD');
  // Elimina los diacríticos (acentos, etc.).
  const withoutDiacritics = normalized.replace(/[\u0300-\u036f]/g, '');
  // Reemplaza la 'ñ' y 'Ñ'.
  const withoutN = withoutDiacritics.replace(/ñ/g, 'n').replace(/Ñ/g, 'N');
  // Reemplaza espacios con guiones bajos y elimina caracteres no permitidos.
  // Permite letras, números, puntos, guiones y guiones bajos.
  return withoutN.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9-._]/g, '');
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const authToken = req.headers.authorization?.split("Bearer ")[1];
  if (!authToken) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  try {
    await admin.auth().verifyIdToken(authToken);
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    return res.status(403).json({ error: "Forbidden: Invalid token" });
  }

  const form = formidable({});
  const [fields, files] = await form.parse(req);
  const file = files.file?.[0];

  if (!file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  try {
    const fileContent = await fs.readFile(file.filepath);
    
    // Sanitiza el nombre original del archivo para usarlo en la UI y como parte de la ruta.
    const cleanName = sanitizeFilename(file.originalFilename || 'unnamed_file');
    const finalFileName = `${Date.now()}-${cleanName}`;
    const bucketName = "documentos";

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(finalFileName, fileContent, {
        contentType: file.mimetype || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uploadData.path);

    if (!publicUrlData) {
      throw new Error("Could not get public URL for the uploaded file.");
    }

    // Devuelve la URL pública Y el nombre sanitizado que se usará en Firestore.
    return res.status(200).json({ url: publicUrlData.publicUrl, name: cleanName });

  } catch (error) {
    console.error("Server-side upload error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  } finally {
    // Limpia el archivo temporal del disco.
    await fs.unlink(file.filepath);
  }
}
