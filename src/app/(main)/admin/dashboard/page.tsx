'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // 1. Importar useRouter
import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const SUPABASE_STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB
const SUPABASE_PROJECT_URL = 'https://supabase.com/dashboard/project/jjcoikehfpzwmjliqktc/storage/files';

const FIREBASE_USAGE_URL = `https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/usage`;
const FIREBASE_ANALYTICS_URL = `https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/analytics`;

function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

interface BucketUsage {
    name: string;
    size: number;
}

interface StorageData {
    totalSize: number | null;
    bucketUsage: BucketUsage[];
}

const bucketFriendlyNames: { [key: string]: string } = {
    documentos: 'Documentos (documentos)',
    intranet_img: 'Imagenes de interfaces (intranet_img)',
    perfiles: 'Fotos de perfil (perfiles)',
    docs_folders_images: 'Fotos carpetas de documentos (docs_folders_images)',
    news_images: 'Imagenes de noticias (news_images)',
    gallery_photos: 'Galeria de fotos (gallery_photos)'
};

const AccessDenied = () => (
    <div className="container mx-auto flex items-center justify-center h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Acceso Denegado</CardTitle>
                <CardDescription>
                    Serás redirigido a la página de inicio.
                </CardDescription>
            </CardHeader>
        </Card>
    </div>
);

export default function AdminDashboardPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const router = useRouter(); // 2. Inicializar el router
    
    const [storage, setStorage] = useState<StorageData>({ totalSize: null, bucketUsage: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 3. Lógica de redirección
    useEffect(() => {
        if (!authLoading) {
            if (!userProfile || userProfile.role !== 'Admin Intranet') {
                router.push('/inicio');
            }
        }
    }, [userProfile, authLoading, router]);

    useEffect(() => {
        if (userProfile && userProfile.role === 'Admin Intranet') {
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
        }
    }, [userProfile]);

    // 4. Mostrar AccessDenied o un loader mientras se redirige
    if (authLoading || !userProfile || userProfile.role !== 'Admin Intranet') {
        return <AccessDenied />;
    }

    const usagePercentage = storage.totalSize !== null
        ? (storage.totalSize / SUPABASE_STORAGE_LIMIT_BYTES) * 100
        : 0;

    const progressBarColor = usagePercentage > 90 ? 'bg-red-500' : usagePercentage > 75 ? 'bg-yellow-500' : 'bg-green-500';

    // Si el usuario es admin, se muestra el dashboard
    return (
        <div className="container mx-auto p-4 md:p-8 space-y-6">
            {/* ... resto del JSX del dashboard ... */}
        </div>
    );
}