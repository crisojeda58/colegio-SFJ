
import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import admin from "@/lib/firebase-admin";

// Helper to robustly delete a non-empty folder in Supabase Storage
async function deleteSupabaseFolder(folderPath: string) {
    const BUCKET_NAME = 'gallery_photos'; // Corrected bucket name

    // 1. List all files within the folder
    const { data: files, error: listError } = await supabase.storage
        .from(BUCKET_NAME)
        .list(folderPath, { limit: 1000 }); // List up to 1000 files

    if (listError) {
        console.warn(`Could not list files in '${folderPath}' for deletion:`, listError.message);
        // We don't return here; we will still try to delete the album from Firestore.
        // The files will become orphans, but the app won't show the album anymore.
        return;
    }

    if (files && files.length > 0) {
        // 2. Prepare the list of file paths to be deleted
        const filePaths = files.map(file => `${folderPath}/${file.name}`);

        // 3. Remove all the files in one go
        const { error: deleteError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove(filePaths);

        if (deleteError) {
            console.warn(`Could not delete files from folder '${folderPath}':`, deleteError.message);
            // Again, we log the error but don't block the main operation.
        }
    }
}

export async function POST(req: NextRequest) {
    // 1. Authenticate the user using Firebase Admin SDK
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

    // 2. Get the Album ID from the request body
    const { albumId } = await req.json();
    if (!albumId) {
        return NextResponse.json({ error: 'Album ID is required' }, { status: 400 });
    }

    try {
        const db = admin.firestore();
        const albumRef = db.collection('photoAlbums').doc(albumId);
        const photosRef = albumRef.collection('photos');

        // 3. Delete all photo documents in the subcollection (important for consistency)
        const photosSnapshot = await photosRef.get();
        if (!photosSnapshot.empty) {
            const batch = db.batch();
            photosSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }

        // 4. Delete the main album document in Firestore
        await albumRef.delete();

        // 5. Delete the corresponding folder from Supabase Storage (after successful DB deletion)
        const folderPath = `album_photos/${albumId}`;
        await deleteSupabaseFolder(folderPath);

        return NextResponse.json({ message: 'Album deleted successfully' }, { status: 200 });

    } catch (error: any) {
        console.error("Error deleting album:", error);
        return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
    }
}
