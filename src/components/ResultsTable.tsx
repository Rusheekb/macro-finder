import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowUpDown, Star, MapPin, DollarSign, Utensils, Edit, Loader2 } from "lucide-react";
import { FoodResult } from "@/pages/MacroApp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface ResultsTableProps {
  results: FoodResult[];
  onPriceUpdate: () => void;
}

type SortField = "score" | "protein" | "calories" | "price" | "distance";
type SortDirection = "asc" | "desc";

const ResultsTable = ({ results, onPriceUpdate }: ResultsTableProps) => {
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<FoodResult | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const openPriceModal = (result: FoodResult) => {
    setSelectedResult(result);
    setPriceInput(result.price.toFixed(2));
    setIsPriceModalOpen(true);
  };

  const closePriceModal = () => {
    setIsPriceModalOpen(false);
    setSelectedResult(null);
    setPriceInput("");
  };

  const handlePriceSubmit = async () => {
    if (!selectedResult) return;

    const price = parseFloat(priceInput);
    
    // Validation
    if (isNaN(price) || price < 0.5 || price > 100) {
      toast({
        title: "Invalid price",
        description: "Price must be between $0.50 and $100.00",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('set_price', {
        body: {
          restaurantId: selectedResult.restaurantId,
          itemId: selectedResult.itemId,
          price: price,
        },
      });

      if (error) throw error;

      toast({
        title: "Price updated",
        description: `Local price set to $${price.toFixed(2)}`,
      });

      closePriceModal();
      
      // Trigger re-rank
      onPriceUpdate();
    } catch (error) {
      console.error('Failed to update price:', error);
      toast({
        title: "Update failed",
        description: "Unable to update price. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const multiplier = sortDirection === "asc" ? 1 : -1;
    return (aValue - bValue) * multiplier;
  });

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-auto p-1 font-semibold"
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  const PriceCell = ({ result }: { result: FoodResult }) => (
    <div className="flex items-center gap-2">
      <span>${result.price.toFixed(2)}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => openPriceModal(result)}
        className="h-6 w-6 p-0"
        title="Report local price"
      >
        <Edit className="h-3 w-3" />
      </Button>
      {result.priceUpdatedAt && (
        <Badge variant="secondary" className="text-xs">
          Updated {formatDistanceToNow(new Date(result.priceUpdatedAt), { addSuffix: true })}
        </Badge>
      )}
    </div>
  );

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Utensils className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
          <p className="text-muted-foreground text-center">
            Set your macro targets and click "Find Foods" to discover options near you.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Food Results ({results.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3">
                    <SortButton field="score">Score</SortButton>
                  </th>
                  <th className="text-left py-3">Food & Restaurant</th>
                  <th className="text-left py-3">
                    <SortButton field="protein">Protein</SortButton>
                  </th>
                  <th className="text-left py-3">
                    <SortButton field="calories">Calories</SortButton>
                  </th>
                  <th className="text-left py-3">
                    <SortButton field="price">Price</SortButton>
                  </th>
                  <th className="text-left py-3">
                    <SortButton field="distance">Distance</SortButton>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((result, index) => (
                  <tr key={result.id} className="border-b hover:bg-muted/50">
                    <td className="py-3">
                      <Badge 
                        variant={index < 3 ? "default" : "secondary"}
                        className="font-semibold"
                      >
                        {Math.round(result.score * 100)}%
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div>
                        <div className="font-semibold">{result.name}</div>
                        <div className="text-sm text-muted-foreground">{result.restaurant}</div>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="font-semibold text-primary">{result.protein}g</span>
                    </td>
                    <td className="py-3">{result.calories} cal</td>
                    <td className="py-3">
                      <PriceCell result={result} />
                    </td>
                    <td className="py-3">{result.distance?.toFixed(1) ?? 'N/A'} km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {sortedResults.map((result, index) => (
              <Card key={result.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">{result.name}</h3>
                    <p className="text-sm text-muted-foreground">{result.restaurant}</p>
                  </div>
                  <Badge 
                    variant={index < 3 ? "default" : "secondary"}
                    className="font-semibold"
                  >
                    {Math.round(result.score * 100)}%
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="font-semibold text-primary">{result.protein}g</span> protein
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{result.calories} cal</span>
                  </div>
                  
                  <div className="flex items-center gap-2 col-span-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">${result.price.toFixed(2)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openPriceModal(result)}
                      className="h-6 px-2"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Report Price
                    </Button>
                  </div>
                  
                  {result.priceUpdatedAt && (
                    <div className="col-span-2">
                      <Badge variant="secondary" className="text-xs">
                        Updated {formatDistanceToNow(new Date(result.priceUpdatedAt), { addSuffix: true })}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{result.distance?.toFixed(1) ?? 'N/A'} km</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Price Update Modal */}
      <Dialog open={isPriceModalOpen} onOpenChange={setIsPriceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Local Price</DialogTitle>
            <DialogDescription>
              Help others by reporting the current price at your location
            </DialogDescription>
          </DialogHeader>
          
          {selectedResult && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <div className="font-semibold">{selectedResult.name}</div>
                <div className="text-sm text-muted-foreground">{selectedResult.restaurant}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Current price: ${selectedResult.price.toFixed(2)}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">New Price</Label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">$</span>
                  <Input
                    id="price"
                    type="number"
                    min="0.50"
                    max="100"
                    step="0.01"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    placeholder="0.00"
                    className="text-lg"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter a value between $0.50 and $100.00
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closePriceModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePriceSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Price'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ResultsTable;
