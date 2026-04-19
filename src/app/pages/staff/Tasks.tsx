import { CheckCircle } from "lucide-react";

const tasks = [
  { id: 1, title: "Prepare Room 3", description: "Set up for cardiology consultation", priority: "High", status: "Pending" },
  { id: 2, title: "Patient Vitals - Anjali Mehta", description: "Record BP, temperature, pulse", priority: "High", status: "Completed" },
  { id: 3, title: "Equipment Sterilization", description: "Sterilize examination tools", priority: "Normal", status: "Pending" },
  { id: 4, title: "Stock Check", description: "Verify medical supplies inventory", priority: "Normal", status: "Pending" },
];

export default function StaffTasks() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">My Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">Daily tasks and responsibilities</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tasks.map((task) => (
          <div key={task.id} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-foreground">{task.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
              </div>
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                task.priority === "High" ? "bg-[#eb9d9d]/30 text-foreground" : "bg-[#7ba3c0]/20 text-foreground"
              }`}>
                {task.priority}
              </span>
            </div>
            <button className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
              task.status === "Completed" ? "bg-[#a9d4b8]/30 text-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}>
              <CheckCircle className="w-4 h-4" />
              {task.status === "Completed" ? "Completed" : "Mark Complete"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
