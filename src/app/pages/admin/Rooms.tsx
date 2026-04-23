import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Edit } from "lucide-react";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
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

type RoomFormValues = {
  roomName: string;
  roomType: string;
  siteId: number;
};

export default function AdminRooms() {
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [sites, setSites] = useState<SiteDto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Active");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editRoomId, setEditRoomId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreateForm,
    formState: { errors: createErrors },
  } = useForm<RoomFormValues>({
    defaultValues: { roomName: "", roomType: "", siteId: 0 },
  });
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEditForm,
    formState: { errors: editErrors },
  } = useForm<RoomFormValues>({
    defaultValues: { roomName: "", roomType: "", siteId: 0 },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadError(null);
        const [siteList, roomList] = await Promise.all([
          fetchSites({ page: 1, pageSize: 250 }),
          fetchRooms({ page: 1, pageSize: 500 }),
        ]);
        if (cancelled) return;
        setSites(siteList);
        setRooms(roomList);
        const defaultSiteId = siteList[0]?.siteId ?? 0;
        resetCreateForm({ roomName: "", roomType: "", siteId: defaultSiteId });
      } catch (error) {
        if (!cancelled) {
          setLoadError(getErrorMessage(error, "Could not load rooms."));
          setSites([]);
          setRooms([]);
        }
      }
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

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (isAxiosError<{ message?: string }>(error)) {
      return error.response?.data?.message ?? fallback;
    }
    if (error instanceof Error) return error.message;
    return fallback;
  };

  const handleCreateRoom = async (values: RoomFormValues) => {
    try {
      setActionMessage(null);
      const created = await createRoom({
        roomName: values.roomName.trim(),
        roomType: values.roomType.trim() || undefined,
        siteId: Number(values.siteId),
      });
      setRooms((prev) => [...prev, created]);
      setShowCreateModal(false);
      resetCreateForm({ roomName: "", roomType: "", siteId: values.siteId });
    } catch (error) {
      setActionMessage(getErrorMessage(error, "Could not create room."));
    }
  };

  const handleStartEdit = (room: RoomDto) => {
    setEditRoomId(room.roomId);
    resetEditForm({
      roomName: room.roomName,
      roomType: room.roomType,
      siteId: room.siteId,
    });
  };

  const handleSaveEdit = async (values: RoomFormValues) => {
    if (editRoomId == null) return;
    try {
      setActionMessage(null);
      const updated = await updateRoom(editRoomId, {
        roomName: values.roomName.trim(),
        roomType: values.roomType.trim(),
        siteId: Number(values.siteId),
      });
      setRooms((prev) => prev.map((room) => (room.roomId === editRoomId ? updated : room)));
      setEditRoomId(null);
    } catch (error) {
      setActionMessage(getErrorMessage(error, "Could not update room."));
    }
  };

  const handleDeactivate = async (roomId: number) => {
    try {
      setActionMessage(null);
      await deactivateRoom(roomId);
      setRooms((prev) => prev.map((room) => (room.roomId === roomId ? { ...room, status: "Inactive" } : room)));
    } catch (error) {
      setActionMessage(getErrorMessage(error, "Could not deactivate room."));
    }
  };

  const handleActivate = async (roomId: number) => {
    try {
      setActionMessage(null);
      await activateRoom(roomId);
      setRooms((prev) => prev.map((room) => (room.roomId === roomId ? { ...room, status: "Active" } : room)));
    } catch (error) {
      setActionMessage(getErrorMessage(error, "Could not activate room."));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Rooms</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage room inventory and room metadata</p>
        {loadError && <p className="text-sm text-destructive mt-2">{loadError}</p>}
        {actionMessage && <p className="text-sm text-destructive mt-2">{actionMessage}</p>}
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
            {editRoomId == null ? (
              <form className="space-y-4" onSubmit={handleCreateSubmit(handleCreateRoom)}>
                <input
                  type="text"
                  placeholder="Room name"
                  {...registerCreate("roomName", {
                    required: "Room name is required.",
                    validate: (value) => value.trim().length > 0 || "Room name cannot be empty.",
                  })}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground"
                />
                {createErrors.roomName && <p className="text-xs text-destructive">{createErrors.roomName.message}</p>}
                <input
                  type="text"
                  placeholder="Room type"
                  {...registerCreate("roomType", {
                    required: "Room type is required.",
                    validate: (value) => value.trim().length > 0 || "Room type cannot be empty.",
                  })}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground"
                />
                {createErrors.roomType && <p className="text-xs text-destructive">{createErrors.roomType.message}</p>}
                <select
                  {...registerCreate("siteId", {
                    valueAsNumber: true,
                    min: { value: 1, message: "Please select a valid site." },
                  })}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground"
                >
                  {sites.map((site) => (
                    <option key={site.siteId} value={site.siteId}>
                      {site.name}
                    </option>
                  ))}
                </select>
                {createErrors.siteId && <p className="text-xs text-destructive">{createErrors.siteId.message}</p>}
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                  >
                    Create Room
                  </button>
                </div>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleEditSubmit(handleSaveEdit)}>
                <input
                  type="text"
                  placeholder="Room name"
                  {...registerEdit("roomName", {
                    required: "Room name is required.",
                    validate: (value) => value.trim().length > 0 || "Room name cannot be empty.",
                  })}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground"
                />
                {editErrors.roomName && <p className="text-xs text-destructive">{editErrors.roomName.message}</p>}
                <input
                  type="text"
                  placeholder="Room type"
                  {...registerEdit("roomType", {
                    required: "Room type is required.",
                    validate: (value) => value.trim().length > 0 || "Room type cannot be empty.",
                  })}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground"
                />
                {editErrors.roomType && <p className="text-xs text-destructive">{editErrors.roomType.message}</p>}
                <select
                  {...registerEdit("siteId", {
                    valueAsNumber: true,
                    min: { value: 1, message: "Please select a valid site." },
                  })}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground"
                >
                  {sites.map((site) => (
                    <option key={site.siteId} value={site.siteId}>
                      {site.name}
                    </option>
                  ))}
                </select>
                {editErrors.siteId && <p className="text-xs text-destructive">{editErrors.siteId.message}</p>}
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setEditRoomId(null)}
                    className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
