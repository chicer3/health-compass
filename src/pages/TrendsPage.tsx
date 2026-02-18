import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, Filter } from "lucide-react";
import { format } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ReferenceLine, Area, ComposedChart
} from "recharts";

interface TestResult {
  id: string;
  test_name: string;
  test_category: string;
  value: number | null;
  unit: string | null;
  is_normal: boolean | null;
  record_date: string;
  normal_range_min: number | null;
  normal_range_max: number | null;
}

export default function TrendsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState<TestResult[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [selectedTest, setSelectedTest] = useState(searchParams.get("test") || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("test_results")
      .select("*")
      .eq("user_id", user.id)
      .order("record_date", { ascending: true })
      .then(({ data }) => {
        if (data) setResults(data);
        setLoading(false);
      });
  }, [user]);

  const categories = [...new Set(results.map((r) => r.test_category))];
  const filtered = selectedCategory
    ? results.filter((r) => r.test_category === selectedCategory)
    : results;
  const testNames = [...new Set(filtered.map((r) => r.test_name))];

  const activeTest = selectedTest || testNames[0] || "";
  const testData = filtered
    .filter((r) => r.test_name === activeTest && r.value != null)
    .map((r) => ({
      date: format(new Date(r.record_date), "MMM dd, yy"),
      value: r.value,
      min: r.normal_range_min,
      max: r.normal_range_max,
    }));

  const activeUnit = filtered.find((r) => r.test_name === activeTest)?.unit || "";
  const rangeMin = testData[0]?.min;
  const rangeMax = testData[0]?.max;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold text-foreground">Trends</h1>
        <p className="text-muted-foreground mt-1">Track how your health data changes over time</p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-3"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span>Filter:</span>
        </div>
        <button
          onClick={() => { setSelectedCategory(""); setSelectedTest(""); }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !selectedCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => { setSelectedCategory(cat); setSelectedTest(""); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </motion.div>

      {/* Test selector */}
      {testNames.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2"
        >
          {testNames.map((name) => (
            <button
              key={name}
              onClick={() => setSelectedTest(name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTest === name
                  ? "bg-accent text-accent-foreground ring-1 ring-primary/30"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {name}
            </button>
          ))}
        </motion.div>
      )}

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-2xl p-6"
      >
        {testData.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display font-semibold text-foreground">{activeTest}</h2>
                <p className="text-xs text-muted-foreground">
                  {activeUnit && `Unit: ${activeUnit}`}
                  {rangeMin != null && rangeMax != null && ` • Normal: ${rangeMin}–${rangeMax}`}
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={testData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                {rangeMin != null && (
                  <ReferenceLine y={rangeMin} stroke="hsl(var(--success))" strokeDasharray="5 5" label={{ value: "Min", fontSize: 10, fill: "hsl(var(--success))" }} />
                )}
                {rangeMax != null && (
                  <ReferenceLine y={rangeMax} stroke="hsl(var(--warning))" strokeDasharray="5 5" label={{ value: "Max", fontSize: 10, fill: "hsl(var(--warning))" }} />
                )}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No data to display</p>
              <p className="text-sm mt-1">Upload records to see trends here</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Data Table */}
      {testData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-6"
        >
          <h2 className="font-display font-semibold text-foreground mb-4">Data Points</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Date</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Value</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Normal Range</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {testData.map((d, i) => {
                  const isNormal = d.min != null && d.max != null && d.value != null
                    ? d.value >= d.min && d.value <= d.max
                    : null;
                  return (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-3 text-foreground">{d.date}</td>
                      <td className="py-3 text-right font-medium text-foreground">{d.value} {activeUnit}</td>
                      <td className="py-3 text-right text-muted-foreground">{d.min ?? "—"} – {d.max ?? "—"}</td>
                      <td className="py-3 text-right">
                        {isNormal != null && (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            isNormal ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                          }`}>
                            {isNormal ? "Normal" : "Abnormal"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
