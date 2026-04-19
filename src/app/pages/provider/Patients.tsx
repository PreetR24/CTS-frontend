import { Search, User } from "lucide-react";
import { useState } from "react";

const patients = [
  { id: 1, name: "Anjali Mehta", lastVisit: "2026-03-15", totalVisits: 5, condition: "Hypertension" },
  { id: 2, name: "Arjun Nair", lastVisit: "2026-03-20", totalVisits: 3, condition: "Diabetes" },
  { id: 3, name: "Kavita Desai", lastVisit: "2026-03-25", totalVisits: 7, condition: "Cardiac Care" },
];

export default function ProviderPatients() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">My Patients</h1>
        <p className="text-sm text-muted-foreground mt-1">Patients under your care</p>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="p-5">
          <div className="space-y-3">
            {patients.map((patient) => (
              <div key={patient.id} className="p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[#e8b8d4]/20 flex items-center justify-center">
                      <User className="w-6 h-6 text-[#e8b8d4]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{patient.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{patient.condition}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last visit: {patient.lastVisit} • Total visits: {patient.totalVisits}
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs">
                    View Records
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
