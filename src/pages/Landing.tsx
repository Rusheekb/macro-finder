import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Calculator, Zap, LogIn, LogOut } from "lucide-react";
import heroImage from "@/assets/macro-finder-hero.jpg";
import { useAuth } from "@/contexts/AuthContext";

const Landing = () => {
  const [selectedMode, setSelectedMode] = useState<"bulking" | "cutting">("bulking");
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate(`/app?mode=${selectedMode}`);
    } else {
      navigate("/auth");
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="relative container mx-auto px-4 py-16">
          {/* Header with Auth Button */}
          <div className="flex justify-end mb-8">
            {user ? (
              <Button variant="outline" onClick={handleSignOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            ) : (
              <Button variant="outline" onClick={() => navigate("/auth")} className="gap-2">
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>
          
          {/* Header */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Calculator className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold">MacroFinder</h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Find the perfect foods to hit your macro targets. Whether you're bulking or cutting, 
              we'll help you discover optimal food choices in your area.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-16">
        {/* Mode Selection */}
        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="text-2xl font-semibold text-center mb-8">Choose Your Goal</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card 
              className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                selectedMode === "bulking" ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
              }`}
              onClick={() => setSelectedMode("bulking")}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Bulking</CardTitle>
                <CardDescription>
                  Maximize muscle growth and strength gains
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="secondary" className="w-full justify-center">Higher Calories</Badge>
                  <Badge variant="secondary" className="w-full justify-center">Protein Focus</Badge>
                  <Badge variant="secondary" className="w-full justify-center">Nutrient Dense</Badge>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                selectedMode === "cutting" ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
              }`}
              onClick={() => setSelectedMode("cutting")}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Cutting</CardTitle>
                <CardDescription>
                  Lean down while preserving muscle mass
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="secondary" className="w-full justify-center">Lower Calories</Badge>
                  <Badge variant="secondary" className="w-full justify-center">High Protein</Badge>
                  <Badge variant="secondary" className="w-full justify-center">Filling Foods</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Smart Calculations</h3>
              <p className="text-sm text-muted-foreground">
                Advanced algorithms to match foods with your exact macro needs
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Location-Based</h3>
              <p className="text-sm text-muted-foreground">
                Find available foods and restaurants within your specified radius
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Real-Time Results</h3>
              <p className="text-sm text-muted-foreground">
                Instantly ranked results with pricing and nutritional data
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button 
            size="lg" 
            onClick={handleGetStarted}
            className="px-8 py-6 text-lg font-semibold"
          >
            {user ? `Continue with ${selectedMode === "bulking" ? "Bulking" : "Cutting"}` : "Get Started"}
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            {user ? "Your preferences are saved" : "Create an account to save your preferences"}
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t">
        <p className="text-center text-muted-foreground text-sm">
          © 2024 MacroFinder. Built with React, TypeScript, and Tailwind CSS.
          <br />
          Restaurant data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">OpenStreetMap contributors</a>
        </p>
      </footer>
    </div>
  );
};

export default Landing;