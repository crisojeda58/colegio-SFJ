"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, type User, updatePassword } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail, Building, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  name: string;
  email: string;
  role: string;
  department: string;
}

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as UserProfile;
            setUserProfile(userData);
          } else {
            console.log("No such document!");
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo encontrar el perfil de usuario.",
            });
          }
        } catch (error) {
            console.error("Error fetching user data:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo cargar la información del perfil.",
            });
        }
      } else {
        setUserProfile(null);
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleUpdatePassword = async () => {
    setPasswordError('');
    if (newPassword.length < 6) {
        setPasswordError("La contraseña debe tener al menos 6 caracteres.");
        return;
    }
    if (newPassword !== confirmPassword) {
        setPasswordError("Las contraseñas no coinciden.");
        return;
    }
    if (!currentUser) {
        setPasswordError("No se ha encontrado al usuario.");
        return;
    }

    try {
        await updatePassword(currentUser, newPassword);
        toast({
            title: "Éxito",
            description: "Tu contraseña ha sido actualizada.",
        });
        setNewPassword("");
        setConfirmPassword("");
        setIsChangingPassword(false);
    } catch (error: any) {
        console.error("Error updating password:", error);
        toast({
            variant: "destructive",
            title: "Error al cambiar contraseña",
            description: "Es posible que necesites volver a iniciar sesión para realizar esta acción.",
        });
    }
  };
  
  if (loading) {
    return (
        <div className="container mx-auto">
             <h1 className="text-3xl font-bold mb-6 text-card">Perfil de Usuario</h1>
             <Card>
                <CardHeader className="flex flex-col md:flex-row items-start gap-6 space-y-0">
                    <div className="flex-1 space-y-2">
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
    )
  }

  if (!userProfile) {
    return <div className="container mx-auto"><p>No se pudo cargar el perfil. Por favor, inicia sesión de nuevo.</p></div>;
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-card">Perfil de Usuario</h1>
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start gap-6 space-y-0">
          <div className="flex-1">
            <CardTitle className="text-4xl">{userProfile.name}</CardTitle>
            <CardDescription className="text-lg">{userProfile.role}</CardDescription>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span>{userProfile.department}</span>
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
                <a href={`mailto:${userProfile.email}`} className="hover:underline">{userProfile.email}</a>
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
                        <Button variant="outline" onClick={() => setIsChangingPassword(false)}>Cancelar</Button>
                    </div>
                </div>
             )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}