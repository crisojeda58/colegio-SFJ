'use server';

import { v2 as cloudinary } from 'cloudinary';

export interface CloudinaryResource {
  asset_id: string;
  public_id: string;
  filename: string;
  format: string;
  created_at: string;
  bytes: number;
  secure_url: string;
}

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function getDocuments(): Promise<CloudinaryResource[]> {
  try {
    const { resources } = await cloudinary.search
      .expression('resource_type:raw AND folder="intranet_colegio/documentos"')
      .sort_by('created_at', 'desc')
      .max_results(50)
      .execute();

    return resources as CloudinaryResource[];
  } catch (error) {
    console.error('Error fetching documents from Cloudinary:', error);
    return [];
  }
}

export async function getSignedDownloadUrl(publicId: string): Promise<{ url?: string; error?: string }> {
  try {
    const url = cloudinary.utils.private_download_url(publicId, '', {
        resource_type: 'raw',
        type: 'upload',
        // La URL expira en 60 segundos. Suficiente para que el navegador inicie la descarga.
        expires_at: Math.floor(Date.now() / 1000) + 60, 
    });
    return { url };
  } catch (error: any) {
    console.error('Error creating signed URL:', error);
    return { error: 'No se pudo generar la URL de descarga. ' + error.message };
  }
}
