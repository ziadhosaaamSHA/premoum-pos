import Image from "next/image";
import { ChangeEvent } from "react";

type ProfilePhotoCardProps = {
  avatarUrl: string;
  fullName: string;
  email: string;
  onAvatarUrlChange: (value: string) => void;
  onAvatarUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
};

export default function ProfilePhotoCard({
  avatarUrl,
  fullName,
  email,
  onAvatarUrlChange,
  onAvatarUpload,
  onRemoveAvatar,
}: ProfilePhotoCardProps) {
  return (
    <div className="profile-photo-card">
      <div className="profile-avatar-preview" style={{ position: "relative", overflow: "hidden" }}>
        {avatarUrl ? (
          <Image src={avatarUrl} alt={fullName} fill sizes="96px" unoptimized />
        ) : (
          <span>{fullName.slice(0, 1) || "P"}</span>
        )}
      </div>
      <div className="profile-photo-meta">
        <strong>{fullName || "الملف الشخصي"}</strong>
        <span>{email}</span>
      </div>
      <div className="profile-photo-actions">
        <label className="field">
          <span className="profile-label">رابط الصورة</span>
          <input
            type="text"
            value={avatarUrl}
            onChange={(event) => onAvatarUrlChange(event.target.value)}
            placeholder="https://..."
          />
        </label>
        <label className="field">
          <span className="profile-label">رفع صورة</span>
          <input type="file" accept="image/*" onChange={onAvatarUpload} />
        </label>
        <button className="ghost" type="button" onClick={onRemoveAvatar}>
          إزالة الصورة
        </button>
      </div>
    </div>
  );
}
