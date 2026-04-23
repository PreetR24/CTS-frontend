import { LogOut, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { useAuth } from "../../api/AuthContext";
import { meApi } from "../../api/authApi";
import { updateUser } from "../../api/usersApi";

interface HeaderProps {
  title: string;
  userName?: string;
  userRole?: string;
  enableProfileEdit?: boolean;
}

export function Header({ title, userName = "User", userRole = "Role", enableProfileEdit = false }: HeaderProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const [profileName, setProfileName] = useState(userName);
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [displayName, setDisplayName] = useState(userName);
  const [displayRole, setDisplayRole] = useState(userRole);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!enableProfileEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await meApi();
        if (cancelled) return;
        setProfileUserId(me.userId);
        setProfileName(me.name);
        setProfileEmail(me.email);
        setProfilePhone(me.phone ?? "");
        setDisplayName(me.name);
        setDisplayRole(me.role);
      } catch {
        if (!cancelled) {
          setDisplayName(userName);
          setDisplayRole(userRole);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enableProfileEdit, userName, userRole]);

  const handleLogout = async () => {
    await logout();        // ✅ backend + local cleanup
    navigate("/", { replace: true }); // ✅ hard reset
  };

  const openProfileModal = () => {
    if (!enableProfileEdit) return;
    setNotice(null);
    setShowProfileModal(true);
  };

  const saveOwnProfile = async () => {
    if (!profileUserId || !profileName.trim() || !profileEmail.trim()) {
      setNotice("Name and email are required.");
      return;
    }
    try {
      const updated = await updateUser(profileUserId, {
        name: profileName.trim(),
        email: profileEmail.trim(),
        phone: profilePhone.trim() || undefined,
        requesterRole: displayRole,
      });
      setDisplayName(updated.name);
      setProfileName(updated.name);
      setProfileEmail(updated.email);
      setProfilePhone(updated.phone ?? "");
      setNotice("Profile updated.");
      setShowProfileModal(false);
    } catch (error) {
      const msg = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      setNotice(msg ?? "You are not allowed to update profile from this role.");
    }
  };

  return (
    <>
    <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-medium text-foreground">{title}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          CareSchedule Management System
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button className="flex items-center gap-3 hover:bg-secondary rounded-lg px-2 py-1" onClick={openProfileModal}>
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground">{displayRole}</p>
          </div>
        </button>

        <button
          onClick={handleLogout}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </header>
    {showProfileModal && (
      <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md">
          <h3 className="text-base font-medium text-foreground mb-4">Edit My Profile</h3>
          {notice && <p className="text-sm text-primary mb-3">{notice}</p>}
          <label className="block text-sm font-medium text-foreground mb-1.5">Name</label>
          <input
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <label className="block text-sm font-medium text-foreground mb-1.5 mt-3">Email</label>
          <input
            type="email"
            value={profileEmail}
            onChange={(e) => setProfileEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <label className="block text-sm font-medium text-foreground mb-1.5 mt-3">Phone</label>
          <input
            type="text"
            value={profilePhone}
            onChange={(e) => setProfilePhone(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowProfileModal(false)}
              className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => void saveOwnProfile()}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}