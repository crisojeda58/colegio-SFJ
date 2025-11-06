
import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import admin from "@/lib/firebase-admin";
import { sanitize } from "@/utils/file-utils";

export async function POST(req: NextRequest) {
  const authToken = req.headers.get("authorization")?.split("Bearer ")[1];
  if (!authToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify Firebase token to get user info
    const decodedToken = await admin.auth().verifyIdToken(authToken);
    const { uid } = decodedToken;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const bucketName = "docs_folders_images";
    const fileName = sanitize(file.name);
    const uniqueFileName = `${uid}-${Date.now()}-${fileName}`;

    const fileContent = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(uniqueFileName, fileContent, {
        contentType: file.type || "application/octet-stream",
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uniqueFileName);

    if (!publicUrlData) {
      throw new Error("Could not get public URL for the uploaded file.");
    }

    return NextResponse.json({ url: publicUrlData.publicUrl }, { status: 200 });

  } catch (error) {
    console.error("Server-side folder image upload error:", error);
    // Differentiate between auth errors and other errors
    if ((error as any).code === 'auth/id-token-expired') {
      return NextResponse.json({ error: "Forbidden: Invalid or expired token" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
