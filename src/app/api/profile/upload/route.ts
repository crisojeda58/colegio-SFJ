
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

  // Destructure uid and email from the token
  const { uid, email } = decodedToken;

  // We need the email to create the filename, so it must exist.
  if (!email) {
      return NextResponse.json({ error: "Email not found in Firebase token." }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  try {
    const fileContent = Buffer.from(await file.arrayBuffer());
    const fileExtension = file.name.split('.').pop();
    
    // CONSTRUCT THE FILENAME USING THE EMAIL, as seen in your screenshot.
    const fileName = `${email}.${fileExtension}`;
    const bucketName = "perfiles";

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .update(fileName, fileContent, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
        cacheControl: '0',
      });

    if (uploadError) {
      console.error("Supabase update/upload error:", uploadError);
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    if (!publicUrlData) {
      throw new Error("Could not get public URL for the uploaded file.");
    }
    
    // Create the unique, cache-busting URL.
    const finalAvatarUrl = `${publicUrlData.publicUrl}?t=${new Date().getTime()}`;

    // Update both Firebase Auth and Firestore with the cache-busted URL.
    await admin.auth().updateUser(uid, { photoURL: finalAvatarUrl });
    await admin.firestore().collection('users').doc(uid).update({ avatarUrl: finalAvatarUrl });

    // Return the same URL to the client for immediate UI update.
    return NextResponse.json({ avatarUrl: finalAvatarUrl }, { status: 200 });

  } catch (error) {
    console.error("Server-side profile upload error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
