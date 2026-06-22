import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { Branding, useBranding } from "@/context/BrandingContext";
import { ApiError, apiRequest } from "@/lib/api";
import type { BusinessMode } from "@/lib/businessMode";
import { FACTORY_RESET_PHRASE } from "@/lib/constants";
import {
  BrandingForm,
  DEFAULT_BRAND_COLORS,
  InviteForm,
  InviteRow,
  Permission,
  RoleForm,
  RoleModalState,
  RoleRow,
  TaxForm,
  TaxRow,
  UserForm,
  UserModalState,
  UserRow,
} from "../types";
import {
  MAX_AVATAR_DIMENSION,
  MAX_IMAGE_CHARS,
  MAX_LOGO_DIMENSION,
  compressImageFile,
} from "../utils/image";

const RESET_PHRASE = "إعادة تعيين الحركة";

export function useSettingsPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const { user, hasPermission, refresh, logout } = useAuth();
  const { branding, refresh: refreshBranding, setBranding } = useBranding();

  const canViewSettings = hasPermission("settings:view") || hasPermission("settings:manage");
  const canManageSettings = hasPermission("settings:manage");
  const canManageRoles = hasPermission("roles:manage");
  const canManageUsers = hasPermission("users:manage");
  const canInviteUsers = hasPermission("users:invite");
  const canResetSystem = hasPermission("system:reset");

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [taxes, setTaxes] = useState<TaxRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [settingsTab, setSettingsTab] = useState<"profile" | "branding" | "operations" | "access">("profile");
  const [activeTab, setActiveTab] = useState<"roles" | "users">("roles");

  const [roleSearch, setRoleSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteFilter, setInviteFilter] = useState("");
  const [taxSearch, setTaxSearch] = useState("");

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [roleModal, setRoleModal] = useState<RoleModalState>(null);
  const [userModal, setUserModal] = useState<UserModalState>(null);
  const [inviteCreateOpen, setInviteCreateOpen] = useState(false);
  const [inviteViewId, setInviteViewId] = useState<string | null>(null);
  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [taxDeleteId, setTaxDeleteId] = useState<string | null>(null);

  const [roleForm, setRoleForm] = useState<RoleForm>({
    name: "",
    description: "",
    permissionCodes: [],
  });

  const [userForm, setUserForm] = useState<UserForm>({
    fullName: "",
    email: "",
    phone: "",
    status: "ACTIVE",
    roleId: "",
  });

  const [inviteForm, setInviteForm] = useState<InviteForm>({
    email: "",
    roleId: "",
  });
  const [newInviteLink, setNewInviteLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [taxForm, setTaxForm] = useState<TaxForm>({
    id: "",
    name: "",
    rate: 0,
    isDefault: false,
    isActive: true,
  });

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    avatarUrl: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [brandingForm, setBrandingForm] = useState<BrandingForm>({
    brandName: "",
    brandTagline: "",
    logoUrl: "",
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
  });
  const [savingBranding, setSavingBranding] = useState(false);
  const [businessMode, setBusinessMode] = useState<BusinessMode>("cafe_restaurant");
  const [savingBusinessMode, setSavingBusinessMode] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: "" });
  const [savingPassword, setSavingPassword] = useState(false);

  const [resetScope, setResetScope] = useState<"transactions" | "operational">("transactions");
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetAck, setResetAck] = useState(false);
  const [factoryResetOpen, setFactoryResetOpen] = useState(false);
  const [factoryResetAck, setFactoryResetAck] = useState(false);
  const [factoryResetConfirmText, setFactoryResetConfirmText] = useState("");
  const [factoryResetSubmitting, setFactoryResetSubmitting] = useState(false);

  const handleError = useCallback(
    (error: unknown, fallback: string) => {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          void (async () => {
            await logout().catch(() => undefined);
            router.replace("/login");
          })();
          return;
        }
        pushToast(error.message || fallback, "error");
        return;
      }
      pushToast(fallback, "error");
    },
    [logout, pushToast, router]
  );

  const handleLogout = useCallback(() => {
    setLogoutOpen(false);
    void (async () => {
      await logout().catch(() => undefined);
      router.replace("/login");
      pushToast("تم تسجيل الخروج", "success");
    })();
  }, [logout, pushToast, router]);

  const fetchSettingsData = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const [
          permissionsPayload,
          rolesPayload,
          usersPayload,
          invitesPayload,
          taxesPayload,
          businessModePayload,
        ] = await Promise.all([
          canManageRoles || canManageUsers || canInviteUsers
            ? apiRequest<{ permissions: Permission[] }>("/api/admin/permissions")
            : Promise.resolve({ permissions: [] }),
          canManageRoles || canManageUsers || canInviteUsers
            ? apiRequest<{ roles: RoleRow[] }>("/api/admin/roles")
            : Promise.resolve({ roles: [] }),
          canManageUsers
            ? apiRequest<{ users: UserRow[] }>("/api/admin/users")
            : Promise.resolve({ users: [] }),
          canManageUsers || canInviteUsers
            ? apiRequest<{ invites: InviteRow[] }>("/api/admin/invites")
            : Promise.resolve({ invites: [] }),
          canViewSettings
            ? apiRequest<{ taxes: TaxRow[] }>("/api/settings/taxes")
            : Promise.resolve({ taxes: [] }),
          canViewSettings
            ? apiRequest<{ businessMode: BusinessMode }>("/api/settings/business-mode")
            : Promise.resolve({ businessMode: "cafe_restaurant" as BusinessMode }),
        ]);

        setPermissions(permissionsPayload.permissions);
        setRoles(rolesPayload.roles);
        setUsers(usersPayload.users);
        setInvites(invitesPayload.invites);
        setTaxes(taxesPayload.taxes || []);
        setBusinessMode(businessModePayload.businessMode || "cafe_restaurant");
      } catch (error) {
        handleError(error, "تعذر تحميل بيانات الإعدادات");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [canInviteUsers, canManageRoles, canManageUsers, canViewSettings, handleError]
  );

  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || "",
        avatarUrl: user.avatarUrl || "",
      });
    }
  }, [user]);

  useEffect(() => {
    setBrandingForm({
      brandName: branding.brandName,
      brandTagline: branding.brandTagline || "",
      logoUrl: branding.logoUrl || "",
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      backgroundColor: branding.backgroundColor,
      cardColor: branding.cardColor,
      borderColor: branding.borderColor,
      topbarColor: branding.topbarColor,
      topbarTextColor: branding.topbarTextColor,
      tableHeaderColor: branding.tableHeaderColor,
      tableHeaderTextColor: branding.tableHeaderTextColor,
      backgroundOpacity: branding.backgroundOpacity,
      cardOpacity: branding.cardOpacity,
      topbarOpacity: branding.topbarOpacity,
      tableHeaderOpacity: branding.tableHeaderOpacity,
      sidebarOpacity: branding.sidebarOpacity,
      sidebarColor: branding.sidebarColor,
      sidebarTextColor: branding.sidebarTextColor,
    });
  }, [branding]);

  useEffect(() => {
    void fetchSettingsData(true);
  }, [fetchSettingsData]);

  useEffect(() => {
    if (!canManageRoles && (canManageUsers || canInviteUsers)) {
      setActiveTab("users");
    }
  }, [canInviteUsers, canManageRoles, canManageUsers]);

  const permissionLabelMap = useMemo(
    () => new Map(permissions.map((permission) => [permission.code, permission.label])),
    [permissions]
  );

  const currentPermissionLabels = useMemo(() => {
    if (!user) return [];
    return user.permissions.map((code) => permissionLabelMap.get(code) || code);
  }, [permissionLabelMap, user]);

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    return roles.filter((role) => {
      const matchesSearch =
        !q ||
        role.name.toLowerCase().includes(q) ||
        role.description.toLowerCase().includes(q) ||
        role.permissions.some((permission) => permission.code.toLowerCase().includes(q));
      const matchesFilter =
        !roleFilter ||
        (roleFilter === "system" && role.isSystem) ||
        (roleFilter === "custom" && !role.isSystem) ||
        (roleFilter === "disabled" && !role.isActive);
      return matchesSearch && matchesFilter;
    });
  }, [roleFilter, roleSearch, roles]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((row) => {
      const matchesSearch =
        !q ||
        row.fullName.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.roles.some((role) => role.name.toLowerCase().includes(q));
      const matchesFilter = !userFilter || row.status === userFilter;
      return matchesSearch && matchesFilter;
    });
  }, [userFilter, userSearch, users]);

  const filteredInvites = useMemo(() => {
    const q = inviteSearch.trim().toLowerCase();
    return invites.filter((invite) => {
      const inviteStatus = invite.status === "PENDING" && invite.isExpired ? "EXPIRED" : invite.status;
      const matchesSearch =
        !q ||
        invite.email.toLowerCase().includes(q) ||
        invite.id.toLowerCase().includes(q) ||
        invite.role.name.toLowerCase().includes(q);
      const matchesFilter = !inviteFilter || inviteStatus === inviteFilter;
      return matchesSearch && matchesFilter;
    });
  }, [inviteFilter, inviteSearch, invites]);

  const filteredTaxes = useMemo(() => {
    const q = taxSearch.trim().toLowerCase();
    if (!q) return taxes;
    return taxes.filter((tax) => tax.name.toLowerCase().includes(q) || String(tax.rate).includes(q));
  }, [taxSearch, taxes]);

  const assignableRoles = useMemo(() => roles.filter((role) => role.isActive), [roles]);

  const selectedRole = roleModal?.roleId
    ? roles.find((item) => item.id === roleModal.roleId) || null
    : null;
  const selectedUser = userModal?.userId
    ? users.find((item) => item.id === userModal.userId) || null
    : null;
  const selectedInvite = inviteViewId ? invites.find((item) => item.id === inviteViewId) || null : null;

  const canReset = resetConfirmText.trim() === RESET_PHRASE && resetAck;
  const canFactoryReset = factoryResetAck && factoryResetConfirmText.trim() === FACTORY_RESET_PHRASE;

  const openRoleModal = (mode: "view" | "edit", roleId: string) => {
    const role = roles.find((item) => item.id === roleId);
    if (!role) return;
    setRoleForm({
      name: role.name,
      description: role.description,
      permissionCodes: role.permissions.map((permission) => permission.code),
    });
    setRoleModal({ mode, roleId });
  };

  const openRoleCreate = () => {
    setRoleForm({ name: "", description: "", permissionCodes: [] });
    setRoleModal({ mode: "create" });
  };

  const openUserModal = (mode: "view" | "edit", userId: string) => {
    const row = users.find((item) => item.id === userId);
    if (!row) return;
    setUserForm({
      fullName: row.fullName,
      email: row.email,
      phone: row.phone || "",
      status: row.status,
      roleId: row.roles.find((role) => role.isActive)?.id || assignableRoles[0]?.id || "",
    });
    setUserModal({ mode, userId });
  };

  const togglePermission = (code: string) => {
    setRoleForm((prev) => {
      const exists = prev.permissionCodes.includes(code);
      const permissionCodes = exists
        ? prev.permissionCodes.filter((item) => item !== code)
        : [...prev.permissionCodes, code];
      return { ...prev, permissionCodes };
    });
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await apiRequest<{ user: { id: string } }>("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: profileForm.fullName,
          phone: profileForm.phone || null,
          avatarUrl: profileForm.avatarUrl || null,
        }),
      });
      await refresh();
      pushToast("تم تحديث الملف الشخصي", "success");
    } catch (error) {
      handleError(error, "تعذر تحديث الملف الشخصي");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleBrandingSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageSettings) return;
    setSavingBranding(true);
    try {
      const payload = await apiRequest<{ branding: Branding }>("/api/settings/branding", {
        method: "PATCH",
        body: JSON.stringify({
          brandName: brandingForm.brandName,
          brandTagline: brandingForm.brandTagline || null,
          logoUrl: brandingForm.logoUrl || null,
          primaryColor: brandingForm.primaryColor,
          secondaryColor: brandingForm.secondaryColor,
          backgroundColor: brandingForm.backgroundColor,
          cardColor: brandingForm.cardColor,
          borderColor: brandingForm.borderColor,
          topbarColor: brandingForm.topbarColor,
          topbarTextColor: brandingForm.topbarTextColor,
          tableHeaderColor: brandingForm.tableHeaderColor,
          tableHeaderTextColor: brandingForm.tableHeaderTextColor,
          backgroundOpacity: brandingForm.backgroundOpacity,
          cardOpacity: brandingForm.cardOpacity,
          topbarOpacity: brandingForm.topbarOpacity,
          tableHeaderOpacity: brandingForm.tableHeaderOpacity,
          sidebarOpacity: brandingForm.sidebarOpacity,
          sidebarColor: brandingForm.sidebarColor,
          sidebarTextColor: brandingForm.sidebarTextColor,
        }),
      });
      setBranding(payload.branding);
      await refreshBranding();
      pushToast("تم تحديث الهوية البصرية", "success");
    } catch (error) {
      handleError(error, "تعذر تحديث الهوية البصرية");
    } finally {
      setSavingBranding(false);
    }
  };

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void (async () => {
      try {
        const compressed = await compressImageFile(file, MAX_LOGO_DIMENSION, MAX_IMAGE_CHARS);
        setBrandingForm((prev) => ({ ...prev, logoUrl: compressed }));
      } catch {
        pushToast("حجم الصورة كبير جداً. اختر صورة أصغر أو بجودة أقل.", "error");
      } finally {
        event.target.value = "";
      }
    })();
  };

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void (async () => {
      try {
        const compressed = await compressImageFile(file, MAX_AVATAR_DIMENSION, MAX_IMAGE_CHARS);
        setProfileForm((prev) => ({ ...prev, avatarUrl: compressed }));
      } catch {
        pushToast("حجم الصورة كبير جداً. اختر صورة أصغر أو بجودة أقل.", "error");
      } finally {
        event.target.value = "";
      }
    })();
  };

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passwordForm.password.trim()) {
      pushToast("اكتب كلمة المرور الجديدة", "error");
      return;
    }
    setSavingPassword(true);
    try {
      await apiRequest<{ updated: boolean }>("/api/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ password: passwordForm.password }),
      });
      setPasswordForm({ password: "" });
      pushToast("تم تحديث كلمة المرور", "success");
    } catch (error) {
      handleError(error, "تعذر تحديث كلمة المرور");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleBrandingDefaults = () => {
    setBrandingForm((prev) => ({
      ...prev,
      ...DEFAULT_BRAND_COLORS,
    }));
    pushToast("تمت استعادة ألوان الهوية الافتراضية، اضغط حفظ لتطبيقها", "info");
  };

  const handleBusinessModeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageSettings) return;
    setSavingBusinessMode(true);
    try {
      const payload = await apiRequest<{ businessMode: BusinessMode }>("/api/settings/business-mode", {
        method: "PATCH",
        body: JSON.stringify({ businessMode }),
      });
      setBusinessMode(payload.businessMode);
      window.dispatchEvent(new CustomEvent<BusinessMode>("business-mode-updated", { detail: payload.businessMode }));
      pushToast("تم تحديث نوع النشاط", "success");
    } catch (error) {
      handleError(error, "تعذر تحديث نوع النشاط");
    } finally {
      setSavingBusinessMode(false);
    }
  };

  const openFactoryReset = () => {
    setFactoryResetConfirmText("");
    setFactoryResetAck(false);
    setFactoryResetOpen(true);
  };

  const handleRoleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageRoles || !roleModal) return;

    setSubmitting(true);
    try {
      const body = {
        name: roleForm.name,
        description: roleForm.description,
        permissionCodes: roleForm.permissionCodes,
      };

      if (roleModal.mode === "create") {
        await apiRequest<{ role: { id: string } }>("/api/admin/roles", {
          method: "POST",
          body: JSON.stringify(body),
        });
      } else if (roleModal.mode === "edit" && roleModal.roleId) {
        await apiRequest<{ role: { id: string } }>(`/api/admin/roles/${roleModal.roleId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      }

      setRoleModal(null);
      await fetchSettingsData();
      pushToast(roleModal.mode === "create" ? "تمت إضافة الدور" : "تم تحديث الدور", "success");
    } catch (error) {
      handleError(error, "تعذر حفظ الدور");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      const result = await apiRequest<{ deleted: boolean; mode?: string }>(`/api/admin/roles/${roleId}`, {
        method: "DELETE",
      });
      await fetchSettingsData();
      if (result.mode === "disabled") {
        pushToast("تم تعطيل الدور. يمكن حذفه نهائياً عند الضغط مرة أخرى.", "success");
      } else {
        pushToast("تم حذف الدور نهائياً", "success");
      }
    } catch (error) {
      handleError(error, "تعذر حذف الدور");
    }
  };

  const handleUserSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageUsers || !userModal?.userId) return;
    if (!userForm.roleId) {
      pushToast("اختر دور المستخدم", "error");
      return;
    }
    if (!assignableRoles.some((role) => role.id === userForm.roleId)) {
      pushToast("الدور المحدد معطل. اختر دوراً نشطاً.", "error");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest<{ user: { id: string } }>(`/api/admin/users/${userModal.userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          fullName: userForm.fullName,
          phone: userForm.phone || null,
          status: userForm.status,
          roleIds: [userForm.roleId],
        }),
      });
      setUserModal(null);
      await fetchSettingsData();
      pushToast("تم تحديث المستخدم", "success");
    } catch (error) {
      handleError(error, "تعذر تحديث المستخدم");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuspendUser = async (userId: string) => {
    try {
      const result = await apiRequest<{ deleted: boolean; mode?: string }>(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      await fetchSettingsData();
      if (result.mode === "disabled") {
        pushToast("تم تعطيل المستخدم. الحذف مرة ثانية يحذفه نهائياً.", "success");
      } else {
        pushToast("تم حذف المستخدم نهائياً", "success");
      }
    } catch (error) {
      handleError(error, "تعذر تحديث حالة المستخدم");
    }
  };

  const openInviteCreate = () => {
    setInviteForm({ email: "", roleId: assignableRoles[0]?.id || "" });
    setNewInviteLink("");
    setInviteCreateOpen(true);
  };

  const handleCreateInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canInviteUsers) return;
    if (!inviteForm.roleId) {
      pushToast("اختر الدور المطلوب للدعوة", "error");
      return;
    }
    if (!assignableRoles.some((role) => role.id === inviteForm.roleId)) {
      pushToast("الدور المحدد معطل. اختر دوراً نشطاً.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiRequest<{ inviteLink: string }>("/api/admin/invites", {
        method: "POST",
        body: JSON.stringify(inviteForm),
      });
      setNewInviteLink(data.inviteLink);
      await fetchSettingsData();
      pushToast("تم إنشاء رابط الدعوة", "success");
    } catch (error) {
      handleError(error, "تعذر إنشاء الدعوة");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!newInviteLink) return;
    try {
      await navigator.clipboard.writeText(newInviteLink);
      pushToast("تم نسخ رابط الدعوة", "success");
    } catch {
      pushToast("تعذر نسخ الرابط", "error");
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const result = await apiRequest<{ invite?: { id: string }; mode?: string; deleted?: boolean }>(
        `/api/admin/invites/${inviteId}/revoke`,
        {
        method: "POST",
        body: JSON.stringify({ reason: "revoked_from_settings" }),
      }
      );
      await fetchSettingsData();
      if (result.mode === "disabled") {
        pushToast("تم تعطيل الدعوة. الضغط مرة ثانية يحذفها نهائياً.", "success");
      } else {
        pushToast("تم حذف الدعوة نهائياً", "success");
      }
    } catch (error) {
      handleError(error, "تعذر إلغاء الدعوة");
    }
  };

  const openTaxModal = (tax?: TaxRow) => {
    if (tax) {
      setTaxForm({
        id: tax.id,
        name: tax.name,
        rate: tax.rate,
        isDefault: tax.isDefault,
        isActive: tax.isActive,
      });
    } else {
      setTaxForm({ id: "", name: "", rate: 0, isDefault: false, isActive: true });
    }
    setTaxModalOpen(true);
  };

  const handleTaxSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageSettings) return;
    setSubmitting(true);
    try {
      const body = {
        name: taxForm.name,
        rate: taxForm.rate,
        isDefault: taxForm.isDefault,
        isActive: taxForm.isActive,
      };

      if (taxForm.id) {
        await apiRequest<{ tax: TaxRow }>(`/api/settings/taxes/${taxForm.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiRequest<{ tax: TaxRow }>("/api/settings/taxes", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }

      setTaxModalOpen(false);
      setTaxForm({ id: "", name: "", rate: 0, isDefault: false, isActive: true });
      await fetchSettingsData();
      pushToast(taxForm.id ? "تم تحديث الضريبة" : "تمت إضافة الضريبة", "success");
    } catch (error) {
      handleError(error, "تعذر حفظ الضريبة");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTax = async (taxId: string) => {
    try {
      await apiRequest<{ deleted: boolean }>(`/api/settings/taxes/${taxId}`, {
        method: "DELETE",
      });
      setTaxDeleteId(null);
      await fetchSettingsData();
      pushToast("تم حذف الضريبة", "success");
    } catch (error) {
      handleError(error, "تعذر حذف الضريبة");
    }
  };

  const closeResetModal = useCallback(() => {
    setResetOpen(false);
    setResetConfirmText("");
    setResetAck(false);
    setResetScope("transactions");
  }, []);

  const handleSystemReset = useCallback(() => {
    if (!canReset) return;
    setSubmitting(true);
    void (async () => {
      try {
        await apiRequest<{ reset: boolean; scope: "transactions" | "operational" }>("/api/system/reset", {
          method: "POST",
          body: JSON.stringify({ scope: resetScope }),
        });
        closeResetModal();
        pushToast(
          resetScope === "transactions"
            ? "تمت إعادة تعيين الحركات"
            : "تمت إعادة تعيين البيانات التشغيلية",
          "success"
        );
      } catch (error) {
        handleError(error, "تعذر إعادة تعيين البيانات");
      } finally {
        setSubmitting(false);
      }
    })();
  }, [canReset, closeResetModal, handleError, pushToast, resetScope]);

  const closeFactoryResetModal = useCallback(() => {
    setFactoryResetOpen(false);
    setFactoryResetAck(false);
    setFactoryResetConfirmText("");
  }, []);

  const handleFactoryReset = useCallback(() => {
    if (!canFactoryReset) return;
    setFactoryResetSubmitting(true);
    void (async () => {
      try {
        await apiRequest<{ reset: boolean }>("/api/system/factory-reset", {
          method: "POST",
          body: JSON.stringify({
            confirmText: factoryResetConfirmText,
            confirmAck: factoryResetAck,
          }),
        });
        closeFactoryResetModal();
        await logout().catch(() => undefined);
        pushToast("تمت تهيئة النظام. سيتم تحويلك إلى شاشة البداية.", "success");
        router.replace("/setup");
      } catch (error) {
        handleError(error, "تعذر تنفيذ التهيئة الكاملة");
      } finally {
        setFactoryResetSubmitting(false);
      }
    })();
  }, [
    canFactoryReset,
    closeFactoryResetModal,
    factoryResetAck,
    factoryResetConfirmText,
    handleError,
    logout,
    pushToast,
    router,
  ]);

  const canAccessTab = canManageRoles || canManageUsers || canInviteUsers || canResetSystem;
  const settingsTabs = useMemo(
    () => [
      { id: "profile" as const, label: "الملف الشخصي", icon: "bx bx-user" },
      { id: "branding" as const, label: "الهوية البصرية", icon: "bx bx-palette", hidden: !canViewSettings },
      { id: "operations" as const, label: "النظام", icon: "bx bx-slider-alt", hidden: !canViewSettings },
      {
        id: "access" as const,
        label: "الصلاحيات والأدوار",
        icon: "bx bx-shield-quarter",
        hidden: !canAccessTab,
      },
    ],
    [canAccessTab, canViewSettings]
  );

  useEffect(() => {
    const visibleTabs = settingsTabs.filter((tab) => !tab.hidden);
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.some((tab) => tab.id === settingsTab)) {
      setSettingsTab(visibleTabs[0].id);
    }
  }, [settingsTab, settingsTabs]);


  return {
    user,
    canViewSettings,
    canManageSettings,
    canManageRoles,
    canManageUsers,
    canInviteUsers,
    canResetSystem,
    permissions,
    roles,
    users,
    invites,
    taxes,
    loading,
    settingsTab,
    setSettingsTab,
    activeTab,
    setActiveTab,
    roleSearch,
    setRoleSearch,
    roleFilter,
    setRoleFilter,
    userSearch,
    setUserSearch,
    userFilter,
    setUserFilter,
    inviteSearch,
    setInviteSearch,
    inviteFilter,
    setInviteFilter,
    taxSearch,
    setTaxSearch,
    logoutOpen,
    setLogoutOpen,
    resetOpen,
    setResetOpen,
    roleModal,
    setRoleModal,
    userModal,
    setUserModal,
    inviteCreateOpen,
    setInviteCreateOpen,
    inviteViewId,
    setInviteViewId,
    taxModalOpen,
    setTaxModalOpen,
    taxDeleteId,
    setTaxDeleteId,
    roleForm,
    setRoleForm,
    userForm,
    setUserForm,
    inviteForm,
    setInviteForm,
    newInviteLink,
    setNewInviteLink,
    submitting,
    taxForm,
    setTaxForm,
    profileForm,
    setProfileForm,
    savingProfile,
    brandingForm,
    setBrandingForm,
    savingBranding,
    businessMode,
    setBusinessMode,
    savingBusinessMode,
    passwordForm,
    setPasswordForm,
    savingPassword,
    resetScope,
    setResetScope,
    resetConfirmText,
    setResetConfirmText,
    resetAck,
    setResetAck,
    factoryResetOpen,
    setFactoryResetOpen,
    factoryResetAck,
    setFactoryResetAck,
    factoryResetConfirmText,
    setFactoryResetConfirmText,
    factoryResetSubmitting,
    setFactoryResetSubmitting,
    permissionLabelMap,
    currentPermissionLabels,
    filteredRoles,
    filteredUsers,
    filteredInvites,
    filteredTaxes,
    assignableRoles,
    selectedRole,
    selectedUser,
    selectedInvite,
    canReset,
    canFactoryReset,
    openRoleModal,
    openRoleCreate,
    openUserModal,
    togglePermission,
    handleProfileSubmit,
    handleBrandingSubmit,
    handleBusinessModeSubmit,
    handleLogoUpload,
    handleAvatarUpload,
    handlePasswordChange,
    handleBrandingDefaults,
    openFactoryReset,
    handleRoleSubmit,
    handleDeleteRole,
    handleUserSubmit,
    handleSuspendUser,
    openInviteCreate,
    handleCreateInvite,
    handleCopyInviteLink,
    handleRevokeInvite,
    openTaxModal,
    handleTaxSubmit,
    handleDeleteTax,
    handleFactoryReset,
    handleSystemReset,
    closeFactoryResetModal,
    closeResetModal,
    handleLogout,
    canAccessTab,
    settingsTabs,
  };
}

export type SettingsPageState = ReturnType<typeof useSettingsPage>;
