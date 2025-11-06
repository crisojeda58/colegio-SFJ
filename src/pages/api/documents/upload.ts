
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
    
    // Sanitiza el nombre del archivo: reemplaza espacios y otros caracteres problemáticos.
    const sanitizedFilename = file.originalFilename?.replace(/\s+/g, '_') || 'unnamed_file';
    const fileName = `${Date.now()}-${sanitizedFilename}`;
    const bucketName = "documentos";

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileContent, {
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

    return res.status(200).json({ url: publicUrlData.publicUrl });

  } catch (error) {
    console.error("Server-side upload error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  } finally {
    await fs.unlink(file.filepath);
  }
}
