'use client';

import { useState, useEffect } from 'react'; // 1. Importar useEffect
import { useRouter } from 'next/navigation'; // 2. Importar useRouter
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

export default function CreateUserPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const router = useRouter(); // 3. Inicializar el router
    
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('Usuario');
    const [course, setCourse] = useState('');
    const [department, setDepartment] = useState('');
    const [status, setStatus] = useState('nuevo');
    const [birthdate, setBirthdate] = useState('');
    const [birthtime, setBirthtime] = useState('12:00');
    const [jobTitle, setJobTitle] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // 4. Lógica de redirección
    useEffect(() => {
        // Esperar a que la autenticación termine y luego verificar
        if (!authLoading) {
            if (!userProfile || userProfile.role !== 'Admin Intranet') {
                router.push('/inicio');
            }
        }
    }, [userProfile, authLoading, router]);

    const resetForm = () => {
        // ... (código del formulario sin cambios)
    };

    const handleSubmit = async (e: React.FormEvent) => {
        // ... (código del handler sin cambios)
    };

    // 5. Verificar y mostrar AccessDenied mientras se redirige
    if (authLoading || !userProfile || userProfile.role !== 'Admin Intranet') {
        return <AccessDenied />;
    }

    // Si el usuario es admin, se muestra el formulario
    return (
        <div className="container mx-auto py-10">
            {/* ... resto del JSX del formulario ... */}
        </div>
    );
}