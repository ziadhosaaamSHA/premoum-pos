"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiRequest } from "@/lib/api";
import { money, todayISO } from "@/lib/format";
import InlineModal from "@/components/ui/InlineModal";
import RowActions from "@/components/ui/RowActions";
import TableDataActions from "@/components/ui/TableDataActions";

type EmployeeRow = {
  id: string;
  name: string;
  role: string;
  phone: string;
  status: "active" | "inactive";
};

type AttendanceRow = {
  id: string;
  employeeId: string;
  employee: string;
  checkIn: string;
  checkOut: string;
  status: string;
  notes: string | null;
};

type ShiftRow = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  time: string;
  staffCount: number;
  staff: string;
  status: "active" | "inactive";
};

type PayrollRow = {
  id: string;
  employeeId: string;
  employee: string;
  type: "salary" | "advance" | "bonus" | "deduction";
  item: string;
  amount: number;
  date: string;
  note: string | null;
};

type LeaveRow = {
  id: string;
  employeeId: string;
  employee: string;
  from: string;
  to: string;
  status: "pending" | "approved" | "rejected";
  reason: string | null;
};

type UserEmployeeShiftRow = {
  employeeId: string;
  userId: string | null;
  employeeName: string;
  role: string;
  userName: string;
  email: string;
  userStatus: "INVITED" | "ACTIVE" | "SUSPENDED";
  roles: string[];
  shiftsCount: number;
  totalShiftMinutes: number;
  lastShiftStart: string | null;
  lastShiftEnd: string | null;
  lastShiftMinutes: number;
};

type HrPayload = {
  employees: EmployeeRow[];
  attendance: AttendanceRow[];
  shifts: ShiftRow[];
  payroll: PayrollRow[];
  leaves: LeaveRow[];
  userEmployees: UserEmployeeShiftRow[];
};

type EmployeeModalState = { mode: "view" | "edit" | "create"; id?: string } | null;
type AttendanceModalState = { mode: "view" | "edit" | "create"; id?: string } | null;
type ShiftModalState = { mode: "view" | "edit" | "create"; id?: string } | null;
type PayrollModalState = { mode: "view" | "edit" | "create"; id?: string } | null;
type LeaveModalState = { mode: "view" | "edit" | "create"; id?: string } | null;

function statusLabel(value: string) {
  if (value === "active") return "نشط";
  if (value === "inactive") return "غير نشط";
  if (value === "pending") return "قيد المراجعة";
  if (value === "approved") return "مقبولة";
  if (value === "rejected") return "مرفوضة";
  if (value === "salary") return "راتب";
  if (value === "advance") return "سلفة";
  if (value === "bonus") return "حافز";
  if (value === "deduction") return "خصم";
  if (value === "ACTIVE") return "نشط";
  if (value === "INVITED") return "مدعو";
  if (value === "SUSPENDED") return "موقوف";
  return value;
}

function formatDateTime(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ar-EG");
}

