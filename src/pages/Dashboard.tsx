import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Activity, TrendingUp, Upload, AlertTriangle, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Calendar
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
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

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [recentCount, setRecentCount] = useState(0);
  const [abnormalCount, setAbnormalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [profileRes, resultsRes] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", user.id).single(),
        supabase.from("test_results").select("*").eq("user_id", user.id).order("record_date", { ascending: true }).limit(200),
      ]);

      if (profileRes.data) setDisplayName(profileRes.data.display_name || "");
      if (resultsRes.data) {
        setResults(resultsRes.data);
        const recent = resultsRes.data.filter((r) => {
          const d = new Date(r.record_date);
          const now = new Date();
          return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= 30;
        });
        setRecentCount(recent.length);
        setAbnormalCount(resultsRes.data.filter((r) => r.is_normal === false).length);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  // Get unique categories for quick view
  const categories = [...new Set(results.map((r) => r.test_category))];

  // Get latest results per test
  const latestResults = results.reduce<Record<string, TestResult>>((acc, r) => {
    if (!acc[r.test_name] || r.record_date > acc[r.test_name].record_date) {
      acc[r.test_name] = r;
    }
    return acc;
  }, {});

  // Get a sample trend for first test with multiple readings
  const testCounts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.test_name] = (acc[r.test_name] || 0) + 1;
    return acc;
  }, {});
  const trendTest = Object.entries(testCounts).find(([_, count]) => count >= 2)?.[0];
  const trendData = trendTest
    ? results.filter((r) => r.test_name === trendTest).map((r) => ({
        date: format(new Date(r.record_date), "MMM dd"),
        value: r.value,
      }))
    : [];

  const statCards = [
    {
      label: "Total Tests",
      value: results.length,
      icon: Activity,
      color: "primary",
    },
    {
      label: "Recent (30d)",
      value: recentCount,
      icon: Calendar,
      color: "info",
    },
    {
      label: "Normal",
      value: results.filter((r) => r.is_normal === true).length,
      icon: CheckCircle2,
      color: "success",
    },
    {
      label: "Abnormal",
      value: abnormalCount,
      icon: AlertTriangle,
      color: "warning",
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div {...fadeUp}>
        <h1 className="font-display text-3xl font-bold text-foreground">
          {displayName ? `Hey, ${displayName.split(" ")[0]}` : "Dashboard"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Here's your health overview</p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card-hover rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                stat.color === "primary" ? "bg-primary/10 text-primary" :
                stat.color === "info" ? "bg-info/10 text-info" :
                stat.color === "success" ? "bg-success/10 text-success" :
                "bg-warning/10 text-warning"
              }`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Trend Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 glass-card rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-semibold text-foreground">
                {trendTest ? `${trendTest} Trend` : "Health Trends"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {trendTest ? "Your latest trend line" : "Upload records to see trends"}
              </p>
            </div>
            <Link
              to="/trends"
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              View All <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
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
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              <div className="text-center">
                <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No trend data yet</p>
                <Link to="/upload" className="text-primary text-xs hover:underline">Upload your first record</Link>
              </div>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-6"
        >
          <h2 className="font-display font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/upload"
              className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Upload className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Upload Record</p>
                <p className="text-xs text-muted-foreground">Scan a medical document</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
            <Link
              to="/trends"
              className="flex items-center gap-3 p-3 rounded-xl bg-info/5 hover:bg-info/10 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-info flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-info-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">View Trends</p>
                <p className="text-xs text-muted-foreground">Track changes over time</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-info transition-colors" />
            </Link>
          </div>

          {/* Latest Abnormal */}
          {abnormalCount > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Needs Attention</h3>
              <div className="space-y-2">
                {Object.values(latestResults)
                  .filter((r) => r.is_normal === false)
                  .slice(0, 3)
                  .map((r) => (
                    <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg bg-warning/5">
                      <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{r.test_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.value} {r.unit} • {format(new Date(r.record_date), "MMM dd")}
                        </p>
                      </div>
                      {r.value && r.normal_range_max && r.value > r.normal_range_max ? (
                        <ArrowUpRight className="w-3 h-3 text-warning" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 text-warning" />
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="font-display font-semibold text-foreground mb-4">Test Categories</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Link
                key={cat}
                to={`/trends?category=${encodeURIComponent(cat)}`}
                className="px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {cat}
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
