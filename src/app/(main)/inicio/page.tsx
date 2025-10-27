
"use client";

import Image from "next/image";
import * as React from "react";
import dynamic from "next/dynamic";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { format, isPast, isFuture, compareAsc } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Newspaper, Download, CalendarDays } from "lucide-react";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const NewPostDialog = dynamic(() => import('./new-post-dialog').then(mod => mod.NewPostDialog), { ssr: false });
const PostDetailDialog = dynamic(() => import('./post-detail-dialog').then(mod => mod.PostDetailDialog), { ssr: false });

const NEWS_PER_PAGE = 6;

export interface NewsItem {
    id: string;
    title: string;
    excerpt: string;
    imageUrl: string;
    category: "Noticia" | "Evento";
    publishedAt?: Date;
    eventDate?: Date;
    content: string; // Add content for detail view
    authorName: string; // Add authorName for detail view
}

interface Event {
  id: string;
  title: string;
  eventDate: Date;
}

//distincion de usuarios
const ALLOWED_ROLES = ['Admin Intranet'];

export default function NewsAndCalendarPage() {
  const { userProfile } = useAuth();
  const [newsItems, setNewsItems] = React.useState<NewsItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [visibleNewsCount, setVisibleNewsCount] = React.useState(NEWS_PER_PAGE);

  const fetchNews = React.useCallback(async () => {
      setLoading(true);
      try {
          const newsCollection = collection(db, "news_items");
          const q = query(newsCollection, orderBy("eventDate", "desc"));
          const querySnapshot = await getDocs(q);

          const itemsList = querySnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                  id: doc.id,
                  title: data.title,
                  excerpt: data.excerpt,
                  imageUrl: data.imageUrl,
                  category: data.category,
                  publishedAt: data.publishedAt instanceof Timestamp ? data.publishedAt.toDate() : undefined,
                  eventDate: data.eventDate instanceof Timestamp ? data.eventDate.toDate() : undefined,
                  content: data.content, // Make sure to fetch content
                  authorName: data.authorName, // Make sure to fetch authorName
              } as NewsItem;
          });
          
          setNewsItems(itemsList);
      } catch (error) {
          console.error("Error fetching news items:", error);
      } finally {
          setLoading(false);
      }
  }, []);

  React.useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const sortedNewsItems = React.useMemo(() => {
    const pastItems = newsItems
      .filter(item => (item.eventDate ? isPast(item.eventDate) : true))
      .sort((a, b) => {
        const dateA = a.eventDate || a.publishedAt;
        const dateB = b.eventDate || b.publishedAt;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB.getTime() - dateA.getTime(); // Most recent past first
      });

    const futureItems = newsItems
      .filter(item => (item.eventDate ? isFuture(item.eventDate) : false))
      .sort((a, b) => compareAsc(a.eventDate!, b.eventDate!)); // Nearest future first

    return [...pastItems, ...futureItems];
  }, [newsItems]);

  const canCreateNews = userProfile && ALLOWED_ROLES.includes(userProfile.role);

  const newsVisibleToUser = React.useMemo(() => {
    if (canCreateNews) {
      return sortedNewsItems;
    }
    return sortedNewsItems.filter(item => {
      if (item.eventDate) {
        return isFuture(item.eventDate);
      }
      return true; // Always show non-event posts
    });
  }, [sortedNewsItems, canCreateNews]);

  const events = newsItems
    .filter(item => item.category === 'Evento' && item.eventDate)
    .map(item => ({ id: item.id, title: item.title, eventDate: item.eventDate! }));

  const selectedDayEvents = (date 
    ? events.filter(event => format(event.eventDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
    : []
  ).sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

  const eventDays = events.map(event => event.eventDate);

  const handleLoadMore = () => {
    setVisibleNewsCount(prevCount => prevCount + NEWS_PER_PAGE);
  };

  const currentlyVisibleNews = newsVisibleToUser.slice(0, visibleNewsCount);

  const renderNewsList = (items: NewsItem[]) => {
    if (loading && items.length === 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
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
            {items.map((item, index) => {
                const hasEventDatePassed = item.eventDate ? isPast(item.eventDate) : false;
                const displayDate = item.eventDate 
                    ? format(item.eventDate, "dd 'de' MMMM, yyyy - HH:mm 'hrs.'", { locale: es })
                    : (item.publishedAt ? format(item.publishedAt, "dd 'de' MMMM, yyyy", { locale: es }) : "Fecha no especificada");

                return (
                    <PostDetailDialog key={item.id} newsItemId={item.id} onPostDeleted={fetchNews} onPostEdited={fetchNews}>
                        <div className="block transform transition-transform duration-200 hover:scale-[1.02] cursor-pointer h-full">
                            <Card className={cn(
                                "flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full",
                                canCreateNews && hasEventDatePassed && "bg-red-400"
                            )}>
                                <div className="relative w-full h-48">
                                    <Image 
                                        src={item.imageUrl} 
                                        alt={item.title} 
                                        fill
                                        style={{ objectFit: 'cover' }}
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        quality={75}
                                        priority={index < NEWS_PER_PAGE}
                                    />
                                </div>
                                <CardHeader>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`text-xs font-semibold ${item.category === 'Evento' ? 'text-primary' : 'text-accent-foreground'}`}>
                                            {displayDate}
                                        </span>
                                    </div>
                                    <CardTitle>
                                        {item.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <CardDescription className="text-foreground">{item.excerpt}</CardDescription>
                                </CardContent>
                            </Card>
                        </div>
                    </PostDetailDialog>
                );
            })}
        </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-primary text-primary-foreground text-center p-4 rounded-lg mb-6 pb-8 pt-8">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold">Bienvenidos al portal de Educadores</h2>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-card">Avisos y Eventos</h1>
        {canCreateNews && (
          <NewPostDialog onPostCreated={fetchNews} />
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
                formatters={{ formatCaption: (date, options) => format(date, 'MMMM yyyy', { locale: options?.locale }), formatWeekdayName: (day, options) => format(day, 'EEEEEE', { locale: options?.locale }).slice(0, 2) }}
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
                    <PostDetailDialog key={event.id} newsItemId={event.id} onPostDeleted={fetchNews} onPostEdited={fetchNews}>
                      <div className="block group cursor-pointer">
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
                      </div>
                    </PostDetailDialog>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No hay eventos para este día.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Featured Document Card */}
      <div className="my-8">
        <Card>
            <div className="flex flex-col sm:flex-row items-center justify-between p-6">
                <div className="flex items-center gap-4 mb-4 sm:mb-0">
                    <CalendarDays className="h-10 w-10 text-primary flex-shrink-0" />
                    <div>
                        <h3 className="text-xl font-bold">Calendario Académico</h3>
                        <p className="text-muted-foreground">Abiri el calendario académico del semestre.</p>
                    </div>
                </div>
                <Button asChild className="flex-shrink-0">
                    <a href="https://docs.google.com/spreadsheets/d/1cOF3vSqxB5LitnEP5wh3oosANMDft28ZOl90k2PxlTw/edit?gid=0#gid=0" target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        Abrir
                    </a>
                </Button>
            </div>
        </Card>
      </div>

      <div className="mt-6">
        {renderNewsList(currentlyVisibleNews)}
        {visibleNewsCount < newsVisibleToUser.length && (
            <div className="flex justify-center mt-8">
                <Button onClick={handleLoadMore} variant="secondary">
                    Cargar más publicaciones
                </Button>
            </div>
        )}
      </div>
    </div>
  );
}
