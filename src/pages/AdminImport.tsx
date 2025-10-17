import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Brand {
  id: string;
  chain_key: string;
  display_name: string;
}

const AdminImport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingBrands, setIsFetchingBrands] = useState(true);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setIsFetchingBrands(true);
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, chain_key, display_name')
        .order('display_name');

      if (error) throw error;

      setBrands(data || []);
    } catch (error) {
      console.error('Failed to fetch brands:', error);
      toast({
        title: "Error loading brands",
        description: "Unable to fetch brand list from database.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingBrands(false);
    }
  };

  const handleSeedSample = async () => {
    setIsLoading(true);
    try {
      toast({
        title: "Seeding sample data",
        description: "Adding demo restaurants and menu items...",
      });

      const { data, error } = await supabase.functions.invoke('seed_sample');

      if (error) throw error;

      toast({
        title: "Sample data seeded successfully",
        description: `Added ${data.brands} brands, ${data.restaurants} restaurants, and ${data.menuItems} menu items.`,
      });

    } catch (error) {
      console.error('Seed failed:', error);
      toast({
        title: "Seed failed",
        description: error.message || "Unable to seed sample data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedMetros = async () => {
    setIsLoading(true);
    try {
      toast({
        title: "Starting metro seeding",
        description: "Pre-populating top 50 US metro areas with restaurant data. This will run in the background and may take 30-60 minutes.",
      });

      const { data, error } = await supabase.functions.invoke('seed_metros', {
        body: {
          radiusKm: 10,
          topBrandsCount: 30,
        },
      });

      if (error) throw error;

      toast({
        title: "Metro seeding started",
        description: `Processing ${data.metrosQueued} metros. Check backend logs for progress.`,
      });

    } catch (error) {
      console.error('Metro seed failed:', error);
      toast({
        title: "Seed failed",
        description: error.message || "Unable to start metro seeding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedBrand) {
      toast({
        title: "No brand selected",
        description: "Please select a brand to import.",
        variant: "destructive",
      });
      return;
    }

    const brand = brands.find(b => b.id === selectedBrand);
    if (!brand) return;

    setIsLoading(true);

    try {
      toast({
        title: "Importing data",
        description: `Fetching menu items for ${brand.display_name}...`,
      });

      const { data, error } = await supabase.functions.invoke('import_nutritionix', {
        body: { chainKey: brand.chain_key },
      });

      if (error) throw error;

      const { inserted, updated } = data;
      const total = inserted + updated;

      toast({
        title: "Import successful",
        description: `${total} items processed (${inserted} new, ${updated} updated)`,
      });

    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: "Import failed",
        description: error.message || "Unable to import menu items. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
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
            <h1 className="text-2xl font-bold">Admin Import</h1>
            <p className="text-muted-foreground">
              Import nutrition data from Nutritionix
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Seed Metro Areas Card */}
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>🌍 Pre-Populate Metro Areas</CardTitle>
              <CardDescription>
                Pre-seed top 50 US metro areas with restaurant data for instant search results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will discover restaurants and import menu data for the top 50 US metro areas
                (cities with population &gt; 500k). This enables instant search results for 80% of users.
              </p>
              <div className="rounded-lg bg-muted p-4">
                <h3 className="font-medium mb-2">What this does:</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Discovers restaurants in 50 major US cities</li>
                  <li>Imports menu data for top 30 chains per metro</li>
                  <li>Runs in background (30-60 minutes total)</li>
                  <li>Improves cache hit rate to ~70%</li>
                </ul>
              </div>
              <Button
                onClick={handleSeedMetros}
                disabled={isLoading}
                size="lg"
                className="w-full"
                variant="default"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  '🚀 Pre-Populate Metros'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Seed Sample Data Card */}
          <Card>
            <CardHeader>
              <CardTitle>Seed Sample Data</CardTitle>
              <CardDescription>
                Quickly populate the database with demo restaurants and menu items
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will add sample data for 5 brands, 16 restaurants around Los Angeles,
                and 26 menu items with realistic nutrition data and pricing.
              </p>
              <Button
                onClick={handleSeedSample}
                disabled={isLoading}
                size="lg"
                className="w-full"
                variant="default"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  'Seed Demo Data'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Import from Nutritionix Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Import from Nutritionix
              </CardTitle>
              <CardDescription>
                Select a brand to import menu items and nutrition data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Brand Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Brand</label>
                {isFetchingBrands ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a brand..." />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

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
                    Import from Nutritionix
                  </>
                )}
              </Button>

              {/* Info */}
              <div className="rounded-lg bg-muted p-4">
                <h3 className="font-medium mb-2">What happens during import:</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Fetches menu items from Nutritionix API</li>
                  <li>Updates calories and protein data</li>
                  <li>Creates new items that don't exist</li>
                  <li>Preserves existing price data</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminImport;
