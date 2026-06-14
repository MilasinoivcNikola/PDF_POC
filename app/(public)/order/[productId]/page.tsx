import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getProducts } from "@/lib/catalog/products";
import { BRAND } from "@/lib/brand";
import { OrderForm } from "./OrderForm";

interface OrderProps {
  params: Promise<{ productId: string }>;
}

/** Prerender the order form for each catalog product. */
export function generateStaticParams(): { productId: string }[] {
  return getProducts().map((product) => ({ productId: product.productId }));
}

export async function generateMetadata({
  params,
}: OrderProps): Promise<Metadata> {
  const { productId } = await params;
  const product = getProduct(productId);
  return {
    title: product ? `Order ${product.title} — ${BRAND}` : `Order — ${BRAND}`,
  };
}

// PR-05: the real order form. Reuses the wizard draft state + required-field gate;
// on submit it assembles the session and POSTs to /api/order (creating a
// pending_payment order) — NO generation, NO charge. The page is a Server
// Component that resolves the product (404 on unknown id, matching the storefront)
// and hands the product down to the client <OrderForm>.
export default async function OrderPage({ params }: OrderProps) {
  const { productId } = await params;
  const product = getProduct(productId);

  if (!product) {
    notFound();
  }

  return (
    <OrderForm
      productId={product.productId}
      storyType={product.storyType}
      title={product.title}
    />
  );
}
