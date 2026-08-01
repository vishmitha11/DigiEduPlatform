"use client";

import { useEffect, useState, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import { ArrowLeft, Sparkles, Loader2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "~/lib/supabase/client";

interface StudentProfile {
  fullName: string | null;
  targetCareer: string | null;
  previousEducation: string | null;
  city: string | null;
}

interface Enrollment {
  id: string;
  status: string;
  program: { id: string; title: string; level: string | null }[] | null;
}

interface Credential {
  id: string;
  title: string;
  credentialType: string;
}

interface CareerRole {
  title: string;
  skill: string;
}

interface CareerCluster {
  name: string;
  roles: CareerRole[];
}

const nodeStyle = (bg: string, border: string, text = "#fff") => ({
  background: bg,
  border: `2px solid ${border}`,
  borderRadius: "12px",
  padding: "10px 14px",
  color: text,
  fontSize: "13px",
  fontWeight: 600,
  width: 190,
  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
});

const edgeStyle = { stroke: "#94a3b8", strokeWidth: 2 };

export default function CareerMap() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profileData } = await supabase
        .from("Profile")
        .select("fullName, city")
        .eq("id", user.id)
        .single();

      const { data: studentData } = await supabase
        .from("Student")
        .select("id, targetCareer, previousEducation")
        .eq("profileId", user.id)
        .single();

      if (profileData && studentData) {
        setStudentId(studentData.id);
        setProfile({
          fullName: profileData.fullName,
          targetCareer: studentData.targetCareer,
          previousEducation: studentData.previousEducation,
          city: profileData.city,
        });
      } else {
        setLoading(false);
      }
    };

    void init();
  }, []);

  const buildCareerMap = useCallback(async (sId: string, prof: StudentProfile) => {
    try {
      setLoading(true);

      const [enrollmentsRes, credentialsRes] = await Promise.all([
        supabase
          .from("Enrollment")
          .select("id, status, program:Program(id, title, level)")
          .eq("studentId", sId)
          .in("status", ["ACTIVE", "COMPLETED"]),
        supabase
          .from("Credential")
          .select("id, title, credentialType")
          .eq("studentId", sId),
      ]);

      const enrollmentData = (enrollmentsRes.data ?? []) as Enrollment[];
      const credentialData = (credentialsRes.data ?? []) as Credential[];

      setEnrollments(enrollmentData);
      setCredentials(credentialData);

      const generatedNodes: Node[] = [];
      const generatedEdges: Edge[] = [];

      // Centre: Student node
      generatedNodes.push({
        id: "you",
        data: { label: `🎓 ${prof.fullName ?? "Student"}` },
        position: { x: 0, y: 0 },
        style: nodeStyle("#0f172a", "#3b82f6"),
      });

      // Education level node
      if (prof.previousEducation) {
        generatedNodes.push({
          id: "education",
          data: { label: `📚 ${prof.previousEducation}` },
          position: { x: -280, y: -80 },
          style: nodeStyle("#1e3a5f", "#60a5fa"),
        });
        generatedEdges.push({ id: "e-edu-you", source: "education", target: "you", style: edgeStyle });
      }

      // Target career node
      if (prof.targetCareer) {
        generatedNodes.push({
          id: "target",
          data: { label: `🎯 Goal: ${prof.targetCareer}` },
          position: { x: 300, y: -120 },
          style: nodeStyle("#7c3aed", "#a78bfa"),
        });
        generatedEdges.push({
          id: "e-you-target",
          source: "you",
          target: "target",
          animated: true,
          style: { stroke: "#a78bfa", strokeWidth: 2 },
        });
      }

      // Enrollment nodes
      enrollmentData.forEach((enrollment, index) => {
        const program = Array.isArray(enrollment.program) ? enrollment.program[0] : null;
        if (!program) return;

        const pid = `program-${enrollment.id}`;
        const isCompleted = enrollment.status === "COMPLETED";

        generatedNodes.push({
          id: pid,
          data: {
            label: (
              <div>
                <div style={{ fontWeight: 700 }}>{program.title}</div>
                {program.level && (
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{program.level}</div>
                )}
                <div style={{
                  fontSize: 10, marginTop: 4, padding: "2px 6px", borderRadius: 4,
                  display: "inline-block",
                  background: isCompleted ? "#16a34a" : "#d97706",
                  color: "#fff",
                }}>
                  {enrollment.status}
                </div>
              </div>
            ),
          },
          position: { x: -280, y: index * 120 + 60 },
          style: nodeStyle(isCompleted ? "#14532d" : "#1c1917", isCompleted ? "#22c55e" : "#f59e0b"),
        });
        generatedEdges.push({ id: `e-you-${pid}`, source: "you", target: pid, style: edgeStyle });
      });

      // Credential nodes
      credentialData.forEach((cred, index) => {
        const cid = `cred-${cred.id}`;
        generatedNodes.push({
          id: cid,
          data: {
            label: (
              <div>
                <div>🏆 {cred.title}</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{cred.credentialType}</div>
              </div>
            ),
          },
          position: { x: 300, y: index * 110 + 60 },
          style: nodeStyle("#78350f", "#f59e0b"),
        });
        generatedEdges.push({
          id: `e-you-${cid}`, source: "you", target: cid,
          style: { stroke: "#f59e0b", strokeWidth: 2 },
        });
      });

      if (enrollmentData.length === 0 && credentialData.length === 0) {
        generatedNodes.push({
          id: "start",
          data: { label: "🚀 Start exploring programs!" },
          position: { x: -250, y: 80 },
          style: nodeStyle("#1e293b", "#64748b"),
        });
        generatedEdges.push({ id: "e-you-start", source: "you", target: "start", style: edgeStyle });
      }

      setNodes(generatedNodes);
      setEdges(generatedEdges);
    } catch (err) {
      console.error("Map building error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, setNodes, setEdges]);

  useEffect(() => {
    if (profile && studentId) void buildCareerMap(studentId, profile);
  }, [profile, studentId]);

  const generateAICareers = async () => {
    if (isGenerating || !profile) return;
    setIsGenerating(true);
    setAiError(null);

    try {
      // Build context strings from real student data
      const enrolledPrograms = enrollments
        .map((e) => {
          const p = Array.isArray(e.program) ? e.program[0] : null;
          return p ? `${p.title} (${e.status})` : null;
        })
        .filter(Boolean)
        .join(", ");

      const earnedCredentials = credentials
        .map((c) => `${c.title} (${c.credentialType})`)
        .join(", ");

      // Call our internal API route — keeps ANTHROPIC_API_KEY server-side
      const response = await fetch("/api/career-paths", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profile.fullName,
          targetCareer: profile.targetCareer,
          previousEducation: profile.previousEducation,
          city: profile.city,
          enrolledPrograms,
          earnedCredentials,
        }),
      });

      if (!response.ok) {
        const err = await response.json() as { error: string };
        throw new Error(err.error ?? "API request failed");
      }

      const parsed = await response.json() as { clusters: CareerCluster[] };

      if (!parsed.clusters || !Array.isArray(parsed.clusters)) {
        throw new Error("Invalid response from server");
      }

      // Build nodes with timestamp for unique IDs
      const ts = Date.now();
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      parsed.clusters.forEach((cluster, cIdx) => {
        const clusterId = `cluster-${ts}-${cIdx}`;

        newNodes.push({
          id: clusterId,
          data: { label: `🏢 ${cluster.name}` },
          position: { x: 560, y: cIdx * 240 - 100 },
          style: nodeStyle("#0c1a2e", "#3b82f6"),
        });

        newEdges.push({
          id: `e-you-${clusterId}`,
          source: profile.targetCareer ? "target" : "you",
          target: clusterId,
          animated: true,
          style: { stroke: "#3b82f6", strokeWidth: 2 },
        });

        cluster.roles.forEach((role, rIdx) => {
          const roleId = `role-${ts}-${cIdx}-${rIdx}`;

          newNodes.push({
            id: roleId,
            data: {
              label: (
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 700, color: "#bfdbfe" }}>{role.title}</div>
                  <div style={{
                    marginTop: 4, fontSize: 11, background: "#1e3a5f",
                    borderRadius: 4, padding: "2px 6px", color: "#93c5fd",
                  }}>
                    🚀 {role.skill}
                  </div>
                </div>
              ),
            },
            position: { x: 800, y: cIdx * 240 + rIdx * 100 - 100 },
            style: nodeStyle("#0f172a", "#1d4ed8"),
          });

          newEdges.push({
            id: `e-${clusterId}-${roleId}`,
            source: clusterId,
            target: roleId,
            style: edgeStyle,
          });
        });
      });

      // Replace previous AI nodes
      setNodes((nds) => [
        ...nds.filter((n) => !n.id.startsWith("cluster-") && !n.id.startsWith("role-")),
        ...newNodes,
      ]);
      setEdges((eds) => [
        ...eds.filter((e) => !e.id.includes("cluster")),
        ...newEdges,
      ]);
    } catch (err) {
      console.error("AI generation error:", err);
      setAiError(err instanceof Error ? err.message : "Failed to generate career paths");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-950">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-blue-400" />
        <p className="text-lg font-medium text-gray-400">Building your career map...</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-gray-950">

      {/* Header bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/student")}
            className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
            My Learning
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Career Map</h1>
            {profile?.city && (
              <p className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="h-3 w-3" />
                {profile.city}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {aiError && (
            <p className="max-w-xs truncate text-sm text-red-400">{aiError}</p>
          )}
          <button
            onClick={generateAICareers}
            disabled={isGenerating}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isGenerating
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</>
              : <><Sparkles className="h-4 w-4" /> Generate AI Career Paths</>
            }
          </button>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => setSelectedNode(node.id)}
        fitView
        fitViewOptions={{ padding: 0.3 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e293b" />
        <Controls style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
        <MiniMap
          nodeStrokeWidth={3}
          style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }}
          nodeColor="#3b82f6"
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 z-20 rounded-xl border border-gray-700 bg-gray-900 p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-500">Legend</p>
        <div className="space-y-2">
          {[
            { color: "bg-blue-600", label: "You" },
            { color: "bg-violet-600", label: "Career Goal" },
            { color: "bg-yellow-600", label: "Active Program" },
            { color: "bg-green-700", label: "Completed" },
            { color: "bg-yellow-800", label: "Credential" },
            { color: "bg-blue-900", label: "AI Career Cluster" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${color}`} />
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}