import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Plus, Pill, UtensilsCrossed, Dumbbell, Moon, Stethoscope,
  Calendar, X, Loader2, ClipboardList
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const activityTypes = [
  { value: "medication", label: "Medication", icon: Pill },
  { value: "meal", label: "Meal", icon: UtensilsCrossed },
  { value: "exercise", label: "Exercise", icon: Dumbbell },
  { value: "sleep", label: "Sleep", icon: Moon },
  { value: "symptom", label: "Symptom", icon: Stethoscope },
];

interface ActivityLog {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  dosage: string | null;
  meal_type: string | null;
  exercise_type: string | null;
  exercise_duration_min: number | null;
  sleep_hours: number | null;
  symptoms: string | null;
  notes: string | null;
  log_date: string;
  created_at: string;
}

export default function ActivityPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [activityType, setActivityType] = useState("medication");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dosage, setDosage] = useState("");
  const [mealType, setMealType] = useState("");
  const [exerciseType, setExerciseType] = useState("");
  const [exerciseDuration, setExerciseDuration] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [notes, setNotes] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("activity_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("log_date", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setLogs(data);
        setLoading(false);
      });
  }, [user]);

  const resetForm = () => {
    setTitle(""); setDescription(""); setDosage(""); setMealType("");
    setExerciseType(""); setExerciseDuration(""); setSleepHours("");
    setSymptoms(""); setNotes(""); setActivityType("medication");
    setLogDate(new Date().toISOString().split("T")[0]);
  };

  const handleSave = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("activity_logs").insert({
        user_id: user.id,
        activity_type: activityType,
        title: title.trim(),
        description: description || null,
        dosage: dosage || null,
        meal_type: mealType || null,
        exercise_type: exerciseType || null,
        exercise_duration_min: exerciseDuration ? parseInt(exerciseDuration) : null,
        sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
        symptoms: symptoms || null,
        notes: notes || null,
        log_date: logDate,
      }).select().single();

      if (error) throw error;
      setLogs((prev) => [data, ...prev]);
      setShowForm(false);
      resetForm();
      toast({ title: "Activity logged!", description: "Your activity has been saved." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteLog = async (id: string) => {
    await supabase.from("activity_logs").delete().eq("id", id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const getIcon = (type: string) => {
    const found = activityTypes.find((a) => a.value === type);
    return found ? found.icon : ClipboardList;
  };

  const getColor = (type: string) => {
    switch (type) {
      case "medication": return "bg-info/10 text-info";
      case "meal": return "bg-warning/10 text-warning";
      case "exercise": return "bg-success/10 text-success";
      case "sleep": return "bg-primary/10 text-primary";
      case "symptom": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  // Group by date
  const grouped = logs.reduce<Record<string, ActivityLog[]>>((acc, log) => {
    const key = log.log_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Activity Log</h1>
          <p className="text-muted-foreground mt-1">Track medications, meals, exercise, and more</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Log Activity
        </button>
      </motion.div>

      {/* Form Modal */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-semibold text-foreground">Log Activity</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type */}
              <div className="flex flex-wrap gap-2">
                {activityTypes.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setActivityType(t.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      activityType === t.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Date</label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={activityType === "medication" ? "e.g. Metformin" : activityType === "meal" ? "e.g. Lunch" : "Activity name"}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                />
              </div>

              {activityType === "medication" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Dosage</label>
                  <input
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 500mg twice daily"
                    className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                  />
                </div>
              )}

              {activityType === "meal" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Meal Type</label>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Select type</option>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
              )}

              {activityType === "exercise" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Type</label>
                    <input
                      value={exerciseType}
                      onChange={(e) => setExerciseType(e.target.value)}
                      placeholder="e.g. Running"
                      className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Duration (min)</label>
                    <input
                      type="number"
                      value={exerciseDuration}
                      onChange={(e) => setExerciseDuration(e.target.value)}
                      placeholder="30"
                      className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              )}

              {activityType === "sleep" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Hours of Sleep</label>
                  <input
                    type="number"
                    step="0.5"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(e.target.value)}
                    placeholder="7.5"
                    className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                  />
                </div>
              )}

              {activityType === "symptom" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Symptoms</label>
                  <textarea
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="Describe symptoms..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground resize-none"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any observations or notes..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground resize-none"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={!title.trim() || saving}
                className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Activity"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Logs List */}
      {Object.entries(grouped).map(([date, dayLogs]) => (
        <motion.div key={date} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground">
              {format(new Date(date), "EEEE, MMMM d, yyyy")}
            </h2>
          </div>
          <div className="space-y-2">
            {dayLogs.map((log) => {
              const Icon = getIcon(log.activity_type);
              return (
                <div key={log.id} className="glass-card rounded-xl p-4 flex items-start gap-3 group">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${getColor(log.activity_type)}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{log.title}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {log.dosage && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{log.dosage}</span>}
                      {log.meal_type && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{log.meal_type}</span>}
                      {log.exercise_type && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{log.exercise_type}</span>}
                      {log.exercise_duration_min && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{log.exercise_duration_min} min</span>}
                      {log.sleep_hours && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{log.sleep_hours}h sleep</span>}
                    </div>
                    {log.description && <p className="text-xs text-muted-foreground mt-1">{log.description}</p>}
                    {log.notes && <p className="text-xs text-muted-foreground/70 mt-1 italic">{log.notes}</p>}
                  </div>
                  <button
                    onClick={() => deleteLog(log.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      ))}

      {logs.length === 0 && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No activities logged yet</p>
          <p className="text-sm mt-1">Start tracking your daily health activities</p>
        </div>
      )}
    </div>
  );
}
