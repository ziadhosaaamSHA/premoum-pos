"use client";

import Image from "next/image";
import InlineModal from "@/components/ui/InlineModal";
import RowActions from "@/components/ui/RowActions";
import TableDataActions from "@/components/ui/TableDataActions";
import { FACTORY_RESET_PHRASE } from "@/lib/constants";
import {
  UserForm,
  inviteStatusBadge,
  inviteStatusLabel,
  userStatusBadge,
  userStatusLabel,
} from "../types";
import { isHexColor, normalizeHexInput } from "../utils/colors";
import { useSettingsPage } from "../hooks/useSettingsPage";
import ProfilePhotoCard from "./ProfilePhotoCard";
import SettingsTabs from "./SettingsTabs";

const RESET_PHRASE = "إعادة تعيين الحركة";

export default function SettingsPageClient() {
  const {
    user,
    canViewSettings,
    canManageSettings,
    canManageRoles,
    canManageUsers,
    canInviteUsers,
    canResetSystem,
    permissions,
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
    factoryResetAck,
    setFactoryResetAck,
    factoryResetConfirmText,
    setFactoryResetConfirmText,
    factoryResetSubmitting,
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
    settingsTabs,
    handleLogout,
  } = useSettingsPage();

  return (
    <section className="page active settings-page">
      <SettingsTabs tabs={settingsTabs} activeTab={settingsTab} onChange={setSettingsTab} />

      {settingsTab === "profile" && (
        <div className="card wide">
        <h2>الملف الشخصي</h2>
        <form className="form profile-edit-form" onSubmit={handleProfileSubmit}>
          <div className="profile-layout">
            <ProfilePhotoCard
              avatarUrl={profileForm.avatarUrl}
              fullName={profileForm.fullName}
              email={profileForm.email}
              onAvatarUrlChange={(avatarUrl) => setProfileForm((prev) => ({ ...prev, avatarUrl }))}
              onAvatarUpload={handleAvatarUpload}
              onRemoveAvatar={() => setProfileForm((prev) => ({ ...prev, avatarUrl: "" }))}
            />

            <div className="profile-fields-card">
              <div className="profile-fields-grid">
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
            </div>
          </div>

          <div className="profile-actions">
            <button className="primary" type="submit" disabled={savingProfile}>
              {savingProfile ? "جارٍ الحفظ..." : "حفظ بيانات الملف"}
            </button>
          </div>
        </form>
        <p className="section-hint">يمكنك تحديث بيانات حسابك، بينما يتم إدارة الصلاحيات عبر تبويب الأدوار.</p>
        </div>
      )}

      {settingsTab === "branding" && canViewSettings && (
        <div className="card wide">
          <div className="section-header-actions no-tip">
            <h2>الهوية البصرية</h2>
            <div className="branding-preview">
              <div className="branding-logo" style={{ position: "relative", overflow: "hidden" }}>
                {brandingForm.logoUrl ? (
                  <Image src={brandingForm.logoUrl} alt={brandingForm.brandName} fill sizes="96px" unoptimized />
                ) : (
                  <span>{brandingForm.brandName.slice(0, 1) || "P"}</span>
                )}
              </div>
              <div className="branding-text">
                <strong>{brandingForm.brandName || "Premium POS"}</strong>
                <span>{brandingForm.brandTagline || "مطعم ومقهى"}</span>
              </div>
            </div>
          </div>

          <form className="form branding-form" onSubmit={handleBrandingSubmit}>
            <div className="branding-section">
              <div className="branding-section-header">
                <div>
                  <h3>الهوية الأساسية</h3>
                  <p className="hint">اسم العلامة والشعار والمعلومات التعريفية.</p>
                </div>
              </div>
              <div className="branding-grid">
                <label className="field">
                  <span>اسم العلامة</span>
                  <input
                    type="text"
                    value={brandingForm.brandName}
                    onChange={(event) =>
                      setBrandingForm((prev) => ({ ...prev, brandName: event.target.value }))
                    }
                    required
                    disabled={savingBranding || !canManageSettings}
                  />
                </label>
                <label className="field">
                  <span>الوصف المختصر</span>
                  <input
                    type="text"
                    value={brandingForm.brandTagline}
                    onChange={(event) =>
                      setBrandingForm((prev) => ({ ...prev, brandTagline: event.target.value }))
                    }
                    disabled={savingBranding || !canManageSettings}
                    placeholder="مطعم ومقهى"
                  />
                </label>
                <label className="field">
                  <span>رابط الشعار</span>
                  <input
                    type="text"
                    value={brandingForm.logoUrl}
                    onChange={(event) =>
                      setBrandingForm((prev) => ({ ...prev, logoUrl: event.target.value }))
                    }
                    disabled={savingBranding || !canManageSettings}
                    placeholder="https://..."
                  />
                </label>
                <label className="field">
                  <span>رفع شعار</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={savingBranding || !canManageSettings}
                  />
                </label>
              </div>
            </div>

            <div className="branding-section">
              <div className="branding-section-header">
                <div>
                  <h3>ألوان العلامة</h3>
                  <p className="hint">الألوان الرئيسية المستخدمة في الأزرار والعناصر البارزة.</p>
                </div>
              </div>
              <div className="branding-grid">
                <label className="field">
                  <span>لون العلامة الأساسي</span>
                  <div className="color-input">
                    <input
                      type="color"
                      value={isHexColor(brandingForm.primaryColor) ? brandingForm.primaryColor : "#e06d4c"}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({ ...prev, primaryColor: event.target.value }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                    <input
                      type="text"
                      value={brandingForm.primaryColor}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          primaryColor: normalizeHexInput(event.target.value),
                        }))
                      }
                      placeholder="#E06D4C"
                      disabled={savingBranding || !canManageSettings}
                    />
                    <span
                      className="color-preview"
                      style={{
                        background: isHexColor(brandingForm.primaryColor)
                          ? brandingForm.primaryColor
                          : "#e06d4c",
                      }}
                    />
                  </div>
                  {!isHexColor(brandingForm.primaryColor) ? (
                    <span className="hint">أدخل اللون بصيغة HEX مثل #E06D4C</span>
                  ) : null}
                </label>
                <label className="field">
                  <span>لون ثانوي</span>
                  <div className="color-input">
                    <input
                      type="color"
                      value={isHexColor(brandingForm.secondaryColor) ? brandingForm.secondaryColor : "#2f8f83"}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({ ...prev, secondaryColor: event.target.value }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                    <input
                      type="text"
                      value={brandingForm.secondaryColor}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          secondaryColor: normalizeHexInput(event.target.value),
                        }))
                      }
                      placeholder="#2F8F83"
                      disabled={savingBranding || !canManageSettings}
                    />
                    <span
                      className="color-preview"
                      style={{
                        background: isHexColor(brandingForm.secondaryColor)
                          ? brandingForm.secondaryColor
                          : "#2f8f83",
                      }}
                    />
                  </div>
                  {!isHexColor(brandingForm.secondaryColor) ? (
                    <span className="hint">أدخل اللون بصيغة HEX مثل #2F8F83</span>
                  ) : null}
                </label>
                <label className="field">
                  <span>لون الحدود</span>
                  <div className="color-input">
                    <input
                      type="color"
                      value={isHexColor(brandingForm.borderColor) ? brandingForm.borderColor : "#e6e1db"}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({ ...prev, borderColor: event.target.value }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                    <input
                      type="text"
                      value={brandingForm.borderColor}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          borderColor: normalizeHexInput(event.target.value),
                        }))
                      }
                      placeholder="#E6E1DB"
                      disabled={savingBranding || !canManageSettings}
                    />
                    <span
                      className="color-preview"
                      style={{
                        background: isHexColor(brandingForm.borderColor)
                          ? brandingForm.borderColor
                          : "#e6e1db",
                      }}
                    />
                  </div>
                  {!isHexColor(brandingForm.borderColor) ? (
                    <span className="hint">أدخل اللون بصيغة HEX مثل #E6E1DB</span>
                  ) : null}
                </label>
              </div>
            </div>

            <div className="branding-section">
              <div className="branding-section-header">
                <div>
                  <h3>ألوان السطوح</h3>
                  <p className="hint">ألوان الخلفيات والبطاقات داخل النظام.</p>
                </div>
              </div>
              <div className="branding-grid">
                <label className="field">
                  <span>لون خلفية النظام</span>
                  <div className="color-input">
                    <input
                      type="color"
                      value={isHexColor(brandingForm.backgroundColor) ? brandingForm.backgroundColor : "#f7f3ee"}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({ ...prev, backgroundColor: event.target.value }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                    <input
                      type="text"
                      value={brandingForm.backgroundColor}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          backgroundColor: normalizeHexInput(event.target.value),
                        }))
                      }
                      placeholder="#F7F3EE"
                      disabled={savingBranding || !canManageSettings}
                    />
                    <span
                      className="color-preview"
                      style={{
                        background: isHexColor(brandingForm.backgroundColor)
                          ? brandingForm.backgroundColor
                          : "#f7f3ee",
                      }}
                    />
                  </div>
                  <div className="opacity-input">
                    <span>الشفافية</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={brandingForm.backgroundOpacity}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          backgroundOpacity: Number(event.target.value || 0),
                        }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={brandingForm.backgroundOpacity}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          backgroundOpacity: Math.min(100, Math.max(0, Number(event.target.value || 0))),
                        }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                  </div>
                  {!isHexColor(brandingForm.backgroundColor) ? (
                    <span className="hint">أدخل اللون بصيغة HEX مثل #F7F3EE</span>
                  ) : null}
                </label>
                <label className="field">
                  <span>لون البطاقات</span>
                  <div className="color-input">
                    <input
                      type="color"
                      value={isHexColor(brandingForm.cardColor) ? brandingForm.cardColor : "#ffffff"}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({ ...prev, cardColor: event.target.value }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                    <input
                      type="text"
                      value={brandingForm.cardColor}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          cardColor: normalizeHexInput(event.target.value),
                        }))
                      }
                      placeholder="#FFFFFF"
                      disabled={savingBranding || !canManageSettings}
                    />
                    <span
                      className="color-preview"
                      style={{
                        background: isHexColor(brandingForm.cardColor)
                          ? brandingForm.cardColor
                          : "#ffffff",
                      }}
                    />
                  </div>
                  <div className="opacity-input">
                    <span>الشفافية</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={brandingForm.cardOpacity}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          cardOpacity: Number(event.target.value || 0),
                        }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={brandingForm.cardOpacity}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          cardOpacity: Math.min(100, Math.max(0, Number(event.target.value || 0))),
                        }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                  </div>
                  {!isHexColor(brandingForm.cardColor) ? (
                    <span className="hint">أدخل اللون بصيغة HEX مثل #FFFFFF</span>
                  ) : null}
                </label>
              </div>
            </div>

            <div className="branding-section">
              <div className="branding-section-header">
                <div>
                  <h3>الشريط الجانبي والتنقل</h3>
                  <p className="hint">ألوان الشريط الجانبي ونصوصه.</p>
                </div>
              </div>
              <div className="branding-grid">
                <label className="field">
                  <span>لون الشريط الجانبي</span>
                  <div className="color-input">
                    <input
                      type="color"
                      value={isHexColor(brandingForm.sidebarColor) ? brandingForm.sidebarColor : "#1f2a2b"}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({ ...prev, sidebarColor: event.target.value }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                    <input
                      type="text"
                      value={brandingForm.sidebarColor}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          sidebarColor: normalizeHexInput(event.target.value),
                        }))
                      }
                      placeholder="#1F2A2B"
                      disabled={savingBranding || !canManageSettings}
                    />
                    <span
                      className="color-preview"
                      style={{
                        background: isHexColor(brandingForm.sidebarColor)
                          ? brandingForm.sidebarColor
                          : "#1f2a2b",
                      }}
                    />
                  </div>
                  <div className="opacity-input">
                    <span>الشفافية</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={brandingForm.sidebarOpacity}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          sidebarOpacity: Number(event.target.value || 0),
                        }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={brandingForm.sidebarOpacity}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          sidebarOpacity: Math.min(100, Math.max(0, Number(event.target.value || 0))),
                        }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                  </div>
                  {!isHexColor(brandingForm.sidebarColor) ? (
                    <span className="hint">أدخل اللون بصيغة HEX مثل #1F2A2B</span>
                  ) : null}
                </label>
                <label className="field">
                  <span>لون نص الشريط الجانبي</span>
                  <div className="color-input">
                    <input
                      type="color"
                      value={isHexColor(brandingForm.sidebarTextColor) ? brandingForm.sidebarTextColor : "#f6f3ef"}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({ ...prev, sidebarTextColor: event.target.value }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                    <input
                      type="text"
                      value={brandingForm.sidebarTextColor}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          sidebarTextColor: normalizeHexInput(event.target.value),
                        }))
                      }
                      placeholder="#F6F3EF"
                      disabled={savingBranding || !canManageSettings}
                    />
                    <span
                      className="color-preview"
                      style={{
                        background: isHexColor(brandingForm.sidebarTextColor)
                          ? brandingForm.sidebarTextColor
                          : "#f6f3ef",
                      }}
                    />
                  </div>
                  {!isHexColor(brandingForm.sidebarTextColor) ? (
                    <span className="hint">أدخل اللون بصيغة HEX مثل #F6F3EF</span>
                  ) : null}
                </label>
              </div>
            </div>

            <div className="branding-section">
              <div className="branding-section-header">
                <div>
                  <h3>الشريط العلوي والجداول</h3>
                  <p className="hint">ألوان الشريط العلوي ورؤوس الجداول.</p>
                </div>
              </div>
              <div className="branding-grid">
                <label className="field">
                  <span>لون الشريط العلوي</span>
                  <div className="color-input">
                    <input
                      type="color"
                      value={isHexColor(brandingForm.topbarColor) ? brandingForm.topbarColor : "#ffffff"}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({ ...prev, topbarColor: event.target.value }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                    <input
                      type="text"
                      value={brandingForm.topbarColor}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          topbarColor: normalizeHexInput(event.target.value),
                        }))
                      }
                      placeholder="#FFFFFF"
                      disabled={savingBranding || !canManageSettings}
                    />
                    <span
                      className="color-preview"
                      style={{
                        background: isHexColor(brandingForm.topbarColor) ? brandingForm.topbarColor : "#ffffff",
                      }}
                    />
                  </div>
                  <div className="opacity-input">
                    <span>الشفافية</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={brandingForm.topbarOpacity}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          topbarOpacity: Number(event.target.value || 0),
                        }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={brandingForm.topbarOpacity}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          topbarOpacity: Math.min(100, Math.max(0, Number(event.target.value || 0))),
                        }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                  </div>
                  {!isHexColor(brandingForm.topbarColor) ? (
                    <span className="hint">أدخل اللون بصيغة HEX مثل #FFFFFF</span>
                  ) : null}
                </label>
                <label className="field">
                  <span>لون نص الشريط العلوي</span>
                  <div className="color-input">
                    <input
                      type="color"
                      value={isHexColor(brandingForm.topbarTextColor) ? brandingForm.topbarTextColor : "#1b1b1b"}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({ ...prev, topbarTextColor: event.target.value }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                    <input
                      type="text"
                      value={brandingForm.topbarTextColor}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          topbarTextColor: normalizeHexInput(event.target.value),
                        }))
                      }
                      placeholder="#1B1B1B"
                      disabled={savingBranding || !canManageSettings}
                    />
                    <span
                      className="color-preview"
                      style={{
                        background: isHexColor(brandingForm.topbarTextColor)
                          ? brandingForm.topbarTextColor
                          : "#1b1b1b",
                      }}
                    />
                  </div>
                  {!isHexColor(brandingForm.topbarTextColor) ? (
                    <span className="hint">أدخل اللون بصيغة HEX مثل #1B1B1B</span>
                  ) : null}
                </label>
                <label className="field">
                  <span>لون رؤوس الجداول</span>
                  <div className="color-input">
                    <input
                      type="color"
                      value={
                        isHexColor(brandingForm.tableHeaderColor) ? brandingForm.tableHeaderColor : "#fbfaf8"
                      }
                      onChange={(event) =>
                        setBrandingForm((prev) => ({ ...prev, tableHeaderColor: event.target.value }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                    <input
                      type="text"
                      value={brandingForm.tableHeaderColor}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          tableHeaderColor: normalizeHexInput(event.target.value),
                        }))
                      }
                      placeholder="#FBFAF8"
                      disabled={savingBranding || !canManageSettings}
                    />
                    <span
                      className="color-preview"
                      style={{
                        background: isHexColor(brandingForm.tableHeaderColor)
                          ? brandingForm.tableHeaderColor
                          : "#fbfaf8",
                      }}
                    />
                  </div>
                  <div className="opacity-input">
                    <span>الشفافية</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={brandingForm.tableHeaderOpacity}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          tableHeaderOpacity: Number(event.target.value || 0),
                        }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={brandingForm.tableHeaderOpacity}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          tableHeaderOpacity: Math.min(100, Math.max(0, Number(event.target.value || 0))),
                        }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                  </div>
                  {!isHexColor(brandingForm.tableHeaderColor) ? (
                    <span className="hint">أدخل اللون بصيغة HEX مثل #FBFAF8</span>
                  ) : null}
                </label>
                <label className="field">
                  <span>لون نص رؤوس الجداول</span>
                  <div className="color-input">
                    <input
                      type="color"
                      value={
                        isHexColor(brandingForm.tableHeaderTextColor)
                          ? brandingForm.tableHeaderTextColor
                          : "#6b6b6b"
                      }
                      onChange={(event) =>
                        setBrandingForm((prev) => ({ ...prev, tableHeaderTextColor: event.target.value }))
                      }
                      disabled={savingBranding || !canManageSettings}
                    />
                    <input
                      type="text"
                      value={brandingForm.tableHeaderTextColor}
                      onChange={(event) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          tableHeaderTextColor: normalizeHexInput(event.target.value),
                        }))
                      }
                      placeholder="#6B6B6B"
                      disabled={savingBranding || !canManageSettings}
                    />
                    <span
                      className="color-preview"
                      style={{
                        background: isHexColor(brandingForm.tableHeaderTextColor)
                          ? brandingForm.tableHeaderTextColor
                          : "#6b6b6b",
                      }}
                    />
                  </div>
                  {!isHexColor(brandingForm.tableHeaderTextColor) ? (
                    <span className="hint">أدخل اللون بصيغة HEX مثل #6B6B6B</span>
                  ) : null}
                </label>
              </div>
            </div>

            <div className="branding-actions">
              <button
                className="ghost"
                type="button"
                onClick={handleBrandingDefaults}
                disabled={savingBranding || !canManageSettings}
              >
                استعادة الألوان الافتراضية
              </button>
              <button
                className="ghost"
                type="button"
                onClick={() => setBrandingForm((prev) => ({ ...prev, logoUrl: "" }))}
                disabled={savingBranding || !canManageSettings}
              >
                إزالة الشعار
              </button>
              <button className="primary" type="submit" disabled={savingBranding || !canManageSettings}>
                {savingBranding ? "جارٍ الحفظ..." : "حفظ الهوية"}
              </button>
            </div>
          </form>
          <p className="section-hint">يتم تطبيق الألوان مباشرة على النظام بعد الحفظ.</p>
        </div>
      )}

      {settingsTab === "operations" && canViewSettings && (
        <div className="card wide">
          <div className="section-header-actions no-tip">
            <div>
              <h2>نوع النشاط</h2>
              <p className="hint">يحدد شكل الكاشير والميزات التشغيلية الظاهرة في النظام.</p>
            </div>
          </div>

          <form className="form" onSubmit={handleBusinessModeSubmit}>
            <div className="radio-group">
              <label className="radio-card">
                <input
                  type="radio"
                  name="businessMode"
                  checked={businessMode === "cafe_restaurant"}
                  onChange={() => setBusinessMode("cafe_restaurant")}
                  disabled={savingBusinessMode || !canManageSettings}
                />
                <div>
                  <strong>كافيه / مطعم</strong>
                  <span>يعرض الطاولات، الطلبات النشطة، الوصفات، وخصم مكونات الوصفة عند البيع.</span>
                </div>
              </label>
              <label className="radio-card">
                <input
                  type="radio"
                  name="businessMode"
                  checked={businessMode === "retail"}
                  onChange={() => setBusinessMode("retail")}
                  disabled={savingBusinessMode || !canManageSettings}
                />
                <div>
                  <strong>بيع تجزئة</strong>
                  <span>كاشير مباشر بدون طاولات أو وصفات، والطلب ينتهي بمجرد تأكيد البيع.</span>
                </div>
              </label>
            </div>

            <button className="primary" type="submit" disabled={savingBusinessMode || !canManageSettings}>
              {savingBusinessMode ? "جارٍ الحفظ..." : "حفظ نوع النشاط"}
            </button>
          </form>
        </div>
      )}

      {settingsTab === "profile" && (
        <div className="card wide">
        <div className="section-header-actions no-tip">
          <h2>تغيير كلمة المرور</h2>
          <span className="hint">أدخل كلمة مرور جديدة مباشرة (بدون طلب كلمة المرور الحالية).</span>
        </div>
        <form className="form password-form" onSubmit={handlePasswordChange}>
          <label>كلمة المرور الجديدة</label>
          <input
            type="password"
            value={passwordForm.password}
            onChange={(event) => setPasswordForm({ password: event.target.value })}
            placeholder="••••••••••"
            required
            disabled={savingPassword}
          />
          <button className="primary" type="submit" disabled={savingPassword}>
            {savingPassword ? "جارٍ التحديث..." : "تحديث كلمة المرور"}
          </button>
        </form>
        </div>
      )}

      {settingsTab === "access" && (
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
      )}

      {settingsTab === "profile" && canViewSettings && (
        <div className="card wide">
          <div className="section-header-actions">
            <h2>الضرائب (GST)</h2>
            <div className="table-toolbar">
              <div className="search-bar-wrapper">
                <i className="bx bx-search"></i>
                <input
                  type="text"
                  className="table-search"
                  placeholder="بحث في الضرائب..."
                  value={taxSearch}
                  onChange={(event) => setTaxSearch(event.target.value)}
                />
              </div>
              {canManageSettings && (
                <button className="primary" type="button" onClick={() => openTaxModal()}>
                  <i className="bx bx-plus"></i>
                  إضافة ضريبة
                </button>
              )}
              <TableDataActions
                rows={filteredTaxes}
                columns={[
                  { label: "الضريبة", value: (row) => row.name },
                  { label: "النسبة", value: (row) => `${row.rate}%` },
                  { label: "الافتراضية", value: (row) => (row.isDefault ? "نعم" : "لا") },
                  { label: "الحالة", value: (row) => (row.isActive ? "نشطة" : "معطلة") },
                ]}
                fileName="settings-taxes"
                printTitle="الضرائب"
                tableId="settings-taxes-table"
              />
            </div>
          </div>
          <p className="section-hint">يمكنك تحديد ضريبة افتراضية تُطبق تلقائياً على طلبات الكاشير.</p>
          <table id="settings-taxes-table">
            <thead>
              <tr>
                <th>الضريبة</th>
                <th>النسبة</th>
                <th>افتراضية</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredTaxes.length === 0 ? (
                <tr>
                  <td colSpan={5}>لا توجد بيانات</td>
                </tr>
              ) : (
                filteredTaxes.map((tax) => (
                  <tr key={tax.id}>
                    <td>{tax.name}</td>
                    <td>{tax.rate.toFixed(2)}%</td>
                    <td>{tax.isDefault ? <span className="badge neutral">افتراضية</span> : "—"}</td>
                    <td>
                      <span className={`badge ${tax.isActive ? "ok" : "danger"}`}>
                        {tax.isActive ? "نشطة" : "معطلة"}
                      </span>
                    </td>
                    <td>
                      {canManageSettings ? (
                        <RowActions
                          onEdit={() => openTaxModal(tax)}
                          onDelete={() => setTaxDeleteId(tax.id)}
                          confirmDelete={false}
                          deleteMessage="تم حذف الضريبة"
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {settingsTab === "profile" && (
        <div className="card wide">
          <div className="section-header-actions no-tip">
            <h2>تسجيل الخروج</h2>
            <span className="hint">خروج آمن من الحساب الحالي.</span>
          </div>
          <button className="danger-btn" type="button" onClick={() => setLogoutOpen(true)}>
            <i className="bx bx-log-out"></i>
            تسجيل الخروج
          </button>
        </div>
      )}

      {settingsTab === "access" && (canManageRoles || canManageUsers || canInviteUsers) && (
        <SettingsTabs
          tabs={[
            {
              id: "roles",
              label: "الأدوار والصلاحيات",
              icon: "bx bx-shield-quarter",
              hidden: !canManageRoles,
            },
            {
              id: "users",
              label: "المستخدمون والدعوات",
              icon: "bx bx-user-pin",
              hidden: !(canManageUsers || canInviteUsers),
            },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      )}

      {settingsTab === "access" && loading ? (
        <div className="card wide">
          <p className="hint">جارٍ تحميل بيانات الإعدادات...</p>
        </div>
      ) : null}

      {settingsTab === "access" && !loading && activeTab === "roles" && canManageRoles && (
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

      {settingsTab === "access" && !loading && activeTab === "users" && (canManageUsers || canInviteUsers) && (
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

      {settingsTab === "access" && canResetSystem && (
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

      {settingsTab === "access" && canResetSystem && (
        <div className="card wide danger-card settings-danger-card">
          <div className="section-header-actions no-tip">
            <div>
              <h2>تهيئة النظام من الصفر</h2>
              <p className="hint">يحذف كل البيانات ويعيد النظام لخطوات الترحيب وإنشاء المالك.</p>
            </div>
            <button className="danger-btn" type="button" onClick={openFactoryReset}>
              <i className="bx bx-refresh"></i>
              بدء التهيئة الكاملة
            </button>
          </div>

          <ul className="reset-steps">
            <li>اكتب عبارة التأكيد كما هي.</li>
            <li>سيتم حذف كل البيانات بما فيها المستخدمون والإعدادات والنسخ الاحتياطية.</li>
            <li>سيتم تحويلك لصفحة الإعداد للبدء من جديد.</li>
          </ul>
        </div>
      )}

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
        open={taxModalOpen}
        title={taxForm.id ? "تعديل ضريبة" : "إضافة ضريبة"}
        onClose={() => setTaxModalOpen(false)}
      >
        <form className="form" onSubmit={handleTaxSubmit}>
          <label>اسم الضريبة</label>
          <input
            type="text"
            value={taxForm.name}
            onChange={(event) => setTaxForm((prev) => ({ ...prev, name: event.target.value }))}
            required
            disabled={submitting}
          />
          <label>النسبة (%)</label>
          <input
            type="number"
            value={taxForm.rate}
            min={0}
            max={100}
            step={0.5}
            onChange={(event) =>
              setTaxForm((prev) => ({ ...prev, rate: Number(event.target.value || 0) }))
            }
            required
            disabled={submitting}
          />
          <label className="checkbox">
            <input
              type="checkbox"
              checked={taxForm.isDefault}
              onChange={(event) => setTaxForm((prev) => ({ ...prev, isDefault: event.target.checked }))}
              disabled={submitting}
            />
            تعيين كضريبة افتراضية
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={taxForm.isActive}
              onChange={(event) => setTaxForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              disabled={submitting}
            />
            ضريبة نشطة
          </label>
          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? "جارٍ الحفظ..." : "حفظ الضريبة"}
          </button>
        </form>
      </InlineModal>

      <InlineModal
        open={Boolean(taxDeleteId)}
        title="حذف الضريبة"
        onClose={() => setTaxDeleteId(null)}
        footer={
          <>
            <button className="ghost" type="button" onClick={() => setTaxDeleteId(null)}>
              إلغاء
            </button>
            <button
              className="danger-btn"
              type="button"
              onClick={() => {
                if (!taxDeleteId) return;
                void handleDeleteTax(taxDeleteId);
              }}
            >
              تأكيد الحذف
            </button>
          </>
        }
      >
        <div className="modal-body">
          <p>سيتم حذف الضريبة من الإعدادات ولن تُطبق على الطلبات الجديدة.</p>
        </div>
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
              onClick={handleLogout}
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
        onClose={closeResetModal}
        footer={
          <>
            <button
              className="ghost"
              type="button"
              onClick={closeResetModal}
            >
              إلغاء
            </button>
            <button
              className="danger-btn"
              type="button"
              disabled={!canReset || submitting}
              onClick={handleSystemReset}
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

      <InlineModal
        open={factoryResetOpen}
        title="تهيئة النظام من الصفر"
        onClose={closeFactoryResetModal}
        footer={
          <>
            <button
              className="ghost"
              type="button"
              onClick={closeFactoryResetModal}
            >
              إلغاء
            </button>
            <button
              className="danger-btn"
              type="button"
              disabled={!canFactoryReset || factoryResetSubmitting}
              onClick={handleFactoryReset}
            >
              تأكيد التهيئة الكاملة
            </button>
          </>
        }
      >
        <form className="form reset-form">
          <div className="danger-box">
            <strong>تنبيه مهم</strong>
            <p>سيتم حذف جميع البيانات والمستخدمين والإعدادات وإرجاع النظام للوضع الأول.</p>
            <div className="confirm-phrase">{FACTORY_RESET_PHRASE}</div>
          </div>

          <label>اكتب عبارة التأكيد</label>
          <input
            type="text"
            value={factoryResetConfirmText}
            onChange={(event) => setFactoryResetConfirmText(event.target.value)}
            placeholder="اكتب عبارة التأكيد كما هي"
          />

          <label className="checkbox">
            <input
              type="checkbox"
              checked={factoryResetAck}
              onChange={(event) => setFactoryResetAck(event.target.checked)}
            />
            أفهم أن العملية تحذف كل البيانات ولن يمكن التراجع عنها.
          </label>
        </form>
      </InlineModal>
    </section>
  );
}
