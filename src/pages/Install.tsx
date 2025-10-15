import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, CheckCircle, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Install = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      toast({
        title: "App installed!",
        description: "MacroFinder has been added to your home screen.",
      });
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [toast]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast({
        title: "Installation not available",
        description: "Please use your browser's menu to install this app.",
        variant: "destructive",
      });
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card className="border-2">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Smartphone className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-3xl">Install MacroFinder</CardTitle>
            <CardDescription className="text-base mt-2">
              Get the app on your phone for quick access anytime
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {isInstalled ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Already Installed!</h3>
                <p className="text-muted-foreground">
                  MacroFinder is already on your home screen. You can close this page and open the app from there.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 rounded-full p-2 mt-1">
                      <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Works Offline</h4>
                      <p className="text-sm text-muted-foreground">
                        Access your macro targets even without internet
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 rounded-full p-2 mt-1">
                      <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Fast & Responsive</h4>
                      <p className="text-sm text-muted-foreground">
                        Loads instantly from your home screen
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 rounded-full p-2 mt-1">
                      <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Location-Based Search</h4>
                      <p className="text-sm text-muted-foreground">
                        Find macro-friendly foods nearby anytime
                      </p>
                    </div>
                  </div>
                </div>

                {isInstallable ? (
                  <Button 
                    onClick={handleInstall} 
                    className="w-full" 
                    size="lg"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Install Now
                  </Button>
                ) : (
                  <div className="bg-muted rounded-lg p-6 text-center">
                    <h4 className="font-semibold mb-2">Manual Installation</h4>
                    <div className="space-y-2 text-sm text-muted-foreground text-left">
                      <p className="font-medium">On iPhone/iPad:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Tap the Share button in Safari</li>
                        <li>Scroll down and tap "Add to Home Screen"</li>
                        <li>Tap "Add" in the top right</li>
                      </ol>
                      
                      <p className="font-medium mt-4">On Android:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Tap the menu (three dots) in Chrome</li>
                        <li>Tap "Install app" or "Add to Home screen"</li>
                        <li>Tap "Install"</li>
                      </ol>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Install;
