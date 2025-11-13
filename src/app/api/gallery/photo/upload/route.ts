
import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import admin from "@/lib/firebase-admin";
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    // 1. Authenticate the user via Bearer Token
    const authToken = req.headers.get("authorization")?.split("Bearer ")[1];
    if (!authToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await admin.auth().verifyIdToken(authToken);
    } catch (error) {
        console.error("Authentication error:", error);
        return NextResponse.json({ error: "Forbidden: Invalid or expired token" }, { status: 403 });
    }

    // 2. Handle the file upload from FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const albumId = formData.get("albumId") as string | null;

    if (!file || !albumId) {
        return NextResponse.json({ error: "File and albumId are required" }, { status: 400 });
    }

    // 3. Prepare the file for upload (Correct Method)
    const BUCKET_NAME = "gallery_photos"; // Corrected bucket name
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `album_photos/${albumId}/${fileName}`;
    
    const fileContent = Buffer.from(await file.arrayBuffer());

    try {
        // 4. Upload the Buffer to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, fileContent, {
                contentType: file.type || "application/octet-stream",
                cacheControl: '3600',
            });

        if (uploadError) {
            throw uploadError;
        }

        // 5. Get the public URL of the uploaded file
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        if (!publicUrl) {
            throw new Error("Could not get public URL for the uploaded file.");
        }

        // 6. Return the URL to the client
        return NextResponse.json({ url: publicUrl }, { status: 200 });

    } catch (error: any) {
        console.error("Error uploading photo:", error);
        // Send a more specific error message to the client
        const message = error.message || "An unexpected error occurred during upload.";
        return NextResponse.json({ error: `Supabase error: ${message}` }, { status: 500 });
    }
}
