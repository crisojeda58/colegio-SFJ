'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AccessDenied = () => (
    <Card className="w-full max-w-md mx-auto mt-10">
        <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>
                No tienes los permisos necesarios para acceder a esta sección.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p>Por favor, contacta a un administrador si crees que esto es un error.</p>
        </CardContent>
    </Card>
);

export default function CreateUserPage() {
    const { userProfile, getAuthToken } = useAuth();
    
    // Estados para todos los campos del formulario
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('Usuario');
    const [course, setCourse] = useState('');
    const [department, setDepartment] = useState('');
    const [status, setStatus] = useState('nuevo');
    const [birthdate, setBirthdate] = useState('');
    const [birthtime, setBirthtime] = useState('12:00'); // Estado para la hora, con valor por defecto
    const [jobTitle, setJobTitle] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const resetForm = () => {
        setName('');
        setEmail('');
        setPassword('');
        setPhone('');
        setRole('Usuario');
        setCourse('');
        setDepartment('');
        setStatus('nuevo');
        setBirthdate('');
        setBirthtime('12:00'); // Resetear la hora también
        setJobTitle('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const token = await getAuthToken();
            if (!token) {
                throw new Error('No se pudo obtener el token de autenticación.');
            }

            // Combinar fecha y hora en un string ISO 8601
            // Esto crea un formato como "YYYY-MM-DDTHH:mm:00" que Firebase interpreta correctamente
            const birthdateISO = `${birthdate}T${birthtime}:00`;

            const body: any = {
                name, email, password, phone, role, department, status, 
                birthdate: birthdateISO, // Enviar el string combinado
                jobTitle,
                avatarUrl: '' // Dejar en blanco como solicitado
            };

            if (role === 'Profesor Jefe') {
                body.course = course;
            }

            const response = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Ocurrió un error al crear el usuario.');
            }

            setSuccess(`¡Usuario '${name}' creado exitosamente!`);
            resetForm();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!userProfile || userProfile.role !== 'Admin Intranet') {
        return <AccessDenied />;
    }

    return (
        <div className="container mx-auto py-10">
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>Crear Nuevo Usuario</CardTitle>
                    <CardDescription>
                        Completa el formulario para registrar un nuevo usuario en el sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Columna 1 */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre Completo</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Correo Electrónico</Label>
                                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Contraseña</Label>
                                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="phone">Teléfono Interno (Anexo)</Label>
                                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={4} placeholder="Ej: 1234"/>
                            </div>
                             {/* Campo de Fecha de Nacimiento con Hora */}
                             <div className="space-y-2">
                                <Label>Fecha y Hora de Nacimiento</Label>
                                <div className="flex items-center gap-2">
                                    <Input id="birthdate" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} required className="flex-grow"/>
                                    <Input id="birthtime" type="time" value={birthtime} onChange={(e) => setBirthtime(e.target.value)} required className="w-auto"/>
                                </div>
                            </div>
                        </div>

                        {/* Columna 2 */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="role">Rol</Label>
                                <Select onValueChange={setRole} value={role}>
                                    <SelectTrigger><SelectValue placeholder="Selecciona un rol" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Usuario">Usuario</SelectItem>
                                        <SelectItem value="Profesor Jefe">Profesor Jefe</SelectItem>
                                        <SelectItem value="Admin Intranet">Admin Intranet</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {role === 'Profesor Jefe' && (
                                <div className="space-y-2 animate-in fade-in">
                                    <Label htmlFor="course">Curso Asignado</Label>
                                    <Input id="course" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Ej: IV°A" required={role === 'Profesor Jefe'} />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="jobTitle">Cargo</Label>
                                <Input id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required placeholder="Ej: Docente"/>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="department">Departamento</Label>
                                <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} required placeholder="Ej: Lenguaje"/>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Estado</Label>
                                <Select onValueChange={setStatus} value={status}>
                                    <SelectTrigger><SelectValue placeholder="Selecciona un estado" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="nuevo">Nuevo</SelectItem>
                                        <SelectItem value="antiguo">Antiguo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Footer del Formulario */}
                        <div className="md:col-span-2 space-y-4">
                             {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}
                             {success && <p className="text-green-500 text-sm font-medium text-center">{success}</p>}

                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading ? 'Creando...' : 'Crear Usuario'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
