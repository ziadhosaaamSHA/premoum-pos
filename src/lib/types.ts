export type Category = {
  id: string;
  name: string;
  description: string;
};

export type Material = {
  id: string;
  name: string;
  unit: string;
  cost: number;
  stock: number;
  minStock: number;
};

export type RecipeItem = {
  materialId: string;
  qty: number;
};

export type Product = {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  label: string;
  recipe: RecipeItem[];
};

export type Supplier = {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: "active" | "inactive";
};

export type Purchase = {
  id: string;
  date: string;
  supplier: string;
  total: number;
  status: "posted" | "draft" | "cancelled";
};

export type Waste = {
  id: string;
  date: string;
  material: string;
  qty: number;
  reason: string;
  cost: number;
};

export type Zone = {
  id: string;
  name: string;
  limit: number;
  fee: number;
  minOrder: number;
  status: "active" | "inactive";
};

export type Driver = {
  id: string;
  name: string;
  phone: string;
  status: string;
  activeOrders: number;
};

export type Expense = {
  id: string;
  date: string;
  title: string;
  vendor: string;
  amount: number;
};

export type Employee = {
  id: string;
  name: string;
  role: string;
  phone: string;
  status: "active" | "inactive";
  shiftLogs: ShiftLog[];
};

export type Attendance = {
  id: string;
  employee: string;
  checkIn: string;
  checkOut: string;
  status: string;
};

export type Shift = {
  id: string;
  name: string;
  time: string;
  staff: string;
  status: "active" | "inactive";
};

export type Payroll = {
  id: string;
  employee: string;
  item: string;
  amount: number;
  date: string;
};

export type Leave = {
  id: string;
  employee: string;
  from: string;
  to: string;
  status: string;
};

export type Role = {
  id: string;
  name: string;
  description: string;
  permissions: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
};

export type Table = {
  id: string;
  name: string;
  number: number;
  status: "empty" | "occupied";
  orderId: string | null;
};

export type Sale = {
  id: string;
  invoiceNo: string;
  date: string;
  customer: string;
  total: number;
  status: "paid" | "draft";
  items: string[];
};

export type ShiftPause = {
  start: string;
  end?: string;
};

export type ShiftLog = {
  id: string;
  employeeId: string;
  employeeName: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  pauses: ShiftPause[];
};

export type ActiveShift = {
  status: "idle" | "running" | "paused";
  employeeId: string | null;
  startedAt?: string;
  pauseStartedAt?: string;
  pauses: ShiftPause[];
};

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  employeeId: string | null;
};

export type OrderItem = {
  productId: string;
  qty: number;
};

export type Order = {
  id: string;
  type: "dine_in" | "takeaway" | "delivery";
  status: "preparing" | "ready" | "out" | "delivered" | "cancelled";
  customer: string;
  zoneId: string;
  driverId: string;
  tableId?: string;
  createdAt: string;
  items: OrderItem[];
  discount: number;
  payment: "cash" | "card" | "wallet" | "mixed";
};

export type CartItem = {
  productId: string;
  qty: number;
};

export type PosState = {
  category: string;
  search: string;
  orderType: "dine_in" | "takeaway" | "delivery";
  payment: "cash" | "card" | "wallet" | "mixed";
  zoneId: string;
  discount: number;
};

export type AppState = {
  categories: Category[];
  materials: Material[];
  products: Product[];
  suppliers: Supplier[];
  purchases: Purchase[];
  waste: Waste[];
  zones: Zone[];
  drivers: Driver[];
  expenses: Expense[];
  employees: Employee[];
  attendance: Attendance[];
  shifts: Shift[];
  payroll: Payroll[];
  leaves: Leave[];
  roles: Role[];
  users: User[];
  orders: Order[];
  cart: CartItem[];
  pos: PosState;
  tables: Table[];
  sales: Sale[];
  backups: Backup[];
  currentUser: CurrentUser;
  activeShift: ActiveShift;
};

export type Backup = {
  id: string;
  createdAt: string;
  note: string;
  size: number;
  data: Omit<AppState, "backups">;
};
