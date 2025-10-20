import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, DollarSign, Utensils, Edit } from "lucide-react";
import { FoodResult } from "@/pages/MacroApp";
import { formatDistanceToNow } from "date-fns";

interface ResultCardProps {
  result: FoodResult;
  rank: number;
  onEditPrice: () => void;
}

const ResultCard = ({ result, rank, onEditPrice }: ResultCardProps) => {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow animate-in fade-in-50 duration-300">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-start gap-2 mb-1">
            <Badge variant="secondary" className="text-xs">
              #{rank}
            </Badge>
            <h3 className="font-semibold text-base leading-tight">{result.name}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{result.restaurant}</p>
          {result.distance !== undefined && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="h-3 w-3" />
              <span>{result.distance.toFixed(1)} km away</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-primary font-bold">
            <Star className="h-4 w-4 fill-primary" />
            <span>{result.score.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t">
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-xs text-muted-foreground">Protein</div>
            <div className="font-semibold">{result.protein}g</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-xs text-muted-foreground">Calories</div>
            <div className="font-semibold">{result.calories}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-xs text-muted-foreground">Price</div>
            <div className="font-semibold flex items-center gap-1">
              ${result.price.toFixed(2)}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onEditPrice}
              >
                <Edit className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {result.priceUpdatedAt && (
          <div className="col-span-2 text-xs text-muted-foreground">
            Price updated {formatDistanceToNow(new Date(result.priceUpdatedAt), { addSuffix: true })}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ResultCard;
