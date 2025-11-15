'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const SUPABASE_STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB
const SUPABASE_PROJECT_URL = 'https://supabase.com/dashboard/project/jjcoikehfpzwmjliqktc/storage/files';

// Construct the Firebase URLs dynamically
const FIREBASE_USAGE_URL = `https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/usage`;
const FIREBASE_ANALYTICS_URL = `https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/analytics`;


// Helper to format bytes
function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Define the structure for individual bucket usage
interface BucketUsage {
    name: string;
    size: number;
}

// Define the structure for the API response
interface StorageData {
    totalSize: number | null;
    bucketUsage: BucketUsage[];
}

// Mapping for bucket friendly names
const bucketFriendlyNames: { [key: string]: string } = {
    documentos: 'Documentos (documentos)',
    intranet_img: 'Imagenes de interfaces (intranet_img)',
    perfiles: 'Fotos de perfil (perfiles)',
    docs_folders_images: 'Fotos carpetas de documentos (docs_folders_images)',
    news_images: 'Imagenes de noticias (news_images)',
    gallery_photos: 'Galeria de fotos (gallery_photos)'
};

export default function AdminDashboardPage() {
    const [storage, setStorage] = useState<StorageData>({ totalSize: null, bucketUsage: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStorageUsage() {
            setIsLoading(true);
            try {
                const response = await fetch('/api/admin/storage');
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch storage data');
                }
                const data: StorageData = await response.json();
                 data.bucketUsage.sort((a, b) => b.size - a.size);
                setStorage(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }

        fetchStorageUsage();
    }, []);

    const usagePercentage = storage.totalSize !== null
        ? (storage.totalSize / SUPABASE_STORAGE_LIMIT_BYTES) * 100
        : 0;

    const progressBarColor = usagePercentage > 90 ? 'bg-red-500' : usagePercentage > 75 ? 'bg-yellow-500' : 'bg-green-500';

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-bold mb-6">
              <span className="bg-sidebar text-primary-foreground px-3 py-1 rounded-md">
                Panel de control
              </span>
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Uso de Almacenamiento (Supabase)</CardTitle>
                        <CardDescription>
                           Espacio total utilizado en los buckets de Supabase.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <p>Calculando...</p>
                        ) : error ? (
                            <p className="text-red-500">Error: {error}</p>
                        ) : (
                            <div>
                                <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                                    <div 
                                        className={`h-4 rounded-full ${progressBarColor}`}
                                        style={{ width: `${usagePercentage.toFixed(2)}%` }}
                                    ></div>
                                </div>
                                <div className="text-sm text-gray-600 flex justify-between">
                                    <span>
                                        {formatBytes(storage.totalSize ?? 0)} / {formatBytes(SUPABASE_STORAGE_LIMIT_BYTES)}
                                    </span>
                                    <span className="font-bold">
                                        {usagePercentage.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline">
                            <Link href={SUPABASE_PROJECT_URL} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Gestionar en Supabase
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Métricas de Servicios (Firebase)</CardTitle>
                        <CardDescription>
                            Consumo de Firestore, Auth y otros servicios.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600">
                           Revisa el uso detallado y compáralo con los límites del plan gratuito para evitar interrupciones del servicio.
                        </p>
                    </CardContent>
                    <CardFooter>
                         <Button asChild variant="outline">
                            <Link href={FIREBASE_USAGE_URL} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Ver Uso de Firebase
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Análisis de Audiencia (Analytics)</CardTitle>
                        <CardDescription>
                            Comportamiento, demografía y eventos de los usuarios.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600">
                           Explora los informes para entender cómo los usuarios interactúan con el portal y qué contenido es más popular.
                        </p>
                    </CardContent>
                    <CardFooter>
                         <Button asChild variant="outline">
                            <Link href={FIREBASE_ANALYTICS_URL} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Ir a Analytics
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            <Card>
                 <CardHeader>
                    <CardTitle>Desglose por Bucket de Almacenamiento</CardTitle>
                    <CardDescription>
                        Uso de almacenamiento para cada bucket individual (ordenado por tamaño).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p>Cargando detalles de los buckets...</p>
                    ) : error ? (
                        <p className="text-red-500">No se pudo cargar el desglose.</p>
                    ) : (
                        <div className="space-y-3">
                            {storage.bucketUsage.length > 0 ? (
                                storage.bucketUsage.map(bucket => (
                                    <div key={bucket.name} className="flex justify-between items-center border-b pb-2 last:border-b-0 last:pb-0">
                                        <span className="text-base">
                                            {bucketFriendlyNames[bucket.name] || bucket.name}
                                        </span>
                                        <span className="text-base font-medium text-gray-700">
                                            {formatBytes(bucket.size)}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p>No se encontraron buckets o están vacíos.</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
