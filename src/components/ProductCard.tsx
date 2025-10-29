import { ExternalLink, ShoppingCart } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface Product {
  product_name: string;
  brand: string;
  price: string;
  currency: string;
  asin: string;
  url: string;
  category: string;
}

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  console.log("Rendering product:", product);
  
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Badge variant="secondary" className="mb-2">{product.brand}</Badge>
            <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
              {product.product_name}
            </h3>
          </div>
        </div>
        
        <div className="flex items-end justify-between pt-2 border-t">
          <div>
            <p className="text-2xl font-bold text-primary">
             {product.price}
            </p>
          </div>
        <div>
            <p className="text-2xl font-bold text-primary">
             {product.category}
            </p>
          </div>
          
          <Button 
            size="sm" 
            variant="default"
            onClick={() => window.open(product.url, '_blank')}
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
