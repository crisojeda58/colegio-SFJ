import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const albumId = formData.get('albumId') as string | null;

  if (!file || !albumId) {
    return new NextResponse(JSON.stringify({ error: 'File or Album ID not provided' }), { status: 400 });
  }

  try {
    const fileExtension = file.name.split('.').pop();
    const newFileName = `${Date.now()}.${fileExtension}`;
    // Store photos in a subfolder named after the albumId
    const filePath = `album_photos/${albumId}/${newFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('galeria-multimedia') 
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicUrlData } = supabase.storage
      .from('galeria-multimedia')
      .getPublicUrl(filePath);

    return new NextResponse(JSON.stringify({ url: publicUrlData.publicUrl }), { status: 200 });

  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
