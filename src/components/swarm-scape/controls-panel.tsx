
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sparkles, DatabaseZap, RefreshCcw, Settings2, Users } from 'lucide-react'; // Added Users icon
import type { SwarmParams } from './types';
import { suggestParameters } from '@/ai/flows/dynamic-parameter-suggestions';
import { useToast } from "@/hooks/use-toast";

interface ControlsPanelProps {
  swarmParams: Omit<SwarmParams, 'numBoids'>; // numBoids is now from Firebase
  onSwarmParamsChange: (newParams: Partial<Omit<SwarmParams, 'numBoids'>>) => void;
  onAdjustHeightMap: () => void;
  onResetCamera: () => void;
  aiExplanation: string | null;
  isAiLoading: boolean;
  onAiLoadingChange: (isLoading: boolean) => void;
  numBoids: number; // Display current boid count from Firebase
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  swarmParams,
  onSwarmParamsChange,
  onAdjustHeightMap,
  onResetCamera,
  aiExplanation,
  isAiLoading,
  onAiLoadingChange,
  numBoids,
}) => {
  const [desiredBehavior, setDesiredBehavior] = useState<string>("");
  const { toast } = useToast();

  const [localParams, setLocalParams] = useState<Omit<SwarmParams, 'numBoids'>>(swarmParams);

  useEffect(() => {
    setLocalParams(swarmParams);
  }, [swarmParams]);

  const handleSliderChange = (paramName: keyof Omit<SwarmParams, 'numBoids'>, value: number) => {
    setLocalParams(prev => ({ ...prev, [paramName]: value }));
  };

  const handleSliderCommit = (paramName: keyof Omit<SwarmParams, 'numBoids'>, value: number) => {
    onSwarmParamsChange({ [paramName]: value });
  };

  const handleSuggestParams = async () => {
    if (!desiredBehavior.trim()) {
      toast({ title: "Input Required", description: "Please describe the desired swarm behavior.", variant: "destructive" });
      return;
    }
    onAiLoadingChange(true);
    try {
      const currentParamsString = JSON.stringify({
        cohesion: swarmParams.cohesion,
        separation: swarmParams.separation,
        alignment: swarmParams.alignment,
      });
      const suggestions = await suggestParameters({
        desiredSwarmBehavior: desiredBehavior,
        currentParameters: currentParamsString,
      });
      onSwarmParamsChange(suggestions); // This will update cohesion, separation, alignment
      toast({ title: "AI Suggestion Applied", description: "Swarm parameters updated based on AI suggestion." });
    } catch (error) {
      console.error("Error fetching AI suggestions:", error);
      toast({ title: "AI Error", description: "Could not fetch parameter suggestions.", variant: "destructive" });
    } finally {
      onAiLoadingChange(false);
    }
  };
  
  const handleAdjustHeightMapClick = () => {
    onAiLoadingChange(true); 
    onAdjustHeightMap();
  }

  return (
    <Card className="h-full flex flex-col bg-sidebar text-sidebar-foreground border-sidebar-border">
      <CardHeader className="border-b border-sidebar-border">
        <CardTitle className="flex items-center gap-2 text-sidebar-primary-foreground">
          <Settings2 className="h-6 w-6 text-sidebar-primary" />
          SwarmScape Controls
        </CardTitle>
        <CardDescription className="text-sidebar-foreground/80">Tune simulation parameters and interact with AI features.</CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-6 overflow-y-auto flex-grow">
        <Accordion type="multiple" defaultValue={['item-1', 'item-2']} className="w-full">
          <AccordionItem value="item-1" className="border-b-sidebar-border">
            <AccordionTrigger className="text-base font-semibold hover:no-underline text-sidebar-foreground hover:text-sidebar-accent-foreground [&[data-state=open]>svg]:text-sidebar-accent-foreground">Swarm Dynamics</AccordionTrigger>
            <AccordionContent className="pt-2 space-y-4">
              <div className="flex items-center justify-between p-2 bg-sidebar-accent rounded-md">
                <Label className="text-sm flex items-center text-sidebar-accent-foreground">
                  <Users className="mr-2 h-4 w-4" /> Number of Boids (from Firebase):
                </Label>
                <span className="text-sm font-semibold text-sidebar-accent-foreground">{numBoids}</span>
              </div>
              <div>
                <Label htmlFor="cohesion" className="text-sm">Cohesion: {localParams.cohesion.toFixed(2)}</Label>
                <Slider
                  id="cohesion"
                  min={0} max={5} step={0.01}
                  value={[localParams.cohesion]}
                  onValueChange={([val]) => handleSliderChange('cohesion', val)}
                  onValueCommit={([val]) => handleSliderCommit('cohesion', val)}
                  className="[&>span:first-child]:bg-primary [&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary-foreground"
                />
              </div>
              <div>
                <Label htmlFor="separation" className="text-sm">Separation: {localParams.separation.toFixed(2)}</Label>
                <Slider
                  id="separation"
                  min={0} max={5} step={0.01}
                  value={[localParams.separation]}
                  onValueChange={([val]) => handleSliderChange('separation', val)}
                  onValueCommit={([val]) => handleSliderCommit('separation', val)}
                   className="[&>span:first-child]:bg-primary [&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary-foreground"
                />
              </div>
              <div>
                <Label htmlFor="alignment" className="text-sm">Alignment: {localParams.alignment.toFixed(2)}</Label>
                <Slider
                  id="alignment"
                  min={0} max={5} step={0.01}
                  value={[localParams.alignment]}
                  onValueChange={([val]) => handleSliderChange('alignment', val)}
                  onValueCommit={([val]) => handleSliderCommit('alignment', val)}
                   className="[&>span:first-child]:bg-primary [&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary-foreground"
                />
              </div>
              {/* numBoids slider removed as it's Firebase driven */}
              <div className="space-y-2 pt-2">
                <Label htmlFor="desiredBehavior" className="text-sm">Desired Swarm Behavior (for AI)</Label>
                <Input 
                  id="desiredBehavior" 
                  placeholder="e.g., tightly packed, exploring slowly" 
                  value={desiredBehavior} 
                  onChange={(e) => setDesiredBehavior(e.target.value)}
                  className="bg-sidebar-accent border-sidebar-border focus:ring-sidebar-ring"
                />
                <Button onClick={handleSuggestParams} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isAiLoading}>
                  <Sparkles className="mr-2 h-4 w-4" /> Suggest Parameters with AI
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border-b-sidebar-border">
            <AccordionTrigger className="text-base font-semibold hover:no-underline text-sidebar-foreground hover:text-sidebar-accent-foreground [&[data-state=open]>svg]:text-sidebar-accent-foreground">Map & View</AccordionTrigger>
            <AccordionContent className="pt-2 space-y-4">
              <Button onClick={handleAdjustHeightMapClick} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isAiLoading}>
                <DatabaseZap className="mr-2 h-4 w-4" /> Adjust Map Heights with AI
              </Button>
              {aiExplanation && (
                <div className="p-3 bg-sidebar-accent rounded-md border border-sidebar-border">
                  <Label className="text-xs font-semibold">AI Explanation:</Label>
                  <Textarea value={aiExplanation} readOnly rows={4} className="mt-1 text-xs bg-background/30 border-sidebar-border text-foreground/80" />
                </div>
              )}
              <Button onClick={onResetCamera} variant="outline" className="w-full border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <RefreshCcw className="mr-2 h-4 w-4" /> Reset Camera
              </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default ControlsPanel;
