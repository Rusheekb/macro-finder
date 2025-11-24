import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface ParsedItem {
  brand_chain_key: string;
  item_name: string;
  calories: string;
  protein_g: string;
  default_price?: string;
  notes?: string;
  status: 'ok' | 'error' | 'warning';
  statusMessage?: string;
  brand_id?: string;
}

interface UpsertResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ item_name: string; reason: string }>;
}

export default function AdminMenuUpload() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UpsertResult | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast({
            title: "Invalid CSV",
            description: "CSV must have at least a header row and one data row",
            variant: "destructive",
          });
          return;
        }

        // Parse header
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = ['brand_chain_key', 'item_name', 'calories', 'protein_g'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          toast({
            title: "Invalid CSV",
            description: `Missing required columns: ${missingHeaders.join(', ')}`,
            variant: "destructive",
          });
          return;
        }

        // Fetch all brands for resolution
        const { data: brands, error: brandsError } = await supabase
          .from('brands')
          .select('id, chain_key, display_name');

        if (brandsError) {
          toast({
            title: "Error",
            description: "Failed to fetch brands from database",
            variant: "destructive",
          });
          return;
        }

        // Parse data rows
        const items: ParsedItem[] = [];
        const seenItems = new Set<string>();

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const row: any = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });

          const item: ParsedItem = {
            brand_chain_key: row.brand_chain_key,
            item_name: row.item_name,
            calories: row.calories,
            protein_g: row.protein_g,
            default_price: row.default_price,
            notes: row.notes,
            status: 'ok',
          };

          // Validate and resolve brand
          const brand = brands?.find(b => b.chain_key === item.brand_chain_key);
          if (!brand) {
            item.status = 'error';
            item.statusMessage = `Brand not found: ${item.brand_chain_key}`;
          } else {
            item.brand_id = brand.id;
          }

          // Validate required fields
          if (!item.item_name) {
            item.status = 'error';
            item.statusMessage = 'Item name is required';
          } else if (!item.calories || isNaN(Number(item.calories)) || Number(item.calories) < 0) {
            item.status = 'error';
            item.statusMessage = 'Invalid calories value';
          } else if (!item.protein_g || isNaN(Number(item.protein_g)) || Number(item.protein_g) < 0) {
            item.status = 'error';
            item.statusMessage = 'Invalid protein value';
          } else if (item.default_price && (isNaN(Number(item.default_price)) || Number(item.default_price) < 0)) {
            item.status = 'error';
            item.statusMessage = 'Invalid price value';
          }

          // Check for duplicates within file
          const itemKey = `${item.brand_chain_key}:${item.item_name.toLowerCase()}`;
          if (seenItems.has(itemKey)) {
            item.status = 'warning';
            item.statusMessage = 'Duplicate item in CSV';
          } else {
            seenItems.add(itemKey);
          }

          items.push(item);
        }

        setParsedItems(items);
        setUploadResult(null);
        
        const errorCount = items.filter(i => i.status === 'error').length;
        const warningCount = items.filter(i => i.status === 'warning').length;
        
        toast({
          title: "CSV Parsed",
          description: `${items.length} items found. ${errorCount} errors, ${warningCount} warnings.`,
        });
      } catch (error) {
        toast({
          title: "Parse Error",
          description: "Failed to parse CSV file. Please check the format.",
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file);
  };

  const handleCommit = async () => {
    const validItems = parsedItems.filter(item => item.status !== 'error' && item.brand_id);
    
    if (validItems.length === 0) {
      toast({
        title: "No Valid Items",
        description: "There are no valid items to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const itemsToUpload = validItems.map(item => ({
        brand_id: item.brand_id!,
        item_name: item.item_name,
        calories: Number(item.calories),
        protein_g: Number(item.protein_g),
        default_price: item.default_price ? Number(item.default_price) : undefined,
        notes: item.notes || undefined,
      }));

      const { data, error } = await supabase.functions.invoke('bulk_upsert_menu_items', {
        body: { items: itemsToUpload },
      });

      if (error) throw error;

      setUploadResult(data as UpsertResult);
      toast({
        title: "Upload Complete",
        description: `${data.inserted} inserted, ${data.updated} updated, ${data.skipped} skipped`,
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const validCount = parsedItems.filter(i => i.status === 'ok' || i.status === 'warning').length;
  const errorCount = parsedItems.filter(i => i.status === 'error').length;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
          <h1 className="text-3xl font-bold">Manual Menu Upload</h1>
        </div>

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Upload CSV File</h2>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                CSV must include headers: <strong>brand_chain_key, item_name, calories, protein_g</strong>
                <br />
                Optional columns: <strong>default_price, notes</strong>
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-4">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose CSV File
                  </span>
                </Button>
              </label>

              {parsedItems.length > 0 && (
                <Button
                  onClick={handleCommit}
                  disabled={isUploading || validCount === 0}
                >
                  {isUploading ? "Uploading..." : `Upload ${validCount} Items`}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {uploadResult && (
          <Card className="p-6 mb-6 bg-muted">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Upload Results
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Inserted</p>
                <p className="text-2xl font-bold text-green-600">{uploadResult.inserted}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Updated</p>
                <p className="text-2xl font-bold text-blue-600">{uploadResult.updated}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Skipped</p>
                <p className="text-2xl font-bold text-orange-600">{uploadResult.skipped}</p>
              </div>
            </div>
            {uploadResult.errors.length > 0 && (
              <div className="mt-4">
                <p className="font-semibold text-destructive mb-2">Errors:</p>
                <div className="max-h-32 overflow-y-auto space-y-1 text-sm">
                  {uploadResult.errors.map((err, i) => (
                    <p key={i} className="text-muted-foreground">
                      {err.item_name}: {err.reason}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {parsedItems.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Preview ({parsedItems.length} items)
            </h3>
            <div className="mb-4 flex gap-4 text-sm">
              <span className="text-green-600">✓ Valid: {validCount}</span>
              <span className="text-destructive">✗ Errors: {errorCount}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Brand</th>
                    <th className="text-left p-2">Item Name</th>
                    <th className="text-left p-2">Calories</th>
                    <th className="text-left p-2">Protein</th>
                    <th className="text-left p-2">Price</th>
                    <th className="text-left p-2">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedItems.map((item, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">
                        {item.status === 'ok' && <span className="text-green-600">✓</span>}
                        {item.status === 'warning' && <span className="text-orange-600">⚠</span>}
                        {item.status === 'error' && <span className="text-destructive">✗</span>}
                      </td>
                      <td className="p-2">{item.brand_chain_key}</td>
                      <td className="p-2">{item.item_name}</td>
                      <td className="p-2">{item.calories}</td>
                      <td className="p-2">{item.protein_g}</td>
                      <td className="p-2">{item.default_price || '-'}</td>
                      <td className="p-2 text-muted-foreground">{item.statusMessage || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
