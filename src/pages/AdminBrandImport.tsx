import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Brand {
  id: string;
  chain_key: string;
  display_name: string;
  last_imported_at: string | null;
}

interface ImportResult {
  inserted: number;
  updated: number;
  source: 'nutritionix' | 'usda';
  total: number;
  brand: string;
  totalRaw?: number;
  totalMatched?: number;
  reason?: string;
}

const AdminBrandImport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);

  // Fetch brands on mount
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const { data, error } = await supabase
          .from('brands')
          .select('id, chain_key, display_name, last_imported_at')
          .order('display_name');

        if (error) throw error;

        setBrands(data || []);
      } catch (error) {
        console.error('Failed to fetch brands:', error);
        toast({
          title: "Failed to load brands",
          description: "Please try again",
          variant: "destructive",
        });
      } finally {
        setIsLoadingBrands(false);
      }
    };

    fetchBrands();
  }, [toast]);

  const handleImport = async () => {
    if (!selectedBrand) {
      toast({
        title: "No brand selected",
        description: "Please select a brand to import",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('import_brand_menu', {
        body: { chainKey: selectedBrand },
      });

      if (error) throw error;

      setLastResult(data as ImportResult);

      toast({
        title: "Import successful",
        description: `${data.inserted} inserted, ${data.updated} updated from ${data.source}`,
      });

      // Refresh brands to update last_imported_at
      const { data: refreshedBrands } = await supabase
        .from('brands')
        .select('id, chain_key, display_name, last_imported_at')
        .order('display_name');

      if (refreshedBrands) {
        setBrands(refreshedBrands);
      }
    } catch (error: any) {
      console.error('Import failed:', error);
      toast({
        title: "Import failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const selectedBrandData = brands.find(b => b.chain_key === selectedBrand);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Brand Menu Import</h1>
            <p className="text-muted-foreground">
              Import menu items from Nutritionix or USDA FoodData Central
            </p>
          </div>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle>Import Menu Items</CardTitle>
            <CardDescription>
              Select a brand to fetch and update its menu items. The system will try Nutritionix first, then fall back to USDA if needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Brand Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Brand</label>
              <Select
                value={selectedBrand}
                onValueChange={setSelectedBrand}
                disabled={isLoadingBrands || isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingBrands ? "Loading brands..." : "Select a brand"} />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.chain_key}>
                      <div className="flex items-center justify-between w-full">
                        <span>{brand.display_name}</span>
                        <span className="text-xs text-muted-foreground ml-4">
                          ({brand.chain_key})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Brand Info */}
            {selectedBrandData && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Brand:</span>
                  <span className="text-sm">{selectedBrandData.display_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Chain Key:</span>
                  <span className="text-sm font-mono">{selectedBrandData.chain_key}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Last Imported:</span>
                  <span className="text-sm">{formatDate(selectedBrandData.last_imported_at)}</span>
                </div>
              </div>
            )}

            {/* Import Button */}
            <Button
              onClick={handleImport}
              disabled={!selectedBrand || isLoading}
              size="lg"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Import Menu Items
                </>
              )}
            </Button>

            {/* Last Result */}
            {lastResult && (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-semibold">Import Completed</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Brand</div>
                    <div className="font-medium">{lastResult.brand}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Source</div>
                    <Badge variant="secondary">{lastResult.source.toUpperCase()}</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Inserted</div>
                    <div className="text-xl font-bold text-green-600">{lastResult.inserted}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Updated</div>
                    <div className="text-xl font-bold text-blue-600">{lastResult.updated}</div>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground">Total Items Processed</div>
                  <div className="text-2xl font-bold">{lastResult.total}</div>
                </div>
                
                {(lastResult.totalRaw !== undefined || lastResult.totalMatched !== undefined) && (
                  <div className="pt-2 border-t space-y-2">
                    {lastResult.totalRaw !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Raw items from API:</span>
                        <span className="font-medium">{lastResult.totalRaw}</span>
                      </div>
                    )}
                    {lastResult.totalMatched !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Matched after filtering:</span>
                        <span className="font-medium">{lastResult.totalMatched}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {lastResult.reason && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-destructive">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">{lastResult.reason}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Info */}
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>How it works:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>The system first attempts to fetch menu items from Nutritionix</li>
                <li>If Nutritionix is unavailable or returns no results, it falls back to USDA FoodData Central</li>
                <li>Menu items are matched by brand and item name</li>
                <li>Existing prices will not be overwritten</li>
                <li>Calories and protein data will be updated for existing items</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Brands Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>All Brands</CardTitle>
            <CardDescription>Overview of all brands in the database</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBrands ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : brands.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No brands found. Please add brands first.
              </div>
            ) : (
              <div className="space-y-2">
                {brands.map((brand) => (
                  <div
                    key={brand.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{brand.display_name}</div>
                      <div className="text-sm text-muted-foreground font-mono">{brand.chain_key}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Last Imported</div>
                      <div className="text-sm font-medium">{formatDate(brand.last_imported_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminBrandImport;
