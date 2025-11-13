import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { db } from "@/lib/firebaseAdmin";
import { doc, collection, getDocs } from "firebase-admin/firestore";

export const dynamic = 'force-dynamic';

async function deleteSupabaseFolder(supabase: any, bucket: string, folderPath: string) {
    const { data: files, error: listError } = await supabase.storage
        .from(bucket)
        .list(folderPath);

    if (listError) {
        console.warn(`Could not list files in ${folderPath} for deletion:`, listError.message);
        return; // Proceed to Firestore cleanup
    }

    if (files && files.length > 0) {
        const filePaths = files.map(file => `${folderPath}/${file.name}`);
        const { error: deleteError } = await supabase.storage
            .from(bucket)
            .remove(filePaths);
        if (deleteError) {
            console.warn(`Could not delete files from folder ${folderPath}:`, deleteError.message);
        }
    }
}

export async function POST(request: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { albumId } = await request.json();

    if (!albumId) {
        return new NextResponse(JSON.stringify({ error: 'Album ID is required' }), { status: 400 });
    }

    try {
        const albumRef = db.collection("photoAlbums").doc(albumId);

        // 1. Delete all photos within the album's folder from Supabase Storage
        const supabaseFolderPath = `album_photos/${albumId}`;
        await deleteSupabaseFolder(supabase, 'galeria-multimedia', supabaseFolderPath);

        // 2. Batch delete all Firestore documents (album and its photos subcollection)
        const photosSnapshot = await albumRef.collection("photos").get();
        const batch = db.batch();

        photosSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        batch.delete(albumRef);
        await batch.commit();

        return new NextResponse(JSON.stringify({ message: 'Album and all contents deleted successfully' }), { status: 200 });

    } catch (error: any) {
        console.error('Error deleting album:', error);
        return new NextResponse(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
    }
}
