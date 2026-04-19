import type { ProviderDto, RoomDto, ServiceDto, SiteDto } from "./masterdataApi";
import type { UserDto } from "./usersApi";

export type AdminSiteRow = {
  id: number;
  name: string;
  location: string;
  rooms: number;
  status: string;
};

export type AdminServiceRow = {
  id: number;
  name: string;
  visitType: string;
  duration: number;
  buffer: number;
  status: string;
};

export type AdminUserRow = {
  id: number;
  name: string;
  role: string;
  email: string;
  specialty?: string;
};

export type AdminProviderRow = {
  id: number;
  name: string;
  specialty?: string;
  email: string;
  serviceCount: number;
};

export function formatSiteLocation(addressJson: string | null): string {
  if (!addressJson?.trim()) return "—";
  try {
    const o = JSON.parse(addressJson) as { city?: string; street?: string; line1?: string };
    const parts = [o.line1 ?? o.street, o.city].filter(Boolean);
    if (parts.length) return parts.join(", ");
  } catch {
    return addressJson;
  }
  return addressJson;
}

export function mapSiteRows(sites: SiteDto[], rooms: RoomDto[]): AdminSiteRow[] {
  const countBySite = new Map<number, number>();
  for (const r of rooms) {
    countBySite.set(r.siteId, (countBySite.get(r.siteId) ?? 0) + 1);
  }
  return sites.map((s) => ({
    id: s.siteId,
    name: s.name,
    location: formatSiteLocation(s.addressJson),
    rooms: countBySite.get(s.siteId) ?? 0,
    status: s.status,
  }));
}

export function mapServiceRow(s: ServiceDto): AdminServiceRow {
  return {
    id: s.serviceId,
    name: s.name,
    visitType: s.visitType,
    duration: s.defaultDurationMin,
    buffer: s.bufferBeforeMin + s.bufferAfterMin,
    status: s.status,
  };
}

export function buildProviderSpecialtyMap(providers: ProviderDto[]): Map<number, string> {
  const m = new Map<number, string>();
  for (const p of providers) {
    if (p.specialty?.trim()) m.set(p.providerId, p.specialty.trim());
  }
  return m;
}

export function mapUserRows(users: UserDto[], specialtyByProviderId: Map<number, string>): AdminUserRow[] {
  return users.map((u) => ({
    id: u.userId,
    name: u.name,
    role: u.role,
    email: u.email,
    specialty: u.providerId != null ? specialtyByProviderId.get(u.providerId) : undefined,
  }));
}

function pickEmailFromContact(contactInfo: string | null | undefined): string {
  if (!contactInfo?.trim()) return "—";
  const match = contactInfo.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return match ? match[0] : contactInfo.trim();
}

export function mapProviderRows(
  providers: ProviderDto[],
  serviceCountByProviderId: Record<number, number>
): AdminProviderRow[] {
  return providers.map((p) => ({
    id: p.providerId,
    name: p.name,
    specialty: p.specialty ?? undefined,
    email: pickEmailFromContact(p.contactInfo),
    serviceCount: serviceCountByProviderId[p.providerId] ?? 0,
  }));
}
