'use client';

import { useState } from 'react';
import { updatePassword } from 'firebase/auth';
import { useAuth, type UserProfile } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Mail, Building, KeyRound, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function ProfilePage() {
  const { user, userProfile, loading } = useAuth();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { toast } = useToast();

  const handleUpdatePassword = async () => {
    setPasswordError('');
    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }
    if (!user) {
      setPasswordError('No se ha encontrado al usuario para la actualización.');
      return;
    }

    try {
      await updatePassword(user, newPassword);
      toast({
        title: 'Éxito',
        description: 'Tu contraseña ha sido actualizada.',
      });
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        variant: 'destructive',
        title: 'Error al cambiar contraseña',
        description: 'Es posible que necesites volver a iniciar sesión para realizar esta acción.',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-card">Perfil de Usuario</h1>
        <Card>
          <CardHeader className="flex flex-col md:flex-row items-start gap-6 space-y-0">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-2 pt-2">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-5 w-1/3" />
            </div>
          </CardHeader>
          <CardContent>
            <Separator className="my-4" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="container mx-auto">
        <p>No se pudo cargar el perfil. Por favor, asegúrate de haber iniciado sesión.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-card">Perfil de Usuario</h1>
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start gap-6 space-y-0">
          <Avatar className="h-24 w-24">
            <AvatarImage src={userProfile.avatarUrl} />
            <AvatarFallback>{userProfile.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 pt-2">
            <CardTitle className="text-4xl">{userProfile.name}</CardTitle>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                <span>Departamento: {userProfile.department}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>{userProfile.jobTitle}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Separator className="my-4" />
          <div>
            <h3 className="font-semibold text-lg mb-2">Información de Contacto</h3>
            <div className="space-y-2 text-muted-foreground">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5" />
                <a href={`mailto:${userProfile.email}`} className="hover:underline">
                  {userProfile.email}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5" />
                <span>{userProfile.phone}</span>
              </div>
            </div>
          </div>
          <Separator className="my-4" />
          <div>
            <h3 className="font-semibold text-lg mb-4">Seguridad de la Cuenta</h3>
            {!isChangingPassword ? (
              <Button onClick={() => setIsChangingPassword(true)}>
                <KeyRound className="mr-2" />
                Cambiar Contraseña
              </Button>
            ) : (
              <div className="space-y-4 max-w-sm">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva Contraseña</Label>
                  <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                  <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                <div className="flex gap-2">
                  <Button onClick={handleUpdatePassword}>Actualizar Contraseña</Button>
                  <Button variant="outline" onClick={() => setIsChangingPassword(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
