import { EmployeeStatus, LeaveStatus, PayrollType, ShiftStatus } from "@prisma/client";

const employeeStatusToUi: Record<EmployeeStatus, "active" | "inactive"> = {
  [EmployeeStatus.ACTIVE]: "active",
  [EmployeeStatus.INACTIVE]: "inactive",
};

const employeeStatusFromUi: Record<"active" | "inactive", EmployeeStatus> = {
  active: EmployeeStatus.ACTIVE,
  inactive: EmployeeStatus.INACTIVE,
};

const shiftStatusToUi: Record<ShiftStatus, "active" | "inactive"> = {
  [ShiftStatus.ACTIVE]: "active",
  [ShiftStatus.INACTIVE]: "inactive",
};

const shiftStatusFromUi: Record<"active" | "inactive", ShiftStatus> = {
  active: ShiftStatus.ACTIVE,
  inactive: ShiftStatus.INACTIVE,
};

const leaveStatusToUi: Record<LeaveStatus, "pending" | "approved" | "rejected"> = {
  [LeaveStatus.PENDING]: "pending",
  [LeaveStatus.APPROVED]: "approved",
  [LeaveStatus.REJECTED]: "rejected",
};

const leaveStatusFromUi: Record<"pending" | "approved" | "rejected", LeaveStatus> = {
  pending: LeaveStatus.PENDING,
  approved: LeaveStatus.APPROVED,
  rejected: LeaveStatus.REJECTED,
};

const payrollTypeToUi: Record<PayrollType, "salary" | "advance" | "bonus" | "deduction"> = {
  [PayrollType.SALARY]: "salary",
  [PayrollType.ADVANCE]: "advance",
  [PayrollType.BONUS]: "bonus",
  [PayrollType.DEDUCTION]: "deduction",
};

const payrollTypeFromUi: Record<"salary" | "advance" | "bonus" | "deduction", PayrollType> = {
  salary: PayrollType.SALARY,
  advance: PayrollType.ADVANCE,
  bonus: PayrollType.BONUS,
  deduction: PayrollType.DEDUCTION,
};

export function fromEmployeeStatus(value: EmployeeStatus) {
  return employeeStatusToUi[value];
}

export function toEmployeeStatus(value: "active" | "inactive") {
  return employeeStatusFromUi[value];
}

export function fromShiftStatus(value: ShiftStatus) {
  return shiftStatusToUi[value];
}

export function toShiftStatus(value: "active" | "inactive") {
  return shiftStatusFromUi[value];
}

export function fromLeaveStatus(value: LeaveStatus) {
  return leaveStatusToUi[value];
}

export function toLeaveStatus(value: "pending" | "approved" | "rejected") {
  return leaveStatusFromUi[value];
}

export function fromPayrollType(value: PayrollType) {
  return payrollTypeToUi[value];
}

export function toPayrollType(value: "salary" | "advance" | "bonus" | "deduction") {
  return payrollTypeFromUi[value];
}

type EmployeeRow = {
  id: string;
  name: string;
  roleTitle: string;
  phone: string | null;
  status: EmployeeStatus;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function mapEmployee(row: EmployeeRow) {
  return {
    id: row.id,
    name: row.name,
    role: row.roleTitle,
    phone: row.phone || "",
    status: fromEmployeeStatus(row.status),
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type AttendanceRow = {
  id: string;
  employeeId: string;
  checkIn: Date;
  checkOut: Date | null;
  status: string;
  notes: string | null;
  employee: {
    name: string;
  };
};

export function mapAttendance(row: AttendanceRow) {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employee: row.employee.name,
    checkIn: row.checkIn.toISOString(),
    checkOut: row.checkOut ? row.checkOut.toISOString() : "",
    status: row.status,
    notes: row.notes,
  };
}

type ShiftTemplateRow = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  staffCount: number | null;
  status: ShiftStatus;
  createdAt: Date;
  updatedAt: Date;
};

export function mapShiftTemplate(row: ShiftTemplateRow) {
  return {
    id: row.id,
    name: row.name,
    startTime: row.startTime,
    endTime: row.endTime,
    time: `${row.startTime} - ${row.endTime}`,
    staffCount: row.staffCount || 0,
    staff: String(row.staffCount || 0),
    status: fromShiftStatus(row.status),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type PayrollRow = {
  id: string;
  employeeId: string;
  type: PayrollType;
  amount: unknown;
  date: Date;
  note: string | null;
  employee: {
    name: string;
  };
};

export function mapPayroll(row: PayrollRow) {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employee: row.employee.name,
    type: fromPayrollType(row.type),
    item: fromPayrollType(row.type),
    amount: Number(row.amount),
    date: row.date.toISOString().slice(0, 10),
    note: row.note,
  };
}

type LeaveRow = {
  id: string;
  employeeId: string;
  fromDate: Date;
  toDate: Date;
  status: LeaveStatus;
  reason: string | null;
  employee: {
    name: string;
  };
};

export function mapLeave(row: LeaveRow) {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employee: row.employee.name,
    from: row.fromDate.toISOString().slice(0, 10),
    to: row.toDate.toISOString().slice(0, 10),
    status: fromLeaveStatus(row.status),
    reason: row.reason,
  };
}

export function parseUiDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function normalizeTime(value: string) {
  const result = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!result) return null;
  return `${result[1]}:${result[2]}`;
}
