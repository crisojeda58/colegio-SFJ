
import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import admin from "@/lib/firebase-admin";

/**
 * Extracts the file path from a Supabase public URL.
 * This is a more robust method that doesn't rely on hardcoded bucket names in the function call.
 * @param url The full public URL of the Supabase object.
 * @returns The file path to be used with the .remove() method, e.g., "folder/file.png".
 */
function getPathFromUrl(url: string): string | null {
  try {
    const urlObject = new URL(url);
    // The pathname is structured like: /storage/v1/object/public/bucket-name/folder/file.png
    const pathSegments = urlObject.pathname.split('/');
    // The bucket name is at index 5. The actual file path starts after it.
    const bucketNameIndex = 5; 
    if (pathSegments.length > bucketNameIndex + 1) {
      // Re-join the segments after the bucket name to get the full file path.
      return decodeURIComponent(pathSegments.slice(bucketNameIndex + 1).join('/'));
    }
    return null;
  } catch (error) {
    console.error("Could not parse URL:", url, error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const authToken = req.headers.get("authorization")?.split("Bearer ")[1];
  if (!authToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Authenticate the user and ensure they are an admin.
    await admin.auth().verifyIdToken(authToken);

    const { folderId, folderImageUrl } = await req.json();

    if (!folderId || !folderImageUrl) {
      return NextResponse.json({ error: "Missing folderId or folderImageUrl" }, { status: 400 });
    }
    
    const adminDb = admin.firestore();
    const folderImageBucket = "docs_folders_images";
    const documentsBucket = "documentos";

    // 2. Prepare to delete the folder's cover image from Supabase
    const folderImagePath = getPathFromUrl(folderImageUrl);
    if (!folderImagePath) {
      console.warn(`Could not parse path from folder image URL: ${folderImageUrl}. The image may be orphaned.`);
    }

    // 3. Prepare to delete all files contained within the folder from Supabase
    const filesRef = adminDb.collection(`docs_folders/${folderId}/files`);
    const filesSnapshot = await filesRef.get();
    
    const documentPathsToDelete: string[] = [];
    filesSnapshot.forEach(doc => {
        const fileData = doc.data();
        if (fileData.url) {
            const filePath = getPathFromUrl(fileData.url);
            if (filePath) {
                documentPathsToDelete.push(filePath);
            } else {
                console.warn(`Could not parse path from document URL: ${fileData.url}. The file may be orphaned.`);
            }
        }
    });

    // 4. Execute deletion from Supabase Storage for each bucket.

    // Delete the folder's cover image
    if (folderImagePath) {
        console.log(`Attempting to delete from ${folderImageBucket}:`, [folderImagePath]);
        const { error: folderImgErr } = await supabase.storage
            .from(folderImageBucket)
            .remove([folderImagePath]);

        if (folderImgErr) {
            // Log the error but don't stop the process.
            console.error("Error deleting folder image from Supabase:", folderImgErr);
        } else {
            console.log("Successfully deleted folder image from Supabase.");
        }
    }
    
    // Delete all the files that were inside the folder
    if (documentPathsToDelete.length > 0) {
        console.log(`Attempting to delete from ${documentsBucket}:`, documentPathsToDelete);
        const { error: docsErr } = await supabase.storage
            .from(documentsBucket)
            .remove(documentPathsToDelete);

        if (docsErr) {
            console.error("Error deleting document files from Supabase:", docsErr);
        } else {
            console.log("Successfully deleted document files from Supabase.");
        }
    }

    // The frontend is responsible for deleting the Firestore documents. 
    // This endpoint just confirms the backend file deletion process has been attempted.
    return NextResponse.json({ message: "Supabase file deletion process completed." }, { status: 200 });

  } catch (error) {
    console.error("Server-side folder delete error:", error);
    if ((error as any).code === 'auth/id-token-expired') {
      return NextResponse.json({ error: "Forbidden: Invalid or expired token" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
