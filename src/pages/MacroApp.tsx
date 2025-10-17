import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ControlsPanel from "@/components/ControlsPanel";
import ResultsTable from "@/components/ResultsTable";
import Loader from "@/components/Loader";
import { rankItems, type RankResult } from "@/api/rank";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { findNearestMetro } from "@/lib/metros";

const STORAGE_KEY = "macroFinder_settings";
const REFRESH_TIMESTAMP_KEY = "macroFinder_lastRefresh";

export interface MacroTargets {
  mode: "bulking" | "cutting";
  targetProtein: number;
  targetCalories: number;
  wP: number;
  wC: number;
  wR: number;
  radiusKm: number;
  priceCap: number;
  minProtein?: number;
  includeBrands?: string[];
  excludeBrands?: string[];
  lat?: number;
  lng?: number;
}

export interface FoodResult {
  id: string;
  restaurantId: string;
  itemId: string;
  name: string;
  restaurant: string;
  protein: number;
  calories: number;
  price: number;
  distance?: number;
  score: number;
  priceUpdatedAt?: string;
}

const MacroApp = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isRefreshingNearby, setIsRefreshingNearby] = useState(false);
  const [isRefreshingMenus, setIsRefreshingMenus] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [nearbyRestaurantCount, setNearbyRestaurantCount] = useState<number | null>(null);
  const [isZipModalOpen, setIsZipModalOpen] = useState(false);
  const [zipInput, setZipInput] = useState("");
  const [isLoadingZip, setIsLoadingZip] = useState(false);
  const zipResolveRef = useRef<((coords: { lat: number; lng: number } | null) => void) | null>(null);
  const [dbStatus, setDbStatus] = useState<{
    brandCount: number;
    restaurantCount: number;
    itemCount: number;
    localPriceCount: number;
    projectRef: string;
  } | null>(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
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

  // Fetch database status on mount
  useEffect(() => {
    const fetchDbStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('db_status');
        if (!error && data) {
          setDbStatus(data);
        }
      } catch (error) {
        console.error('Failed to fetch db status:', error);
      }
    };
    fetchDbStatus();
  }, []);

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

  const performSearch = useCallback(async (forceRefresh = false) => {
    console.log('🔍 [SEARCH FLOW] Starting performSearch', { 
      forceRefresh, 
      hasLocation: !!(targets.lat && targets.lng),
      location: targets.lat && targets.lng ? { lat: targets.lat, lng: targets.lng } : 'NO LOCATION',
      radiusKm: targets.radiusKm 
    });
    
    setIsLoading(true);
    
    try {
      // Check if location is in a seeded metro area
      let isInSeededArea = false;
      let nearestMetroInfo = null;
      if (targets.lat !== undefined && targets.lng !== undefined) {
        nearestMetroInfo = findNearestMetro(targets.lat, targets.lng, 20);
        isInSeededArea = nearestMetroInfo !== null;
        
        if (isInSeededArea && nearestMetroInfo) {
          console.log(`📍 Location is near ${nearestMetroInfo.metro.name} (${nearestMetroInfo.distance.toFixed(1)}km away)`);
          setLoadingMessage(`Loading results near ${nearestMetroInfo.metro.name}...`);
        } else {
          console.log('🌍 Location not in pre-seeded area, discovering restaurants...');
          setLoadingMessage('Discovering restaurants in your area (this may take 10-15 seconds)...');
        }
      }

      // Check if we need to refresh brand menus (only if location is available)
      if (targets.lat && targets.lng) {
        const lastRefresh = localStorage.getItem(REFRESH_TIMESTAMP_KEY);
        const now = Date.now();
        const thirtyMinutes = 30 * 60 * 1000;
        const shouldRefresh = forceRefresh || !lastRefresh || (now - parseInt(lastRefresh)) > thirtyMinutes;
        
        console.log('🔍 [SEARCH FLOW] Menu refresh check', { 
          shouldRefresh, 
          forceRefresh,
          lastRefresh: lastRefresh ? new Date(parseInt(lastRefresh)).toISOString() : 'NEVER',
          minutesSinceRefresh: lastRefresh ? Math.round((now - parseInt(lastRefresh)) / 60000) : 'N/A'
        });
        
        // Refresh if never refreshed, forced, or last refresh was more than 30 minutes ago
        if (shouldRefresh) {
          setIsRefreshingMenus(true);
          console.log('🔄 [REFRESH] Calling refresh_brand_menus edge function...');
          
          try {
            const { data: refreshData, error: refreshError } = await supabase.functions.invoke(
              'refresh_brand_menus',
              {
                body: { 
                  lat: targets.lat, 
                  lng: targets.lng, 
                  radiusKm: targets.radiusKm,
                  includeBrands: targets.includeBrands 
                },
              }
            );

            if (refreshError) {
              console.error('❌ [REFRESH] Menu refresh error:', refreshError);
            } else if (refreshData) {
              console.log('✅ [REFRESH] Menu refresh result:', refreshData);
              if (refreshData.brandsImported > 0) {
                toast({
                  title: "Menus refreshed",
                  description: `Updated ${refreshData.brandsImported} brand menu${refreshData.brandsImported !== 1 ? 's' : ''}`,
                });
              }
            }
            
            // Store timestamp regardless of success/failure to avoid hammering
            localStorage.setItem(REFRESH_TIMESTAMP_KEY, now.toString());
          } catch (error) {
            console.error('❌ [REFRESH] Menu refresh failed:', error);
          } finally {
            setIsRefreshingMenus(false);
          }
        }
      } else {
        console.warn('⚠️ [SEARCH FLOW] No location available, skipping menu refresh');
      }

      console.log('🎯 [RANK] Calling rankItems edge function...');
      const rankResults = await rankItems({
        mode: targets.mode,
        targetProtein: targets.targetProtein,
        targetCalories: targets.targetCalories,
        wP: targets.wP,
        wC: targets.wC,
        wR: targets.wR,
        radiusKm: targets.radiusKm,
        priceCap: targets.priceCap,
        minProtein: targets.minProtein,
        includeBrands: targets.includeBrands,
        excludeBrands: targets.excludeBrands,
        lat: targets.lat,
        lng: targets.lng,
      });

      console.log('✅ [RANK] Received results:', { count: rankResults.length });

      // Map to FoodResult format
      const mappedResults: FoodResult[] = rankResults.map((item) => ({
        id: item.itemId,
        restaurantId: item.restaurantId,
        itemId: item.itemId,
        name: item.itemName,
        restaurant: item.restaurantName,
        protein: item.protein,
        calories: item.calories,
        price: item.price,
        distance: item.distance,
        score: item.score,
        priceUpdatedAt: item.priceUpdatedAt,
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
      performSearch(false);
    }, 500);
  }, [performSearch]);

  const fetchCoordsFromZip = async (zip: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.places && data.places.length > 0) {
        return {
          lat: Number(parseFloat(data.places[0].latitude).toFixed(6)),
          lng: Number(parseFloat(data.places[0].longitude).toFixed(6)),
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch coordinates from ZIP:', error);
      return null;
    }
  };

  const handleZipSubmit = async () => {
    if (!zipInput.trim()) {
      toast({
        title: "ZIP code required",
        description: "Please enter a valid ZIP code.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingZip(true);
    const coords = await fetchCoordsFromZip(zipInput.trim());
    setIsLoadingZip(false);

    if (!coords) {
      toast({
        title: "Invalid ZIP code",
        description: "Could not find coordinates for this ZIP code.",
        variant: "destructive",
      });
      return;
    }

    setIsZipModalOpen(false);
    setZipInput("");
    
    if (zipResolveRef.current) {
      zipResolveRef.current(coords);
      zipResolveRef.current = null;
    }
  };

  const ensureLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      // If we already have location, use it
      if (targets.lat && targets.lng) {
        resolve({ lat: targets.lat, lng: targets.lng });
        return;
      }

      // Try to get geolocation
      if (!navigator.geolocation) {
        // No geolocation support, prompt for ZIP
        zipResolveRef.current = resolve;
        setIsZipModalOpen(true);
        return;
      }

      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsGettingLocation(false);
          const coords = {
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
          };
          resolve(coords);
        },
        (error) => {
          setIsGettingLocation(false);
          // Geolocation denied or failed, prompt for ZIP
          zipResolveRef.current = resolve;
          setIsZipModalOpen(true);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    });
  };

  const handleFindFoods = async () => {
    console.log('🚀 [FIND FOODS] User clicked Find Foods button');
    
    const coords = await ensureLocation();
    
    if (!coords) {
      console.warn('⚠️ [FIND FOODS] No location provided by user');
      toast({
        title: "Location required",
        description: "Please provide your location to find foods.",
        variant: "destructive",
      });
      return;
    }

    console.log('📍 [FIND FOODS] Location obtained:', coords);

    // Update targets with location
    setTargets((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }));
    
    // Perform search with the new location
    await performSearch(false);
  };

  const handleForceRefresh = async () => {
    console.log('🔄 [FORCE REFRESH] User clicked force refresh button');
    // Clear the refresh timestamp to force a refresh
    localStorage.removeItem(REFRESH_TIMESTAMP_KEY);
    await performSearch(true);
  };

  const handleLoadDemoData = useCallback(async () => {
    console.log('📦 [DEMO DATA] User clicked Load Demo Data');
    setIsLoadingDemo(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed_demo');
      
      if (error) throw error;

      console.log('✅ [DEMO DATA] Successfully loaded:', data);

      toast({
        title: "Demo data loaded",
        description: `Loaded ${data.inserted.brands} brands, ${data.inserted.menuItems} items, ${data.inserted.restaurants} restaurants`,
      });

      // Refresh db status
      const { data: statusData } = await supabase.functions.invoke('db_status');
      if (statusData) {
        setDbStatus(statusData);
      }

      // Set Frisco, TX coordinates for demo data
      const friscoCoords = { lat: 33.1507, lng: -96.8236 };
      console.log('📍 [DEMO DATA] Setting location to Frisco, TX:', friscoCoords);
      setTargets((prev) => ({ ...prev, ...friscoCoords }));

      // Trigger a new search after demo data loads
      await performSearch(false);
    } catch (error) {
      console.error('❌ [DEMO DATA] Failed to load demo data:', error);
      toast({
        title: "Failed to load demo data",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDemo(false);
    }
  }, [toast, performSearch]);

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
          setNearbyRestaurantCount(count);
          
          if (count === 0) {
            toast({
              title: "No chains found nearby",
              description: `Try increasing radius or search by ZIP code`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Restaurants updated",
              description: `Found ${count} restaurant${count !== 1 ? 's' : ''} nearby`,
            });
          }

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
              onSearch={handleFindFoods}
              isLoading={isLoading}
              onLocationRequest={handleLocationRequest}
              isGettingLocation={isGettingLocation}
              onRefreshNearby={handleRefreshNearby}
              isRefreshingNearby={isRefreshingNearby}
              onForceRefresh={handleForceRefresh}
            />
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            {isRefreshingMenus && (
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-3 rounded-lg">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                <span>Refreshing menus...</span>
              </div>
            )}
            {isLoading ? (
              <Loader message={loadingMessage} />
            ) : (
              <ResultsTable 
                results={results} 
                onPriceUpdate={handleSearch}
              />
            )}
          </div>
        </div>

        {/* Database Status Badge */}
        {dbStatus && (
          <div className="fixed bottom-4 right-4 z-50">
            {dbStatus.brandCount === 0 || dbStatus.restaurantCount === 0 || dbStatus.itemCount === 0 ? (
              <div className="flex flex-col gap-2 items-end">
                <Button
                  onClick={handleLoadDemoData}
                  disabled={isLoadingDemo}
                  size="sm"
                  className="shadow-lg"
                >
                  {isLoadingDemo ? 'Loading...' : 'Load demo data'}
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 bg-yellow-500/90 text-yellow-950 px-3 py-2 rounded-lg shadow-lg text-sm font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        <span>No seed data found</span>
                        <span className="text-xs opacity-70 ml-1">({dbStatus.projectRef.slice(0, 6)})</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Click 'Load demo data' to insert sample chains/items.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ) : (
              <div className="bg-muted/80 px-3 py-2 rounded-lg shadow text-xs text-muted-foreground">
                DB: {dbStatus.projectRef.slice(0, 6)}
              </div>
            )}
          </div>
        )}

        {/* ZIP Code Modal */}
        <Dialog open={isZipModalOpen} onOpenChange={setIsZipModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enter ZIP Code</DialogTitle>
              <DialogDescription>
                We need your location to find nearby restaurants. Please enter your ZIP code.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  placeholder="e.g., 90210"
                  value={zipInput}
                  onChange={(e) => setZipInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleZipSubmit();
                    }
                  }}
                  maxLength={5}
                />
              </div>
              <Button
                onClick={handleZipSubmit}
                disabled={isLoadingZip}
                className="w-full"
              >
                {isLoadingZip ? 'Loading...' : 'Continue'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MacroApp;