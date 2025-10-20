import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Utensils, MapPin, Search } from "lucide-react";

interface EmptyStateProps {
  hasLocation: boolean;
  onFindFoods: () => void;
  onLoadDemo?: () => void;
  isLoadingDemo?: boolean;
}

const EmptyState = ({ hasLocation, onFindFoods, onLoadDemo, isLoadingDemo }: EmptyStateProps) => {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="rounded-full bg-primary/10 p-6 mb-6">
          <Utensils className="h-12 w-12 text-primary" />
        </div>
        
        <h3 className="text-2xl font-semibold mb-2">
          {hasLocation ? "No Results Found" : "Ready to Find Your Perfect Meal?"}
        </h3>
        
        <p className="text-muted-foreground mb-8 max-w-md">
          {hasLocation 
            ? "Try adjusting your search parameters, increasing the radius, or raising the price cap to see more options."
            : "Discover high-protein, macro-friendly food options from restaurants near you. Adjust your preferences and let's find the best options!"}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          {!hasLocation && (
            <Button onClick={onFindFoods} size="lg" className="gap-2">
              <MapPin className="h-4 w-4" />
              Find Foods Near Me
            </Button>
          )}
          
          {hasLocation && (
            <Button onClick={onFindFoods} variant="outline" size="lg" className="gap-2">
              <Search className="h-4 w-4" />
              Search Again
            </Button>
          )}

          {onLoadDemo && (
            <Button 
              onClick={onLoadDemo} 
              variant="outline" 
              size="lg"
              disabled={isLoadingDemo}
            >
              {isLoadingDemo ? "Loading..." : "Try Demo Data"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmptyState;
