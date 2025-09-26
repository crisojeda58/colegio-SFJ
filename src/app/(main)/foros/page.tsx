"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MessageSquare, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";

interface ForumTopic {
  id: string;
  title: string;
  authorName: string;
  replyCount: number;
  lastActivity: Date;
  category: string;
}

export default function ForumPage() {
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopics = async () => {
      setLoading(true);
      try {
        const topicsCollection = collection(db, "forum_topics");
        const q = query(topicsCollection, orderBy("lastActivity", "desc"));
        const querySnapshot = await getDocs(q);

        const topicsList = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const lastActivity = data.lastActivity instanceof Timestamp 
            ? data.lastActivity.toDate() 
            : new Date();

          return {
            id: doc.id,
            title: data.title,
            authorName: data.authorName,
            replyCount: data.replyCount || 0,
            lastActivity: lastActivity,
            category: data.category,
          };
        }) as ForumTopic[];

        setTopics(topicsList);
      } catch (error) {
        console.error("Error fetching forum topics: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, []);

  const formatLastActivity = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  };
  
  const isInactive = (date: Date) => {
    return differenceInDays(new Date(), date) > 20;
  }

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-card">Foros de Discusión</h1>
        <Button asChild>
          <Link href="/foros/nuevo">
            <PlusCircle className="mr-2" />
            Nuevo Tema
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardFooter className="flex justify-between">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
              </CardFooter>
            </Card>
          ))
        ) : (
          topics.map((topic) => {
            const inactive = isInactive(topic.lastActivity);
            return (
                <Link href={`/foros/${topic.id}`} key={topic.id} className="block transform transition-transform duration-200 hover:scale-[1.02]">
                    <Card className="hover:bg-secondary transition-colors h-full">
                    <CardHeader>
                        <CardTitle className={cn("text-lg", inactive && "text-destructive")}>{topic.title}</CardTitle>
                    </CardHeader>
                    <CardFooter className="flex justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span>{topic.authorName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            <span>{topic.replyCount}</span>
                        </div>
                        </div>
                        <div className={cn("flex items-center gap-1", inactive && "text-destructive font-semibold")}>
                        <Clock className="h-4 w-4" />
                        <span>Última actividad {formatLastActivity(topic.lastActivity)}</span>
                        </div>
                    </CardFooter>
                    </Card>
                </Link>
            )
          })
        )}
        {!loading && topics.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No hay temas en el foro todavía. ¡Crea uno nuevo!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}