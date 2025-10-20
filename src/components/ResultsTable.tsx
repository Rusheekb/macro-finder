import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, Star, MapPin, DollarSign, Utensils, Edit, Loader2, Download, ArrowUp, ArrowDown } from "lucide-react";
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
    const aValue = a[sortField] ?? 0;
    const bValue = b[sortField] ?? 0;
    const multiplier = sortDirection === "asc" ? 1 : -1;
    return (aValue - bValue) * multiplier;
  });

  const exportToCSV = () => {
    const headers = ['Rank', 'Food', 'Restaurant', 'Protein (g)', 'Calories', 'Price ($)', 'Distance (km)', 'Score (%)'];
    const rows = sortedResults.map((result, index) => [
      index + 1,
      result.name,
      result.restaurant,
      result.protein,
      result.calories,
      result.price.toFixed(2),
      result.distance?.toFixed(1) ?? 'N/A',
      Math.round(result.score * 100),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `macrofinder-results-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `Exported ${sortedResults.length} results to CSV`,
    });
  };

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

  return (
    <>
      <Card className="animate-in fade-in-50 duration-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Food Results ({results.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Sort Controls */}
          <div className="flex items-center gap-4 mb-4 pb-4 border-b">
            <Label className="text-sm font-semibold">Sort by:</Label>
            <Select
              value={sortField}
              onValueChange={(value) => setSortField(value as SortField)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Score</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="protein">Protein</SelectItem>
                <SelectItem value="calories">Calories</SelectItem>
                <SelectItem value="distance">Distance</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
              className="flex items-center gap-2"
            >
              {sortDirection === "asc" ? (
                <>
                  <ArrowUp className="h-4 w-4" />
                  Ascending
                </>
              ) : (
                <>
                  <ArrowDown className="h-4 w-4" />
                  Descending
                </>
              )}
            </Button>
          </div>
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
                  <tr 
                    key={result.id} 
                    className="border-b hover:bg-muted/50 transition-colors animate-in fade-in-50 duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
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
              <Card 
                key={result.id} 
                className="p-4 animate-in fade-in-50 duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
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
