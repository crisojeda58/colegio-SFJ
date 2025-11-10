
import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import admin from "@/lib/firebase-admin";

// Extracts the file path from a Supabase URL
function getPathFromUrl(url: string) {
  try {
    const urlObject = new URL(url);
    // The path after '/object/public/' is what we need
    const pathWithBucket = urlObject.pathname.split("/public/")[1];
    return pathWithBucket;
  } catch (error) {
    console.error("Invalid URL provided for path extraction:", error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  // 1. Authenticate the user
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

  // 2. Get the old image URL from the request body
  const { oldImageUrl } = await req.json();
  if (!oldImageUrl) {
    return NextResponse.json({ error: "oldImageUrl is required" }, { status: 400 });
  }

  // 3. Extract the file path and delete from Supabase
  const filePath = getPathFromUrl(oldImageUrl);
  if (!filePath) {
    return NextResponse.json({ error: "Invalid oldImageUrl format" }, { status: 400 });
  }
  
  // The path includes the bucket name, so we just need the part after that
  const bucketName = "news_images";
  const fileName = filePath.replace(`${bucketName}/`, '');

  try {
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([fileName]);

    if (deleteError) {
      // It's often okay if the file doesn't exist, so we log instead of throwing
      console.warn("Supabase delete warning:", deleteError.message);
    }

    return NextResponse.json({ success: true, message: `Successfully deleted or file did not exist: ${fileName}` }, { status: 200 });

  } catch (error) {
    console.error("Server-side news image delete error:", error);
    return NextResponse.json({ error: "Internal Server Error during file deletion" }, { status: 500 });
  }
}
