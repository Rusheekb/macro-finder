import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";

interface Step {
  label: string;
  status: "pending" | "loading" | "complete";
}

interface ProgressIndicatorProps {
  steps: Step[];
}

const ProgressIndicator = ({ steps }: ProgressIndicatorProps) => {
  return (
    <Card className="mb-4">
      <CardContent className="py-4">
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-3">
              {step.status === "complete" && (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              )}
              {step.status === "loading" && (
                <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
              )}
              {step.status === "pending" && (
                <div className="h-5 w-5 rounded-full border-2 border-muted shrink-0" />
              )}
              <span 
                className={`text-sm ${
                  step.status === "complete" 
                    ? "text-foreground font-medium" 
                    : step.status === "loading"
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgressIndicator;
