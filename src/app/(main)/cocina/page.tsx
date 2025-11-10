'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth, type UserProfile } from '@/context/AuthContext';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Pencil, LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// --- Tipos y Esquemas ---

const normalDaySchema = z.object({
  option1: z.string().min(3, 'Debe tener al menos 3 caracteres.'),
  option2: z.string().min(3, 'Debe tener al menos 3 caracteres.'),
});

const singleDaySchema = z.string().min(3, 'Debe tener al menos 3 caracteres.');

const weekSchema = z.object({
  Lunes: singleDaySchema,
  Martes: singleDaySchema,
  Miércoles: singleDaySchema,
  Jueves: singleDaySchema,
  Viernes: singleDaySchema,
});

const normalWeekSchema = z.object({
  Lunes: normalDaySchema,
  Martes: normalDaySchema,
  Miércoles: normalDaySchema,
  Jueves: normalDaySchema,
  Viernes: normalDaySchema,
});

const formSchema = z.object({
  normal: normalWeekSchema,
  hipocalorica: weekSchema,
  vegetariana: weekSchema,
});

type FormValues = z.infer<typeof formSchema>;

const initialMenuData: FormValues = {
  normal: {
    Lunes: { option1: '', option2: '' },
    Martes: { option1: '', option2: '' },
    Miércoles: { option1: '', option2: '' },
    Jueves: { option1: '', option2: '' },
    Viernes: { option1: '', option2: '' },
  },
  hipocalorica: { Lunes: '', Martes: '', Miércoles: '', Jueves: '', Viernes: '' },
  vegetariana: { Lunes: '', Martes: '', Miércoles: '', Jueves: '', Viernes: '' },
};

const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] as const;

// --- Componentes ---

const DailyMenuCard = ({ day, menu, loading }: { day: string; menu: FormValues | null; loading: boolean }) => {
  if (loading) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-32 mt-2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-32 mt-2" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!menu) {
    return null; // O un mensaje de error si prefieres
  }

  return (
    <Card key={day} className="bg-card">
      <CardHeader>
        <CardTitle className="text-primary">{day}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Menú Normal */}
        <p className="font-semibold text-foreground">Menú Normal:</p>
        <CardDescription className="mb-1 ml-2 text-foreground">Opción 1: {menu.normal[day as keyof typeof menu.normal]?.option1 || 'No definido'}</CardDescription>
        <CardDescription className="mb-2 ml-2 text-foreground">Opción 2: {menu.normal[day as keyof typeof menu.normal]?.option2 || 'No definido'}</CardDescription>

        {/* Menú Hipocalórico */}
        <p className="font-semibold text-foreground mt-3">Menú Hipocalórico:</p>
        <CardDescription className="mb-2 ml-2 text-foreground">{menu.hipocalorica[day as keyof typeof menu.hipocalorica] || 'No definido'}</CardDescription>

        {/* Menú Vegetariano */}
        <p className="font-semibold text-foreground mt-3">Menú Vegetariano:</p>
        <CardDescription className="ml-2 text-foreground">{menu.vegetariana[day as keyof typeof menu.vegetariana] || 'No definido'}</CardDescription>
      </CardContent>
    </Card>
  );
};

const DailyMenuForm = ({ day, control }: { day: string; control: any }) => (
  <Card key={day} className="mb-6">
    <CardHeader>
      <CardTitle>{day}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <h3 className="font-semibold text-lg text-primary mb-2">Menú Normal</h3>
      <FormField
        control={control}
        name={`normal.${day}.option1`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Opción 1</FormLabel>
            <FormControl>
              <Input placeholder="Ej: Lentejas con arroz" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`normal.${day}.option2`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Opción 2</FormLabel>
            <FormControl>
              <Input placeholder="Ej: Pollo asado con puré" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <hr className="my-4" />

      <h3 className="font-semibold text-lg text-primary mb-2">Menú Hipocalórico</h3>
      <FormField
        control={control}
        name={`hipocalorica.${day}`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Plato Principal</FormLabel>
            <FormControl>
              <Input placeholder="Ej: Ensalada César" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <hr className="my-4" />

      <h3 className="font-semibold text-lg text-primary mb-2">Menú Vegetariano</h3>
      <FormField
        control={control}
        name={`vegetariana.${day}`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Plato Principal</FormLabel>
            <FormControl>
              <Input placeholder="Ej: Lasaña de verduras" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </CardContent>
  </Card>
);

export default function KitchenPage() {
  const [menu, setMenu] = useState<FormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialMenuData,
  });

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      const menuDocRef = doc(db, 'kitchen_menus', 'weekly');
      try {
        const docSnap = await getDoc(menuDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data().menu as FormValues;
          const mergedData = {
            ...initialMenuData,
            ...data,
            normal: {
              ...initialMenuData.normal,
              ...(data.normal || {}),
            },
            hipocalorica: {
              ...initialMenuData.hipocalorica,
              ...(data.hipocalorica || {}),
            },
            vegetariana: {
              ...initialMenuData.vegetariana,
              ...(data.vegetariana || {}),
            },
          };
          setMenu(mergedData);
          form.reset(mergedData);
        } else {
          setMenu(initialMenuData);
          form.reset(initialMenuData);
        }
      } catch (error) {
        console.error('Error fetching menu:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar la minuta.' });
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [form, toast]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    const menuDocRef = doc(db, 'kitchen_menus', 'weekly');
    try {
      await setDoc(menuDocRef, {
        menu: data,
        lastUpdated: serverTimestamp(),
      });
      setMenu(data);
      toast({ title: 'Éxito', description: 'La minuta semanal ha sido actualizada.' });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving menu:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la minuta.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canEditMenu = userProfile?.role === 'Admin Intranet' || userProfile?.role === 'Jefe de cocina';

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          <span className="bg-sidebar text-primary-foreground px-3 py-1 rounded-md">
            Minuta de Cocina Semanal
          </span>
        </h1>
        {canEditMenu && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Pencil className="mr-2 h-4 w-4" />
                Cambiar Menú
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Editar Minuta Semanal</DialogTitle>
              </DialogHeader>
              <div className="flex-grow overflow-y-auto pr-6">
                <Form {...form}>
                  <form id="menu-form" className="space-y-8">
                    {daysOfWeek.map((day) => (
                      <DailyMenuForm key={day} day={day} control={form.control} />
                    ))}
                  </form>
                </Form>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSubmitting}>
                    Cancelar
                  </Button>
                </DialogClose>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={isSubmitting}>{isSubmitting && <LoaderCircle className="animate-spin mr-2" />}Guardar Cambios</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Confirmar Cambios?</AlertDialogTitle>
                      <AlertDialogDescription>Estás a punto de sobrescribir la minuta semanal actual. Esta acción no se puede deshacer. ¿Deseas continuar?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={form.handleSubmit(onSubmit)}>Sí, guardar cambios</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {daysOfWeek.map((day) => (
          <DailyMenuCard key={day} day={day} menu={menu} loading={loading} />
        ))}
      </div>
    </div>
  );
}
