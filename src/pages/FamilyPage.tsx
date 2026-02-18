import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Users, Plus, X, Loader2, User, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  date_of_birth: string | null;
  created_at: string;
}

export default function FamilyPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("spouse");
  const [dob, setDob] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("family_members")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at")
      .then(({ data }) => {
        if (data) setMembers(data);
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("family_members").insert({
        user_id: user.id,
        name: name.trim(),
        relationship,
        date_of_birth: dob || null,
      }).select().single();
      if (error) throw error;
      setMembers((prev) => [...prev, data]);
      setShowForm(false);
      setName(""); setRelationship("spouse"); setDob("");
      toast({ title: "Family member added!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteMember = async (id: string) => {
    await supabase.from("family_members").delete().eq("id", id);
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const relationships = ["self", "spouse", "child", "parent", "sibling", "other"];

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Family Profiles</h1>
          <p className="text-muted-foreground mt-1">Manage health records for your family</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Member
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
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-semibold text-foreground">Add Family Member</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Relationship</label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {relationships.map((r) => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Member"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Members Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member, i) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card-hover rounded-2xl p-6 group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                <User className="w-6 h-6 text-accent-foreground" />
              </div>
              <button
                onClick={() => deleteMember(member.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="font-display font-semibold text-foreground">{member.name}</h3>
            <p className="text-sm text-muted-foreground capitalize">{member.relationship}</p>
            {member.date_of_birth && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {format(new Date(member.date_of_birth), "MMM d, yyyy")}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {members.length === 0 && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No family members yet</p>
          <p className="text-sm mt-1">Add family members to track their health too</p>
        </div>
      )}
    </div>
  );
}
