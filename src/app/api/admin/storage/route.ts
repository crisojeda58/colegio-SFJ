''
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// Recursive function to calculate the size of a folder and its subfolders
async function getFolderSize(bucketName: string, path: string = ''): Promise<number> {
    let totalSize = 0;

    // Supabase's list method can fetch a limited number of items at once.
    // We will use a high limit, but for folders with extreme numbers of files, pagination would be needed.
    const { data: files, error } = await supabase.storage
        .from(bucketName)
        .list(path, { limit: 2000 }); 

    if (error) {
        console.error(`Error listing files for bucket ${bucketName} at path ${path}:`, error);
        return 0; // Return 0 if there's an error, to not break the whole calculation
    }

    if (!files) {
        return 0;
    }

    // Create an array of promises for the recursive calls
    const folderPromises: Promise<number>[] = [];

    for (const file of files) {
        // If the item has a size in metadata, it's a file. Add its size.
        if (file.metadata && typeof file.metadata.size === 'number') {
            totalSize += file.metadata.size;
        } 
        // If the item has no id, it's treated as a folder by the Supabase client.
        else if (file.id === null) {
            const subfolderPath = path ? `${path}/${file.name}` : file.name;
            // Add the recursive call to the array of promises
            folderPromises.push(getFolderSize(bucketName, subfolderPath));
        }
    }

    // Wait for all the recursive calls to complete and add their sizes
    const subfolderSizes = await Promise.all(folderPromises);
    totalSize += subfolderSizes.reduce((acc, size) => acc + size, 0);

    return totalSize;
}

// This function will be triggered by a GET request to /api/admin/storage
export async function GET() {
    try {
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

        if (bucketsError) {
            console.error("Error fetching buckets:", bucketsError);
            throw new Error("Could not fetch Supabase buckets.");
        }
        
        if (!buckets) {
            return NextResponse.json({ totalSize: 0, bucketUsage: [] });
        }

        let totalSize = 0;
        const bucketUsage: { name: string; size: number }[] = [];

        // Use Promise.all to fetch sizes for all buckets concurrently, making the API faster
        const bucketPromises = buckets.map(async (bucket) => {
            const bucketSize = await getFolderSize(bucket.name);
            return { name: bucket.name, size: bucketSize };
        });

        const allBucketSizes = await Promise.all(bucketPromises);

        // Calculate total size and populate bucketUsage array
        allBucketSizes.forEach(bucketData => {
            bucketUsage.push(bucketData);
            totalSize += bucketData.size;
        });

        return NextResponse.json({ totalSize, bucketUsage });

    } catch (error: any) {
        console.error('Error in storage API route:', error);
        return new NextResponse(
            JSON.stringify({ error: error.message || 'Failed to calculate storage size' }),
            { status: 500 }
        );
    }
}
''