import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, TrendingUp, Target, TrendingDown, DollarSign, Loader2, MapPin, RefreshCw, Filter } from "lucide-react";
import { MacroTargets } from "@/pages/MacroApp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface ControlsPanelProps {
  targets: MacroTargets;
  onTargetsChange: (targets: MacroTargets) => void;
  onSearch: () => void;
  isLoading: boolean;
  onLocationRequest: () => void;
  isGettingLocation: boolean;
  onRefreshNearby: () => void;
  isRefreshingNearby: boolean;
  onForceRefresh: () => void;
}

const PRESETS = {
  bulking: { wP: 2.0, wC: 0.8, wR: 0.2, label: "Bulking", icon: TrendingUp },
  cutting: { wP: 2.5, wC: 0.3, wR: 0.4, label: "Cutting", icon: TrendingDown },
  budget: { wP: 1.8, wC: 0.8, wR: 0.5, label: "Budget", icon: DollarSign },
};

const ControlsPanel = ({
  targets,
  onTargetsChange,
  onSearch,
  isLoading,
  onLocationRequest,
  isGettingLocation,
  onRefreshNearby,
  isRefreshingNearby,
  onForceRefresh,
}: ControlsPanelProps) => {
  const { toast } = useToast();
  const [brands, setBrands] = useState<Array<{ chain_key: string; display_name: string }>>([]);

  // Fetch brands on mount
  useEffect(() => {
    const fetchBrands = async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('chain_key, display_name')
        .order('display_name');
      
      if (error) {
        console.error('Failed to fetch brands:', error);
      } else {
        setBrands(data || []);
      }
    };
    
    fetchBrands();
  }, []);

  const updateTarget = (key: keyof MacroTargets, value: string | number) => {
    let validatedValue = typeof value === "string" ? Number(value) || 0 : value;

    // Validate inputs
    if (key === 'wP' || key === 'wC' || key === 'wR') {
      validatedValue = Math.max(0, Math.min(5, validatedValue));
    } else if (key === 'radiusKm') {
      validatedValue = Math.max(1, Math.min(30, validatedValue));
    } else if (key === 'priceCap') {
      validatedValue = Math.max(0, Math.min(100, validatedValue));
    } else if (key === 'targetProtein' || key === 'targetCalories') {
      validatedValue = Math.max(0, validatedValue);
    }

    onTargetsChange({
      ...targets,
      [key]: validatedValue,
    });
  };

  const applyPreset = (preset: keyof typeof PRESETS) => {
    const config = PRESETS[preset];
    onTargetsChange({
      ...targets,
      wP: config.wP,
      wC: config.wC,
      wR: config.wR,
    });
    toast({
      title: `${config.label} preset applied`,
      description: `Weights optimized for ${preset} goals`,
    });
  };

  const switchMode = (mode: "bulking" | "cutting") => {
    const newTargets = { ...targets, mode };
    
    // Auto-adjust default values based on mode
    if (mode === "bulking") {
      newTargets.targetCalories = Math.max(targets.targetCalories, 400);
      newTargets.wC = 0.4; // Higher calorie weight for bulking
      newTargets.wP = 0.4;
      newTargets.wR = 0.2;
    } else {
      newTargets.targetCalories = Math.min(targets.targetCalories, 300);
      newTargets.wP = 0.5; // Higher protein weight for cutting
      newTargets.wC = 0.3;
      newTargets.wR = 0.2;
    }
    
    onTargetsChange(newTargets);
  };

  const toggleBrand = (brandKey: string, action: 'include' | 'exclude') => {
    if (action === 'exclude') {
      const currentExcluded = targets.excludeBrands || [];
      const isExcluded = currentExcluded.includes(brandKey);
      
      onTargetsChange({
        ...targets,
        excludeBrands: isExcluded
          ? currentExcluded.filter(b => b !== brandKey)
          : [...currentExcluded, brandKey],
      });
    } else {
      const currentIncluded = targets.includeBrands || [];
      const isIncluded = currentIncluded.includes(brandKey);
      
      onTargetsChange({
        ...targets,
        includeBrands: isIncluded
          ? currentIncluded.filter(b => b !== brandKey)
          : [...currentIncluded, brandKey],
      });
    }
  };

  return (
    <TooltipProvider>
      <Card className="sticky top-6">
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {targets.mode === "bulking" ? (
            <TrendingUp className="h-5 w-5 text-primary" />
          ) : (
            <Target className="h-5 w-5 text-primary" />
          )}
          Macro Targets
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto">
                <span className="text-xs">ℹ️</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                <strong>Data sources:</strong> Locations from OpenStreetMap; nutrition from Nutritionix/USDA; prices user-reported or baseline.
              </p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preset Buttons */}
        <div>
          <Label className="text-sm mb-3 block">Quick Presets</Label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PRESETS).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(key as keyof typeof PRESETS)}
                  className="flex flex-col h-auto py-3 gap-1"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{config.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
        {/* Mode Selection */}
        <div className="space-y-3">
          <Label>Goal Mode</Label>
          <div className="flex gap-2">
            <Button
              variant={targets.mode === "bulking" ? "default" : "outline"}
              size="sm"
              onClick={() => switchMode("bulking")}
              className="flex-1"
            >
              Bulking
            </Button>
            <Button
              variant={targets.mode === "cutting" ? "default" : "outline"}
              size="sm"
              onClick={() => switchMode("cutting")}
              className="flex-1"
            >
              Cutting
            </Button>
          </div>
        </div>

        {/* Macro Targets */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="protein">Target Protein (g)</Label>
            <Input
              id="protein"
              type="number"
              value={targets.targetProtein}
              onChange={(e) => updateTarget("targetProtein", e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="calories">Target Calories</Label>
            <Input
              id="calories"
              type="number"
              value={targets.targetCalories}
              onChange={(e) => updateTarget("targetCalories", e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {/* Weighting Factors */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Priority Weights</Label>
            <Badge variant="secondary" className="text-xs">
              Total: {(targets.wP + targets.wC + targets.wR).toFixed(1)}
            </Badge>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-sm">Protein Match</Label>
              <span className="text-sm text-muted-foreground">{targets.wP.toFixed(1)}</span>
            </div>
            <Slider
              value={[targets.wP]}
              onValueChange={([value]) => updateTarget("wP", value)}
              max={5}
              step={0.1}
              className="w-full"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-sm">Calorie Match</Label>
              <span className="text-sm text-muted-foreground">{targets.wC.toFixed(1)}</span>
            </div>
            <Slider
              value={[targets.wC]}
              onValueChange={([value]) => updateTarget("wC", value)}
              max={5}
              step={0.1}
              className="w-full"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-sm">Distance/Price</Label>
              <span className="text-sm text-muted-foreground">{targets.wR.toFixed(1)}</span>
            </div>
            <Slider
              value={[targets.wR]}
              onValueChange={([value]) => updateTarget("wR", value)}
              max={5}
              step={0.1}
              className="w-full"
            />
          </div>
          <p className="text-xs text-muted-foreground">Range: 0-5 for all weights</p>
        </div>

        {/* Location Buttons */}
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={onLocationRequest}
            disabled={isGettingLocation}
          >
            {isGettingLocation ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Getting location...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Use my location
              </>
            )}
          </Button>

          <Button
            variant="secondary"
            className="w-full"
            onClick={onRefreshNearby}
            disabled={isRefreshingNearby}
          >
            {isRefreshingNearby ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Discovering restaurants...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Nearby
              </>
            )}
          </Button>
        </div>

        {/* Filters Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <Label className="text-base font-semibold">Filters</Label>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="priceCap">Max Price</Label>
              <span className="text-sm text-muted-foreground">${targets.priceCap}</span>
            </div>
            <Slider
              id="priceCap"
              value={[targets.priceCap]}
              onValueChange={([value]) => updateTarget("priceCap", value)}
              min={0}
              max={30}
              step={0.5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">$0 - $30</p>
          </div>

          <div>
            <Label htmlFor="minProtein">Minimum Protein (g)</Label>
            <Input
              id="minProtein"
              type="number"
              min="0"
              value={targets.minProtein || ""}
              onChange={(e) => {
                const value = e.target.value === "" ? undefined : Number(e.target.value);
                onTargetsChange({ ...targets, minProtein: value });
              }}
              placeholder="Optional"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Filter items below this protein amount</p>
          </div>

          <div>
            <Label>Chain Filter</Label>
            <div className="mt-2 max-h-40 overflow-y-auto space-y-2 border rounded-md p-3 bg-background">
              {brands.length === 0 ? (
                <p className="text-xs text-muted-foreground">Loading brands...</p>
              ) : (
                brands.map((brand) => {
                  const isIncluded = targets.includeBrands?.includes(brand.chain_key) || false;
                  const isExcluded = targets.excludeBrands?.includes(brand.chain_key) || false;
                  
                  return (
                    <div key={brand.chain_key} className="flex items-center justify-between space-x-2 py-1">
                      <span className="text-sm">{brand.display_name}</span>
                      <div className="flex gap-2">
                        <Button
                          variant={isIncluded ? "default" : "ghost"}
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => toggleBrand(brand.chain_key, 'include')}
                        >
                          Include
                        </Button>
                        <Button
                          variant={isExcluded ? "destructive" : "ghost"}
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => toggleBrand(brand.chain_key, 'exclude')}
                        >
                          Exclude
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {targets.includeBrands?.length ? `${targets.includeBrands.length} included` : ''} 
              {targets.includeBrands?.length && targets.excludeBrands?.length ? ', ' : ''}
              {targets.excludeBrands?.length ? `${targets.excludeBrands.length} excluded` : ''}
              {!targets.includeBrands?.length && !targets.excludeBrands?.length ? 'All chains included' : ''}
            </p>
          </div>
        </div>

        {/* Search Parameters */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="radius">Search Radius (km): {targets.radiusKm}</Label>
            <Input
              id="radius"
              type="number"
              min="1"
              max="30"
              value={targets.radiusKm}
              onChange={(e) => updateTarget("radiusKm", e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Range: 1-30 km</p>
          </div>
        </div>

        {/* Search Button */}
        <Button 
          onClick={onSearch} 
          disabled={isLoading}
          size="lg"
          className="w-full"
        >
          <Search className="h-4 w-4 mr-2" />
          {isLoading ? "Searching..." : "Find Foods"}
        </Button>
        <button
          onClick={onForceRefresh}
          disabled={isLoading}
          className="text-xs text-muted-foreground hover:text-foreground underline disabled:opacity-50 mt-2 text-center w-full"
        >
          Force refresh menus
        </button>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
};

export default ControlsPanel;