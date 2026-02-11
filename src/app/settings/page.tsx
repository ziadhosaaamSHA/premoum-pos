"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { ApiError, apiRequest } from "@/lib/api";
import InlineModal from "@/components/ui/InlineModal";
import RowActions from "@/components/ui/RowActions";
import TableDataActions from "@/components/ui/TableDataActions";

const RESET_PHRASE = "إعادة تعيين الحركة";

type Permission = {
  id: string;
  code: string;
  label: string;
  description?: string | null;
};

type RoleRow = {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
  usersCount: number;
  permissions: Permission[];
};

type UserRole = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
};

type UserRow = {
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

type InviteRow = {
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

type RoleModalState = { mode: "view" | "edit" | "create"; roleId?: string } | null;
type UserModalState = { mode: "view" | "edit"; userId: string } | null;

type RoleForm = {
  name: string;
  description: string;
  permissionCodes: string[];
};

type UserForm = {
  fullName: string;
  email: string;
  phone: string;
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
  roleId: string;
};

type InviteForm = {
  email: string;
  roleId: string;
};

function userStatusLabel(status: UserRow["status"]) {
  if (status === "ACTIVE") return "نشط";
  if (status === "INVITED") return "مدعو";
  return "موقوف";
}

function userStatusBadge(status: UserRow["status"]) {
  if (status === "ACTIVE") return "ok";
  if (status === "INVITED") return "warn";
  return "danger";
}

function inviteStatusLabel(invite: InviteRow) {
  if (invite.status === "PENDING" && invite.isExpired) return "منتهية";
  if (invite.status === "PENDING") return "قيد الانتظار";
  if (invite.status === "ACCEPTED") return "مقبولة";
  if (invite.status === "REVOKED") return "ملغية";
  return "منتهية";
}

function inviteStatusBadge(invite: InviteRow) {
  if (invite.status === "ACCEPTED") return "ok";
  if (invite.status === "PENDING" && !invite.isExpired) return "warn";
  return "danger";
}

export default function SettingsPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const { user, hasPermission, refresh, logout } = useAuth();

  const canManageRoles = hasPermission("roles:manage");
  const canManageUsers = hasPermission("users:manage");
  const canInviteUsers = hasPermission("users:invite");
  const canResetSystem = hasPermission("system:reset");

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"roles" | "users">("roles");

  const [roleSearch, setRoleSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteFilter, setInviteFilter] = useState("");

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [roleModal, setRoleModal] = useState<RoleModalState>(null);
  const [userModal, setUserModal] = useState<UserModalState>(null);
  const [inviteCreateOpen, setInviteCreateOpen] = useState(false);
  const [inviteViewId, setInviteViewId] = useState<string | null>(null);

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

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [resetScope, setResetScope] = useState<"transactions" | "operational">("transactions");
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetAck, setResetAck] = useState(false);

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

  const fetchSettingsData = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const [permissionsPayload, rolesPayload, usersPayload, invitesPayload] = await Promise.all([
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
        ]);

        setPermissions(permissionsPayload.permissions);
        setRoles(rolesPayload.roles);
        setUsers(usersPayload.users);
        setInvites(invitesPayload.invites);
      } catch (error) {
        handleError(error, "تعذر تحميل بيانات الإعدادات");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [canInviteUsers, canManageRoles, canManageUsers, handleError]
  );

  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || "",
      });
    }
  }, [user]);

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

  const assignableRoles = useMemo(() => roles.filter((role) => role.isActive), [roles]);

  const selectedRole = roleModal?.roleId
    ? roles.find((item) => item.id === roleModal.roleId) || null
    : null;
  const selectedUser = userModal?.userId
    ? users.find((item) => item.id === userModal.userId) || null
    : null;
  const selectedInvite = inviteViewId ? invites.find((item) => item.id === inviteViewId) || null : null;

  const canReset = resetConfirmText.trim() === RESET_PHRASE && resetAck;

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

  return (
    <section className="page active settings-page">
      <div className="card wide">
        <h2>الملف الشخصي</h2>
        <form className="form profile-edit-form" onSubmit={handleProfileSubmit}>
          <div className="profile-card">
            <label className="field">
              <span className="profile-label">الاسم الكامل</span>
              <input
                type="text"
                value={profileForm.fullName}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))
                }
                required
              />
            </label>

            <label className="field">
              <span className="profile-label">الدور</span>
              <input
                type="text"
                value={user?.isOwner ? "Owner" : user?.roles.join("، ") || "بدون دور"}
                readOnly
              />
            </label>

            <label className="field">
              <span className="profile-label">البريد</span>
              <input type="email" value={profileForm.email} readOnly />
            </label>

            <label className="field">
              <span className="profile-label">الهاتف</span>
              <input
                type="text"
                value={profileForm.phone}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, phone: event.target.value }))
                }
                placeholder="01xxxxxxxxx"
              />
            </label>
          </div>

          <button className="primary" type="submit" disabled={savingProfile}>
            {savingProfile ? "جارٍ الحفظ..." : "حفظ بيانات الملف"}
          </button>
        </form>
        <p className="section-hint">يمكنك تحديث بيانات حسابك، بينما يتم إدارة الصلاحيات عبر تبويب الأدوار.</p>
      </div>

      <div className="card wide">
        <h2>صلاحياتي الحالية</h2>
        <div className="permissions-pills">
          {currentPermissionLabels.length === 0 ? (
            <span className="pill">لا توجد صلاحيات معرفة</span>
          ) : (
            currentPermissionLabels.map((permission, index) => (
              <span key={`${permission}-${index}`} className="pill">
                {permission}
              </span>
            ))
          )}
        </div>
        <p className="section-hint">هذه الصلاحيات تُستخدم لحماية الصفحات والإجراءات على مستوى النظام.</p>
      </div>

      {(canManageRoles || canManageUsers || canInviteUsers) && (
        <div className="subtabs">
          {canManageRoles && (
            <button
              className={`subtab ${activeTab === "roles" ? "active" : ""}`}
              onClick={() => setActiveTab("roles")}
              type="button"
            >
              <i className="bx bx-shield-quarter"></i>
              الأدوار والصلاحيات
            </button>
          )}

          {(canManageUsers || canInviteUsers) && (
            <button
              className={`subtab ${activeTab === "users" ? "active" : ""}`}
              onClick={() => setActiveTab("users")}
              type="button"
            >
              <i className="bx bx-user-pin"></i>
              المستخدمون والدعوات
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="card wide">
          <p className="hint">جارٍ تحميل بيانات الإعدادات...</p>
        </div>
      ) : null}

      {!loading && activeTab === "roles" && canManageRoles && (
        <div className="subtab-panel users-manage active">
          <div className="card wide">
            <div className="section-header-actions no-tip">
              <h2>الأدوار والصلاحيات</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في الأدوار..."
                    value={roleSearch}
                    onChange={(event) => setRoleSearch(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                >
                  <option value="">كل الأدوار</option>
                  <option value="system">أدوار النظام</option>
                  <option value="custom">أدوار مخصصة</option>
                  <option value="disabled">معطلة</option>
                </select>
                <button className="primary" type="button" onClick={openRoleCreate}>
                  <i className="bx bx-plus"></i>
                  إضافة دور
                </button>
                <TableDataActions
                  rows={filteredRoles}
                  columns={[
                    { label: "الدور", value: (row) => row.name },
                    { label: "الوصف", value: (row) => row.description },
                    { label: "عدد المستخدمين", value: (row) => row.usersCount },
                    {
                      label: "الحالة",
                      value: (row) => (row.isActive ? "نشط" : "معطل"),
                    },
                  ]}
                  fileName="settings-roles"
                  printTitle="الأدوار والصلاحيات"
                  tableId="settings-roles-table"
                />
              </div>
            </div>

            <p className="section-hint">اعتمد مبدأ أقل صلاحية، وامنح كل دور الحد الأدنى المطلوب فقط.</p>

            <table id="settings-roles-table">
              <thead>
                <tr>
                  <th>الدور</th>
                  <th>الوصف</th>
                  <th>عدد المستخدمين</th>
                  <th>الصلاحيات</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan={5}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredRoles.map((role) => (
                    <tr key={role.id}>
                      <td>
                        {role.name}
                        {role.isSystem ? <span className="badge neutral">نظام</span> : null}
                        {!role.isActive ? <span className="badge danger">معطل</span> : null}
                      </td>
                      <td>{role.description}</td>
                      <td>{role.usersCount}</td>
                      <td>{role.permissions.map((item) => item.label).join("، ") || "—"}</td>
                      <td>
                        <RowActions
                          onView={() => openRoleModal("view", role.id)}
                          onEdit={() => openRoleModal("edit", role.id)}
                          onDelete={() => handleDeleteRole(role.id)}
                          disableEdit={role.isSystem || !role.isActive}
                          disableDelete={role.isSystem}
                          confirmDeleteText={
                            role.isActive
                              ? "سيتم تعطيل الدور الآن. اضغط حذف مرة ثانية لاحقاً للحذف النهائي."
                              : "سيتم حذف الدور نهائياً إذا لم يكن مرتبطاً بمستخدمين أو دعوات. متابعة؟"
                          }
                          deleteMessage={role.isActive ? "تم تعطيل الدور" : "تم حذف الدور نهائياً"}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === "users" && (canManageUsers || canInviteUsers) && (
        <div className="subtab-panel active">
          {canManageUsers && (
            <div className="card wide">
              <div className="section-header-actions no-tip">
                <h2>المستخدمون</h2>
                <div className="table-toolbar">
                  <div className="search-bar-wrapper">
                    <i className="bx bx-search"></i>
                    <input
                      type="text"
                      className="table-search"
                      placeholder="بحث في المستخدمين..."
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                    />
                  </div>

                  <select
                    className="select-filter"
                    value={userFilter}
                    onChange={(event) => setUserFilter(event.target.value)}
                  >
                    <option value="">كل الحالات</option>
                    <option value="ACTIVE">نشط</option>
                    <option value="INVITED">مدعو</option>
                    <option value="SUSPENDED">موقوف</option>
                  </select>

                  {canInviteUsers && (
                    <button className="primary" type="button" onClick={openInviteCreate}>
                      <i className="bx bx-link-alt"></i>
                      دعوة مستخدم
                    </button>
                  )}
                  <TableDataActions
                    rows={filteredUsers}
                    columns={[
                      { label: "الاسم", value: (row) => row.fullName },
                      { label: "البريد", value: (row) => row.email },
                      {
                        label: "الدور",
                        value: (row) =>
                          row.isOwner
                            ? "Owner"
                            : row.roles
                                .map((role) => `${role.name}${role.isActive ? "" : " (معطل)"}`)
                                .join("، ") || "—",
                      },
                      { label: "الحالة", value: (row) => userStatusLabel(row.status) },
                    ]}
                    fileName="settings-users"
                    printTitle="المستخدمون"
                    tableId="settings-users-table"
                  />
                </div>
              </div>

              <p className="section-hint">إضافة المستخدمين تتم عبر الدعوات. الجدول التالي يعرض الحسابات المفعّلة والمدعوة.</p>

              <table id="settings-users-table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>البريد</th>
                    <th>الدور</th>
                    <th>الحالة</th>
                    <th>آخر دخول</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6}>لا توجد بيانات</td>
                    </tr>
                  ) : (
                    filteredUsers.map((row) => (
                      <tr key={row.id}>
                        <td>{row.fullName}</td>
                        <td>{row.email}</td>
                        <td>
                          {row.isOwner
                            ? "Owner"
                            : row.roles
                                .map((role) => `${role.name}${role.isActive ? "" : " (معطل)"}`)
                                .join("، ") || "—"}
                        </td>
                        <td>
                          <span className={`badge ${userStatusBadge(row.status)}`}>{userStatusLabel(row.status)}</span>
                        </td>
                        <td>{row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString("ar-EG") : "—"}</td>
                        <td>
                          <RowActions
                            onView={() => openUserModal("view", row.id)}
                            onEdit={() => openUserModal("edit", row.id)}
                            onDelete={() => handleSuspendUser(row.id)}
                            disableDelete={row.isOwner || row.id === user?.id}
                            confirmDeleteText={
                              row.status === "SUSPENDED"
                                ? "المستخدم معطل حالياً. هل تريد حذفه نهائياً؟"
                                : "سيتم تعطيل المستخدم الآن. اضغط حذف مرة ثانية للحذف النهائي."
                            }
                            deleteMessage={row.status === "SUSPENDED" ? "تم حذف المستخدم نهائياً" : "تم تعطيل المستخدم"}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {(canInviteUsers || canManageUsers) && (
            <div className="card wide">
              <div className="section-header-actions no-tip">
                <h2>سجل الدعوات</h2>
                <div className="table-toolbar">
                  <div className="search-bar-wrapper">
                    <i className="bx bx-search"></i>
                    <input
                      type="text"
                      className="table-search"
                      placeholder="بحث في الدعوات..."
                      value={inviteSearch}
                      onChange={(event) => setInviteSearch(event.target.value)}
                    />
                  </div>

                  <select
                    className="select-filter"
                    value={inviteFilter}
                    onChange={(event) => setInviteFilter(event.target.value)}
                  >
                    <option value="">كل الحالات</option>
                    <option value="PENDING">قيد الانتظار</option>
                    <option value="ACCEPTED">مقبولة</option>
                    <option value="REVOKED">ملغية</option>
                    <option value="EXPIRED">منتهية</option>
                  </select>

                  {canInviteUsers && (
                    <button className="primary" type="button" onClick={openInviteCreate}>
                      <i className="bx bx-plus"></i>
                      دعوة جديدة
                    </button>
                  )}
                  <TableDataActions
                    rows={filteredInvites}
                    columns={[
                      { label: "البريد", value: (row) => row.email },
                      { label: "الدور", value: (row) => row.role.name },
                      { label: "حالة الدور", value: (row) => (row.role.isActive ? "نشط" : "معطل") },
                      { label: "الحالة", value: (row) => inviteStatusLabel(row) },
                      { label: "الإنشاء", value: (row) => new Date(row.createdAt).toLocaleString("ar-EG") },
                    ]}
                    fileName="settings-invites"
                    printTitle="سجل الدعوات"
                    tableId="settings-invites-table"
                  />
                </div>
              </div>

              <p className="section-hint">رابط الدعوة يحدد البريد والدور مسبقاً، ويتم استكمال الاسم وكلمة المرور من المستخدم الجديد.</p>

              <table id="settings-invites-table">
                <thead>
                  <tr>
                    <th>البريد</th>
                    <th>الدور</th>
                    <th>الحالة</th>
                    <th>تاريخ الإنشاء</th>
                    <th>الانتهاء</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvites.length === 0 ? (
                    <tr>
                      <td colSpan={6}>لا توجد دعوات</td>
                    </tr>
                  ) : (
                    filteredInvites.map((invite) => (
                      <tr key={invite.id}>
                        <td>{invite.email}</td>
                        <td>{invite.role.name}</td>
                        <td>
                          <span className={`badge ${inviteStatusBadge(invite)}`}>{inviteStatusLabel(invite)}</span>
                        </td>
                        <td>{new Date(invite.createdAt).toLocaleString("ar-EG")}</td>
                        <td>{new Date(invite.expiresAt).toLocaleString("ar-EG")}</td>
                        <td>
                          <RowActions
                            onView={() => setInviteViewId(invite.id)}
                            onDelete={
                              canInviteUsers &&
                              (invite.status === "PENDING" || invite.status === "REVOKED")
                                ? () => handleRevokeInvite(invite.id)
                                : undefined
                            }
                            confirmDeleteText={
                              invite.status === "PENDING"
                                ? "سيتم تعطيل الدعوة الآن. ضغط حذف مرة ثانية يحذف السجل نهائياً."
                                : "سيتم حذف سجل الدعوة نهائياً. متابعة؟"
                            }
                            deleteMessage={invite.status === "PENDING" ? "تم تعطيل الدعوة" : "تم حذف الدعوة نهائياً"}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {canResetSystem && (
        <div className="card wide danger-card settings-danger-card">
          <div className="section-header-actions no-tip">
            <div>
              <h2>إعادة تعيين البيانات</h2>
              <p className="hint">هذه العملية غير قابلة للتراجع. قم بأخذ نسخة احتياطية قبل التنفيذ.</p>
            </div>
            <button className="danger-btn" type="button" onClick={() => setResetOpen(true)}>
              <i className="bx bx-trash"></i>
              إعادة تعيين البيانات
            </button>
          </div>

          <ul className="reset-steps">
            <li>اختيار نطاق الإعادة (حركات فقط أو كل البيانات التشغيلية).</li>
            <li>تأكيد فهمك للمخاطر عبر خانة تأكيد مزدوجة.</li>
            <li>كتابة عبارة التأكيد كما هي قبل التفعيل.</li>
          </ul>
        </div>
      )}

      <button className="danger-btn" type="button" onClick={() => setLogoutOpen(true)}>
        <i className="bx bx-log-out"></i>
        تسجيل الخروج
      </button>

      <InlineModal
        open={Boolean(roleModal)}
        title={
          roleModal?.mode === "create"
            ? "إضافة دور"
            : roleModal?.mode === "edit"
              ? "تعديل الدور"
              : "تفاصيل الدور"
        }
        onClose={() => setRoleModal(null)}
      >
        {roleModal?.mode === "view" && selectedRole ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>اسم الدور</span>
                <strong>{selectedRole.name}</strong>
              </div>
              <div className="row-line">
                <span>الوصف</span>
                <strong>{selectedRole.description}</strong>
              </div>
              <div className="row-line">
                <span>نوع الدور</span>
                <strong>{selectedRole.isSystem ? "نظام" : "مخصص"}</strong>
              </div>
              <div className="row-line">
                <span>الصلاحيات</span>
                <strong>{selectedRole.permissions.map((item) => item.label).join("، ") || "—"}</strong>
              </div>
            </div>
          </div>
        ) : (
          <form className="form" onSubmit={handleRoleSubmit}>
            <label>اسم الدور</label>
            <input
              type="text"
              value={roleForm.name}
              onChange={(event) => setRoleForm((prev) => ({ ...prev, name: event.target.value }))}
              required
              disabled={submitting}
            />

            <label>الوصف</label>
            <input
              type="text"
              value={roleForm.description}
              onChange={(event) =>
                setRoleForm((prev) => ({ ...prev, description: event.target.value }))
              }
              required
              disabled={submitting}
            />

            <label>الصلاحيات</label>
            <div className="role-permissions-grid">
              {permissions.length === 0 ? (
                <div className="hint">لا توجد صلاحيات متاحة</div>
              ) : (
                permissions.map((permission) => {
                  const active = roleForm.permissionCodes.includes(permission.code);
                  return (
                    <button
                      key={permission.id}
                      type="button"
                      className={`permission-pill ${active ? "active" : ""}`}
                      onClick={() => togglePermission(permission.code)}
                    >
                      {permission.label}
                    </button>
                  );
                })
              )}
            </div>

            <p className="hint">
              الصلاحيات المختارة: {roleForm.permissionCodes.length === 0 ? "لا توجد" : roleForm.permissionCodes.length}
            </p>

            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </button>
          </form>
        )}
      </InlineModal>

      <InlineModal
        open={Boolean(userModal)}
        title={userModal?.mode === "edit" ? "تعديل المستخدم" : "تفاصيل المستخدم"}
        onClose={() => setUserModal(null)}
      >
        {userModal?.mode === "view" && selectedUser ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>الاسم</span>
                <strong>{selectedUser.fullName}</strong>
              </div>
              <div className="row-line">
                <span>البريد</span>
                <strong>{selectedUser.email}</strong>
              </div>
              <div className="row-line">
                <span>الهاتف</span>
                <strong>{selectedUser.phone || "—"}</strong>
              </div>
              <div className="row-line">
                <span>الدور</span>
                <strong>{selectedUser.isOwner ? "Owner" : selectedUser.roles.map((r) => r.name).join("، ") || "—"}</strong>
              </div>
              <div className="row-line">
                <span>الحالة</span>
                <strong>{userStatusLabel(selectedUser.status)}</strong>
              </div>
            </div>
          </div>
        ) : (
          <form className="form" onSubmit={handleUserSubmit}>
            <label>الاسم</label>
            <input
              type="text"
              value={userForm.fullName}
              onChange={(event) => setUserForm((prev) => ({ ...prev, fullName: event.target.value }))}
              required
              disabled={submitting}
            />

            <label>البريد</label>
            <input type="email" value={userForm.email} readOnly />

            <label>الهاتف</label>
            <input
              type="text"
              value={userForm.phone}
              onChange={(event) => setUserForm((prev) => ({ ...prev, phone: event.target.value }))}
              disabled={submitting}
            />

            <label>الدور</label>
            <select
              value={userForm.roleId}
              onChange={(event) => setUserForm((prev) => ({ ...prev, roleId: event.target.value }))}
              disabled={submitting}
            >
              <option value="">اختر دور</option>
              {assignableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>

            <label>الحالة</label>
            <select
              value={userForm.status}
              onChange={(event) =>
                setUserForm((prev) => ({
                  ...prev,
                  status: event.target.value as UserForm["status"],
                }))
              }
              disabled={submitting}
            >
              <option value="ACTIVE">نشط</option>
              <option value="INVITED">مدعو</option>
              <option value="SUSPENDED">موقوف</option>
            </select>

            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </button>
          </form>
        )}
      </InlineModal>

      <InlineModal
        open={inviteCreateOpen}
        title="دعوة مستخدم جديد"
        onClose={() => {
          setInviteCreateOpen(false);
          setNewInviteLink("");
        }}
      >
        <form className="form" onSubmit={handleCreateInvite}>
          <label>البريد الإلكتروني</label>
          <input
            type="email"
            value={inviteForm.email}
            onChange={(event) =>
              setInviteForm((prev) => ({ ...prev, email: event.target.value }))
            }
            required
            disabled={submitting}
          />

          <label>الدور</label>
          <select
            value={inviteForm.roleId}
            onChange={(event) =>
              setInviteForm((prev) => ({ ...prev, roleId: event.target.value }))
            }
            required
            disabled={submitting}
          >
            <option value="">اختر دور</option>
            {assignableRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>

          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? "جارٍ إنشاء الدعوة..." : "إنشاء رابط الدعوة"}
          </button>
        </form>

        {newInviteLink ? (
          <div className="danger-box" style={{ marginTop: 16 }}>
            <strong>تم إنشاء الرابط</strong>
            <p>{newInviteLink}</p>
            <button className="ghost" type="button" onClick={handleCopyInviteLink}>
              نسخ الرابط
            </button>
          </div>
        ) : null}
      </InlineModal>

      <InlineModal
        open={Boolean(selectedInvite)}
        title="تفاصيل الدعوة"
        onClose={() => setInviteViewId(null)}
      >
        {selectedInvite ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>البريد</span>
                <strong>{selectedInvite.email}</strong>
              </div>
              <div className="row-line">
                <span>الدور</span>
                <strong>{selectedInvite.role.name}</strong>
              </div>
              <div className="row-line">
                <span>الحالة</span>
                <strong>{inviteStatusLabel(selectedInvite)}</strong>
              </div>
              <div className="row-line">
                <span>أنشأها</span>
                <strong>{selectedInvite.createdBy.fullName}</strong>
              </div>
              <div className="row-line">
                <span>تاريخ الإنشاء</span>
                <strong>{new Date(selectedInvite.createdAt).toLocaleString("ar-EG")}</strong>
              </div>
              <div className="row-line">
                <span>تنتهي في</span>
                <strong>{new Date(selectedInvite.expiresAt).toLocaleString("ar-EG")}</strong>
              </div>
            </div>
          </div>
        ) : null}
      </InlineModal>

      <InlineModal
        open={logoutOpen}
        title="تسجيل الخروج"
        onClose={() => setLogoutOpen(false)}
        footer={
          <>
            <button className="ghost" type="button" onClick={() => setLogoutOpen(false)}>
              إلغاء
            </button>
            <button
              className="primary"
              type="button"
              onClick={() => {
                setLogoutOpen(false);
                void (async () => {
                  await logout().catch(() => undefined);
                  router.replace("/login");
                  pushToast("تم تسجيل الخروج", "success");
                })();
              }}
            >
              تأكيد الخروج
            </button>
          </>
        }
      >
        <div className="modal-body">
          <p>هل تريد تسجيل الخروج من النظام؟</p>
        </div>
      </InlineModal>

      <InlineModal
        open={resetOpen}
        title="إعادة تعيين البيانات"
        onClose={() => {
          setResetOpen(false);
          setResetConfirmText("");
          setResetAck(false);
          setResetScope("transactions");
        }}
        footer={
          <>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setResetOpen(false);
                setResetConfirmText("");
                setResetAck(false);
                setResetScope("transactions");
              }}
            >
              إلغاء
            </button>
            <button
              className="danger-btn"
              type="button"
              disabled={!canReset || submitting}
              onClick={() => {
                if (!canReset) return;
                setSubmitting(true);
                void (async () => {
                  try {
                    await apiRequest<{ reset: boolean; scope: "transactions" | "operational" }>("/api/system/reset", {
                      method: "POST",
                      body: JSON.stringify({ scope: resetScope }),
                    });
                    setResetOpen(false);
                    setResetConfirmText("");
                    setResetAck(false);
                    setResetScope("transactions");
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
              }}
            >
              تأكيد إعادة التعيين
            </button>
          </>
        }
      >
        <form className="form reset-form">
          <div className="radio-group">
            <label className="radio-card">
              <input
                type="radio"
                name="resetScope"
                checked={resetScope === "transactions"}
                onChange={() => setResetScope("transactions")}
              />
              <div>
                <strong>حركات فقط</strong>
                <span>يحذف العمليات اليومية مع بقاء الإعدادات الأساسية.</span>
              </div>
            </label>
            <label className="radio-card">
              <input
                type="radio"
                name="resetScope"
                checked={resetScope === "operational"}
                onChange={() => setResetScope("operational")}
              />
              <div>
                <strong>كل البيانات التشغيلية</strong>
                <span>يحذف العمليات والمخزون والسجلات التشغيلية.</span>
              </div>
            </label>
          </div>

          <div className="danger-box">
            <strong>تأكيد إلزامي</strong>
            <p>اكتب العبارة التالية للتأكيد:</p>
            <div className="confirm-phrase">{RESET_PHRASE}</div>
          </div>

          <label>اكتب عبارة التأكيد</label>
          <input
            type="text"
            value={resetConfirmText}
            onChange={(event) => setResetConfirmText(event.target.value)}
            placeholder="اكتب عبارة التأكيد كما هي"
          />

          <label className="checkbox">
            <input
              type="checkbox"
              checked={resetAck}
              onChange={(event) => setResetAck(event.target.checked)}
            />
            أفهم أن العملية غير قابلة للتراجع.
          </label>
        </form>
      </InlineModal>
    </section>
  );
}
