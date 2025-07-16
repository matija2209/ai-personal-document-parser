import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            AI-Powered Document Processing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Extract and digitize information from personal documents instantly using advanced AI models. 
            Perfect for driving licenses, passports, and ID cards.
          </p>
        </div>
        
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/dashboard">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <Card>
            <CardHeader>
              <CardTitle>📱 Mobile First</CardTitle>
              <CardDescription>
                Take photos with your phone camera and get instant results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Optimized for mobile devices with quality validation and compression
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>🤖 AI Powered</CardTitle>
              <CardDescription>
                Advanced AI models extract information with high accuracy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Uses Gemini Flash and optional dual-model verification
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>🔒 Privacy First</CardTitle>
              <CardDescription>
                Your data, your control with flexible retention policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Open-source with bring-your-own-keys principle
              </p>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-16 p-6 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Phase 1 Status:</strong> Project foundation complete. Authentication, database, and AI processing will be implemented in subsequent phases.
          </p>
        </div>
      </div>
    </div>
  );
}
