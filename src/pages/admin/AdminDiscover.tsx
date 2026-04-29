import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Sparkles, Star, Globe, Building2, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface DiscoveredCompany {
  name: string;
  website: string;
  country: string;
  type: string;
  description: string;
  linkedin?: string;
  instagram?: string;
  email?: string;
}

export default function AdminDiscover() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DiscoveredCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("atmos-discover-recent") ?? "[]"); } catch { return []; }
  });

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("discover-prospects", {
        body: { query: query.trim() },
      });
      if (error) throw error;
      if (data?.companies && Array.isArray(data.companies)) {
        setResults(data.companies);
      } else {
        toast({ title: "Nenhum resultado encontrado" });
      }
      // Save recent search
      const updated = [query.trim(), ...recentSearches.filter(s => s !== query.trim())].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("atmos-discover-recent", JSON.stringify(updated));
    } catch (err) {
      toast({ title: "Erro na busca", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [query, recentSearches]);

  const handleFavorite = async (company: DiscoveredCompany, idx: number) => {
    setSavingIdx(idx);
    try {
      // Get first B2B stage for "Mapeado"
      const { data: stages } = await db.from("pipeline_stages").select("id").eq("segment", "b2b").order("position").limit(1);
      const stageId = stages?.[0]?.id ?? null;

      const { error } = await db.from("prospects").insert({
        name: company.name,
        company_name: company.name,
        segment: "b2b",
        source: "manual",
        country: company.country || null,
        company_type: company.type || null,
        website: company.website || null,
        description: company.description || null,
        linkedin: company.linkedin || null,
        instagram: company.instagram || null,
        email: company.email || null,
        stage_id: stageId,
        tags: ["descoberta-ia", "verificar-dados"],
        potential: "medium",
        priority: "medium",
        type: "b2b",
      });
      if (error) throw error;
      toast({ title: `${company.name} adicionado como prospect!`, description: "Revise os dados no detalhe." });
    } catch (err) {
      toast({ title: "Erro ao salvar", description: String(err), variant: "destructive" });
    } finally {
      setSavingIdx(null);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Descobrir Prospects
        </h1>
        <p className="text-muted-foreground mt-1">Use IA para encontrar potenciais parceiros B2B</p>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Ex: DMCs que operam Brasil no mercado USA, Agências de wellness retreats na Europa..."
            className="pl-9 h-11"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading || !query.trim()} className="h-11 px-6">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
        </Button>
      </div>

      {/* Recent searches */}
      {recentSearches.length > 0 && !loading && results.length === 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Buscas recentes</p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map(s => (
              <button key={s} onClick={() => { setQuery(s); }} className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{results.length} empresas encontradas</p>
          {results.map((company, idx) => (
            <Card key={idx} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="font-semibold text-sm">{company.name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {company.country && <Badge variant="outline" className="text-[10px]">{company.country}</Badge>}
                      {company.type && <Badge variant="secondary" className="text-[10px]">{company.type}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{company.description}</p>
                    {company.website && (
                      <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Globe className="h-3 w-3" /> {company.website}
                      </a>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleFavorite(company, idx)}
                    disabled={savingIdx === idx}
                    className="shrink-0"
                  >
                    {savingIdx === idx ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Star className="h-4 w-4 mr-1" /> Salvar</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