function datetimeLocalValue(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export default function HrPage() {
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<HrPayload | null>(null);

  const [activeTab, setActiveTab] = useState("employees");
  const [searchEmployees, setSearchEmployees] = useState("");
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState("");
  const [searchAttendance, setSearchAttendance] = useState("");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("");
  const [searchShifts, setSearchShifts] = useState("");
  const [shiftStatusFilter, setShiftStatusFilter] = useState("");
  const [searchPayroll, setSearchPayroll] = useState("");
  const [payrollTypeFilter, setPayrollTypeFilter] = useState("");
  const [searchLeaves, setSearchLeaves] = useState("");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("");
  const [searchUserShifts, setSearchUserShifts] = useState("");
  const [userShiftStatusFilter, setUserShiftStatusFilter] = useState("");

  const [employeeModal, setEmployeeModal] = useState<EmployeeModalState>(null);
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    role: "",
    phone: "",
    status: "active" as "active" | "inactive",
  });

  const [attendanceModal, setAttendanceModal] = useState<AttendanceModalState>(null);
  const [attendanceForm, setAttendanceForm] = useState({
    employeeId: "",
    checkIn: "",
    checkOut: "",
    status: "On Time",
    notes: "",
  });

  const [shiftModal, setShiftModal] = useState<ShiftModalState>(null);
  const [shiftForm, setShiftForm] = useState({
    name: "",
    startTime: "08:00",
    endTime: "16:00",
    staffCount: 0,
    status: "active" as "active" | "inactive",
  });

  const [payrollModal, setPayrollModal] = useState<PayrollModalState>(null);
  const [payrollForm, setPayrollForm] = useState({
    employeeId: "",
    type: "salary" as "salary" | "advance" | "bonus" | "deduction",
    amount: 0,
    date: todayISO(),
    note: "",
  });

  const [leaveModal, setLeaveModal] = useState<LeaveModalState>(null);
  const [leaveForm, setLeaveForm] = useState({
    employeeId: "",
    from: todayISO(),
    to: todayISO(),
    status: "pending" as "pending" | "approved" | "rejected",
    reason: "",
  });
  const [selectedUserShiftEmployeeId, setSelectedUserShiftEmployeeId] = useState<string | null>(null);

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

  const fetchHrData = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const payload = await apiRequest<HrPayload>("/api/hr/bootstrap");
        setData(payload);
      } catch (error) {
        handleError(error, "تعذر تحميل بيانات الموارد البشرية");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [handleError]
  );

  useEffect(() => {
    void fetchHrData(true);
  }, [fetchHrData]);

  const employeeOptions = data?.employees || [];

  const filteredEmployees = useMemo(() => {
    const rows = data?.employees || [];
    const q = searchEmployees.trim().toLowerCase();

    return rows.filter((employee) => {
      const matchesSearch =
        !q || employee.name.toLowerCase().includes(q) || employee.role.toLowerCase().includes(q);
      const matchesStatus = !employeeStatusFilter || employee.status === employeeStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data?.employees, employeeStatusFilter, searchEmployees]);

  const filteredAttendance = useMemo(() => {
    const rows = data?.attendance || [];
    const q = searchAttendance.trim().toLowerCase();

    return rows.filter((record) => {
      const matchesSearch =
        !q || record.employee.toLowerCase().includes(q) || record.status.toLowerCase().includes(q);
      const matchesStatus = !attendanceStatusFilter || record.status === attendanceStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [attendanceStatusFilter, data?.attendance, searchAttendance]);

  const filteredShifts = useMemo(() => {
    const rows = data?.shifts || [];
    const q = searchShifts.trim().toLowerCase();

    return rows.filter((shift) => {
      const matchesSearch = !q || shift.name.toLowerCase().includes(q) || shift.time.toLowerCase().includes(q);
      const matchesStatus = !shiftStatusFilter || shift.status === shiftStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data?.shifts, searchShifts, shiftStatusFilter]);

  const filteredPayroll = useMemo(() => {
    const rows = data?.payroll || [];
    const q = searchPayroll.trim().toLowerCase();

    return rows.filter((item) => {
      const matchesSearch =
        !q || item.employee.toLowerCase().includes(q) || statusLabel(item.type).toLowerCase().includes(q);
      const matchesType = !payrollTypeFilter || item.type === payrollTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [data?.payroll, payrollTypeFilter, searchPayroll]);

  const filteredLeaves = useMemo(() => {
    const rows = data?.leaves || [];
    const q = searchLeaves.trim().toLowerCase();

    return rows.filter((leave) => {
      const matchesSearch =
        !q || leave.employee.toLowerCase().includes(q) || statusLabel(leave.status).toLowerCase().includes(q);
      const matchesStatus = !leaveStatusFilter || leave.status === leaveStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data?.leaves, leaveStatusFilter, searchLeaves]);

  const filteredUserEmployees = useMemo(() => {
    const rows = data?.userEmployees || [];
    const q = searchUserShifts.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        row.employeeName.toLowerCase().includes(q) ||
        row.userName.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q);
      const matchesStatus = !userShiftStatusFilter || row.userStatus === userShiftStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data?.userEmployees, searchUserShifts, userShiftStatusFilter]);

  const selectedEmployee = employeeModal?.id
    ? data?.employees.find((item) => item.id === employeeModal.id) || null
    : null;
  const selectedAttendance = attendanceModal?.id
    ? data?.attendance.find((item) => item.id === attendanceModal.id) || null
    : null;
  const selectedShift = shiftModal?.id
    ? data?.shifts.find((item) => item.id === shiftModal.id) || null
    : null;
  const selectedPayroll = payrollModal?.id
    ? data?.payroll.find((item) => item.id === payrollModal.id) || null
    : null;
  const selectedLeave = leaveModal?.id
    ? data?.leaves.find((item) => item.id === leaveModal.id) || null
    : null;
  const selectedUserEmployeeShift = selectedUserShiftEmployeeId
    ? data?.userEmployees.find((item) => item.employeeId === selectedUserShiftEmployeeId) || null
    : null;

  const openEmployeeModal = (mode: "view" | "edit" | "create", id?: string) => {
    if (mode === "create") {
      setEmployeeForm({ name: "", role: "", phone: "", status: "active" });
      setEmployeeModal({ mode: "create" });
      return;
    }

    const employee = data?.employees.find((item) => item.id === id);
    if (!employee) return;

    setEmployeeForm({
      name: employee.name,
      role: employee.role,
      phone: employee.phone,
      status: employee.status,
    });
    setEmployeeModal({ mode, id: employee.id });
  };

  const openAttendanceModal = (mode: "view" | "edit" | "create", id?: string) => {
    if (mode === "create") {
      setAttendanceForm({
        employeeId: employeeOptions[0]?.id || "",
        checkIn: datetimeLocalValue(new Date().toISOString()),
        checkOut: "",
        status: "On Time",
        notes: "",
      });
      setAttendanceModal({ mode: "create" });
      return;
    }

    const attendance = data?.attendance.find((item) => item.id === id);
    if (!attendance) return;

    setAttendanceForm({
      employeeId: attendance.employeeId,
      checkIn: datetimeLocalValue(attendance.checkIn),
      checkOut: datetimeLocalValue(attendance.checkOut),
      status: attendance.status,
      notes: attendance.notes || "",
    });
    setAttendanceModal({ mode, id: attendance.id });
  };

  const openShiftModal = (mode: "view" | "edit" | "create", id?: string) => {
    if (mode === "create") {
      setShiftForm({ name: "", startTime: "08:00", endTime: "16:00", staffCount: 0, status: "active" });
      setShiftModal({ mode: "create" });
      return;
    }

    const shift = data?.shifts.find((item) => item.id === id);
    if (!shift) return;

    setShiftForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      staffCount: shift.staffCount,
      status: shift.status,
    });
    setShiftModal({ mode, id: shift.id });
  };

  const openPayrollModal = (mode: "view" | "edit" | "create", id?: string) => {
    if (mode === "create") {
      setPayrollForm({
        employeeId: employeeOptions[0]?.id || "",
        type: "salary",
        amount: 0,
        date: todayISO(),
        note: "",
      });
      setPayrollModal({ mode: "create" });
      return;
    }

    const payroll = data?.payroll.find((item) => item.id === id);
    if (!payroll) return;

    setPayrollForm({
      employeeId: payroll.employeeId,
      type: payroll.type,
      amount: payroll.amount,
      date: payroll.date,
      note: payroll.note || "",
    });
    setPayrollModal({ mode, id: payroll.id });
  };

  const openLeaveModal = (mode: "view" | "edit" | "create", id?: string) => {
    if (mode === "create") {
      setLeaveForm({
        employeeId: employeeOptions[0]?.id || "",
        from: todayISO(),
        to: todayISO(),
        status: "pending",
        reason: "",
      });
      setLeaveModal({ mode: "create" });
      return;
    }

    const leave = data?.leaves.find((item) => item.id === id);
    if (!leave) return;

    setLeaveForm({
      employeeId: leave.employeeId,
      from: leave.from,
      to: leave.to,
      status: leave.status,
      reason: leave.reason || "",
    });
    setLeaveModal({ mode, id: leave.id });
  };

  const submitEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!employeeModal) return;

    setSubmitting(true);
    try {
      const payload = {
        name: employeeForm.name,
        role: employeeForm.role,
        phone: employeeForm.phone || null,
        status: employeeForm.status,
      };

      if (employeeModal.mode === "create") {
        await apiRequest<{ employee: EmployeeRow }>("/api/hr/employees", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        pushToast("تمت إضافة موظف", "success");
      } else if (employeeModal.mode === "edit" && employeeModal.id) {
        await apiRequest<{ employee: EmployeeRow }>(`/api/hr/employees/${employeeModal.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        pushToast("تم تحديث بيانات الموظف", "success");
      }

      setEmployeeModal(null);
      await fetchHrData();
    } catch (error) {
      handleError(error, "تعذر حفظ بيانات الموظف");
    } finally {
      setSubmitting(false);
    }
  };

  const submitAttendance = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!attendanceModal) return;

    setSubmitting(true);
    try {
      const payload = {
        employeeId: attendanceForm.employeeId,
        checkIn: attendanceForm.checkIn,
        checkOut: attendanceForm.checkOut || null,
        status: attendanceForm.status,
        notes: attendanceForm.notes || null,
      };

      if (attendanceModal.mode === "create") {
        await apiRequest<{ attendance: AttendanceRow }>("/api/hr/attendance", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        pushToast("تم تسجيل الحضور", "success");
      } else if (attendanceModal.mode === "edit" && attendanceModal.id) {
        await apiRequest<{ attendance: AttendanceRow }>(`/api/hr/attendance/${attendanceModal.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        pushToast("تم تحديث سجل الحضور", "success");
      }

      setAttendanceModal(null);
      await fetchHrData();
    } catch (error) {
      handleError(error, "تعذر حفظ سجل الحضور");
    } finally {
      setSubmitting(false);
    }
  };

  const submitShift = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shiftModal) return;

    setSubmitting(true);
    try {
      const payload = {
        name: shiftForm.name,
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        staffCount: shiftForm.staffCount,
        status: shiftForm.status,
      };

      if (shiftModal.mode === "create") {
        await apiRequest<{ shift: ShiftRow }>("/api/hr/shifts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        pushToast("تمت إضافة الشيفت", "success");
      } else if (shiftModal.mode === "edit" && shiftModal.id) {
        await apiRequest<{ shift: ShiftRow }>(`/api/hr/shifts/${shiftModal.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        pushToast("تم تحديث بيانات الشيفت", "success");
      }

      setShiftModal(null);
      await fetchHrData();
    } catch (error) {
      handleError(error, "تعذر حفظ بيانات الشيفت");
    } finally {
      setSubmitting(false);
    }
  };

  const submitPayroll = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!payrollModal) return;

    setSubmitting(true);
    try {
      const payload = {
        employeeId: payrollForm.employeeId,
        type: payrollForm.type,
        amount: payrollForm.amount,
        date: payrollForm.date,
        note: payrollForm.note || null,
      };

      if (payrollModal.mode === "create") {
        await apiRequest<{ payroll: PayrollRow }>("/api/hr/payroll", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        pushToast("تمت إضافة بند مرتبات", "success");
      } else if (payrollModal.mode === "edit" && payrollModal.id) {
        await apiRequest<{ payroll: PayrollRow }>(`/api/hr/payroll/${payrollModal.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        pushToast("تم تحديث بند المرتبات", "success");
      }

      setPayrollModal(null);
      await fetchHrData();
    } catch (error) {
      handleError(error, "تعذر حفظ بند المرتبات");
    } finally {
      setSubmitting(false);
    }
  };

  const submitLeave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!leaveModal) return;

    setSubmitting(true);
    try {
      const payload = {
        employeeId: leaveForm.employeeId,
        from: leaveForm.from,
        to: leaveForm.to,
        status: leaveForm.status,
        reason: leaveForm.reason || null,
      };

      if (leaveModal.mode === "create") {
        await apiRequest<{ leave: LeaveRow }>("/api/hr/leaves", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        pushToast("تم تسجيل طلب الإجازة", "success");
      } else if (leaveModal.mode === "edit" && leaveModal.id) {
        await apiRequest<{ leave: LeaveRow }>(`/api/hr/leaves/${leaveModal.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        pushToast("تم تحديث طلب الإجازة", "success");
      }

      setLeaveModal(null);
      await fetchHrData();
    } catch (error) {
      handleError(error, "تعذر حفظ طلب الإجازة");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteEmployee = async (employeeId: string) => {
    try {
      await apiRequest<{ deleted: boolean }>(`/api/hr/employees/${employeeId}`, { method: "DELETE" });
      await fetchHrData();
    } catch (error) {
      handleError(error, "تعذر حذف الموظف");
      throw error;
    }
  };

  const deleteAttendance = async (attendanceId: string) => {
    try {
      await apiRequest<{ deleted: boolean }>(`/api/hr/attendance/${attendanceId}`, { method: "DELETE" });
      await fetchHrData();
    } catch (error) {
      handleError(error, "تعذر حذف سجل الحضور");
      throw error;
    }
  };

  const deleteShift = async (shiftId: string) => {
    try {
      await apiRequest<{ deleted: boolean }>(`/api/hr/shifts/${shiftId}`, { method: "DELETE" });
      await fetchHrData();
    } catch (error) {
      handleError(error, "تعذر حذف الشيفت");
      throw error;
    }
  };

  const deletePayroll = async (payrollId: string) => {
    try {
      await apiRequest<{ deleted: boolean }>(`/api/hr/payroll/${payrollId}`, { method: "DELETE" });
      await fetchHrData();
    } catch (error) {
      handleError(error, "تعذر حذف بند المرتبات");
      throw error;
    }
  };

  const deleteLeave = async (leaveId: string) => {
    try {
      await apiRequest<{ deleted: boolean }>(`/api/hr/leaves/${leaveId}`, { method: "DELETE" });
      await fetchHrData();
    } catch (error) {
      handleError(error, "تعذر حذف طلب الإجازة");
      throw error;
    }
  };

  if (loading && !data) {
    return (
      <section className="page active">
        <div className="card wide">
          <p className="hint">جارٍ تحميل بيانات الموارد البشرية...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page active">
      <div className="subtabs">
        <button className={`subtab ${activeTab === "employees" ? "active" : ""}`} onClick={() => setActiveTab("employees")} type="button">
          <i className="bx bx-user"></i>
          إدارة الموظفين
        </button>
        <button className={`subtab ${activeTab === "attendance" ? "active" : ""}`} onClick={() => setActiveTab("attendance")} type="button">
          <i className="bx bx-time"></i>
          حضور وانصراف
        </button>
        <button className={`subtab ${activeTab === "shifts" ? "active" : ""}`} onClick={() => setActiveTab("shifts")} type="button">
          <i className="bx bx-calendar"></i>
          جدول الشيفتات
        </button>
        <button className={`subtab ${activeTab === "payroll" ? "active" : ""}`} onClick={() => setActiveTab("payroll")} type="button">
          <i className="bx bx-wallet"></i>
          كشوف المرتبات والسلف
        </button>
        <button className={`subtab ${activeTab === "leaves" ? "active" : ""}`} onClick={() => setActiveTab("leaves")} type="button">
          <i className="bx bx-coffee"></i>
          الإجازات
        </button>
        <button className={`subtab ${activeTab === "userShifts" ? "active" : ""}`} onClick={() => setActiveTab("userShifts")} type="button">
          <i className="bx bx-id-card"></i>
          مستخدمو النظام والورديات
        </button>
      </div>

      {activeTab === "employees" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>الموظفون</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في الموظفين..."
                    value={searchEmployees}
                    onChange={(event) => setSearchEmployees(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={employeeStatusFilter}
                  onChange={(event) => setEmployeeStatusFilter(event.target.value)}
                >
                  <option value="">كل الحالات</option>
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
                <button className="primary" type="button" onClick={() => openEmployeeModal("create") }>
                  <i className="bx bx-plus"></i>
                  إضافة موظف
                </button>
                <TableDataActions
                  rows={filteredEmployees}
                  columns={[
                    { label: "الاسم", value: (row) => row.name },
                    { label: "الدور", value: (row) => row.role },
                    { label: "الهاتف", value: (row) => row.phone || "—" },
                    { label: "الحالة", value: (row) => statusLabel(row.status) },
                  ]}
                  fileName="hr-employees"
                  printTitle="الموظفون"
                  tableId="hr-employees-table"
                />
              </div>
            </div>
            <table id="hr-employees-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الدور</th>
                  <th>الهاتف</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee) => (
                    <tr key={employee.id} data-status={employee.status}>
                      <td>{employee.name}</td>
                      <td>{employee.role}</td>
                      <td>{employee.phone || "—"}</td>
                      <td>
                        <span className={`badge ${employee.status === "active" ? "ok" : "neutral"}`}>
                          {statusLabel(employee.status)}
                        </span>
                      </td>
                      <td>
                        <RowActions
                          onView={() => openEmployeeModal("view", employee.id)}
                          onEdit={() => openEmployeeModal("edit", employee.id)}
                          onDelete={() => deleteEmployee(employee.id)}
                          deleteMessage="تم حذف الموظف"
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

      {activeTab === "attendance" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>الحضور والانصراف</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في الحضور..."
                    value={searchAttendance}
                    onChange={(event) => setSearchAttendance(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={attendanceStatusFilter}
                  onChange={(event) => setAttendanceStatusFilter(event.target.value)}
                >
                  <option value="">كل الحالات</option>
                  {[...new Set((data?.attendance || []).map((record) => record.status))].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button className="primary" type="button" onClick={() => openAttendanceModal("create") }>
                  <i className="bx bx-plus"></i>
                  تسجيل حضور
                </button>
                <TableDataActions
                  rows={filteredAttendance}
                  columns={[
                    { label: "الموظف", value: (row) => row.employee },
                    { label: "الدخول", value: (row) => formatDateTime(row.checkIn) },
                    { label: "الخروج", value: (row) => formatDateTime(row.checkOut) },
                    { label: "الحالة", value: (row) => row.status },
                  ]}
                  fileName="hr-attendance"
                  printTitle="الحضور والانصراف"
                  tableId="hr-attendance-table"
                />
              </div>
            </div>
            <table id="hr-attendance-table">
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>الدخول</th>
                  <th>الخروج</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={5}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredAttendance.map((att) => (
                    <tr key={att.id}>
                      <td>{att.employee}</td>
                      <td>{formatDateTime(att.checkIn)}</td>
                      <td>{formatDateTime(att.checkOut)}</td>
                      <td>
                        <span className="badge neutral">{att.status}</span>
                      </td>
                      <td>
                        <RowActions
                          onView={() => openAttendanceModal("view", att.id)}
                          onEdit={() => openAttendanceModal("edit", att.id)}
                          onDelete={() => deleteAttendance(att.id)}
                          deleteMessage="تم حذف سجل الحضور"
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

      {activeTab === "shifts" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>جدول الشيفتات</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في الشيفتات..."
                    value={searchShifts}
                    onChange={(event) => setSearchShifts(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={shiftStatusFilter}
                  onChange={(event) => setShiftStatusFilter(event.target.value)}
                >
                  <option value="">كل الحالات</option>
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
                <button className="primary" type="button" onClick={() => openShiftModal("create") }>
                  <i className="bx bx-plus"></i>
                  إضافة شيفت
                </button>
                <TableDataActions
                  rows={filteredShifts}
                  columns={[
                    { label: "الشيفت", value: (row) => row.name },
                    { label: "الوقت", value: (row) => row.time },
                    { label: "عدد الموظفين", value: (row) => row.staffCount },
                    { label: "الحالة", value: (row) => statusLabel(row.status) },
                  ]}
                  fileName="hr-shifts"
                  printTitle="جدول الشيفتات"
                  tableId="hr-shifts-table"
                />
              </div>
            </div>
            <table id="hr-shifts-table">
              <thead>
                <tr>
                  <th>الشيفت</th>
                  <th>الوقت</th>
                  <th>الموظفون</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredShifts.length === 0 ? (
                  <tr>
                    <td colSpan={5}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredShifts.map((shift) => (
                    <tr key={shift.id} data-status={shift.status}>
                      <td>{shift.name}</td>
                      <td>{shift.time}</td>
                      <td>{shift.staffCount}</td>
                      <td>
                        <span className={`badge ${shift.status === "active" ? "ok" : "neutral"}`}>
                          {statusLabel(shift.status)}
                        </span>
                      </td>
                      <td>
                        <RowActions
                          onView={() => openShiftModal("view", shift.id)}
                          onEdit={() => openShiftModal("edit", shift.id)}
                          onDelete={() => deleteShift(shift.id)}
                          deleteMessage="تم حذف الشيفت"
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

      {activeTab === "payroll" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>كشوف المرتبات والسلف</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في كشوف المرتبات..."
                    value={searchPayroll}
                    onChange={(event) => setSearchPayroll(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={payrollTypeFilter}
                  onChange={(event) => setPayrollTypeFilter(event.target.value)}
                >
                  <option value="">كل البنود</option>
                  <option value="salary">راتب</option>
                  <option value="advance">سلفة</option>
                  <option value="bonus">حافز</option>
                  <option value="deduction">خصم</option>
                </select>
                <button className="primary" type="button" onClick={() => openPayrollModal("create") }>
                  <i className="bx bx-plus"></i>
                  إضافة راتب/سلفة
                </button>
                <TableDataActions
                  rows={filteredPayroll}
                  columns={[
                    { label: "الموظف", value: (row) => row.employee },
                    { label: "البند", value: (row) => statusLabel(row.type) },
                    { label: "القيمة", value: (row) => row.amount },
                    { label: "التاريخ", value: (row) => row.date },
                  ]}
                  fileName="hr-payroll"
                  printTitle="كشوف المرتبات والسلف"
                  tableId="hr-payroll-table"
                />
              </div>
            </div>
            <table id="hr-payroll-table">
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>البند</th>
                  <th>القيمة</th>
                  <th>التاريخ</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayroll.length === 0 ? (
                  <tr>
                    <td colSpan={5}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredPayroll.map((item) => (
                    <tr key={item.id}>
                      <td>{item.employee}</td>
                      <td>{statusLabel(item.type)}</td>
                      <td>{money(item.amount)}</td>
                      <td>{item.date}</td>
                      <td>
                        <RowActions
                          onView={() => openPayrollModal("view", item.id)}
                          onEdit={() => openPayrollModal("edit", item.id)}
                          onDelete={() => deletePayroll(item.id)}
                          deleteMessage="تم حذف بند المرتبات"
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

      {activeTab === "leaves" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>الإجازات</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في الإجازات..."
                    value={searchLeaves}
                    onChange={(event) => setSearchLeaves(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={leaveStatusFilter}
                  onChange={(event) => setLeaveStatusFilter(event.target.value)}
                >
                  <option value="">كل الحالات</option>
                  <option value="pending">قيد المراجعة</option>
                  <option value="approved">مقبولة</option>
                  <option value="rejected">مرفوضة</option>
                </select>
                <button className="primary" type="button" onClick={() => openLeaveModal("create") }>
                  <i className="bx bx-plus"></i>
                  طلب إجازة
                </button>
                <TableDataActions
                  rows={filteredLeaves}
                  columns={[
                    { label: "الموظف", value: (row) => row.employee },
                    { label: "من", value: (row) => row.from },
                    { label: "إلى", value: (row) => row.to },
                    { label: "الحالة", value: (row) => statusLabel(row.status) },
                  ]}
                  fileName="hr-leaves"
                  printTitle="الإجازات"
                  tableId="hr-leaves-table"
                />
              </div>
            </div>
            <table id="hr-leaves-table">
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>من</th>
                  <th>إلى</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={5}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredLeaves.map((leave) => (
                    <tr key={leave.id}>
                      <td>{leave.employee}</td>
                      <td>{leave.from}</td>
                      <td>{leave.to}</td>
                      <td>
                        <span className={`badge ${leave.status === "approved" ? "ok" : leave.status === "rejected" ? "danger" : "warn"}`}>
                          {statusLabel(leave.status)}
                        </span>
                      </td>
                      <td>
                        <RowActions
                          onView={() => openLeaveModal("view", leave.id)}
                          onEdit={() => openLeaveModal("edit", leave.id)}
                          onDelete={() => deleteLeave(leave.id)}
                          deleteMessage="تم حذف طلب الإجازة"
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

      {activeTab === "userShifts" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>موظفو النظام وسجل الورديات</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث باسم الموظف أو البريد..."
                    value={searchUserShifts}
                    onChange={(event) => setSearchUserShifts(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={userShiftStatusFilter}
                  onChange={(event) => setUserShiftStatusFilter(event.target.value)}
                >
                  <option value="">كل الحالات</option>
                  <option value="ACTIVE">نشط</option>
                  <option value="INVITED">مدعو</option>
                  <option value="SUSPENDED">موقوف</option>
                </select>
                <TableDataActions
                  rows={filteredUserEmployees}
                  columns={[
                    { label: "الموظف", value: (row) => row.employeeName },
                    { label: "المستخدم", value: (row) => row.userName },
                    { label: "البريد", value: (row) => row.email },
                    { label: "الورديات", value: (row) => row.shiftsCount },
                    { label: "الدقائق", value: (row) => row.totalShiftMinutes },
                  ]}
                  fileName="hr-user-shifts"
                  printTitle="موظفو النظام وسجل الورديات"
                  tableId="hr-user-shifts-table"
                />
              </div>
            </div>
            <table id="hr-user-shifts-table">
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>المستخدم</th>
                  <th>الأدوار</th>
                  <th>حالة الحساب</th>
                  <th>عدد الورديات</th>
                  <th>إجمالي الدقائق</th>
                  <th>آخر وردية</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredUserEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredUserEmployees.map((row) => (
                    <tr key={row.employeeId}>
                      <td>{row.employeeName}</td>
                      <td>
                        {row.userName}
                        <br />
                        <small>{row.email}</small>
                      </td>
                      <td>{row.roles.join("، ") || "—"}</td>
                      <td>
                        <span className={`badge ${row.userStatus === "ACTIVE" ? "ok" : row.userStatus === "INVITED" ? "warn" : "danger"}`}>
                          {statusLabel(row.userStatus)}
                        </span>
                      </td>
                      <td>{row.shiftsCount}</td>
                      <td>{row.totalShiftMinutes}</td>
                      <td>{row.lastShiftStart ? formatDateTime(row.lastShiftStart) : "—"}</td>
                      <td>
                        <RowActions onView={() => setSelectedUserShiftEmployeeId(row.employeeId)} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InlineModal
        open={Boolean(employeeModal)}
        title={
          employeeModal?.mode === "create"
            ? "إضافة موظف"
            : employeeModal?.mode === "edit"
              ? "تعديل موظف"
              : "تفاصيل الموظف"
        }
        onClose={() => setEmployeeModal(null)}
      >
        {employeeModal?.mode === "view" && selectedEmployee ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>الاسم</span>
                <strong>{selectedEmployee.name}</strong>
              </div>
              <div className="row-line">
                <span>الدور</span>
                <strong>{selectedEmployee.role}</strong>
              </div>
              <div className="row-line">
                <span>الهاتف</span>
                <strong>{selectedEmployee.phone || "—"}</strong>
              </div>
              <div className="row-line">
                <span>الحالة</span>
                <strong>{statusLabel(selectedEmployee.status)}</strong>
              </div>
            </div>
          </div>
        ) : (
          <form className="form" onSubmit={submitEmployee}>
            <label>الاسم</label>
            <input type="text" value={employeeForm.name} onChange={(event) => setEmployeeForm((prev) => ({ ...prev, name: event.target.value }))} required />
            <label>الدور الوظيفي</label>
            <input type="text" value={employeeForm.role} onChange={(event) => setEmployeeForm((prev) => ({ ...prev, role: event.target.value }))} required />
            <label>الهاتف</label>
            <input type="text" value={employeeForm.phone} onChange={(event) => setEmployeeForm((prev) => ({ ...prev, phone: event.target.value }))} />
            <label>الحالة</label>
            <select
              value={employeeForm.status}
              onChange={(event) => setEmployeeForm((prev) => ({ ...prev, status: event.target.value as "active" | "inactive" }))}
            >
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </form>
        )}
      </InlineModal>

      <InlineModal
        open={Boolean(attendanceModal)}
        title={
          attendanceModal?.mode === "create"
            ? "تسجيل حضور"
            : attendanceModal?.mode === "edit"
              ? "تعديل حضور"
              : "تفاصيل الحضور"
        }
        onClose={() => setAttendanceModal(null)}
      >
        {attendanceModal?.mode === "view" && selectedAttendance ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>الموظف</span>
                <strong>{selectedAttendance.employee}</strong>
              </div>
              <div className="row-line">
                <span>الدخول</span>
                <strong>{formatDateTime(selectedAttendance.checkIn)}</strong>
              </div>
              <div className="row-line">
                <span>الخروج</span>
                <strong>{formatDateTime(selectedAttendance.checkOut)}</strong>
              </div>
              <div className="row-line">
                <span>الحالة</span>
                <strong>{selectedAttendance.status}</strong>
              </div>
              <div className="row-line">
                <span>ملاحظات</span>
                <strong>{selectedAttendance.notes || "—"}</strong>
              </div>
            </div>
          </div>
        ) : (
          <form className="form" onSubmit={submitAttendance}>
            <label>الموظف</label>
            <select
              value={attendanceForm.employeeId}
              onChange={(event) => setAttendanceForm((prev) => ({ ...prev, employeeId: event.target.value }))}
              required
            >
              {employeeOptions.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
            <label>وقت الدخول</label>
            <input
              type="datetime-local"
              value={attendanceForm.checkIn}
              onChange={(event) => setAttendanceForm((prev) => ({ ...prev, checkIn: event.target.value }))}
              required
            />
            <label>وقت الخروج</label>
            <input
              type="datetime-local"
              value={attendanceForm.checkOut}
              onChange={(event) => setAttendanceForm((prev) => ({ ...prev, checkOut: event.target.value }))}
            />
            <label>الحالة</label>
            <input
              type="text"
              value={attendanceForm.status}
              onChange={(event) => setAttendanceForm((prev) => ({ ...prev, status: event.target.value }))}
              required
            />
            <label>ملاحظات</label>
            <textarea rows={3} value={attendanceForm.notes} onChange={(event) => setAttendanceForm((prev) => ({ ...prev, notes: event.target.value }))} />
            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </form>
        )}
      </InlineModal>

      <InlineModal
        open={Boolean(shiftModal)}
        title={
          shiftModal?.mode === "create"
            ? "إضافة شيفت"
            : shiftModal?.mode === "edit"
              ? "تعديل شيفت"
              : "تفاصيل الشيفت"
        }
        onClose={() => setShiftModal(null)}
      >
        {shiftModal?.mode === "view" && selectedShift ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>الشيفت</span>
                <strong>{selectedShift.name}</strong>
              </div>
              <div className="row-line">
                <span>الوقت</span>
                <strong>{selectedShift.time}</strong>
              </div>
              <div className="row-line">
                <span>الموظفون</span>
                <strong>{selectedShift.staffCount}</strong>
              </div>
              <div className="row-line">
                <span>الحالة</span>
                <strong>{statusLabel(selectedShift.status)}</strong>
              </div>
            </div>
          </div>
        ) : (
          <form className="form" onSubmit={submitShift}>
            <label>اسم الشيفت</label>
            <input type="text" value={shiftForm.name} onChange={(event) => setShiftForm((prev) => ({ ...prev, name: event.target.value }))} required />
            <label>من</label>
            <input type="time" value={shiftForm.startTime} onChange={(event) => setShiftForm((prev) => ({ ...prev, startTime: event.target.value }))} required />
            <label>إلى</label>
            <input type="time" value={shiftForm.endTime} onChange={(event) => setShiftForm((prev) => ({ ...prev, endTime: event.target.value }))} required />
            <label>عدد الموظفين</label>
            <input type="number" min={0} value={shiftForm.staffCount} onChange={(event) => setShiftForm((prev) => ({ ...prev, staffCount: Number(event.target.value || 0) }))} required />
            <label>الحالة</label>
            <select
              value={shiftForm.status}
              onChange={(event) => setShiftForm((prev) => ({ ...prev, status: event.target.value as "active" | "inactive" }))}
            >
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </form>
        )}
      </InlineModal>

      <InlineModal
        open={Boolean(payrollModal)}
        title={
          payrollModal?.mode === "create"
            ? "إضافة راتب/سلفة"
            : payrollModal?.mode === "edit"
              ? "تعديل بند مرتبات"
              : "تفاصيل بند المرتبات"
        }
        onClose={() => setPayrollModal(null)}
      >
        {payrollModal?.mode === "view" && selectedPayroll ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>الموظف</span>
                <strong>{selectedPayroll.employee}</strong>
              </div>
              <div className="row-line">
                <span>البند</span>
                <strong>{statusLabel(selectedPayroll.type)}</strong>
              </div>
              <div className="row-line">
                <span>القيمة</span>
                <strong>{money(selectedPayroll.amount)}</strong>
              </div>
              <div className="row-line">
                <span>التاريخ</span>
                <strong>{selectedPayroll.date}</strong>
              </div>
              <div className="row-line">
                <span>ملاحظات</span>
                <strong>{selectedPayroll.note || "—"}</strong>
              </div>
            </div>
          </div>
        ) : (
          <form className="form" onSubmit={submitPayroll}>
            <label>الموظف</label>
            <select
              value={payrollForm.employeeId}
              onChange={(event) => setPayrollForm((prev) => ({ ...prev, employeeId: event.target.value }))}
              required
            >
              {employeeOptions.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
            <label>البند</label>
            <select
              value={payrollForm.type}
              onChange={(event) =>
                setPayrollForm((prev) => ({
                  ...prev,
                  type: event.target.value as "salary" | "advance" | "bonus" | "deduction",
                }))
              }
            >
              <option value="salary">راتب</option>
              <option value="advance">سلفة</option>
              <option value="bonus">حافز</option>
              <option value="deduction">خصم</option>
            </select>
            <label>القيمة</label>
            <input type="number" min={0} step="0.01" value={payrollForm.amount} onChange={(event) => setPayrollForm((prev) => ({ ...prev, amount: Number(event.target.value || 0) }))} required />
            <label>التاريخ</label>
            <input type="date" value={payrollForm.date} onChange={(event) => setPayrollForm((prev) => ({ ...prev, date: event.target.value }))} required />
            <label>ملاحظات</label>
            <textarea rows={3} value={payrollForm.note} onChange={(event) => setPayrollForm((prev) => ({ ...prev, note: event.target.value }))} />
            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </form>
        )}
      </InlineModal>

      <InlineModal
        open={Boolean(leaveModal)}
        title={
          leaveModal?.mode === "create"
            ? "طلب إجازة"
            : leaveModal?.mode === "edit"
              ? "تعديل طلب إجازة"
              : "تفاصيل الإجازة"
        }
        onClose={() => setLeaveModal(null)}
      >
        {leaveModal?.mode === "view" && selectedLeave ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>الموظف</span>
                <strong>{selectedLeave.employee}</strong>
              </div>
              <div className="row-line">
                <span>من</span>
                <strong>{selectedLeave.from}</strong>
              </div>
              <div className="row-line">
                <span>إلى</span>
                <strong>{selectedLeave.to}</strong>
              </div>
              <div className="row-line">
                <span>الحالة</span>
                <strong>{statusLabel(selectedLeave.status)}</strong>
              </div>
              <div className="row-line">
                <span>السبب</span>
                <strong>{selectedLeave.reason || "—"}</strong>
              </div>
            </div>
          </div>
        ) : (
          <form className="form" onSubmit={submitLeave}>
            <label>الموظف</label>
            <select
              value={leaveForm.employeeId}
              onChange={(event) => setLeaveForm((prev) => ({ ...prev, employeeId: event.target.value }))}
              required
            >
              {employeeOptions.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
            <label>من</label>
            <input type="date" value={leaveForm.from} onChange={(event) => setLeaveForm((prev) => ({ ...prev, from: event.target.value }))} required />
            <label>إلى</label>
            <input type="date" value={leaveForm.to} onChange={(event) => setLeaveForm((prev) => ({ ...prev, to: event.target.value }))} required />
            <label>الحالة</label>
            <select
              value={leaveForm.status}
              onChange={(event) => setLeaveForm((prev) => ({ ...prev, status: event.target.value as "pending" | "approved" | "rejected" }))}
            >
              <option value="pending">قيد المراجعة</option>
              <option value="approved">مقبولة</option>
              <option value="rejected">مرفوضة</option>
            </select>
            <label>السبب</label>
            <textarea rows={3} value={leaveForm.reason} onChange={(event) => setLeaveForm((prev) => ({ ...prev, reason: event.target.value }))} />
            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </form>
        )}
      </InlineModal>

      <InlineModal
        open={Boolean(selectedUserEmployeeShift)}
        title="تفاصيل موظف النظام والورديات"
        onClose={() => setSelectedUserShiftEmployeeId(null)}
      >
        {selectedUserEmployeeShift ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>الموظف</span>
                <strong>{selectedUserEmployeeShift.employeeName}</strong>
              </div>
              <div className="row-line">
                <span>حساب المستخدم</span>
                <strong>{selectedUserEmployeeShift.userName}</strong>
              </div>
              <div className="row-line">
                <span>البريد</span>
                <strong>{selectedUserEmployeeShift.email}</strong>
              </div>
              <div className="row-line">
                <span>الأدوار</span>
                <strong>{selectedUserEmployeeShift.roles.join("، ") || "—"}</strong>
              </div>
              <div className="row-line">
                <span>حالة الحساب</span>
                <strong>{statusLabel(selectedUserEmployeeShift.userStatus)}</strong>
              </div>
              <div className="row-line">
                <span>عدد الورديات</span>
                <strong>{selectedUserEmployeeShift.shiftsCount}</strong>
              </div>
              <div className="row-line">
                <span>إجمالي الدقائق</span>
                <strong>{selectedUserEmployeeShift.totalShiftMinutes}</strong>
              </div>
              <div className="row-line">
                <span>آخر وردية</span>
                <strong>
                  {selectedUserEmployeeShift.lastShiftStart
                    ? `${formatDateTime(selectedUserEmployeeShift.lastShiftStart)} (${selectedUserEmployeeShift.lastShiftMinutes} دقيقة)`
                    : "—"}
                </strong>
              </div>
            </div>
          </div>
        ) : null}
      </InlineModal>
    </section>
  );
}
