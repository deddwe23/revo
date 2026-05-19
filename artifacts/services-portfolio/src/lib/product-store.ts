import { FilterKey, ProductItem, getProductBySlug, products as localProducts } from "@/lib/product-catalog";

export type ProductSortKey = "newest" | "price-asc" | "price-desc" | "rating";

export interface ProductListQuery {
  category?: FilterKey;
  search?: string;
  sortBy?: ProductSortKey;
}

export interface ProductCatalogMetrics {
  totalProducts: number;
  averageRating: string;
  businessServices: number;
}

function sortProducts(products: ProductItem[], sortBy: ProductSortKey = "newest") {
  return [...products].sort((firstProduct, secondProduct) => {
    switch (sortBy) {
      case "price-asc":
        return firstProduct.price - secondProduct.price;
      case "price-desc":
        return secondProduct.price - firstProduct.price;
      case "rating":
        return secondProduct.rating - firstProduct.rating;
      case "newest":
      default:
        return secondProduct.id - firstProduct.id;
    }
  });
}

export async function getStoreProducts(query: ProductListQuery = {}): Promise<ProductItem[]> {
  const { category = "all", search = "", sortBy = "newest" } = query;

  // نقطة الربط الخلفي الرئيسية لصفحة المنتجات:
  // استبدل هذا الفلتر المحلي بطلب API مثل GET /products?category=&search=&sort=
  // ثم أعد البيانات بصيغة ProductItem القادمة من لوحة التحكم أو قاعدة البيانات.
  const normalizedSearch = search.trim().toLowerCase();

  const filteredProducts = localProducts.filter((product) => {
    const matchesCategory = category === "all" || product.category === category;
    const matchesSearch =
      normalizedSearch.length === 0 ||
      [product.title, product.description, product.categoryLabel, product.badge].join(" ").toLowerCase().includes(normalizedSearch);

    return matchesCategory && matchesSearch;
  });

  return Promise.resolve(sortProducts(filteredProducts, sortBy));
}

export async function getStoreProductDetails(slug: string): Promise<ProductItem | undefined> {
  // نقطة الربط الخلفي الرئيسية لصفحة التفاصيل:
  // استبدل هذا السطر بطلب API مثل GET /products/:slug لجلب السعر والوصف والصور والمميزات والمتطلبات من قاعدة البيانات.
  return Promise.resolve(getProductBySlug(slug));
}

export async function getRelatedStoreProducts(product: ProductItem): Promise<ProductItem[]> {
  // يمكن لاحقاً استبدال هذا المنطق بتوصيات ذكية من الـ CMS أو قاعدة البيانات.
  return Promise.resolve(localProducts.filter((item) => item.slug !== product.slug && item.category === product.category).slice(0, 3));
}

export async function getStoreCatalogMetrics(): Promise<ProductCatalogMetrics> {
  // يمكن لاحقاً جلب هذه المؤشرات من endpoint تحليلي لتقليل الحسابات على الواجهة.
  return Promise.resolve({
    totalProducts: localProducts.length,
    averageRating: (localProducts.reduce((sum, product) => sum + product.rating, 0) / localProducts.length).toFixed(1),
    businessServices: localProducts.filter((product) => product.category !== "courses").length,
  });
}