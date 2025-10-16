
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Mail, Phone, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface Employee {
  id: string;
  name: string;
  department: string;
  email: string;
  phone?: string;
  status: string;
  jobTitle: string;
  avatarUrl?: string;
}

export default function ColleaguesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const usersCollection = collection(db, "users");
        const q = query(
            usersCollection, 
            where("status", "==", "nuevo"),
            orderBy("name")
        );
        const querySnapshot = await getDocs(q);
        const usersList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Employee[];
        setEmployees(usersList);
        setFilteredEmployees(usersList);
      } catch (error) {
        console.error("Error fetching users: ", error);
        // Aquí podrías usar un toast para notificar el error
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = employees.filter((item) => {
      return (
        item.name.toLowerCase().includes(lowercasedFilter) ||
        item.department.toLowerCase().includes(lowercasedFilter) ||
        (item.phone && item.phone.toLowerCase().includes(lowercasedFilter))
      );
    });
    setFilteredEmployees(filteredData);
  }, [searchTerm, employees]);

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-card">Nuevos Educadores</h1>
      <p className="text-card mb-6">Colegas que se han unido este año.</p>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, departamento o teléfono..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <Card className="bg-indigo-100">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground font-bold">Nombre</TableHead>
                <TableHead className="text-foreground font-bold">Departamento</TableHead>
                <TableHead className="text-foreground font-bold">Cargo</TableHead>
                <TableHead className="text-foreground font-bold">Teléfono</TableHead>
                <TableHead className="text-foreground font-bold">Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  </TableRow>
                ))
              ) : (
                filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={employee.avatarUrl || `https://avatar.vercel.sh/${employee.name}.png`} alt={employee.name} />
                          <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium whitespace-nowrap">{employee.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium whitespace-nowrap">{employee.department}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium whitespace-nowrap">{employee.jobTitle}</span>
                    </TableCell>
                    <TableCell>
                      {employee.phone ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                              <Phone className="h-4 w-4" />
                              {employee.phone}
                          </div>
                      ) : (
                          <span className="text-xs text-muted-foreground">No disponible</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <a href={`mailto:${employee.email}`} className="flex items-center gap-2 text-sm hover:underline text-muted-foreground hover:text-primary whitespace-nowrap">
                          <Mail className="h-4 w-4" />
                          {employee.email}
                      </a>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!loading && filteredEmployees.length === 0 && (
                  <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                          No hay colegas nuevos este año.
                      </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
