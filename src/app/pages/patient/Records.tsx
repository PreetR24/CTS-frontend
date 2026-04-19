import { FileText, Download } from "lucide-react";

const records = [
  { id: 1, title: "Cardiology Report", date: "2026-03-15", provider: "Dr. Rajesh Kumar", type: "Lab Report" },
  { id: 2, title: "ECG Results", date: "2026-02-20", provider: "Dr. Rajesh Kumar", type: "Test Result" },
  { id: 3, title: "General Checkup", date: "2026-01-10", provider: "Dr. Priya Sharma", type: "Consultation Notes" },
];

export default function PatientRecords() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Medical Records</h1>
        <p className="text-sm text-muted-foreground mt-1">Your health documents and reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {records.map((record) => (
          <div key={record.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-[#c4b5e8]/20 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-[#c4b5e8]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{record.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{record.type}</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <p className="text-xs text-muted-foreground">Date: {record.date}</p>
              <p className="text-xs text-muted-foreground">Provider: {record.provider}</p>
            </div>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm">
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
