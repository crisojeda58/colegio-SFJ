
import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import admin from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  const authToken = req.headers.get("authorization")?.split("Bearer ")[1];
  if (!authToken) {
    return NextResponse.json({ error: "Unauthorized: No token provided" }, { status: 401 });
  }

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(authToken);
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    return NextResponse.json({ error: "Forbidden: Invalid token" }, { status: 403 });
  }

  const { uid, email } = decodedToken;
  if (!email) {
      return NextResponse.json({ error: "Email not found in Firebase token." }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  try {
    const bucketName = "perfiles";
    const baseFileName = email; // The part of the name without extension

    // 1. Find any existing files for this user (e.g., .jpg, .png)
    const { data: existingFiles, error: listError } = await supabase.storage
      .from(bucketName)
      .list('', { search: baseFileName });

    if (listError) {
        console.error("Supabase list error:", listError);
        throw listError;
    }

    // 2. If old files are found, delete them.
    if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => f.name);
        const { error: removeError } = await supabase.storage
            .from(bucketName)
            .remove(filesToDelete);

        if (removeError) {
            console.error("Supabase remove error:", removeError);
            throw removeError;
        }
    }

    // 3. Now, upload the new file.
    const fileContent = Buffer.from(await file.arrayBuffer());
    const fileExtension = file.name.split('.').pop();
    const newFileName = `${baseFileName}.${fileExtension}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(newFileName, fileContent, {
        contentType: file.type || "application/octet-stream",
        cacheControl: '0', // No cache for new uploads
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(newFileName);

    if (!publicUrlData) {
      throw new Error("Could not get public URL for the uploaded file.");
    }

    const finalAvatarUrl = `${publicUrlData.publicUrl}?t=${new Date().getTime()}`;

    await admin.auth().updateUser(uid, { photoURL: finalAvatarUrl });
    await admin.firestore().collection('users').doc(uid).update({ avatarUrl: finalAvatarUrl });

    return NextResponse.json({ avatarUrl: finalAvatarUrl }, { status: 200 });

  } catch (error) {
    console.error("Server-side profile upload error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
