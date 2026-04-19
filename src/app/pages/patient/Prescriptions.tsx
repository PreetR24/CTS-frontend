import { Pill, Calendar, RefreshCw, Download, AlertCircle } from "lucide-react";
import { useState } from "react";

const prescriptions = [
  { 
    id: 1, 
    medication: "Atorvastatin 10mg", 
    prescribedBy: "Dr. Rajesh Kumar", 
    date: "2026-03-15", 
    dosage: "Once daily", 
    timing: "After dinner",
    refills: 2,
    quantity: "30 tablets",
    status: "Active",
    instructions: "Take with water. Avoid grapefruit juice."
  },
  { 
    id: 2, 
    medication: "Metformin 500mg", 
    prescribedBy: "Dr. Rajesh Kumar", 
    date: "2026-02-20", 
    dosage: "Twice daily", 
    timing: "After meals",
    refills: 1,
    quantity: "60 tablets",
    status: "Active",
    instructions: "Take after breakfast and dinner."
  },
  { 
    id: 3, 
    medication: "Vitamin D3 60000IU", 
    prescribedBy: "Dr. Priya Sharma", 
    date: "2026-01-10", 
    dosage: "Once weekly", 
    timing: "Any time",
    refills: 0,
    quantity: "4 capsules",
    status: "Refill Needed",
    instructions: "Take on Sunday morning."
  },
];

export default function PatientPrescriptions() {
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Active": return "bg-[#95d4a8]/30 text-[#75b488]";
      case "Refill Needed": return "bg-[#f0b895]/30 text-[#d89768]";
      case "Expired": return "bg-[#e8a0a0]/30 text-[#d88080]";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">My Prescriptions</h1>
        <p className="text-sm text-muted-foreground mt-1">Current medications and refill management</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-5 rounded-xl bg-gradient-to-br from-[#95d4a8]/10 to-[#75b488]/5 border border-[#95d4a8]/30">
          <p className="text-sm text-muted-foreground mb-1">Active Prescriptions</p>
          <p className="text-3xl font-medium text-foreground">{prescriptions.filter(p => p.status === "Active").length}</p>
        </div>
        <div className="p-5 rounded-xl bg-gradient-to-br from-[#f0b895]/10 to-[#d89768]/5 border border-[#f0b895]/30">
          <p className="text-sm text-muted-foreground mb-1">Refills Available</p>
          <p className="text-3xl font-medium text-foreground">{prescriptions.reduce((sum, p) => sum + p.refills, 0)}</p>
        </div>
        <div className="p-5 rounded-xl bg-gradient-to-br from-[#e8b5d4]/10 to-[#d8a0c4]/5 border border-[#e8b5d4]/30">
          <p className="text-sm text-muted-foreground mb-1">Medications</p>
          <p className="text-3xl font-medium text-foreground">{prescriptions.length}</p>
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="space-y-4">
        {prescriptions.map((rx) => (
          <div key={rx.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#e8b5d4]/30 to-[#d8a0c4]/20 flex items-center justify-center flex-shrink-0">
                  <Pill className="w-7 h-7 text-[#e8b5d4]" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-medium text-foreground mb-1">{rx.medication}</h3>
                      <p className="text-sm text-muted-foreground">Prescribed by {rx.prescribedBy}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-md text-xs font-medium ${getStatusColor(rx.status)}`}>
                      {rx.status}
                    </span>
                  </div>

                  {/* Dosage Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Dosage</p>
                      <p className="text-sm font-medium text-foreground">{rx.dosage}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Timing</p>
                      <p className="text-sm font-medium text-foreground">{rx.timing}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Quantity</p>
                      <p className="text-sm font-medium text-foreground">{rx.quantity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Refills Left</p>
                      <p className="text-sm font-medium text-foreground">{rx.refills}</p>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="p-3 rounded-lg bg-[#6b9bd1]/10 border border-[#6b9bd1]/20 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-[#6b9bd1] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-foreground mb-1">Instructions</p>
                        <p className="text-xs text-muted-foreground">{rx.instructions}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button 
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#6b9bd1] to-[#5a8bc1] text-white text-sm font-medium hover:shadow-md transition-all"
                      disabled={rx.refills === 0}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Request Refill
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-all">
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button 
                      onClick={() => setSelectedPrescription(rx)}
                      className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-all"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Prescription History */}
            <div className="px-5 py-3 bg-secondary/30 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>Prescribed on {rx.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedPrescription && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-4">Prescription Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Medication</p>
                <p className="text-base font-medium text-foreground">{selectedPrescription.medication}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Prescribed By</p>
                  <p className="text-sm font-medium text-foreground">{selectedPrescription.prescribedBy}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Date</p>
                  <p className="text-sm font-medium text-foreground">{selectedPrescription.date}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Dosage</p>
                  <p className="text-sm font-medium text-foreground">{selectedPrescription.dosage}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Timing</p>
                  <p className="text-sm font-medium text-foreground">{selectedPrescription.timing}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Instructions</p>
                <p className="text-sm text-foreground">{selectedPrescription.instructions}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedPrescription(null)}
              className="w-full mt-6 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
