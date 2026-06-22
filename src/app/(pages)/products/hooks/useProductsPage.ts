"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiRequest } from "@/lib/api";
import { isRetailMode } from "@/lib/businessMode";
import type {
  BusinessMode,
  CategoryModalState,
  CategoryRow,
  MaterialRef,
  ProductModalState,
  ProductRow,
  ProductsTab,
  RecipeDraftLine,
} from "../types";

const MAX_PRODUCT_IMAGE_CHARS = 1_400_000;
const MAX_PRODUCT_IMAGE_DIMENSION = 560;

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

export function useProductsPage() {
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [materials, setMaterials] = useState<MaterialRef[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [businessMode, setBusinessMode] = useState<BusinessMode>("cafe_restaurant");

  const [activeTab, setActiveTab] = useState<ProductsTab>("products");
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
  const retailMode = isRetailMode(businessMode);

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
          businessMode: BusinessMode;
        }>("/api/products/bootstrap");

        setCategories(data.categories);
        setMaterials(data.materials);
        setProducts(data.products);
        setBusinessMode(data.businessMode || "cafe_restaurant");
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
    if (productForm.categoryId || categories.length === 0) return;
    setProductForm((prev) => ({ ...prev, categoryId: categories[0].id }));
  }, [categories, productForm.categoryId]);

  useEffect(() => {
    if (retailMode && activeTab === "recipes") {
      setActiveTab("products");
    }
  }, [activeTab, retailMode]);

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
    if (retailMode) return [];
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
  }, [products, recipeCostFilter, retailMode, searchRecipes]);

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

  const selectedProduct = productModal?.id ? products.find((item) => item.id === productModal.id) || null : null;
  const selectedCategory = categoryModal?.id
    ? categories.find((item) => item.id === categoryModal.id) || null
    : null;

  const openProductModal = useCallback(
    (mode: "view" | "edit" | "create", id?: string) => {
      if (mode === "create") {
        setProductForm({
          name: "",
          categoryId: categories[0]?.id || "",
          price: 0,
          isActive: true,
          imageUrl: "",
        });
        setRecipeForm(!retailMode && materials[0] ? [{ materialId: materials[0].id, quantity: 1 }] : []);
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
        retailMode ? [] : product.recipe.map((line) => ({ materialId: line.materialId, quantity: line.qty }))
      );
      setProductModal({ mode, id: product.id });
    },
    [categories, materials, products, retailMode]
  );

  const openCategoryModal = useCallback(
    (mode: "view" | "edit" | "create", id?: string) => {
      if (mode === "create") {
        setCategoryForm({ name: "", description: "" });
        setCategoryModal({ mode: "create" });
        return;
      }

      const category = categories.find((item) => item.id === id);
      if (!category) return;

      setCategoryForm({ name: category.name, description: category.description });
      setCategoryModal({ mode, id: category.id });
    },
    [categories]
  );

  const addRecipeLine = useCallback(() => {
    if (retailMode || materials.length === 0) return;
    setRecipeForm((prev) => [...prev, { materialId: materials[0].id, quantity: 1 }]);
  }, [materials, retailMode]);

  const removeRecipeLine = useCallback((index: number) => {
    setRecipeForm((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateRecipeLine = useCallback((index: number, updates: Partial<RecipeDraftLine>) => {
    setRecipeForm((prev) => prev.map((line, i) => (i === index ? { ...line, ...updates } : line)));
  }, []);

  const recipePayload = useMemo(
    () =>
      retailMode
        ? []
        : recipeForm
        .filter((line) => line.materialId && line.quantity > 0)
        .map((line) => ({ materialId: line.materialId, quantity: line.quantity })),
    [recipeForm, retailMode]
  );

  const recipeEstimatedCost = useMemo(() => {
    if (retailMode) return 0;
    return recipeForm.reduce((sum, line) => {
      const material = materials.find((entry) => entry.id === line.materialId);
      return sum + (material ? material.cost * line.quantity : 0);
    }, 0);
  }, [materials, recipeForm, retailMode]);

  const handleProductImageUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
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
    },
    [pushToast]
  );

  const submitProduct = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!productModal) return;

      setSubmitting(true);
      try {
        const payload = {
          ...productForm,
          imageUrl: productForm.imageUrl.trim() || null,
          ...(retailMode ? {} : { recipe: recipePayload }),
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
    },
    [handleError, loadData, productForm, productModal, pushToast, recipePayload, retailMode]
  );

  const submitCategory = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
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
    },
    [categoryForm, categoryModal, handleError, loadData, pushToast]
  );

  return {
    activeTab,
    addRecipeLine,
    businessMode,
    categories,
    categoryForm,
    categoryModal,
    categorySizeFilter,
    filteredCategories,
    filteredProducts,
    filteredRecipes,
    handleProductImageUpload,
    loadData,
    loading,
    materials,
    openCategoryModal,
    openProductModal,
    productCategoryFilter,
    productForm,
    productModal,
    recipeCostFilter,
    recipeEstimatedCost,
    recipeForm,
    retailMode,
    removeRecipeLine,
    searchCategories,
    searchProducts,
    searchRecipes,
    selectedCategory,
    selectedProduct,
    setActiveTab,
    setCategoryForm,
    setCategoryModal,
    setCategorySizeFilter,
    setProductCategoryFilter,
    setProductForm,
    setProductModal,
    setRecipeCostFilter,
    setSearchCategories,
    setSearchProducts,
    setSearchRecipes,
    submitCategory,
    submitProduct,
    submitting,
    updateRecipeLine,
  };
}

export type ProductsPageState = ReturnType<typeof useProductsPage>;
