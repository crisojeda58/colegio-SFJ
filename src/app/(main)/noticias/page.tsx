"use client";

import Image from "next/image";
import * as React from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Clock, Newspaper } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface NewsItem {
    id: string;
    title: string;
    excerpt: string;
    imageUrl: string;
    publishedAt?: Date;
    eventDate?: Date;
}

interface UserProfile {
    role: string;
}

interface Event {
  id: string;
  title: string;
  eventDate: Date;
}

export default function NewsAndCalendarPage() {
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [newsItems, setNewsItems] = React.useState<NewsItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUserProfile({ role: data.role });
        }
      }
    });
    return () => unsubscribe();
  }, []);
  
  React.useEffect(() => {
    const fetchNews = async () => {
        setLoading(true);
        try {
            const newsCollection = collection(db, "news_items");
            const q = query(newsCollection, orderBy("eventDate", "asc"));
            const querySnapshot = await getDocs(q);

            const itemsList = querySnapshot.docs
                .map(doc => {
                    const data = doc.data();
                    // Robust date checking
                    const publishedAt = data.publishedAt instanceof Timestamp ? data.publishedAt.toDate() : undefined;
                    const eventDate = data.eventDate instanceof Timestamp ? data.eventDate.toDate() : undefined;
                    return {
                        id: doc.id,
                        title: data.title,
                        excerpt: data.excerpt,
                        imageUrl: data.imageUrl,
                        publishedAt: publishedAt,
                        eventDate: eventDate,
                    } as NewsItem;
                })
                .filter(item => item.eventDate); // Ensure we only deal with items that are events
            
            setNewsItems(itemsList);
        } catch (error) {
            console.error("Error fetching news items:", error);
        } finally {
            setLoading(false);
        }
    }
    fetchNews();
  }, []);

  const events = newsItems
    .filter(item => item.eventDate)
    .map(item => ({
        id: item.id,
        title: item.title,
        eventDate: item.eventDate!
    }));

  const selectedDayEvents = (date 
    ? events.filter(event => format(event.eventDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
    : []
  ).sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

  const eventDays = events.map(event => event.eventDate);

  const canCreateNews = userProfile?.role === 'Jefe de departamento' || userProfile?.role === 'Admin Intranet';

  const renderNewsList = (items: NewsItem[]) => {
    if (loading && items.length === 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="flex flex-col overflow-hidden">
                <Skeleton className="w-full h-48" />
                <CardHeader>
                    <Skeleton className="h-4 w-1/4 mb-2" />
                    <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-5/6" />
                </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    if (items.length === 0 && !loading) {
        return <p className="text-muted-foreground text-center py-8">No hay noticias o eventos publicados.</p>;
    }
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
                const hasEventDatePassed = item.eventDate ? isPast(item.eventDate) : false;
                return (
                    <Link href={`/noticias/${item.id}`} key={item.id} className="block transform transition-transform duration-200 hover:scale-[1.02]">
                        <Card className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full">
                        <div className="relative w-full h-48">
                            <Image src={item.imageUrl} alt={item.title} layout="fill" objectFit="cover" />
                        </div>
                        <CardHeader>
                            <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-primary font-semibold">
                                {item.eventDate ? format(item.eventDate, "dd 'de' MMMM, yyyy - HH:mm 'hrs.'", { locale: es }) : 'Fecha no especificada'}
                            </span>
                            </div>
                            <CardTitle className={cn(hasEventDatePassed && "text-destructive")}>
                                {item.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <CardDescription className="text-foreground">{item.excerpt}</CardDescription>
                        </CardContent>
                        </Card>
                    </Link>
                );
            })}
        </div>
    )
  }

  return (
    <div className="container mx-auto">
      <div className="bg-primary text-primary-foreground text-center p-4 rounded-lg mb-6">
          <h2 className="text-6xl font-bold">Bienvenidos a la Intranet de Funcionarios</h2>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-card">Portal de Noticias y Eventos</h1>
        {canCreateNews && (
          <Button asChild>
            <Link href="/noticias/nuevo">
              <PlusCircle className="mr-2" />
              Crear Noticia
            </Link>
          </Button>
        )}
      </div>

      {/* Calendar Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div>
          <Card>
            <CardContent className="p-0 flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="p-3"
                locale={es}
                modifiers={{ event: eventDays }}
                modifiersStyles={{ 
                  event: { 
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                    textDecorationColor: 'hsl(var(--primary))',
                  } 
                }}
              />
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Eventos del día</CardTitle>
              <p className="text-muted-foreground">
                {date ? format(date, "EEEE, dd 'de' MMMM, yyyy", { locale: es }) : "Selecciona un día"}
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : selectedDayEvents.length > 0 ? (
                <div className="space-y-4">
                  {selectedDayEvents.map((event) => (
                    <Link href={`/noticias/${event.id}`} key={event.id} className="block group">
                      <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                        <div className="mt-1">
                            <Newspaper className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold group-hover:underline">{event.title}</p>
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                                <Clock className="h-4 w-4 mr-1.5" />
                                <span>{format(event.eventDate, 'HH:mm')} hrs</span>
                            </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No hay eventos para este día.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        {renderNewsList(newsItems)}
      </div>
    </div>
  );
}