import { DoorOpen } from "lucide-react";

const rooms = [
  { id: 1, name: "Room 1", type: "Exam", status: "Occupied", patient: "Anjali Mehta" },
  { id: 2, name: "Room 2", type: "Exam", status: "Available", patient: null },
  { id: 3, name: "Room 3", type: "Procedure", status: "Cleaning", patient: null },
  { id: 4, name: "Room 4", type: "Exam", status: "Occupied", patient: "Arjun Nair" },
];

export default function StaffRooms() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Room Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Current room status and availability</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {rooms.map((room) => (
          <div key={room.id} className={`bg-card rounded-xl border-2 p-5 ${
            room.status === "Occupied" ? "border-[#eb9d9d]/30" :
            room.status === "Available" ? "border-[#a9d4b8]/30" :
            "border-[#e8c9a9]/30"
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                room.status === "Occupied" ? "bg-[#eb9d9d]/20" :
                room.status === "Available" ? "bg-[#a9d4b8]/20" :
                "bg-[#e8c9a9]/20"
              }`}>
                <DoorOpen className={`w-6 h-6 ${
                  room.status === "Occupied" ? "text-[#eb9d9d]" :
                  room.status === "Available" ? "text-[#a9d4b8]" :
                  "text-[#e8c9a9]"
                }`} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{room.name}</p>
                <p className="text-xs text-muted-foreground">{room.type}</p>
              </div>
            </div>
            <div className="mb-4">
              <span className={`inline-flex px-3 py-1 rounded-md text-xs font-medium ${
                room.status === "Occupied" ? "bg-[#eb9d9d]/30 text-foreground" :
                room.status === "Available" ? "bg-[#a9d4b8]/30 text-foreground" :
                "bg-[#e8c9a9]/30 text-foreground"
              }`}>
                {room.status}
              </span>
            </div>
            {room.patient && <p className="text-xs text-muted-foreground">Patient: {room.patient}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
