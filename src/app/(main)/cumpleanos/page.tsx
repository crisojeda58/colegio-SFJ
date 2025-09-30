
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, getMonth } from 'date-fns';
import { es } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Cake, CalendarX } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

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

  const currentMonth = getMonth(new Date());

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
          <h1 className="text-3xl font-bold text-card">Cumpleaños del mes</h1>
        </div>
      </div>

      <p className="text-white font-bold mb-6">
        Estos son los cumpleaños para el mes de <span className="capitalize text-white font-bold">{monthName}</span>.
      </p>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
                <CardHeader className="flex-row items-center gap-4">
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
          {users.map(user => (
            <Card key={user.id} className="overflow-hidden group hover:shadow-primary/20 hover:shadow-lg transition-shadow">
               <CardHeader className="flex-row items-center gap-4">
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
            </Card>
          ))}
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