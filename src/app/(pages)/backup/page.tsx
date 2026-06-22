"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { ApiError, apiRequest } from "@/lib/api";
import InlineModal from "@/components/ui/InlineModal";
import RowActions from "@/components/ui/RowActions";
import TableDataActions from "@/components/ui/TableDataActions";

const RESTORE_PHRASE = "استعادة النسخة";

type BackupStatus = "completed" | "failed" | "running";

type BackupRecordRow = {
  id: string;
  reference: string;
  fileName: string;
  status: BackupStatus;
  sizeBytes: number;
  note: string | null;
  createdAt: string;
  restoredAt: string | null;
  createdBy: {
    id: string;
    fullName: string;
    email: string;
  } | null;
};

type BackupDetail = {
  backup: BackupRecordRow;
  summary: {
    categories: number;
    materials: number;
    products: number;
    suppliers: number;
    orders: number;
    sales: number;
    expenses: number;
    employees: number;
  } | null;
};

function backupStatusLabel(status: BackupStatus) {
  if (status === "completed") return "مكتمل";
  if (status === "running") return "قيد التنفيذ";
  return "فشل";
}

function backupStatusBadge(status: BackupStatus) {
  if (status === "completed") return "ok";
  if (status === "running") return "warn";
  return "danger";
}

