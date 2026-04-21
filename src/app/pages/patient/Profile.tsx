import { User, Edit } from "lucide-react";
import { useEffect, useState } from "react";
import { meApi, type MeResponse } from "../../../api/authApi";
import { getUserById, updateUser } from "../../../api/usersApi";

export default function PatientProfile() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await meApi();
        if (!cancelled) {
          setMe(data);
          setEditName(data.name);
          setEditEmail(data.email);
          const user = await getUserById(data.userId);
          if (!cancelled) {
            setPhone(user.phone ?? "");
            setEditPhone(user.phone ?? "");
            const storedAddress = localStorage.getItem(`patient-address-${data.userId}`) ?? "";
            setAddress(storedAddress);
            setEditAddress(storedAddress);
          }
        }
      } catch {
        if (!cancelled) setMe(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your personal information</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-[#e8b8d4]/20 flex items-center justify-center">
              <User className="w-10 h-10 text-[#e8b8d4]" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">{me?.name ?? "Patient"}</p>
              <p className="text-sm text-muted-foreground">Patient ID: P{String(me?.userId ?? 0).padStart(5, "0")}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Email</label>
                <p className="text-sm text-foreground">{me?.email ?? "Not available"}</p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Phone</label>
                <p className="text-sm text-foreground">{phone || "Not available"}</p>
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Address</label>
              <p className="text-sm text-foreground">{address || "Not available"}</p>
            </div>
          </div>

          <button
            onClick={() => {
              setNotice(null);
              setShowModal(true);
            }}
            className="mt-6 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md">
            <h3 className="text-base font-medium text-foreground mb-4">Edit Profile</h3>
            {notice && <p className="text-sm text-primary mb-2">{notice}</p>}
            <label className="block text-sm font-medium text-foreground mb-1.5">Name</label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            <label className="block text-sm font-medium text-foreground mb-1.5 mt-3">Email</label>
            <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            <label className="block text-sm font-medium text-foreground mb-1.5 mt-3">Phone</label>
            <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            <label className="block text-sm font-medium text-foreground mb-1.5 mt-3">Address</label>
            <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm" />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
              <button
                onClick={async () => {
                  if (!me) return;
                  const updated = await updateUser(me.userId, {
                    name: editName.trim(),
                    email: editEmail.trim(),
                    phone: editPhone.trim() || undefined,
                    requesterRole: "Patient",
                  });
                  localStorage.setItem(`patient-address-${me.userId}`, editAddress.trim());
                  setMe((prev) => (prev ? { ...prev, name: updated.name, email: updated.email } : prev));
                  setPhone(updated.phone ?? "");
                  setAddress(editAddress.trim());
                  setNotice("Profile updated.");
                  setShowModal(false);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
