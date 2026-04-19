import { User, Edit } from "lucide-react";

export default function PatientProfile() {
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
              <p className="text-lg font-medium text-foreground">Anjali Mehta</p>
              <p className="text-sm text-muted-foreground">Patient ID: P00123</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Email</label>
                <p className="text-sm text-foreground">anjali.mehta@gmail.com</p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Phone</label>
                <p className="text-sm text-foreground">+91 98765 43210</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Date of Birth</label>
                <p className="text-sm text-foreground">January 15, 1985</p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Blood Group</label>
                <p className="text-sm text-foreground">A+</p>
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Address</label>
              <p className="text-sm text-foreground">123 Main Street, Indiranagar, Bangalore - 560038</p>
            </div>
          </div>

          <button className="mt-6 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm">
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-sm font-medium text-foreground mb-4">Emergency Contact</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Contact Name</label>
              <p className="text-sm text-foreground">Rahul Mehta</p>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Relationship</label>
              <p className="text-sm text-foreground">Spouse</p>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Phone</label>
              <p className="text-sm text-foreground">+91 98765 12345</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
