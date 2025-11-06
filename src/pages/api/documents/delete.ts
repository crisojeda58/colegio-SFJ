
import { type NextApiRequest, type NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";
import admin from "@/lib/firebase-admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const authToken = req.headers.authorization?.split("Bearer ")[1];
  if (!authToken) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  try {
    // Verify the user's Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(authToken);
    // Optional: Check for admin role if necessary
    // const userRole = decodedToken.role;
    // if (userRole !== 'Admin Intranet') {
    //   return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    // }
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    return res.status(403).json({ error: "Forbidden: Invalid token" });
  }

  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: "Bad Request: filePath is required" });
  }

  try {
    const bucketName = "documentos";
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (deleteError) {
      console.error("Supabase delete error:", deleteError);
      throw deleteError;
    }

    return res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Server-side delete error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
