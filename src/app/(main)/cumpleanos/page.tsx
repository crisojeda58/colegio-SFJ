
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, getMonth, getDate } from 'date-fns';
import { es } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Cake, CalendarX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  birthdate?: Timestamp;
  avatarUrl?: string;
}

export default function BirthdaysPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const today = new Date();
  const currentMonth = getMonth(today);
  const currentDay = getDate(today);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersCollection = collection(db, "users");
        const querySnapshot = await getDocs(usersCollection);
        const usersList = querySnapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name,
              birthdate: data.birthdate,
              avatarUrl: data.avatarUrl,
            } as User;
          })
          .filter(user => user.birthdate && user.birthdate.toDate().getMonth() === currentMonth)
          .sort((a, b) => a.birthdate!.toDate().getDate() - b.birthdate!.toDate().getDate());
        
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los cumpleaños.' });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentMonth, toast]);

  const monthName = format(new Date(new Date().setMonth(currentMonth)), 'MMMM', { locale: es });

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Cake className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">
            <span className="bg-sidebar text-primary-foreground px-3 py-1 rounded-md">
              Cumpleaños del mes
            </span>
          </h1>
        </div>
      </div>

      <p className="mb-6">
        <span className="bg-sidebar text-primary-foreground px-3 py-1 rounded-md font-bold">
            Estos son los cumpleaños para el mes de <span className="capitalize">{monthName}</span>.
        </span>
      </p>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
                <CardHeader className="flex-row items-center gap-4 p-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                </CardHeader>
            </Card>
          ))}
        </div>
      ) : users.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {users.map(user => {
            const birthDate = user.birthdate!.toDate();
            const isBirthday = birthDate.getDate() === currentDay && birthDate.getMonth() === currentMonth;
            
            return (
              <Card key={user.id} className={cn(
                  "overflow-hidden group hover:shadow-primary/20 hover:shadow-lg transition-all duration-300 flex flex-col",
                  isBirthday && "border-amber-400 dark:border-amber-500 shadow-amber-500/20 dark:shadow-amber-500/10"
              )}>
                 <CardHeader className="flex-row items-center gap-4 p-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatarUrl || `https://avatar.vercel.sh/${user.name}.png`} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{user.name}</CardTitle>
                    {user.birthdate && (
                      <p className="text-sm text-muted-foreground font-semibold">
                        {format(user.birthdate.toDate(), "d 'de' MMMM", { locale: es })}
                      </p>
                    )}
                  </div>
                </CardHeader>
                {isBirthday && (
                    <CardContent className="py-2 px-4 bg-amber-100 dark:bg-amber-900/20 mt-auto">
                        <p className="text-center font-bold text-amber-600 dark:text-amber-400">¡Feliz Cumpleaños!</p>
                    </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
            <CardContent className="pt-6 flex flex-col items-center justify-center h-48">
                <CalendarX className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-center text-muted-foreground">
                    No hay cumpleaños para mostrar este mes.
                </p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