export default function BackupPage() {
  const { pushToast } = useToast();
  const { hasPermission } = useAuth();
  const canManageBackups = hasPermission("backup:manage");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [backups, setBackups] = useState<BackupRecordRow[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [selectedBackupDetail, setSelectedBackupDetail] = useState<BackupDetail | null>(null);

  const [restoreBackupId, setRestoreBackupId] = useState<string | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const [restoreAck, setRestoreAck] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadConfirmText, setUploadConfirmText] = useState("");
  const [uploadAck, setUploadAck] = useState(false);

  const handleError = useCallback(
    (error: unknown, fallback: string) => {
      if (error instanceof ApiError) {
        pushToast(error.message || fallback, "error");
        return;
      }
      pushToast(fallback, "error");
    },
    [pushToast]
  );

  const fetchBackups = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const payload = await apiRequest<{ backups: BackupRecordRow[] }>("/api/backup/bootstrap");
        setBackups(payload.backups);
      } catch (error) {
        handleError(error, "تعذر تحميل سجل النسخ الاحتياطية");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [handleError]
  );

  useEffect(() => {
    void fetchBackups(true);
  }, [fetchBackups]);

  const filteredBackups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return backups.filter((backup) => {
      const matchesSearch =
        !q ||
        backup.reference.toLowerCase().includes(q) ||
        backup.fileName.toLowerCase().includes(q) ||
        (backup.note || "").toLowerCase().includes(q);
      const matchesStatus = !statusFilter || backup.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [backups, search, statusFilter]);

  const canRestoreFromHistory = restoreConfirmText.trim() === RESTORE_PHRASE && restoreAck;
  const canRestoreFromUpload = uploadConfirmText.trim() === RESTORE_PHRASE && uploadAck && uploadFile;

  const handleCreateBackup = async (downloadAfterCreate = false) => {
    setSubmitting(true);
    try {
      const payload = await apiRequest<{ backup: BackupRecordRow }>("/api/backup", {
        method: "POST",
        body: JSON.stringify({}),
      });

      await fetchBackups();
      pushToast("تم إنشاء نسخة احتياطية جديدة", "success");

      if (downloadAfterCreate) {
        window.open(`/api/backup/${payload.backup.id}/download`, "_blank");
      }
    } catch (error) {
      handleError(error, "تعذر إنشاء النسخة الاحتياطية");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewBackup = async (backupId: string) => {
    try {
      const payload = await apiRequest<BackupDetail>(`/api/backup/${backupId}`);
      setSelectedBackupDetail(payload);
      setSelectedBackupId(backupId);
    } catch (error) {
      handleError(error, "تعذر تحميل تفاصيل النسخة");
      throw error;
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    setSubmitting(true);
    try {
      await apiRequest<{ restored: boolean }>(`/api/backup/${backupId}/restore`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setRestoreBackupId(null);
      setRestoreConfirmText("");
      setRestoreAck(false);
      await fetchBackups();
      pushToast("تمت استعادة النسخة بنجاح", "success");
    } catch (error) {
      handleError(error, "تعذر استعادة النسخة");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    try {
      await apiRequest<{ deleted: boolean }>(`/api/backup/${backupId}`, {
        method: "DELETE",
      });
      await fetchBackups();
    } catch (error) {
      handleError(error, "تعذر حذف النسخة الاحتياطية");
      throw error;
    }
  };

  const handleImportUpload = async () => {
    if (!canRestoreFromUpload || !uploadFile) return;

    setSubmitting(true);
    try {
      const text = await uploadFile.text();
      const snapshot = JSON.parse(text) as unknown;

      await apiRequest<{ backup: BackupRecordRow }>("/api/backup/import", {
        method: "POST",
        body: JSON.stringify({
          snapshot,
          note: "استعادة من ملف محلي",
        }),
      });

      setUploadOpen(false);
      setUploadFile(null);
      setUploadConfirmText("");
      setUploadAck(false);
      await fetchBackups();
      pushToast("تمت الاستعادة من الملف المحلي", "success");
    } catch (error) {
      handleError(error, "تعذر استعادة النسخة من الملف");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page active backup-page">
      <div className="card wide">
        <div className="section-header-actions no-tip">
          <h2>النسخ الاحتياطي للنظام</h2>
        </div>
        <p className="section-hint">يمكنك إنشاء نسخة احتياطية كاملة أو استعادة البيانات من نسخة سابقة.</p>
        <div className="table-toolbar backup-toolbar">
          <button className="primary large" type="button" disabled={submitting || !canManageBackups} onClick={() => void handleCreateBackup(true)}>
            <i className="bx bx-cloud-download"></i>
            تحميل نسخة احتياطية
          </button>
          <button className="ghost" type="button" disabled={submitting || !canManageBackups} onClick={() => void handleCreateBackup(false)}>
            <i className="bx bx-save"></i>
            إنشاء نسخة الآن
          </button>
          <button className="ghost" type="button" disabled={submitting || !canManageBackups} onClick={() => setUploadOpen(true)}>
            <i className="bx bx-import"></i>
            استيراد البيانات
          </button>
        </div>
      </div>

      <div className="card wide">
        <div className="section-header-actions no-tip">
          <h2>
            <i className="bx bx-history"></i>
            سجل النسخ الاحتياطي
          </h2>
          <div className="table-toolbar">
            <div className="search-bar-wrapper">
              <i className="bx bx-search"></i>
              <input
                type="text"
                className="table-search"
                placeholder="بحث في السجل..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select className="select-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">الكل</option>
              <option value="completed">مكتمل</option>
              <option value="failed">فشل</option>
              <option value="running">قيد التنفيذ</option>
            </select>
            <TableDataActions
              rows={filteredBackups}
              columns={[
                { label: "التاريخ", value: (row) => new Date(row.createdAt).toLocaleString("ar-EG") },
                { label: "الملف", value: (row) => row.fileName },
                { label: "الحجم (MB)", value: (row) => (row.sizeBytes / 1024 / 1024).toFixed(2) },
                { label: "الحالة", value: (row) => backupStatusLabel(row.status) },
              ]}
              fileName="backup-history"
              printTitle="سجل النسخ الاحتياطي"
              tableId="backup-history-table"
            />
          </div>
        </div>
        <p className="section-hint">يظهر هنا سجل عمليات النسخ الاحتياطي مع الحالة والحجم.</p>

        {loading ? (
          <p className="hint">جارٍ تحميل سجل النسخ...</p>
        ) : (
          <table id="backup-history-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الملف</th>
                <th>الحجم</th>
                <th>الحالة</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filteredBackups.length === 0 ? (
                <tr>
                  <td colSpan={5}>لا توجد بيانات مطابقة</td>
                </tr>
              ) : (
                filteredBackups.map((backup) => (
                  <tr key={backup.id}>
                    <td>{new Date(backup.createdAt).toLocaleString("ar-EG")}</td>
                    <td>{backup.fileName}</td>
                    <td>{(backup.sizeBytes / 1024 / 1024).toFixed(2)} MB</td>
                    <td>
                      <span className={`badge ${backupStatusBadge(backup.status)}`}>
                        {backupStatusLabel(backup.status)}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="action-btn view"
                          type="button"
                          title="تنزيل"
                          onClick={() => window.open(`/api/backup/${backup.id}/download`, "_blank")}
                        >
                          <i className="bx bx-download"></i>
                        </button>
                        <RowActions
                          onView={() => handleViewBackup(backup.id)}
                          onEdit={canManageBackups ? () => setRestoreBackupId(backup.id) : undefined}
                          onDelete={canManageBackups ? () => handleDeleteBackup(backup.id) : undefined}
                          editMessage="تم فتح نافذة استعادة النسخة"
                          confirmDeleteText="هل تريد حذف سجل هذه النسخة الاحتياطية؟"
                          deleteMessage="تم حذف سجل النسخة الاحتياطية"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <InlineModal
        open={Boolean(selectedBackupId && selectedBackupDetail)}
        title="تفاصيل النسخة الاحتياطية"
        onClose={() => {
          setSelectedBackupId(null);
          setSelectedBackupDetail(null);
        }}
      >
        {selectedBackupDetail ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>المعرف</span>
                <strong>{selectedBackupDetail.backup.reference}</strong>
              </div>
              <div className="row-line">
                <span>التاريخ</span>
                <strong>{new Date(selectedBackupDetail.backup.createdAt).toLocaleString("ar-EG")}</strong>
              </div>
              <div className="row-line">
                <span>الحالة</span>
                <strong>{backupStatusLabel(selectedBackupDetail.backup.status)}</strong>
              </div>
              <div className="row-line">
                <span>حجم الملف</span>
                <strong>{(selectedBackupDetail.backup.sizeBytes / 1024 / 1024).toFixed(2)} MB</strong>
              </div>
              <div className="row-line">
                <span>عدد الطلبات</span>
                <strong>{selectedBackupDetail.summary?.orders ?? "—"}</strong>
              </div>
              <div className="row-line">
                <span>عدد المنتجات</span>
                <strong>{selectedBackupDetail.summary?.products ?? "—"}</strong>
              </div>
              <div className="row-line">
                <span>عدد الموظفين</span>
                <strong>{selectedBackupDetail.summary?.employees ?? "—"}</strong>
              </div>
            </div>
          </div>
        ) : null}
      </InlineModal>

      <InlineModal
        open={Boolean(restoreBackupId)}
        title="استعادة نسخة احتياطية"
        onClose={() => {
          setRestoreBackupId(null);
          setRestoreConfirmText("");
          setRestoreAck(false);
        }}
        footer={
          <>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setRestoreBackupId(null);
                setRestoreConfirmText("");
                setRestoreAck(false);
              }}
            >
              إلغاء
            </button>
            <button
              className="danger-btn"
              type="button"
              disabled={!canRestoreFromHistory || submitting}
              onClick={() => {
                if (!restoreBackupId || !canRestoreFromHistory) return;
                void handleRestoreBackup(restoreBackupId);
              }}
            >
              تأكيد الاستعادة
            </button>
          </>
        }
      >
        <form className="form">
          <div className="danger-box">
            <strong>تأكيد إلزامي</strong>
            <p>اكتب العبارة التالية للتأكيد:</p>
            <div className="confirm-phrase">{RESTORE_PHRASE}</div>
          </div>
          <label>اكتب عبارة التأكيد</label>
          <input
            type="text"
            value={restoreConfirmText}
            onChange={(event) => setRestoreConfirmText(event.target.value)}
            placeholder="اكتب عبارة التأكيد كما هي"
          />
          <label className="checkbox">
            <input type="checkbox" checked={restoreAck} onChange={(event) => setRestoreAck(event.target.checked)} />
            أفهم أن الاستعادة ستستبدل البيانات الحالية بالكامل.
          </label>
        </form>
      </InlineModal>

      <InlineModal
        open={uploadOpen}
        title="استعادة من ملف محلي"
        onClose={() => {
          setUploadOpen(false);
          setUploadFile(null);
          setUploadConfirmText("");
          setUploadAck(false);
        }}
        footer={
          <>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setUploadOpen(false);
                setUploadFile(null);
                setUploadConfirmText("");
                setUploadAck(false);
              }}
            >
              إلغاء
            </button>
            <button className="danger-btn" type="button" disabled={!canRestoreFromUpload || submitting} onClick={() => void handleImportUpload()}>
              تأكيد الاستعادة
            </button>
          </>
        }
      >
        <form className="form">
          <label>ملف النسخة (JSON)</label>
          <input
            type="file"
            accept=".json,application/json"
            onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
          />
          <div className="danger-box">
            <strong>تأكيد إلزامي</strong>
            <p>اكتب العبارة التالية للتأكيد:</p>
            <div className="confirm-phrase">{RESTORE_PHRASE}</div>
          </div>
          <label>اكتب عبارة التأكيد</label>
          <input
            type="text"
            value={uploadConfirmText}
            onChange={(event) => setUploadConfirmText(event.target.value)}
            placeholder="اكتب عبارة التأكيد كما هي"
          />
          <label className="checkbox">
            <input type="checkbox" checked={uploadAck} onChange={(event) => setUploadAck(event.target.checked)} />
            أفهم أن هذه العملية ستستبدل بيانات النظام الحالية.
          </label>
        </form>
      </InlineModal>
    </section>
  );
}
