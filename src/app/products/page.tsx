"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiRequest } from "@/lib/api";
import { money, num2 } from "@/lib/format";
import InlineModal from "@/components/ui/InlineModal";
import RowActions from "@/components/ui/RowActions";
import TableDataActions from "@/components/ui/TableDataActions";

const MAX_PRODUCT_IMAGE_CHARS = 1_400_000;
const MAX_PRODUCT_IMAGE_DIMENSION = 560;

type CategoryRow = {
  id: string;
  name: string;
  description: string;
  productsCount: number;
};

type MaterialRef = {
  id: string;
  name: string;
  unit: string;
  cost: number;
};

type ProductRecipeLine = {
  id: string;
  materialId: string;
  materialName: string;
  unit: string;
  materialCost: number;
  qty: number;
};

type ProductRow = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  price: number;
  isActive: boolean;
  imageUrl: string | null;
  recipe: ProductRecipeLine[];
  cost: number;
  margin: number;
};

type ProductModalState = { mode: "view" | "edit" | "create"; id?: string } | null;
type CategoryModalState = { mode: "view" | "edit" | "create"; id?: string } | null;

type RecipeDraftLine = {
  materialId: string;
  quantity: number;
};

async function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("invalid_image"));
    };
    img.src = url;
  });
}

function drawToCanvas(image: HTMLImageElement, scale: number) {
  const canvas = document.createElement("canvas");
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(image, 0, 0, width, height);
  }
  return canvas;
}

function encodeCanvas(canvas: HTMLCanvasElement, type: string, quality?: number) {
  try {
    return canvas.toDataURL(type, quality);
  } catch {
    return canvas.toDataURL();
  }
}

async function compressImageFile(file: File) {
  const image = await loadImage(file);
  let scale = Math.min(1, MAX_PRODUCT_IMAGE_DIMENSION / Math.max(image.width, image.height));

  for (let pass = 0; pass < 4; pass += 1) {
    const canvas = drawToCanvas(image, scale);
    const attempts: Array<{ type: string; quality?: number }> = [
      { type: "image/webp", quality: 0.9 },
      { type: "image/webp", quality: 0.8 },
      { type: "image/webp", quality: 0.7 },
      { type: "image/jpeg", quality: 0.85 },
      { type: "image/jpeg", quality: 0.75 },
    ];

    for (const attempt of attempts) {
      const dataUrl = encodeCanvas(canvas, attempt.type, attempt.quality);
      if (attempt.type === "image/webp" && !dataUrl.startsWith("data:image/webp")) {
        continue;
      }
      if (dataUrl.length <= MAX_PRODUCT_IMAGE_CHARS) {
        return dataUrl;
      }
    }

    scale *= 0.82;
  }

  throw new Error("image_too_large");
}

