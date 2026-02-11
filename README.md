# Premium POS (Frontend + Backend Foundation)

This project now includes:

- Next.js frontend
- Prisma + PostgreSQL data layer
- Session-based authentication
- Role-based access control (RBAC)
- Invite-link onboarding flow for owner/admin created users

## 1) Environment

Copy the template and set real values:

```bash
cp .env.example .env
```

Important variables:

- `DATABASE_URL`
- `APP_URL`
- `SESSION_SECRET`
- `OWNER_EMAIL` / `OWNER_PASSWORD`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`

## 2) Database

Generate and migrate schema:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

> `db:seed` creates default permissions, roles, owner, and admin users.

## 3) Run

```bash
npm run dev
```

Open:

- Login: `http://localhost:3000/login`
- Invite acceptance: `http://localhost:3000/accept-invite?token=...`

## 4) Core Auth / RBAC APIs

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/auth/profile`
- `GET /api/auth/invite-details?token=...`
- `POST /api/auth/accept-invite`

### Admin (Protected by RBAC)

- `GET /api/admin/permissions`
- `GET /api/admin/roles`
- `POST /api/admin/roles`
- `PATCH /api/admin/roles/:roleId`
- `DELETE /api/admin/roles/:roleId`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:userId`
- `DELETE /api/admin/users/:userId` (soft-delete via suspension)
- `GET /api/admin/invites`
- `POST /api/admin/invites` (creates invite link)
- `POST /api/admin/invites/:inviteId/revoke`

### POS / Orders / Tables (Protected by RBAC)

- `GET /api/pos/bootstrap`
- `GET /api/orders`
- `POST /api/orders`
- `GET /api/orders/:orderId`
- `PATCH /api/orders/:orderId`
- `DELETE /api/orders/:orderId`
- `GET /api/tables`
- `POST /api/tables`
- `GET /api/tables/:tableId`
- `PATCH /api/tables/:tableId`
- `DELETE /api/tables/:tableId`

### Sales (Protected by RBAC)

- `GET /api/sales`
- `POST /api/sales`
- `GET /api/sales/:saleId`
- `PATCH /api/sales/:saleId`
- `DELETE /api/sales/:saleId`

### Inventory (Protected by RBAC)

- `GET /api/inventory/bootstrap`
- `GET /api/inventory/materials`
- `POST /api/inventory/materials`
- `GET /api/inventory/materials/:materialId`
- `PATCH /api/inventory/materials/:materialId`
- `DELETE /api/inventory/materials/:materialId`
- `GET /api/inventory/purchases`
- `POST /api/inventory/purchases`
- `GET /api/inventory/purchases/:purchaseId`
- `PATCH /api/inventory/purchases/:purchaseId`
- `DELETE /api/inventory/purchases/:purchaseId`
- `GET /api/inventory/waste`
- `POST /api/inventory/waste`
- `GET /api/inventory/waste/:wasteId`
- `PATCH /api/inventory/waste/:wasteId`
- `DELETE /api/inventory/waste/:wasteId`

### Products (Protected by RBAC)

- `GET /api/products/bootstrap`
- `GET /api/products`
- `POST /api/products`
- `GET /api/products/:productId`
- `PATCH /api/products/:productId`
- `DELETE /api/products/:productId`
- `GET /api/products/categories`
- `POST /api/products/categories`
- `GET /api/products/categories/:categoryId`
- `PATCH /api/products/categories/:categoryId`
- `DELETE /api/products/categories/:categoryId`

### Suppliers (Protected by RBAC)

- `GET /api/suppliers`
- `POST /api/suppliers`
- `GET /api/suppliers/:supplierId`
- `PATCH /api/suppliers/:supplierId`
- `DELETE /api/suppliers/:supplierId`

### Delivery (Protected by RBAC)

- `GET /api/delivery/bootstrap`
- `GET /api/delivery/zones`
- `POST /api/delivery/zones`
- `GET /api/delivery/zones/:zoneId`
- `PATCH /api/delivery/zones/:zoneId`
- `DELETE /api/delivery/zones/:zoneId`
- `GET /api/delivery/drivers`
- `POST /api/delivery/drivers`
- `GET /api/delivery/drivers/:driverId`
- `PATCH /api/delivery/drivers/:driverId`
- `DELETE /api/delivery/drivers/:driverId`

### Dashboard / Reports (Protected by RBAC)

- `GET /api/dashboard/overview`
- `GET /api/reports/bootstrap`

### Finance (Protected by RBAC)

- `GET /api/finance/bootstrap`
- `GET /api/finance/expenses`
- `POST /api/finance/expenses`
- `PATCH /api/finance/expenses/:expenseId`
- `DELETE /api/finance/expenses/:expenseId`

### HR (Protected by RBAC)

- `GET /api/hr/bootstrap`
- `GET /api/hr/employees`
- `POST /api/hr/employees`
- `PATCH /api/hr/employees/:employeeId`
- `DELETE /api/hr/employees/:employeeId`
- `GET /api/hr/attendance`
- `POST /api/hr/attendance`
- `PATCH /api/hr/attendance/:attendanceId`
- `DELETE /api/hr/attendance/:attendanceId`
- `GET /api/hr/shifts`
- `POST /api/hr/shifts`
- `PATCH /api/hr/shifts/:shiftId`
- `DELETE /api/hr/shifts/:shiftId`
- `GET /api/hr/payroll`
- `POST /api/hr/payroll`
- `PATCH /api/hr/payroll/:payrollId`
- `DELETE /api/hr/payroll/:payrollId`
- `GET /api/hr/leaves`
- `POST /api/hr/leaves`
- `PATCH /api/hr/leaves/:leaveId`
- `DELETE /api/hr/leaves/:leaveId`

### Backup (Protected by RBAC)

- `GET /api/backup/bootstrap`
- `POST /api/backup` (create backup snapshot)
- `POST /api/backup/import` (restore from uploaded snapshot)
- `GET /api/backup/:backupId`
- `DELETE /api/backup/:backupId`
- `POST /api/backup/:backupId/restore`
- `GET /api/backup/:backupId/download`

### System Reset (Protected by RBAC)

- `POST /api/system/reset` (requires `system:reset`)

### Shift Tracking (Authenticated User)

- `GET /api/shifts/me`
- `POST /api/shifts/me/start`
- `POST /api/shifts/me/pause`
- `POST /api/shifts/me/resume`
- `POST /api/shifts/me/stop`

## 5) Invite Flow (Owner/Admin)

1. Owner/Admin calls `POST /api/admin/invites` with:
   - `email`
   - `roleId`
2. API returns an `inviteLink`.
3. New user opens link, sets full name + password.
4. Account is activated and can log in with assigned email/password and role permissions.

## 6) Security Notes

- Password hashing: `argon2id`
- Session cookie: `httpOnly`, `sameSite=strict`, `secure` in production
- Session tokens stored hashed in DB
- API permission guards via `requireAuth`
- Login/invite acceptance rate limiting
- System roles protected from deletion
