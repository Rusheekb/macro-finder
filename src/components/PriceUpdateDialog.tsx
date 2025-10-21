import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";
import { setLocalPrice } from "@/api/price";
import { useToast } from "@/hooks/use-toast";

interface PriceUpdateDialogProps {
  restaurantId: string;
  itemId: string;
  currentPrice: number;
  itemName: string;
  restaurantName: string;
}

export const PriceUpdateDialog = ({
  restaurantId,
  itemId,
  currentPrice,
  itemName,
  restaurantName,
}: PriceUpdateDialogProps) => {
  const [price, setPrice] = useState(currentPrice.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const priceValue = parseFloat(price);
      if (isNaN(priceValue) || priceValue <= 0) {
        toast({
          title: "Invalid Price",
          description: "Please enter a valid price greater than 0",
          variant: "destructive",
        });
        return;
      }

      await setLocalPrice({
        restaurantId,
        itemId,
        price: priceValue,
      });

      toast({
        title: "Price Updated",
        description: "Thank you for reporting the local price!",
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update price. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <DollarSign className="h-4 w-4" />
          Report Price
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Local Price</DialogTitle>
          <DialogDescription>
            Help the community by reporting the current price at your local {restaurantName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Item</Label>
            <p className="text-sm">{itemName}</p>
          </div>
          <div>
            <Label htmlFor="price">Price ($)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Price"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
