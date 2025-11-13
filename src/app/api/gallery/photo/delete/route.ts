
import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import admin from "@/lib/firebase-admin";

// Helper function to correctly extract the file path from a Supabase URL
function getPathFromUrl(url: string, bucketName: string) {
    try {
        const urlObject = new URL(url);
        // Example pathname: /storage/v1/object/public/gallery_photos/album_photos/albumId/photo.jpg
        const pathAfterPublic = urlObject.pathname.split(`/public/${bucketName}/`)[1];
        return pathAfterPublic || null;
    } catch (error) {
        console.error("Invalid URL provided for path extraction:", error);
        return null;
    }
}

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

    // 2. Get required data from the request body
    const { albumId, photoId, photoUrl } = await req.json();
    if (!albumId || !photoId || !photoUrl) {
        return NextResponse.json({ error: "Missing required fields: albumId, photoId, or photoUrl" }, { status: 400 });
    }

    const BUCKET_NAME = "gallery_photos"; // Corrected bucket name

    try {
        // 3. Delete the photo document from Firestore first
        const db = admin.firestore();
        const photoRef = db.collection("photoAlbums").doc(albumId).collection("photos").doc(photoId);
        await photoRef.delete();

        // 4. Delete the file from Supabase Storage
        const filePath = getPathFromUrl(photoUrl, BUCKET_NAME);
        if (filePath) {
            const { error: deleteError } = await supabase.storage
                .from(BUCKET_NAME)
                .remove([filePath]);
            
            if (deleteError) {
                console.warn(`Supabase file deletion failed for ${filePath}, but proceeding.`, deleteError.message);
            }
        } else {
            console.warn(`Could not extract file path from URL, so skipping Supabase deletion: ${photoUrl}`);
        }

        return NextResponse.json({ message: 'Photo deleted successfully' }, { status: 200 });

    } catch (error: any) {
        console.error("Error deleting photo:", error);
        return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
    }
}
