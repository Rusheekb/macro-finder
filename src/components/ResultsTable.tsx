import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Star, MapPin, DollarSign, Utensils } from "lucide-react";
import { FoodResult } from "@/pages/MacroApp";

interface ResultsTableProps {
  results: FoodResult[];
}

type SortField = "score" | "protein" | "calories" | "price" | "distance";
type SortDirection = "asc" | "desc";

const ResultsTable = ({ results }: ResultsTableProps) => {
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
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
                  <td className="py-3">${result.price.toFixed(2)}</td>
                  <td className="py-3">{result.distance.toFixed(1)} km</td>
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
                
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">${result.price.toFixed(2)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{result.distance.toFixed(1)} km</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultsTable;