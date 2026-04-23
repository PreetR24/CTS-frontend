
import { DoorOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { fetchRooms, type RoomDto } from "../../../api/masterdataApi";
import { searchCheckIns, type CheckInDto } from "../../../api/checkinsApi";

type RoomViewRow = {
  id: number;
  name: string;
  type: string;
  status: string;
  appointmentRef: string | null;
};

export default function NurseRooms() {
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [occupiedByRoom, setOccupiedByRoom] = useState<Map<number, number>>(new Map());
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [roomList, checkIns] = await Promise.all([fetchRooms({ page: 1, pageSize: 250 }), searchCheckIns()]);
        if (cancelled) return;
        setRooms(roomList);
        const roomMap = new Map<number, number>();
        checkIns.forEach((c: CheckInDto) => {
          const status = c.status.trim().toLowerCase();
          if (c.roomAssigned && (status === "roomassigned" || status === "inroom" || status === "withprovider")) {
            roomMap.set(c.roomAssigned, c.appointmentId);
          }
        });
        setOccupiedByRoom(roomMap);
      } catch (error) {
        const msg = isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
        if (!cancelled) {
          setRooms([]);
          setOccupiedByRoom(new Map());
        }
        setMessage(msg ?? "Could not load room status.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const roomRows: RoomViewRow[] = rooms.map((room) => ({
    id: room.roomId,
    name: room.roomName,
    type: room.roomType,
    status: occupiedByRoom.has(room.roomId)
      ? "Occupied"
      : room.status === "Active"
        ? "Available"
        : "Inactive",
    appointmentRef: occupiedByRoom.has(room.roomId) ? `Appt #${occupiedByRoom.get(room.roomId)}` : null,
  }));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Nurse Room Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Current room status from check-in pipeline</p>
        {message && <p className="text-sm text-primary mt-2">{message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {roomRows.map((room) => (
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
            {room.appointmentRef && <p className="text-xs text-muted-foreground">Assigned: {room.appointmentRef}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
