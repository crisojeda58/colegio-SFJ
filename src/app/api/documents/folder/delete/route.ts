
import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import admin from "@/lib/firebase-admin";

// Extracts the file path from a Supabase public URL
function getPathFromUrl(url: string, bucketName: string): string | null {
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucketName}/`;
  if (url.startsWith(prefix)) {
    return decodeURIComponent(url.substring(prefix.length));
  }
  return null;
}

export async function POST(req: NextRequest) {
  const authToken = req.headers.get("authorization")?.split("Bearer ")[1];
  if (!authToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Authenticate the user
    await admin.auth().verifyIdToken(authToken);

    const { folderId, folderImageUrl } = await req.json();

    if (!folderId || !folderImageUrl) {
      return NextResponse.json({ error: "Missing folderId or folderImageUrl" }, { status: 400 });
    }
    
    const adminDb = admin.firestore(); // Correctly get the Firestore instance
    let filesToDelete: string[] = [];

    // 2. Delete the main folder image from Supabase Storage
    const folderImageBucket = "docs_folders_images";
    const folderImagePath = getPathFromUrl(folderImageUrl, folderImageBucket);
    if (folderImagePath) {
      filesToDelete.push(folderImagePath);
    } else {
      console.warn(`Could not parse path from folder image URL: ${folderImageUrl}`);
    }
    
    // 3. Get all files within the folder from Firestore to delete them from Supabase Storage
    const filesRef = adminDb.collection(`docs_folders/${folderId}/files`);
    const filesSnapshot = await filesRef.get();
    
    const documentsBucket = "documentos";
    filesSnapshot.forEach(doc => {
        const fileData = doc.data();
        if (fileData.url) {
            const filePath = getPathFromUrl(fileData.url, documentsBucket);
            if (filePath) {
                filesToDelete.push(filePath);
            } else {
                console.warn(`Could not parse path from document URL: ${fileData.url}`);
            }
        }
    });

    // 4. Batch delete all associated files from Supabase Storage
    if (filesToDelete.length > 0) {
        const folderImages = filesToDelete.filter(p => folderImagePath && p === folderImagePath);
        const documentFiles = filesToDelete.filter(p => !folderImages.includes(p));
        
        if (folderImages.length > 0) {
            const { error: folderImgErr } = await supabase.storage.from(folderImageBucket).remove(folderImages);
            if (folderImgErr) console.error("Error deleting from docs_folders_images bucket:", folderImgErr);
        }

        if (documentFiles.length > 0) {
            const { error: docsErr } = await supabase.storage.from(documentsBucket).remove(documentFiles);
            if (docsErr) console.error("Error deleting from documentos bucket:", docsErr);
        }
    }

    return NextResponse.json({ message: "Supabase files marked for deletion." }, { status: 200 });

  } catch (error) {
    console.error("Server-side folder delete error:", error);
    if ((error as any).code === 'auth/id-token-expired') {
      return NextResponse.json({ error: "Forbidden: Invalid or expired token" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
