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
  product_url: string;
  source_url: string;
  category: string;
}

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  // console.log("Rendering product:1111111111111", product);
  
  // console.log("Rendering product:", product.product_url);
  
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <img
            src={product.product_url}
            alt={product.product_name}
            className="w-full h-40 object-cover border-b"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "https://www.google.com/imgres?q=link%20to%20no%20image&imgurl=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2F1%2F14%2FNo_Image_Available.jpg&imgrefurl=https%3A%2F%2Fcommons.wikimedia.org%2Fwiki%2FFile%3ANo_Image_Available.jpg&docid=r1K2HZMoU-bYgM&tbnid=adRgxP47ko1kpM&vet=12ahUKEwi9pYyy1_uQAxXzzjgGHTooD38QM3oECA8QAA..i&w=547&h=547&hcb=2&ved=2ahUKEwi9pYyy1_uQAxXzzjgGHTooD38QM3oECA8QAA";
            }}
          />
            {/* <Badge variant="secondary" className="mb-2">{product.brand}</Badge> */}
            <h3 className="font-semibold text-sm line-clamp-2 leading-tight mt-2">
              {product.product_name}
            </h3>
          </div>
        </div>
        
        <div className="flex items-end justify-between pt-2 border-t">
          <div>
            <p className="text-2xl font-bold text-primary">
              ₹ {product.price}
            </p>
          </div>
        {/* <div>
            <p className="text-2xl font-bold text-primary">
             {product.category}
            </p>
          </div> */}
          
          <Button 
            size="sm" 
            variant="default"
            onClick={() => window.open(product.source_url, "_blank")}
            className="gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            View
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  ); <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <img
            src={product.product_url}
            alt={product.product_name}
            className="w-50 h-48 object-cover border-b"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "https://picsum.photos/200/300";
            }}
          />

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
        {/* <div>
            <p className="text-2xl font-bold text-primary">
             {product.category}
            </p>
          </div> */}
          
          <Button 
            size="sm" 
            variant="default"
            onClick={() => window.open(product.product_url, "_blank")}
            className="gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            View
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
};
