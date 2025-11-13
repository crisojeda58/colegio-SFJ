import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { db } from "@/lib/firebaseAdmin"; // Using admin SDK

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { albumId, photoId, photoUrl } = await request.json();

    if (!albumId || !photoId || !photoUrl) {
        return new NextResponse(JSON.stringify({ error: 'Missing required fields: albumId, photoId, or photoUrl' }), { status: 400 });
    }

    try {
        // 1. Delete file from Supabase Storage
        // The filePath is the part of the URL after the bucket name
        const filePath = `album_photos/${albumId}/${photoUrl.split('/').pop()}`;
        
        const { error: deleteError } = await supabase.storage
            .from('galeria-multimedia')
            .remove([filePath]);

        if (deleteError) {
            // Log the error but proceed to delete the Firestore entry anyway
            console.warn(`Supabase file deletion failed for ${filePath}, but proceeding with Firestore deletion.`, deleteError.message);
        }

        // 2. Delete the photo document from Firestore
        const photoRef = db.collection("photoAlbums").doc(albumId).collection("photos").doc(photoId);
        await photoRef.delete();

        return new NextResponse(JSON.stringify({ message: 'Photo deleted successfully' }), { status: 200 });

    } catch (error: any) {
        console.error('Error deleting photo:', error);
        return new NextResponse(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
    }
}
