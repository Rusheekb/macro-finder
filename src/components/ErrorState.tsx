import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

const ErrorState = ({ 
  message = "Something went wrong while loading results. Please try again.", 
  onRetry,
  isRetrying = false 
}: ErrorStateProps) => {
  return (
    <Card className="border-destructive/50">
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="rounded-full bg-destructive/10 p-6 mb-6">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
        
        <h3 className="text-2xl font-semibold mb-2">Oops! Something Went Wrong</h3>
        
        <p className="text-muted-foreground mb-8 max-w-md">
          {message}
        </p>

        {onRetry && (
          <Button 
            onClick={onRetry} 
            size="lg" 
            className="gap-2"
            disabled={isRetrying}
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? "Retrying..." : "Try Again"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ErrorState;
