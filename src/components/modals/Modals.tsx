"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useModal } from "@/context/ModalContext";
import { useAppState } from "@/context/AppStateContext";
import { useToast } from "@/context/ToastContext";
import Modal from "@/components/modals/Modal";

export default function Modals() {
  const router = useRouter();
  const { openModal, closeModal } = useModal();
  const { state } = useAppState();
  const { pushToast } = useToast();
  const [viewFilter, setViewFilter] = useState("");
  const [viewGroupFilter, setViewGroupFilter] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    pushToast("تم الحفظ بنجاح (تجريبي)", "success");
    closeModal();
  };

  return (
    <>
      <Modal id="modalQuickAction" title="إجراء سريع">
        <p className="hint modal-hint">اختر الإجراء المطلوب لإضافة بيانات جديدة بسرعة.</p>
        <div className="list">
          <button
            className="nav-item"
            type="button"
            onClick={() => {
              router.push("/pos");
              closeModal();
            }}
          >
            <i className="bx bx-cart-alt"></i>
            فتح شاشة الكاشير
          </button>
          <button
            className="nav-item"
            type="button"
            onClick={() => {
              openModal("modalProduct");
            }}
          >
            <i className="bx bx-package"></i>
            إضافة منتج جديد
          </button>
          <button
            className="nav-item"
            type="button"
            onClick={() => {
              openModal("modalExpense");
            }}
          >
            <i className="bx bx-receipt"></i>
            تسجيل مصروف
          </button>
          <button
            className="nav-item"
            type="button"
            onClick={() => {
              openModal("modalEmployee");
            }}
          >
            <i className="bx bx-user"></i>
            إضافة موظف
          </button>
        </div>
      </Modal>

      <Modal id="modalProduct" title="إضافة منتج">
        <form className="form" onSubmit={handleSubmit}>
          <label>اسم المنتج</label>
          <input type="text" name="name" required />
          <label>الفئة</label>
          <select name="category">
            <option>العصائر</option>
            <option>مشروبات ساخنة</option>
            <option>ساندوتشات</option>
          </select>
          <label>سعر البيع</label>
          <input type="number" name="price" required />
          <label>وصف مختصر</label>
          <input type="text" name="description" />
          <label>صورة المنتج</label>
          <input type="file" name="image" />
          <button className="primary" type="submit">
            حفظ المنتج
          </button>
        </form>
      </Modal>

      <Modal id="modalCategory" title="إضافة فئة">
        <form className="form" onSubmit={handleSubmit}>
          <label>اسم الفئة</label>
          <input type="text" name="name" required />
          <label>وصف</label>
          <input type="text" name="description" />
          <button className="primary" type="submit">
            حفظ الفئة
          </button>
        </form>
      </Modal>

      <Modal id="modalRecipe" title="إضافة وصفة">
        <form className="form" onSubmit={handleSubmit}>
          <label>المنتج</label>
          <select name="product">
            <option>عصير برتقال</option>
            <option>لاتيه</option>
            <option>ساندوتش دجاج</option>
          </select>
          <label>المكونات</label>
          <textarea name="ingredients" rows={4} placeholder="مثال: برتقال 0.3 كجم, سكر 0.02 كجم"></textarea>
          <label>ملاحظات</label>
          <input type="text" name="notes" />
          <button className="primary" type="submit">
            حفظ الوصفة
          </button>
        </form>
      </Modal>

      <Modal id="modalMaterial" title="إضافة مادة خام">
        <form className="form" onSubmit={handleSubmit}>
          <label>اسم المادة</label>
          <input type="text" name="name" required />
          <label>الوحدة</label>
          <input type="text" name="unit" required />
          <label>تكلفة الوحدة</label>
          <input type="number" name="cost" required />
          <label>الحد الأدنى</label>
          <input type="number" name="min" />
          <button className="primary" type="submit">
            حفظ المادة
          </button>
        </form>
      </Modal>

      <Modal id="modalPurchase" title="إضافة مشتريات">
        <form className="form" onSubmit={handleSubmit}>
          <label>المورد</label>
          <select name="supplier">
            <option>مورد الفاكهة</option>
            <option>مورد التعبئة</option>
          </select>
          <label>المادة</label>
          <input type="text" name="item" required />
          <label>الكمية</label>
          <input type="number" name="qty" required />
          <label>إجمالي التكلفة</label>
          <input type="number" name="total" required />
          <button className="primary" type="submit">
            حفظ المشتريات
          </button>
        </form>
      </Modal>

      <Modal id="modalWaste" title="تسجيل هدر">
        <form className="form" onSubmit={handleSubmit}>
          <label>المادة</label>
          <input type="text" name="item" required />
          <label>الكمية</label>
          <input type="number" name="qty" required />
          <label>السبب</label>
          <input type="text" name="reason" />
          <button className="primary" type="submit">
            حفظ الهدر
          </button>
        </form>
      </Modal>

      <Modal id="modalSupplier" title="إضافة مورد">
        <form className="form" onSubmit={handleSubmit}>
          <label>اسم المورد</label>
          <input type="text" name="name" required />
          <label>الهاتف</label>
          <input type="text" name="phone" />
          <label>البريد الإلكتروني</label>
          <input type="email" name="email" />
          <button className="primary" type="submit">
            حفظ المورد
          </button>
        </form>
      </Modal>

      <Modal id="modalExpense" title="إضافة مصروف">
        <form className="form" onSubmit={handleSubmit}>
          <label>البند</label>
          <input type="text" name="title" required />
          <label>الجهة</label>
          <input type="text" name="vendor" />
          <label>القيمة</label>
          <input type="number" name="amount" required />
          <button className="primary" type="submit">
            حفظ المصروف
          </button>
        </form>
      </Modal>

      <Modal id="modalZone" title="إضافة نطاق توصيل">
        <form className="form" onSubmit={handleSubmit}>
          <label>اسم النطاق</label>
          <input type="text" name="name" required />
          <label>الحد الأقصى (كم)</label>
          <input type="number" name="limit" required />
          <label>رسوم التوصيل</label>
          <input type="number" name="fee" required />
          <button className="primary" type="submit">
            حفظ النطاق
          </button>
        </form>
      </Modal>

      <Modal id="modalDriver" title="إضافة طيار">
        <form className="form" onSubmit={handleSubmit}>
          <label>الاسم</label>
          <input type="text" name="name" required />
          <label>الهاتف</label>
          <input type="text" name="phone" required />
          <label>الحالة</label>
          <select name="status">
            <option>متاح</option>
            <option>في مهمة</option>
          </select>
          <button className="primary" type="submit">
            حفظ الطيار
          </button>
        </form>
      </Modal>

      <Modal id="modalEmployee" title="إضافة موظف">
        <form className="form" onSubmit={handleSubmit}>
          <label>الاسم</label>
          <input type="text" name="name" required />
          <label>الدور</label>
          <input type="text" name="role" placeholder="اكتب المسمى الوظيفي" required />
          <label>الهاتف</label>
          <input type="text" name="phone" />
          <button className="primary" type="submit">
            حفظ الموظف
          </button>
        </form>
      </Modal>

      <Modal id="modalShift" title="إضافة شيفت">
        <form className="form" onSubmit={handleSubmit}>
          <label>اسم الشيفت</label>
          <input type="text" name="name" required />
          <label>من</label>
          <input type="time" name="from" required />
          <label>إلى</label>
          <input type="time" name="to" required />
          <button className="primary" type="submit">
            حفظ الشيفت
          </button>
        </form>
      </Modal>

      <Modal id="modalAttendance" title="تسجيل حضور">
        <form className="form" onSubmit={handleSubmit}>
          <label>الموظف</label>
          <select name="employee">
            <option>أحمد علي</option>
            <option>سارة محمد</option>
          </select>
          <label>وقت الدخول</label>
          <input type="datetime-local" name="checkin" required />
          <button className="primary" type="submit">
            حفظ
          </button>
        </form>
      </Modal>

      <Modal id="modalPayroll" title="إضافة راتب/سلفة">
        <form className="form" onSubmit={handleSubmit}>
          <label>الموظف</label>
          <select name="employee">
            <option>أحمد علي</option>
            <option>سارة محمد</option>
          </select>
          <label>البند</label>
          <select name="type">
            <option>راتب</option>
            <option>سلفة</option>
          </select>
          <label>القيمة</label>
          <input type="number" name="amount" required />
          <button className="primary" type="submit">
            حفظ
          </button>
        </form>
      </Modal>

      <Modal id="modalLeave" title="طلب إجازة">
        <form className="form" onSubmit={handleSubmit}>
          <label>الموظف</label>
          <select name="employee">
            <option>أحمد علي</option>
            <option>سارة محمد</option>
          </select>
          <label>من</label>
          <input type="date" name="from" required />
          <label>إلى</label>
          <input type="date" name="to" required />
          <button className="primary" type="submit">
            حفظ
          </button>
        </form>
      </Modal>

      <Modal id="modalRole" title="إضافة دور">
        <form className="form" onSubmit={handleSubmit}>
          <label>اسم الدور</label>
          <input type="text" name="role" required />
          <label>الوصف</label>
          <input type="text" name="description" />
          <button className="primary" type="submit">
            حفظ الدور
          </button>
        </form>
      </Modal>

      <Modal id="modalUser" title="إضافة مستخدم">
        <form className="form" onSubmit={handleSubmit}>
          <label>الاسم</label>
          <input type="text" name="name" required />
          <label>البريد الإلكتروني</label>
          <input type="email" name="email" required />
          <label>الدور</label>
          <select name="role">
            {state.roles.length === 0 ? (
              <option>لا توجد أدوار معرفة</option>
            ) : (
              state.roles.map((role) => (
                <option key={role.id}>{role.name}</option>
              ))
            )}
          </select>
          <button className="primary" type="submit">
            حفظ المستخدم
          </button>
        </form>
      </Modal>

      <Modal
        id="modalConfirm"
        title="تأكيد الإجراء"
        footer={
          <>
            <button className="ghost" type="button" onClick={closeModal}>
              إلغاء
            </button>
            <button className="primary" type="button" onClick={closeModal}>
              تأكيد
            </button>
          </>
        }
      >
        <div className="modal-body">
          <p>هل أنت متأكد من إتمام هذا الإجراء؟</p>
          <p className="hint modal-hint">يمكنك الإلغاء للعودة بدون أي تغييرات.</p>
        </div>
      </Modal>

      <Modal id="modalView" title="عرض البيانات">
        <div className="modal-body">
          <div className="table-toolbar" style={{ marginBottom: 12 }}>
            <div className="search-bar-wrapper">
              <i className="bx bx-search"></i>
              <input
                type="text"
                className="table-search"
                placeholder="بحث داخل الجدول..."
                value={viewFilter}
                onChange={(event) => setViewFilter(event.target.value)}
              />
            </div>
            <select
              className="select-filter"
              value={viewGroupFilter}
              onChange={(event) => setViewGroupFilter(event.target.value)}
            >
              <option value="">كل الصفوف</option>
              <option value="basic">بيانات أساسية</option>
              <option value="details">بيانات تفصيلية</option>
            </select>
          </div>
          <table className="view-table">
            <tbody>
              {[
                { label: "البيان", value: "—", group: "basic" },
                { label: "الوصف", value: "—", group: "details" },
              ]
                .filter((row) => {
                  const q = viewFilter.trim().toLowerCase();
                  const matchesSearch = !q || row.label.toLowerCase().includes(q) || row.value.toLowerCase().includes(q);
                  const matchesGroup = !viewGroupFilter || row.group === viewGroupFilter;
                  return matchesSearch && matchesGroup;
                })
                .map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{row.value}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}
