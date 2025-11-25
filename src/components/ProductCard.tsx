import React from "react";
import { ExternalLink, ShoppingCart } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
// import NoImage from "./image.png";
import NoImage from '../../public/image.png'

interface Product {
  title: string;
  price: number;
  source_url: string;
  product_image: string;
}

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const imgSrc =
    product.product_image &&
    typeof product.product_image === "string" &&
    product.product_image.trim() !== "" &&
    !product.product_image.toLowerCase().includes("null")
      ? product.product_image.trim()
      : NoImage;

  const openUrl = (url?: string | null) => {
    if (!url) return;
    const safeUrl = url.startsWith("http") ? url : `https://${url}`;
    window.open(safeUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <img
              src={imgSrc}
              alt={product.title ?? "product image"}
              className="w-full h-40 object-cover border-b"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (target.src !== (NoImage as unknown as string)) {
                  target.src = NoImage as unknown as string;
                }
              }}
            />

            <h3 className="font-semibold text-sm line-clamp-2 leading-tight mt-2">
              {product.title}
            </h3>
          </div>
        </div>

        <div className="flex items-end justify-between pt-2 border-t">
          <div>
            <p className="text-2xl font-bold text-primary">₹ {product.price}</p>
          </div>

          <Button
            size="sm"
            variant="default"
            onClick={() => openUrl(product.source_url)}
            className="gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            View
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
