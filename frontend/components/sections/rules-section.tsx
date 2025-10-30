"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Settings } from "lucide-react";
import type { RuleBundle, TeamRef } from "@/lib/types";

const LS_KEY_RULES = "sunshine.rules.bundle";
const LS_KEY_TEAM = "sunshine.rules.selectedTeam";

export function RulesSection() {
  const { toast } = useToast();
  const [bundle, setBundle] = React.useState<RuleBundle | null>(null);
  const [selectedTeam, setSelectedTeam] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY_RULES);
      if (saved) setBundle(JSON.parse(saved));
      const savedTeam = localStorage.getItem(LS_KEY_TEAM) || undefined;
      setSelectedTeam(savedTeam);
    } catch {}
  }, []);

  const saveBundle = (b: RuleBundle) => {
    setBundle(b);
    localStorage.setItem(LS_KEY_RULES, JSON.stringify(b));
  };

  const onFile = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text) as RuleBundle;
      if (!json.teams || !json.rules) throw new Error("Invalid format");
      saveBundle(json);
      toast({ title: "Rules loaded", description: `${json.rules.length} rule(s)` });
    } catch (e: any) {
      toast({ title: "Failed to load rules", description: e?.message ?? "Invalid file", variant: "destructive" });
    }
  };


  const onSelectTeam = (teamId: string) => {
    setSelectedTeam(teamId);
    localStorage.setItem(LS_KEY_TEAM, teamId);
  };

  const teamName = React.useMemo(() => {
    if (!bundle || !selectedTeam) return undefined;
    return bundle.teams.find((t: TeamRef) => t.id === selectedTeam)?.name;
  }, [bundle, selectedTeam]);

  const rulesForTeam = React.useMemo(() => {
    if (!bundle || !selectedTeam) return 0;
    return bundle.rules.filter(r => !r.appliesTo || r.appliesTo.includes(selectedTeam)).length;
  }, [bundle, selectedTeam]);

  return (
    <div className="w-80 bg-background border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg flex items-center justify-center bg-purple-50 dark:bg-purple-950">
          <Settings className="size-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">Team Rules</h3>
          <p className="text-xs text-muted-foreground">Configure team standards</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="rules-file" className="text-xs font-medium text-muted-foreground">
            Import rules (JSON)
          </label>
          <Input
            id="rules-file"
            type="file"
            accept=".json,application/json"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
            className="h-8 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-950 dark:file:text-purple-300"
          />
        </div>

        {bundle && (
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Team</label>
              <Select value={selectedTeam} onValueChange={onSelectTeam} disabled={!bundle?.teams?.length}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={bundle ? "Select team" : "Load rules first"} />
                </SelectTrigger>
                <SelectContent>
                  {bundle?.teams?.map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 text-xs">
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted/50">
                <div className="size-1.5 rounded-full bg-blue-500" />
                <span>{bundle.rules.length} rules</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted/50">
                <div className="size-1.5 rounded-full bg-green-500" />
                <span>{selectedTeam ? rulesForTeam : 0} active</span>
              </div>
            </div>
          </div>
        )}

        {bundle && selectedTeam && (
          <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <span className="font-medium">{teamName}</span> • Rules ready
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RulesSection;
