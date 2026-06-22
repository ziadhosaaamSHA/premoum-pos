export type Permission = {
  id: string;
  code: string;
  label: string;
  description?: string | null;
};

export type RoleRow = {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
  usersCount: number;
  permissions: Permission[];
};

export type UserRole = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
};

export type UserRow = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
  isOwner: boolean;
  createdAt: string;
  inviteAcceptedAt: string | null;
  lastLoginAt: string | null;
  roles: UserRole[];
};

export type InviteRow = {
  id: string;
  email: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  role: { id: string; name: string; isActive: boolean };
  user: { id: string; email: string; fullName: string } | null;
  createdBy: { id: string; fullName: string; email: string };
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  isExpired: boolean;
};

export type TaxRow = {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BrandingForm = {
  brandName: string;
  brandTagline: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  cardColor: string;
  borderColor: string;
  topbarColor: string;
  topbarTextColor: string;
  tableHeaderColor: string;
  tableHeaderTextColor: string;
  backgroundOpacity: number;
  cardOpacity: number;
  topbarOpacity: number;
  tableHeaderOpacity: number;
  sidebarOpacity: number;
  sidebarColor: string;
  sidebarTextColor: string;
};

export const DEFAULT_BRAND_COLORS = {
  primaryColor: "#e06d4c",
  secondaryColor: "#2f8f83",
  backgroundColor: "#f7f3ee",
  cardColor: "#ffffff",
  borderColor: "#e6e1db",
  topbarColor: "#ffffff",
  topbarTextColor: "#1b1b1b",
  tableHeaderColor: "#fbfaf8",
  tableHeaderTextColor: "#6b6b6b",
  backgroundOpacity: 100,
  cardOpacity: 100,
  topbarOpacity: 0,
  tableHeaderOpacity: 100,
  sidebarOpacity: 100,
  sidebarColor: "#1f2a2b",
  sidebarTextColor: "#f6f3ef",
};

export type RoleModalState = { mode: "view" | "edit" | "create"; roleId?: string } | null;
export type UserModalState = { mode: "view" | "edit"; userId: string } | null;

export type RoleForm = {
  name: string;
  description: string;
  permissionCodes: string[];
};

export type UserForm = {
  fullName: string;
  email: string;
  phone: string;
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
  roleId: string;
};

export type InviteForm = {
  email: string;
  roleId: string;
};

export type TaxForm = {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
  isActive: boolean;
};

export function userStatusLabel(status: UserRow["status"]) {
  if (status === "ACTIVE") return "نشط";
  if (status === "INVITED") return "مدعو";
  return "موقوف";
}

export function userStatusBadge(status: UserRow["status"]) {
  if (status === "ACTIVE") return "ok";
  if (status === "INVITED") return "warn";
  return "danger";
}

export function inviteStatusLabel(invite: InviteRow) {
  if (invite.status === "PENDING" && invite.isExpired) return "منتهية";
  if (invite.status === "PENDING") return "قيد الانتظار";
  if (invite.status === "ACCEPTED") return "مقبولة";
  if (invite.status === "REVOKED") return "ملغية";
  return "منتهية";
}

export function inviteStatusBadge(invite: InviteRow) {
  if (invite.status === "ACCEPTED") return "ok";
  if (invite.status === "PENDING" && !invite.isExpired) return "warn";
  return "danger";
}