export default function ProductsPage() {
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [materials, setMaterials] = useState<MaterialRef[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);

  const [activeTab, setActiveTab] = useState("products");
  const [searchProducts, setSearchProducts] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("");
  const [searchRecipes, setSearchRecipes] = useState("");
  const [recipeCostFilter, setRecipeCostFilter] = useState("");
  const [searchCategories, setSearchCategories] = useState("");
  const [categorySizeFilter, setCategorySizeFilter] = useState("");

  const [productModal, setProductModal] = useState<ProductModalState>(null);
  const [categoryModal, setCategoryModal] = useState<CategoryModalState>(null);

  const [productForm, setProductForm] = useState({
    name: "",
    categoryId: "",
    price: 0,
    isActive: true,
    imageUrl: "",
  });
  const [recipeForm, setRecipeForm] = useState<RecipeDraftLine[]>([]);

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
  });

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

  const loadData = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const data = await apiRequest<{
          categories: CategoryRow[];
          materials: MaterialRef[];
          products: ProductRow[];
        }>("/api/products/bootstrap");

        setCategories(data.categories);
        setMaterials(data.materials);
        setProducts(data.products);
      } catch (error) {
        handleError(error, "تعذر تحميل بيانات المنتجات");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [handleError]
  );

  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  useEffect(() => {
    if (productForm.categoryId) return;
    if (categories.length === 0) return;
    setProductForm((prev) => ({ ...prev, categoryId: categories[0].id }));
  }, [categories, productForm.categoryId]);

  const filteredProducts = useMemo(() => {
    const q = searchProducts.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !q || product.name.toLowerCase().includes(q) || product.categoryName.toLowerCase().includes(q);
      const matchesCategory = !productCategoryFilter || product.categoryId === productCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [productCategoryFilter, products, searchProducts]);

  const filteredRecipes = useMemo(() => {
    const q = searchRecipes.trim().toLowerCase();
    return products.filter((product) => {
      const ingredients = product.recipe.map((line) => line.materialName).join(" ").toLowerCase();
      const matchesSearch = !q || product.name.toLowerCase().includes(q) || ingredients.includes(q);
      const matchesCost =
        !recipeCostFilter ||
        (recipeCostFilter === "low" && product.cost < 20) ||
        (recipeCostFilter === "high" && product.cost >= 20);
      return matchesSearch && matchesCost;
    });
  }, [products, recipeCostFilter, searchRecipes]);

  const filteredCategories = useMemo(() => {
    const q = searchCategories.trim().toLowerCase();
    return categories.filter((category) => {
      const matchesSearch =
        !q || category.name.toLowerCase().includes(q) || category.description.toLowerCase().includes(q);
      const matchesSize =
        !categorySizeFilter ||
        (categorySizeFilter === "small" && category.productsCount < 5) ||
        (categorySizeFilter === "large" && category.productsCount >= 5);
      return matchesSearch && matchesSize;
    });
  }, [categories, categorySizeFilter, searchCategories]);

  const selectedProduct = productModal?.id
    ? products.find((item) => item.id === productModal.id) || null
    : null;
  const selectedCategory = categoryModal?.id
    ? categories.find((item) => item.id === categoryModal.id) || null
    : null;

  const openProductModal = (mode: "view" | "edit" | "create", id?: string) => {
    if (mode === "create") {
      setProductForm({
        name: "",
        categoryId: categories[0]?.id || "",
        price: 0,
        isActive: true,
        imageUrl: "",
      });
      setRecipeForm(
        materials[0]
          ? [{ materialId: materials[0].id, quantity: 1 }]
          : []
      );
      setProductModal({ mode: "create" });
      return;
    }

    const product = products.find((item) => item.id === id);
    if (!product) return;

    setProductForm({
      name: product.name,
      categoryId: product.categoryId,
      price: product.price,
      isActive: product.isActive,
      imageUrl: product.imageUrl || "",
    });
    setRecipeForm(
      product.recipe.map((line) => ({ materialId: line.materialId, quantity: line.qty }))
    );
    setProductModal({ mode, id: product.id });
  };

  const openCategoryModal = (mode: "view" | "edit" | "create", id?: string) => {
    if (mode === "create") {
      setCategoryForm({ name: "", description: "" });
      setCategoryModal({ mode: "create" });
      return;
    }

    const category = categories.find((item) => item.id === id);
    if (!category) return;

    setCategoryForm({ name: category.name, description: category.description });
    setCategoryModal({ mode, id: category.id });
  };

  const addRecipeLine = () => {
    if (materials.length === 0) return;
    setRecipeForm((prev) => [...prev, { materialId: materials[0].id, quantity: 1 }]);
  };

  const removeRecipeLine = (index: number) => {
    setRecipeForm((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRecipeLine = (index: number, updates: Partial<RecipeDraftLine>) => {
    setRecipeForm((prev) => prev.map((line, i) => (i === index ? { ...line, ...updates } : line)));
  };

  const recipePayload = useMemo(
    () =>
      recipeForm
        .filter((line) => line.materialId && line.quantity > 0)
        .map((line) => ({ materialId: line.materialId, quantity: line.quantity })),
    [recipeForm]
  );

  const recipeEstimatedCost = useMemo(() => {
    return recipeForm.reduce((sum, line) => {
      const material = materials.find((entry) => entry.id === line.materialId);
      return sum + (material ? material.cost * line.quantity : 0);
    }, 0);
  }, [materials, recipeForm]);

  const handleProductImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const compressed = await compressImageFile(file);
      setProductForm((prev) => ({ ...prev, imageUrl: compressed }));
      pushToast("تم رفع صورة المنتج", "success");
    } catch {
      pushToast("تعذر رفع الصورة. استخدم صورة أصغر أو جودة أقل.", "error");
    }
  };

  const submitProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productModal) return;

    setSubmitting(true);
    try {
      const payload = {
        ...productForm,
        imageUrl: productForm.imageUrl.trim() || null,
        recipe: recipePayload,
      };

      if (productModal.mode === "create") {
        await apiRequest<{ product: ProductRow }>("/api/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        pushToast("تمت إضافة المنتج", "success");
      } else if (productModal.id) {
        await apiRequest<{ product: ProductRow }>(`/api/products/${productModal.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        pushToast("تم تحديث المنتج", "success");
      }

      setProductModal(null);
      await loadData();
    } catch (error) {
      handleError(error, "تعذر حفظ بيانات المنتج");
    } finally {
      setSubmitting(false);
    }
  };

  const submitCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!categoryModal) return;

    setSubmitting(true);
    try {
      if (categoryModal.mode === "create") {
        await apiRequest<{ category: CategoryRow }>("/api/products/categories", {
          method: "POST",
          body: JSON.stringify(categoryForm),
        });
        pushToast("تمت إضافة الفئة", "success");
      } else if (categoryModal.id) {
        await apiRequest<{ category: CategoryRow }>(`/api/products/categories/${categoryModal.id}`, {
          method: "PATCH",
          body: JSON.stringify(categoryForm),
        });
        pushToast("تم تحديث الفئة", "success");
      }

      setCategoryModal(null);
      await loadData();
    } catch (error) {
      handleError(error, "تعذر حفظ الفئة");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page active">
      <div className="subtabs">
        <button className={`subtab ${activeTab === "products" ? "active" : ""}`} onClick={() => setActiveTab("products")} type="button">
          <i className="bx bx-package"></i>
          المنتجات
        </button>
        <button className={`subtab ${activeTab === "recipes" ? "active" : ""}`} onClick={() => setActiveTab("recipes")} type="button">
          <i className="bx bx-receipt"></i>
          الوصفات
        </button>
        <button className={`subtab ${activeTab === "categories" ? "active" : ""}`} onClick={() => setActiveTab("categories")} type="button">
          <i className="bx bx-category"></i>
          الفئات
        </button>
      </div>

      {loading ? (
        <div className="card wide">
          <p className="hint">جارٍ تحميل بيانات المنتجات...</p>
        </div>
      ) : null}

      {!loading && activeTab === "products" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>المنتجات</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في المنتجات..."
                    value={searchProducts}
                    onChange={(event) => setSearchProducts(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={productCategoryFilter}
                  onChange={(event) => setProductCategoryFilter(event.target.value)}
                >
                  <option value="">كل الفئات</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button className="primary" type="button" onClick={() => openProductModal("create")}> 
                  <i className="bx bx-plus"></i>
                  إضافة منتج
                </button>
                <TableDataActions
                  rows={filteredProducts}
                  columns={[
                    { label: "المنتج", value: (row) => row.name },
                    { label: "الفئة", value: (row) => row.categoryName },
                    { label: "السعر", value: (row) => row.price },
                    { label: "التكلفة", value: (row) => row.cost },
                    { label: "الهامش", value: (row) => row.margin },
                  ]}
                  fileName="products-list"
                  printTitle="المنتجات"
                  tableId="products-table"
                />
              </div>
            </div>
            <table id="products-table">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>الفئة</th>
                  <th>سعر البيع</th>
                  <th>تكلفة المنتج</th>
                  <th>هامش الربح</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{product.categoryName}</td>
                      <td>{money(product.price)}</td>
                      <td>{money(product.cost)}</td>
                      <td>{num2(product.margin)}%</td>
                      <td>
                        <RowActions
                          onView={() => openProductModal("view", product.id)}
                          onEdit={() => openProductModal("edit", product.id)}
                          onDelete={async () => {
                            await apiRequest<{ deleted: boolean }>(`/api/products/${product.id}`, {
                              method: "DELETE",
                            });
                            await loadData();
                          }}
                          confirmDeleteText="هل تريد حذف المنتج؟"
                          deleteMessage="تم حذف المنتج"
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

      {!loading && activeTab === "recipes" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>الوصفات (مكونات كل منتج)</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في الوصفات..."
                    value={searchRecipes}
                    onChange={(event) => setSearchRecipes(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={recipeCostFilter}
                  onChange={(event) => setRecipeCostFilter(event.target.value)}
                >
                  <option value="">كل التكاليف</option>
                  <option value="low">أقل من 20</option>
                  <option value="high">20 فأكثر</option>
                </select>
                <TableDataActions
                  rows={filteredRecipes}
                  columns={[
                    { label: "المنتج", value: (row) => row.name },
                    {
                      label: "المكونات",
                      value: (row) =>
                        row.recipe.map((line) => `${line.materialName} ${num2(line.qty)} ${line.unit}`).join("، "),
                    },
                    { label: "تكلفة الوحدة", value: (row) => row.cost },
                  ]}
                  fileName="products-recipes"
                  printTitle="الوصفات"
                  tableId="products-recipes-table"
                />
              </div>
            </div>
            <table id="products-recipes-table">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>المكونات</th>
                  <th>تكلفة الوحدة</th>
                  <th>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecipes.length === 0 ? (
                  <tr>
                    <td colSpan={4}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredRecipes.map((product) => {
                    const ingredients = product.recipe
                      .map((line) => `${line.materialName} ${num2(line.qty)} ${line.unit}`)
                      .join("، ");
                    return (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>{ingredients || "لا توجد مكونات"}</td>
                        <td>{money(product.cost)}</td>
                        <td>تخصم تلقائيًا من المخزون</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === "categories" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>الفئات</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في الفئات..."
                    value={searchCategories}
                    onChange={(event) => setSearchCategories(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={categorySizeFilter}
                  onChange={(event) => setCategorySizeFilter(event.target.value)}
                >
                  <option value="">كل الأحجام</option>
                  <option value="small">صغيرة (&lt; 5)</option>
                  <option value="large">كبيرة (5+)</option>
                </select>
                <button className="primary" type="button" onClick={() => openCategoryModal("create")}>
                  <i className="bx bx-plus"></i>
                  إضافة فئة
                </button>
                <TableDataActions
                  rows={filteredCategories}
                  columns={[
                    { label: "الفئة", value: (row) => row.name },
                    { label: "عدد المنتجات", value: (row) => row.productsCount },
                    { label: "الوصف", value: (row) => row.description || "—" },
                  ]}
                  fileName="products-categories"
                  printTitle="فئات المنتجات"
                  tableId="products-categories-table"
                />
              </div>
            </div>
            <table id="products-categories-table">
              <thead>
                <tr>
                  <th>الفئة</th>
                  <th>عدد المنتجات</th>
                  <th>الوصف</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={4}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredCategories.map((category) => (
                    <tr key={category.id}>
                      <td>{category.name}</td>
                      <td>{category.productsCount}</td>
                      <td>{category.description || "—"}</td>
                      <td>
                        <RowActions
                          onView={() => openCategoryModal("view", category.id)}
                          onEdit={() => openCategoryModal("edit", category.id)}
                          onDelete={async () => {
                            await apiRequest<{ deleted: boolean }>(`/api/products/categories/${category.id}`, {
                              method: "DELETE",
                            });
                            await loadData();
                          }}
                          confirmDeleteText="سيتم حذف الفئة وجميع المنتجات والوصفات التابعة لها. هل تريد المتابعة؟"
                          deleteMessage="تم حذف الفئة وكافة العناصر المرتبطة"
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

      <InlineModal
        open={Boolean(productModal)}
        title={
          productModal?.mode === "create"
            ? "إضافة منتج"
            : productModal?.mode === "edit"
              ? "تعديل منتج"
              : "تفاصيل المنتج"
        }
        onClose={() => setProductModal(null)}
      >
        {productModal?.mode === "view" && selectedProduct ? (
          <div className="modal-body">
            <div className="receipt-brand" style={{ marginBottom: 12 }}>
              <div className="receipt-logo" style={{ width: 64, height: 64, padding: 0, overflow: "hidden" }}>
                {selectedProduct.imageUrl ? (
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div className="product-thumb-placeholder" style={{ width: "100%", height: "100%" }} />
                )}
              </div>
              <div className="receipt-brand-text">
                <strong>{selectedProduct.name}</strong>
                <span>{selectedProduct.categoryName}</span>
              </div>
            </div>
            <div className="list">
              <div className="row-line">
                <span>اسم المنتج</span>
                <strong>{selectedProduct.name}</strong>
              </div>
              <div className="row-line">
                <span>الفئة</span>
                <strong>{selectedProduct.categoryName}</strong>
              </div>
              <div className="row-line">
                <span>السعر</span>
                <strong>{money(selectedProduct.price)}</strong>
              </div>
              <div className="row-line">
                <span>تكلفة المنتج</span>
                <strong>{money(selectedProduct.cost)}</strong>
              </div>
            </div>
            <table className="view-table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>المادة</th>
                  <th>الكمية</th>
                  <th>التكلفة</th>
                </tr>
              </thead>
              <tbody>
                {selectedProduct.recipe.length === 0 ? (
                  <tr>
                    <td colSpan={3}>لا توجد وصفة</td>
                  </tr>
                ) : (
                  selectedProduct.recipe.map((line) => (
                    <tr key={line.id}>
                      <td>{line.materialName}</td>
                      <td>{num2(line.qty)} {line.unit}</td>
                      <td>{money(line.materialCost * line.qty)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <form className="form" onSubmit={submitProduct}>
            <label>اسم المنتج</label>
            <input
              type="text"
              value={productForm.name}
              onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <label>الفئة</label>
            <select
              value={productForm.categoryId}
              onChange={(event) => setProductForm((prev) => ({ ...prev, categoryId: event.target.value }))}
              required
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <label>سعر البيع</label>
            <input
              type="number"
              value={productForm.price}
              onChange={(event) => setProductForm((prev) => ({ ...prev, price: Number(event.target.value || 0) }))}
              required
            />

            <label>صورة المنتج</label>
            <div className="recipe-editor">
              <div className="receipt-brand" style={{ alignItems: "center" }}>
                <div className="receipt-logo" style={{ width: 72, height: 72, padding: 0, overflow: "hidden" }}>
                  {productForm.imageUrl ? (
                    <img
                      src={productForm.imageUrl}
                      alt="معاينة صورة المنتج"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div className="product-thumb-placeholder" style={{ width: "100%", height: "100%" }} />
                  )}
                </div>
                <div className="row-actions">
                  <label className="ghost" style={{ cursor: "pointer" }}>
                    <i className="bx bx-image-add"></i>
                    رفع صورة
                    <input type="file" accept="image/*" hidden onChange={handleProductImageUpload} />
                  </label>
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => setProductForm((prev) => ({ ...prev, imageUrl: "" }))}
                    disabled={!productForm.imageUrl}
                  >
                    <i className="bx bx-trash"></i>
                    إزالة
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={productForm.imageUrl}
                onChange={(event) => setProductForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                placeholder="أو ضع رابط الصورة مباشرة"
              />
              <p className="hint">إذا لم تُحدد صورة، سيتم عرض مساحة لونية بدون أحرف في الكاشير.</p>
            </div>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={productForm.isActive}
                onChange={(event) => setProductForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              المنتج نشط ومتاح في البيع
            </label>

            <div className="section-header-actions no-tip" style={{ marginTop: 6 }}>
              <h3>الوصفة</h3>
              <button className="ghost" type="button" onClick={addRecipeLine}>
                <i className="bx bx-plus"></i>
                إضافة مكون
              </button>
            </div>

            {recipeForm.length === 0 ? (
              <p className="hint">لا توجد مكونات. يمكنك الحفظ بدون وصفة.</p>
            ) : (
              <div className="recipe-editor">
                <div className="recipe-header">
                  <span>المادة</span>
                  <span>الكمية</span>
                  <span>الوحدة</span>
                  <span>التكلفة</span>
                  <span>إجراء</span>
                </div>
                {recipeForm.map((line, index) => {
                  const material = materials.find((entry) => entry.id === line.materialId);
                  const unit = material?.unit || "—";
                  const lineCost = material ? material.cost * line.quantity : 0;
                  return (
                    <div key={`${line.materialId}-${index}`} className="recipe-row">
                      <select
                        value={line.materialId}
                        onChange={(event) =>
                          updateRecipeLine(index, { materialId: event.target.value })
                        }
                      >
                        {materials.map((materialOption) => (
                          <option key={materialOption.id} value={materialOption.id}>
                            {materialOption.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={line.quantity}
                        min={0.001}
                        step="0.001"
                        onChange={(event) =>
                          updateRecipeLine(index, { quantity: Number(event.target.value || 0) })
                        }
                      />
                      <span className="recipe-unit">{unit}</span>
                      <span className="recipe-cost">{money(lineCost)}</span>
                      <button className="danger-btn" type="button" onClick={() => removeRecipeLine(index)}>
                        <i className="bx bx-trash"></i>
                      </button>
                    </div>
                  );
                })}
                <div className="recipe-summary">
                  <span>إجمالي تكلفة الوصفة</span>
                  <strong>{money(recipeEstimatedCost)}</strong>
                </div>
              </div>
            )}

            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </button>
          </form>
        )}
      </InlineModal>

      <InlineModal
        open={Boolean(categoryModal)}
        title={
          categoryModal?.mode === "create"
            ? "إضافة فئة"
            : categoryModal?.mode === "edit"
              ? "تعديل فئة"
              : "تفاصيل الفئة"
        }
        onClose={() => setCategoryModal(null)}
      >
        {categoryModal?.mode === "view" && selectedCategory ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>اسم الفئة</span>
                <strong>{selectedCategory.name}</strong>
              </div>
              <div className="row-line">
                <span>عدد المنتجات</span>
                <strong>{selectedCategory.productsCount}</strong>
              </div>
              <div className="row-line">
                <span>الوصف</span>
                <strong>{selectedCategory.description || "—"}</strong>
              </div>
            </div>
          </div>
        ) : (
          <form className="form" onSubmit={submitCategory}>
            <label>اسم الفئة</label>
            <input
              type="text"
              value={categoryForm.name}
              onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <label>الوصف</label>
            <input
              type="text"
              value={categoryForm.description}
              onChange={(event) =>
                setCategoryForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </button>
          </form>
        )}
      </InlineModal>
    </section>
  );
}
