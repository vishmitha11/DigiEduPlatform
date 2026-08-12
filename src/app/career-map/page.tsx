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
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  MapPin,
  AlertCircle,
  GraduationCap,
  Target,
  BookOpen,
  Award,
  Building2,
  Rocket,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "~/lib/supabase/client";
import { careerMapNodeTypes } from "./_components/CareerMapNodes";
import { getLayoutedElements } from "./_components/layoutGraph";

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

// Quiet, consistent edge language — static smoothstep lines instead of
// default bezier curves or animated "marching ants", which read as more
// deliberate/designed and less like an AI demo.
const edgeStyle = { stroke: "rgba(136,153,187,0.35)", strokeWidth: 1.5 };
const edgeType = "smoothstep" as const;

const LEGEND_ITEMS = [
  { icon: GraduationCap, label: "You / Education" },
  { icon: Target, label: "Target Career" },
  { icon: BookOpen, label: "Program" },
  { icon: Award, label: "Credential" },
  { icon: Building2, label: "AI Career Cluster" },
  { icon: Rocket, label: "Suggested Role" },
];

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
  const [aiError, setAiError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Independent lookups — resolve concurrently.
      const [{ data: profileData }, { data: studentData }] = await Promise.all([
        supabase.from("Profile").select("fullName, city").eq("id", user.id).single(),
        supabase
          .from("Student")
          .select("id, targetCareer, previousEducation")
          .eq("profileId", user.id)
          .maybeSingle(),
      ]);

      if (!studentData) {
        setAccessError("Career Map is only available for student accounts.");
        setLoading(false);
        return;
      }

      if (profileData) {
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

      const builtNodes: Node[] = [];
      const builtEdges: Edge[] = [];

      builtNodes.push({
        id: "you",
        type: "student",
        data: { name: prof.fullName ?? "Student" },
        position: { x: 0, y: 0 },
      });

      if (prof.previousEducation) {
        builtNodes.push({
          id: "education",
          type: "info",
          data: { icon: "education", label: prof.previousEducation, sublabel: "Education" },
          position: { x: 0, y: 0 },
        });
        builtEdges.push({ id: "e-edu-you", source: "education", target: "you", type: edgeType, style: edgeStyle });
      }

      if (prof.targetCareer) {
        builtNodes.push({
          id: "target",
          type: "info",
          data: { icon: "target", label: prof.targetCareer, sublabel: "Target Career" },
          position: { x: 0, y: 0 },
        });
        builtEdges.push({ id: "e-you-target", source: "you", target: "target", type: edgeType, style: edgeStyle });
      }

      enrollmentData.forEach((enrollment) => {
        const program = Array.isArray(enrollment.program) ? enrollment.program[0] : null;
        if (!program) return;

        const pid = `program-${enrollment.id}`;
        builtNodes.push({
          id: pid,
          type: "program",
          data: { title: program.title, level: program.level, status: enrollment.status },
          position: { x: 0, y: 0 },
        });
        builtEdges.push({ id: `e-you-${pid}`, source: "you", target: pid, type: edgeType, style: edgeStyle });
      });

      credentialData.forEach((cred) => {
        const cid = `cred-${cred.id}`;
        builtNodes.push({
          id: cid,
          type: "credential",
          data: { title: cred.title, credentialType: cred.credentialType },
          position: { x: 0, y: 0 },
        });
        builtEdges.push({ id: `e-you-${cid}`, source: "you", target: cid, type: edgeType, style: edgeStyle });
      });

      if (enrollmentData.length === 0 && credentialData.length === 0) {
        builtNodes.push({
          id: "start",
          type: "empty",
          data: { label: "Start exploring programs" },
          position: { x: 0, y: 0 },
        });
        builtEdges.push({ id: "e-you-start", source: "you", target: "start", type: edgeType, style: edgeStyle });
      }

      const layouted = getLayoutedElements(builtNodes, builtEdges, "LR");
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
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

      const ts = Date.now();
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];
      const sourceId = profile.targetCareer ? "target" : "you";

      parsed.clusters.forEach((cluster, cIdx) => {
        const clusterId = `cluster-${ts}-${cIdx}`;
        newNodes.push({
          id: clusterId,
          type: "cluster",
          data: { name: cluster.name },
          position: { x: 0, y: 0 },
        });
        newEdges.push({
          id: `e-${sourceId}-${clusterId}`,
          source: sourceId,
          target: clusterId,
          type: edgeType,
          style: edgeStyle,
        });

        cluster.roles.forEach((role, rIdx) => {
          const roleId = `role-${ts}-${cIdx}-${rIdx}`;
          newNodes.push({
            id: roleId,
            type: "role",
            data: { title: role.title, skill: role.skill },
            position: { x: 0, y: 0 },
          });
          newEdges.push({
            id: `e-${clusterId}-${roleId}`,
            source: clusterId,
            target: roleId,
            type: edgeType,
            style: edgeStyle,
          });
        });
      });

      // Merge with existing nodes/edges (dropping any prior AI-generated
      // ones) and re-layout everything together so the whole graph reflows
      // cleanly instead of the new branch overlapping the old.
      const mergedNodes = [
        ...nodes.filter((n) => !n.id.startsWith("cluster-") && !n.id.startsWith("role-")),
        ...newNodes,
      ];
      const mergedEdges = [
        ...edges.filter((e) => !e.id.includes("cluster")),
        ...newEdges,
      ];

      const layouted = getLayoutedElements(mergedNodes, mergedEdges, "LR");
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
    } catch (err) {
      console.error("AI generation error:", err);
      setAiError(err instanceof Error ? err.message : "Failed to generate career paths");
    } finally {
      setIsGenerating(false);
    }
  };

  if (accessError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-navy-base px-6 text-center">
        <AlertCircle className="h-10 w-10 text-amber-400" />
        <p className="text-lg font-medium text-ink-secondary">{accessError}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 rounded-xl border border-navy-border bg-navy-surface px-4 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-navy-card"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-navy-base">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-brand" />
        <p className="text-lg font-medium text-ink-secondary">Building your career map...</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-navy-base">

      {/* Header bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/student")}
            className="flex items-center gap-2 rounded-xl border border-navy-border bg-navy-surface px-4 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-navy-card"
          >
            <ArrowLeft className="h-4 w-4" />
            My Learning
          </button>
          <div>
            <h1 className="text-lg font-bold text-ink">Career Map</h1>
            {profile?.city && (
              <p className="flex items-center gap-1 text-xs text-ink-muted">
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
            className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
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
        nodeTypes={careerMapNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e2b55" />
        <Controls style={{ background: "#141c36", border: "1px solid rgba(136,153,187,0.2)", borderRadius: 8 }} />
        <MiniMap
          nodeStrokeWidth={3}
          style={{ background: "#0a0f1e", border: "1px solid #1e2b55", borderRadius: 8 }}
          nodeColor="#22c55e"
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 z-20 rounded-xl border border-navy-border bg-navy-surface p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Legend</p>
        <div className="space-y-2">
          {LEGEND_ITEMS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-brand" />
              <span className="text-xs text-ink-secondary">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
