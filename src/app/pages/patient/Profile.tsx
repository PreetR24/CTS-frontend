import { User, Edit } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
import { meApi, type MeResponse } from "../../../api/authApi";
import { getUserById, updateUser } from "../../../api/usersApi";

type ProfileFormValues = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

export default function PatientProfile() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    defaultValues: { name: "", email: "", phone: "", address: "" },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await meApi();
        if (!cancelled) {
          setMe(data);
          const user = await getUserById(data.userId);
          if (!cancelled) {
            setPhone(user.phone ?? "");
            const storedAddress = localStorage.getItem(`patient-address-${data.userId}`) ?? "";
            setAddress(storedAddress);
            reset({
              name: data.name,
              email: data.email,
              phone: user.phone ?? "",
              address: storedAddress,
            });
          }
        }
      } catch {
        if (!cancelled) setMe(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reset]);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (isAxiosError<{ message?: string }>(error)) {
      return error.response?.data?.message ?? fallback;
    }
    if (error instanceof Error) return error.message;
    return fallback;
  };

  const submitProfile = async (values: ProfileFormValues) => {
    if (!me) return;
    try {
      setNotice(null);
      const updated = await updateUser(me.userId, {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
        requesterRole: "Patient",
      });
      localStorage.setItem(`patient-address-${me.userId}`, values.address.trim());
      setMe((prev) => (prev ? { ...prev, name: updated.name, email: updated.email } : prev));
      setPhone(updated.phone ?? "");
      setAddress(values.address.trim());
      setNotice("Profile updated.");
      setShowModal(false);
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not update profile."));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your personal information</p>
        {notice && <p className="text-sm text-primary mt-2">{notice}</p>}
      </div>

      <div className="max-w-2xl">
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-[#e8b8d4]/20 flex items-center justify-center">
              <User className="w-10 h-10 text-[#e8b8d4]" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">{me?.name ?? "Patient"}</p>
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
              reset({
                name: me?.name ?? "",
                email: me?.email ?? "",
                phone,
                address,
              });
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
            <form onSubmit={handleSubmit(submitProfile)}>
            <label className="block text-sm font-medium text-foreground mb-1.5">Name</label>
            <input
              {...register("name", {
                required: "Name is required.",
                validate: (v) => v.trim().length > 0 || "Name cannot be empty.",
              })}
              className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            <label className="block text-sm font-medium text-foreground mb-1.5 mt-3">Email</label>
            <input
              {...register("email", {
                required: "Email is required.",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email address.",
                },
              })}
              className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            <label className="block text-sm font-medium text-foreground mb-1.5 mt-3">Phone</label>
            <input
              {...register("phone", {
                pattern: {
                  value: /^[0-9+\-\s()]*$/,
                  message: "Phone can contain digits and + - ( ) only.",
                },
                validate: (v) =>
                  !v || v.replace(/\D/g, "").length >= 10 || "Phone must have at least 10 digits.",
              })}
              className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
            />
            {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
            <label className="block text-sm font-medium text-foreground mb-1.5 mt-3">Address</label>
            <input
              {...register("address", {
                maxLength: { value: 200, message: "Address can be up to 200 characters." },
              })}
              className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm"
            />
            {errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
              >
                Save
              </button>
            </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
