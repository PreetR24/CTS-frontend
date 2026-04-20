import { DoorOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { getCalendarEventById, searchCalendarEvents, type CalendarEventDto } from "../../../api/calendarApi";
import { fetchRooms, type RoomDto } from "../../../api/masterdataApi";
import { fetchSites } from "../../../api/masterdataApi";
import {
  deleteResourceHold,
  getResourceHoldById,
  searchResourceHolds,
  type ResourceHoldDto,
  updateResourceHold,
} from "../../../api/resourceHoldsApi";

type RoomViewRow = {
  id: number;
  name: string;
  type: string;
  status: string;
  patient: string | null;
};

export default function StaffRooms() {
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [occupiedIds, setOccupiedIds] = useState<Set<number>>(new Set());
  const [eventByRoomId, setEventByRoomId] = useState<Map<number, CalendarEventDto>>(new Map());
  const [holdByRoomId, setHoldByRoomId] = useState<Map<number, ResourceHoldDto>>(new Map());
  const [message, setMessage] = useState<string | null>(null);
  const [editHoldRoomId, setEditHoldRoomId] = useState<number | null>(null);
  const [editHoldReason, setEditHoldReason] = useState("");

  const upsertRoomHold = (resourceId: number, hold: ResourceHoldDto | null) => {
    setHoldByRoomId((prev) => {
      const next = new Map(prev);
      if (hold) next.set(resourceId, hold);
      else next.delete(resourceId);
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [roomList, sites] = await Promise.all([
          fetchRooms({ page: 1, pageSize: 250 }),
          fetchSites({ page: 1, pageSize: 50 }),
        ]);
        if (cancelled) return;
        setRooms(roomList);

        const today = new Date().toISOString().slice(0, 10);
        const siteId = sites[0]?.siteId;
        if (!siteId) return;
        const events = await searchCalendarEvents({ siteId, date: today });
        if (cancelled) return;
        setOccupiedIds(new Set(events.map((e) => e.roomId).filter((x): x is number => x != null)));
        setEventByRoomId(
          new Map(
            events
              .filter((e): e is CalendarEventDto & { roomId: number } => e.roomId != null)
              .map((e) => [e.roomId, e])
          )
        );
        const roomHolds = await searchResourceHolds({ resourceType: "Room", date: today });
        if (cancelled) return;
        setHoldByRoomId(new Map(roomHolds.map((h) => [h.resourceId, h])));
      } catch {
        if (!cancelled) {
          setRooms([]);
          setOccupiedIds(new Set());
        }
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
    status: occupiedIds.has(room.roomId)
      ? "Occupied"
      : room.status === "Active"
        ? "Available"
        : "Cleaning",
    patient: occupiedIds.has(room.roomId) ? "Assigned" : null,
  }));

  const showEventDetail = async (roomId: number) => {
    const event = eventByRoomId.get(roomId);
    if (!event) {
      setMessage("No calendar event found for this room.");
      return;
    }
    const detail = await getCalendarEventById(event.eventId);
    setMessage(`Event ${detail.entityType} (${detail.status}) ${detail.startTime} - ${detail.endTime}`);
  };

  const showHoldDetail = async (roomId: number) => {
    const hold = holdByRoomId.get(roomId);
    if (!hold) {
      setMessage("No resource hold found for this room.");
      return;
    }
    const detail = await getResourceHoldById(hold.holdId);
    setMessage(`Hold ${detail.status} (${detail.reason ?? "No reason"}) ${detail.startTime} - ${detail.endTime}`);
  };

  const startEditHold = (roomId: number) => {
    const hold = holdByRoomId.get(roomId);
    if (!hold) {
      setMessage("No resource hold found for this room.");
      return;
    }
    setEditHoldRoomId(roomId);
    setEditHoldReason(hold.reason ?? "");
  };

  const releaseHold = async (roomId: number) => {
    const hold = holdByRoomId.get(roomId);
    if (!hold) {
      setMessage("No resource hold found for this room.");
      return;
    }
    const ok = window.confirm("Release this hold?");
    if (!ok) return;
    try {
      await deleteResourceHold(hold.holdId);
      upsertRoomHold(roomId, null);
      setMessage("Hold released.");
    } catch {
      setMessage("Failed to release hold.");
    }
  };

  const closeEditHoldModal = () => setEditHoldRoomId(null);

  const saveEditedHold = async () => {
    if (editHoldRoomId == null) return;
    const hold = holdByRoomId.get(editHoldRoomId);
    if (!hold) return;
    try {
      const updated = await updateResourceHold(hold.holdId, { reason: editHoldReason });
      upsertRoomHold(editHoldRoomId, updated);
      setMessage("Hold updated.");
      setEditHoldRoomId(null);
    } catch {
      setMessage("Failed to update hold.");
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Room Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Current room status and availability</p>
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
            {room.patient && <p className="text-xs text-muted-foreground">Patient: {room.patient}</p>}
            <div className="mt-3 flex gap-2">
              <button
                className="px-2 py-1 text-xs border border-border rounded"
                onClick={() => void showEventDetail(room.id)}
              >
                Event Detail
              </button>
              <button
                className="px-2 py-1 text-xs border border-border rounded"
                onClick={() => void showHoldDetail(room.id)}
              >
                Hold Detail
              </button>
              <button
                className="px-2 py-1 text-xs border border-border rounded"
                onClick={() => startEditHold(room.id)}
              >
                Edit Hold
              </button>
              <button
                className="px-2 py-1 text-xs border border-border rounded"
                onClick={() => void releaseHold(room.id)}
              >
                Release Hold
              </button>
            </div>
          </div>
        ))}
      </div>
      {editHoldRoomId != null && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-medium text-foreground mb-4">Edit Hold Reason</h3>
            <label className="block text-sm font-medium text-foreground mb-1.5">Reason</label>
            <input
              type="text"
              value={editHoldReason}
              onChange={(e) => setEditHoldReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeEditHoldModal}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
              >
                Cancel
              </button>
              <button onClick={() => void saveEditedHold()} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
