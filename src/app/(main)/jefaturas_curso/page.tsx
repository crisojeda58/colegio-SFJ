
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface CourseHead {
  id: string;
  name: string;
  course: string;
  classroom: string;
  email: string;
  department: string;
}

export default function CourseHeadsPage() {
  const [courseHeads, setCourseHeads] = useState<CourseHead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourseHeads = async () => {
      setLoading(true);
      try {
        const usersCollection = collection(db, "users");
        // Filtramos para obtener solo los usuarios que son Profesores Jefe
        const q = query(usersCollection, where("role", "==", "Profesor jefe"));
        const querySnapshot = await getDocs(q);

        const headsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CourseHead[];
        
        setCourseHeads(headsList);
      } catch (error) {
        console.error("Error fetching course heads: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseHeads();
  }, []);

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-card">Información de Jefaturas de Curso</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
           Array.from({ length: 3 }).map((_, index) => (
             <Card key={index} className="hover:shadow-lg transition-shadow">
               <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-5 w-24 mt-1" />
               </CardHeader>
               <CardContent>
                  <Skeleton className="h-6 w-28 rounded-full" />
                  <div className="mt-4">
                    <Skeleton className="h-4 w-40" />
                  </div>
               </CardContent>
             </Card>
           ))
        ) : (
          courseHeads.map((head) => (
            <Card key={head.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center gap-4">
                <div>
                  <CardTitle className="text-primary">{head.course || 'Curso no asignado'}</CardTitle>
                  <p className="text-foreground font-semibold">{head.name}</p>
                </div>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">
                    {head.course ? `Sala ${head.course}` : 'Sala no asignada'}
                </Badge>
                <div className="mt-2 space-y-2 text-muted-foreground">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${head.email}`} className="hover:underline">{head.email}</a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

       {!loading && courseHeads.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No se encontraron jefaturas de curso.</p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}

