import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Database, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSeedDemo = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('seed_demo');
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Demo data seeded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to seed demo data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedSample = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('seed_sample');
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Sample data seeded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to seed sample data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedMetros = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('seed_metros');
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Metro data seeded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to seed metro data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/app')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to App
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage brands, menus, and data</p>
          </div>
        </div>

        <Tabs defaultValue="data" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="data">Data Management</TabsTrigger>
            <TabsTrigger value="import">Import Data</TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Database Seeding</CardTitle>
                <CardDescription>
                  Populate the database with sample or demo data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Demo Data</h3>
                    <p className="text-sm text-muted-foreground">
                      Load demo restaurants and menu items
                    </p>
                  </div>
                  <Button onClick={handleSeedDemo} disabled={isLoading}>
                    <Database className="h-4 w-4 mr-2" />
                    Seed Demo
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Sample Data</h3>
                    <p className="text-sm text-muted-foreground">
                      Load sample menu items for testing
                    </p>
                  </div>
                  <Button onClick={handleSeedSample} disabled={isLoading}>
                    <Database className="h-4 w-4 mr-2" />
                    Seed Sample
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Metro Areas</h3>
                    <p className="text-sm text-muted-foreground">
                      Load major metro area data
                    </p>
                  </div>
                  <Button onClick={handleSeedMetros} disabled={isLoading}>
                    <Database className="h-4 w-4 mr-2" />
                    Seed Metros
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Import Menu Data</CardTitle>
                <CardDescription>
                  Import menu items from nutrition databases or manual CSV upload
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">API Import (Nutritionix/USDA)</h3>
                    <p className="text-sm text-muted-foreground">
                      Fetch menu data automatically from nutrition databases
                    </p>
                  </div>
                  <Button onClick={() => navigate('/admin/brand-import')}>
                    <Upload className="h-4 w-4 mr-2" />
                    Brand Import
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Manual CSV Upload</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload menu items from a CSV file for manual curation
                    </p>
                  </div>
                  <Button onClick={() => navigate('/admin/menu-upload')}>
                    <Upload className="h-4 w-4 mr-2" />
                    CSV Upload
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
