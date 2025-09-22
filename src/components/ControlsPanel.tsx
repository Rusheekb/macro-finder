import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, Target } from "lucide-react";
import { MacroTargets } from "@/pages/MacroApp";

interface ControlsPanelProps {
  targets: MacroTargets;
  onTargetsChange: (targets: MacroTargets) => void;
  onSearch: () => void;
  isLoading: boolean;
}

const ControlsPanel = ({
  targets,
  onTargetsChange,
  onSearch,
  isLoading,
}: ControlsPanelProps) => {
  const updateTarget = (key: keyof MacroTargets, value: string | number) => {
    onTargetsChange({
      ...targets,
      [key]: typeof value === "string" ? Number(value) || 0 : value,
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

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {targets.mode === "bulking" ? (
            <TrendingUp className="h-5 w-5 text-primary" />
          ) : (
            <Target className="h-5 w-5 text-primary" />
          )}
          Macro Targets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
              <span className="text-sm text-muted-foreground">{targets.wP}</span>
            </div>
            <Slider
              value={[targets.wP]}
              onValueChange={([value]) => updateTarget("wP", value)}
              max={1}
              step={0.1}
              className="w-full"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-sm">Calorie Match</Label>
              <span className="text-sm text-muted-foreground">{targets.wC}</span>
            </div>
            <Slider
              value={[targets.wC]}
              onValueChange={([value]) => updateTarget("wC", value)}
              max={1}
              step={0.1}
              className="w-full"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-sm">Distance</Label>
              <span className="text-sm text-muted-foreground">{targets.wR}</span>
            </div>
            <Slider
              value={[targets.wR]}
              onValueChange={([value]) => updateTarget("wR", value)}
              max={1}
              step={0.1}
              className="w-full"
            />
          </div>
        </div>

        {/* Search Parameters */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="radius">Search Radius (km)</Label>
            <Input
              id="radius"
              type="number"
              value={targets.radiusKm}
              onChange={(e) => updateTarget("radiusKm", e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="priceCap">Max Price ($)</Label>
            <Input
              id="priceCap"
              type="number"
              value={targets.priceCap}
              onChange={(e) => updateTarget("priceCap", e.target.value)}
              className="mt-1"
            />
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
      </CardContent>
    </Card>
  );
};

export default ControlsPanel;