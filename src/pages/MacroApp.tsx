import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin } from "lucide-react";
import ControlsPanel from "@/components/ControlsPanel";
import ResultsTable from "@/components/ResultsTable";
import Loader from "@/components/Loader";
import { rankItems, type RankResult } from "@/api/rank";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "macroFinder_settings";

export interface MacroTargets {
  mode: "bulking" | "cutting";
  targetProtein: number;
  targetCalories: number;
  wP: number;
  wC: number;
  wR: number;
  radiusKm: number;
  priceCap: number;
  lat?: number;
  lng?: number;
}

export interface FoodResult {
  id: string;
  name: string;
  restaurant: string;
  protein: number;
  calories: number;
  price: number;
  distance?: number;
  score: number;
}

const MacroApp = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isRefreshingNearby, setIsRefreshingNearby] = useState(false);
  const [results, setResults] = useState<FoodResult[]>([]);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const isInitialMount = useRef(true);

  // Load settings from localStorage or URL params
  const getInitialTargets = (): MacroTargets => {
    // Priority 1: URL params
    if (searchParams.toString()) {
      return {
        mode: (searchParams.get("mode") as "bulking" | "cutting") || "bulking",
        targetProtein: Number(searchParams.get("targetProtein")) || 30,
        targetCalories: Number(searchParams.get("targetCalories")) || 500,
        wP: Number(searchParams.get("wP")) || 0.5,
        wC: Number(searchParams.get("wC")) || 0.3,
        wR: Number(searchParams.get("wR")) || 0.2,
        radiusKm: Number(searchParams.get("radiusKm")) || 5,
        priceCap: Number(searchParams.get("priceCap")) || 20,
        lat: searchParams.get("lat") ? Number(searchParams.get("lat")) : undefined,
        lng: searchParams.get("lng") ? Number(searchParams.get("lng")) : undefined,
      };
    }

    // Priority 2: localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage:", error);
    }

    // Priority 3: defaults
    return {
      mode: "bulking",
      targetProtein: 30,
      targetCalories: 500,
      wP: 0.5,
      wC: 0.3,
      wR: 0.2,
      radiusKm: 5,
      priceCap: 20,
    };
  };

  const [targets, setTargets] = useState<MacroTargets>(getInitialTargets);

  // Update URL and localStorage when targets change
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(targets).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, value.toString());
      }
    });
    setSearchParams(params, { replace: true });

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
    } catch (error) {
      console.error("Failed to save settings to localStorage:", error);
    }

    // Trigger search after initial mount
    if (!isInitialMount.current) {
      handleSearch();
    } else {
      isInitialMount.current = false;
    }
  }, [targets]);

  const performSearch = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const rankResults = await rankItems({
        mode: targets.mode,
        targetProtein: targets.targetProtein,
        targetCalories: targets.targetCalories,
        wP: targets.wP,
        wC: targets.wC,
        wR: targets.wR,
        radiusKm: targets.radiusKm,
        priceCap: targets.priceCap,
        lat: targets.lat,
        lng: targets.lng,
      });

      // Map to FoodResult format
      const mappedResults: FoodResult[] = rankResults.map((item) => ({
        id: item.itemId,
        name: item.itemName,
        restaurant: item.restaurantName,
        protein: item.protein,
        calories: item.calories,
        price: item.price,
        distance: item.distance,
        score: item.score,
      }));

      setResults(mappedResults);

      if (mappedResults.length === 0) {
        toast({
          title: "No results found",
          description: "Try adjusting your search parameters or price cap.",
        });
      }
    } catch (error) {
      console.error("Search failed:", error);
      toast({
        title: "Search failed",
        description: "Unable to fetch results. Please try again.",
        variant: "destructive",
      });
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [targets, toast]);

  const handleSearch = useCallback(() => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer for debounced search
    debounceTimer.current = setTimeout(() => {
      performSearch();
    }, 500);
  }, [performSearch]);

  const handleLocationRequest = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));

        setTargets((prev) => ({ ...prev, lat, lng }));
        setIsGettingLocation(false);

        toast({
          title: "Location detected",
          description: `Searching within ${targets.radiusKm}km of your location`,
        });
      },
      (error) => {
        setIsGettingLocation(false);
        let message = "Failed to get your location.";

        if (error.code === error.PERMISSION_DENIED) {
          message = "Location access denied. Please enable location permissions.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Location information unavailable.";
        } else if (error.code === error.TIMEOUT) {
          message = "Location request timed out.";
        }

        toast({
          title: "Location error",
          description: message,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, [toast, targets.radiusKm]);

  const handleRefreshNearby = useCallback(async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      });
      return;
    }

    setIsRefreshingNearby(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));

        try {
          toast({
            title: "Discovering nearby restaurants",
            description: "Fetching restaurants from OpenStreetMap...",
          });

          const { data, error } = await supabase.functions.invoke('nearby', {
            body: { lat, lng, radiusKm: targets.radiusKm },
          });

          if (error) throw error;

          const count = data?.count || 0;
          toast({
            title: "Restaurants updated",
            description: `Found ${count} restaurant${count !== 1 ? 's' : ''} nearby`,
          });

          // Update location and trigger search
          setTargets((prev) => ({ ...prev, lat, lng }));
          
        } catch (error) {
          console.error('Refresh nearby failed:', error);
          toast({
            title: "Refresh failed",
            description: "Unable to fetch nearby restaurants. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsRefreshingNearby(false);
        }
      },
      (error) => {
        setIsRefreshingNearby(false);
        let message = "Failed to get your location.";

        if (error.code === error.PERMISSION_DENIED) {
          message = "Location access denied. Please enable location permissions.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Location information unavailable.";
        } else if (error.code === error.TIMEOUT) {
          message = "Location request timed out.";
        }

        toast({
          title: "Location error",
          description: message,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, [toast, targets.radiusKm, supabase]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

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
            <h1 className="text-2xl font-bold">MacroFinder</h1>
            <p className="text-muted-foreground">
              Find foods that match your {targets.mode} goals
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Controls Panel */}
          <div className="lg:col-span-1">
            <ControlsPanel
              targets={targets}
              onTargetsChange={setTargets}
              onSearch={handleSearch}
              isLoading={isLoading}
              onLocationRequest={handleLocationRequest}
              isGettingLocation={isGettingLocation}
              onRefreshNearby={handleRefreshNearby}
              isRefreshingNearby={isRefreshingNearby}
            />
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <Loader />
            ) : (
              <ResultsTable results={results} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MacroApp;