import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Edit } from "lucide-react";
import {
  activateRoom,
  createRoom,
  deactivateRoom,
  fetchRooms,
  fetchSites,
  type RoomDto,
  type SiteDto,
  updateRoom,
} from "../../../api/masterdataApi";

export default function AdminRooms() {
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [sites, setSites] = useState<SiteDto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Active");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editRoomId, setEditRoomId] = useState<number | null>(null);
  const [form, setForm] = useState({ roomName: "", roomType: "Consultation", siteId: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [siteList, roomList] = await Promise.all([
        fetchSites({ page: 1, pageSize: 250 }),
        fetchRooms({ page: 1, pageSize: 500 }),
      ]);
      if (cancelled) return;
      setSites(siteList);
      setRooms(roomList);
      setForm((prev) => ({ ...prev, siteId: siteList[0]?.siteId ?? 0 }));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRooms = useMemo(
    () =>
      rooms.filter(
        (room) =>
          (filterStatus === "All" || room.status === filterStatus) &&
          room.roomName.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [rooms, filterStatus, searchQuery]
  );

  const handleCreateRoom = async () => {
    if (!form.roomName.trim() || !form.siteId) return;
    const created = await createRoom({
      roomName: form.roomName.trim(),
      roomType: form.roomType.trim() || undefined,
      siteId: form.siteId,
    });
    setRooms((prev) => [...prev, created]);
    setShowCreateModal(false);
    setForm((prev) => ({ ...prev, roomName: "" }));
  };

  const handleStartEdit = (room: RoomDto) => {
    setEditRoomId(room.roomId);
    setForm({ roomName: room.roomName, roomType: room.roomType, siteId: room.siteId });
  };

  const handleSaveEdit = async () => {
    if (editRoomId == null || !form.roomName.trim() || !form.siteId) return;
    const updated = await updateRoom(editRoomId, {
      roomName: form.roomName.trim(),
      roomType: form.roomType.trim(),
      siteId: form.siteId,
    });
    setRooms((prev) => prev.map((room) => (room.roomId === editRoomId ? updated : room)));
    setEditRoomId(null);
  };

  const handleDeactivate = async (roomId: number) => {
    await deactivateRoom(roomId);
    setRooms((prev) => prev.map((room) => (room.roomId === roomId ? { ...room, status: "Inactive" } : room)));
  };

  const handleActivate = async (roomId: number) => {
    await activateRoom(roomId);
    setRooms((prev) => prev.map((room) => (room.roomId === roomId ? { ...room, status: "Active" } : room)));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Rooms</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage room inventory and room metadata</p>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-4">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option>Active</option>
            <option>Inactive</option>
            <option>All</option>
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Room
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Room Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Room Type</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Site</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room) => (
                <tr key={room.roomId} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="py-4 px-4 text-sm text-foreground">{room.roomName}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{room.roomType}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">
                    {sites.find((site) => site.siteId === room.siteId)?.name ?? `Site ${room.siteId}`}
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{room.status}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 hover:bg-secondary rounded-lg transition-colors" onClick={() => handleStartEdit(room)}>
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {room.status === "Active" ? (
                        <button
                          className="text-xs px-2 py-1 border border-border rounded text-destructive"
                          onClick={() => void handleDeactivate(room.roomId)}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button onClick={() => void handleActivate(room.roomId)} className="text-xs px-2 py-1 border border-border rounded">
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(showCreateModal || editRoomId != null) && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg">
            <h3 className="text-base font-medium text-foreground mb-4">{editRoomId == null ? "Add Room" : "Edit Room"}</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Room name"
                value={form.roomName}
                onChange={(e) => setForm((prev) => ({ ...prev, roomName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground"
              />
              <input
                type="text"
                placeholder="Room type"
                value={form.roomType}
                onChange={(e) => setForm((prev) => ({ ...prev, roomType: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground"
              />
              <select
                value={form.siteId}
                onChange={(e) => setForm((prev) => ({ ...prev, siteId: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground"
              >
                {sites.map((site) => (
                  <option key={site.siteId} value={site.siteId}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditRoomId(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void (editRoomId == null ? handleCreateRoom() : handleSaveEdit())}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                {editRoomId == null ? "Create Room" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
