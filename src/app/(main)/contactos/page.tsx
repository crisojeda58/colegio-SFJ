
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Mail, Phone, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Employee {
  id: string;
  name: string;
  department: string;
  jobTitle: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
}

export default function DirectoryPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const usersCollection = collection(db, "users");
        const q = query(usersCollection, orderBy("name"));
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
      const nameMatch = (item.name ?? '').toLowerCase().includes(lowercasedFilter);
      const departmentMatch = (item.department ?? '').toLowerCase().includes(lowercasedFilter);
      const phoneMatch = (item.phone ?? '').toLowerCase().includes(lowercasedFilter);
      return nameMatch || departmentMatch || phoneMatch;
    });
    setFilteredEmployees(filteredData);
  }, [searchTerm, employees]);


  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        <span className="bg-sidebar text-primary-foreground px-3 py-1 rounded-md">
          Contacto de educadores
        </span>
      </h1>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, departamento o teléfono..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <Card className="bg-cyan-accent border-cyan-accent text-cyan-accent-foreground">
        <Table>
          <TableHeader>
            <TableRow className="border-b-cyan-accent-foreground/20 hover:bg-cyan-accent/80">
              <TableHead className="text-cyan-accent-foreground font-bold">Nombre</TableHead>
              <TableHead className="text-cyan-accent-foreground font-bold">Departamento</TableHead>
              <TableHead className="text-cyan-accent-foreground font-bold">Cargo</TableHead>
              <TableHead className="text-cyan-accent-foreground font-bold">Teléfono</TableHead>
              <TableHead className="text-cyan-accent-foreground font-bold">Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index} className="border-b-cyan-accent-foreground/20">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full bg-cyan-accent-foreground/10" />
                      <Skeleton className="h-4 w-32 bg-cyan-accent-foreground/10" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-28 bg-cyan-accent-foreground/10" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 bg-cyan-accent-foreground/10" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 bg-cyan-accent-foreground/10" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48 bg-cyan-accent-foreground/10" /></TableCell>
                </TableRow>
              ))
            ) : (
              filteredEmployees.map((employee) => (
                <TableRow key={employee.id} className="border-b-cyan-accent-foreground/20 hover:bg-cyan-accent/80">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={employee.avatarUrl || `https://avatar.vercel.sh/${employee.name}.png`} alt={employee.name} />
                        <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{employee.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{employee.department}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{employee.jobTitle}</span>
                  </TableCell>
                  <TableCell>
                    {employee.phone ? (
                        <div className="flex items-center gap-2 text-sm text-cyan-accent-foreground/80">
                            <Phone className="h-4 w-4" />
                            {employee.phone}
                        </div>
                    ) : (
                        <span className="text-xs text-cyan-accent-foreground/60">No disponible</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <a href={`mailto:${employee.email}`} className="flex items-center gap-2 text-sm hover:underline text-cyan-accent-foreground/80 hover:text-primary">
                        <Mail className="h-4 w-4" />
                        {employee.email}
                    </a>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && filteredEmployees.length === 0 && (
                <TableRow className="border-b-cyan-accent-foreground/20">
                    <TableCell colSpan={5} className="h-24 text-center">
                        No se encontraron resultados.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
