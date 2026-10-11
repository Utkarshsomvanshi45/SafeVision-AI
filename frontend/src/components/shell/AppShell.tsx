import { Sidebar, Topbar } from "./Sidebar";
import { Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { useLiveSimulation } from "@/hooks/useLiveSimulation";
import { AICopilotPanel } from "@/components/ai/AICopilot";
import { useSentinelStore } from "@/lib/store";
import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const STANDALONE_ROUTES = new Set(["/", "/login", "/signup"]);

export function AppShell() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const standalone = STANDALONE_ROUTES.has(path);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [hasAuth, setHasAuth] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    const authed = !!token;
    setHasAuth(authed);
    setCheckingAuth(false);

    if (!standalone && !authed) {
      navigate({ to: "/login" });
    }
  }, [path, standalone, navigate]);

  useLiveSimulation(!standalone && hasAuth);

  if (standalone) {
    return (
      <>
        <Outlet />
        <Toaster position="top-right" />
      </>
    );
  }

  if (checkingAuth || !hasAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0A0E1A] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E1261C] border-t-transparent" />
          <p className="text-xs text-neutral-400 font-mono tracking-wider uppercase">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-bg-canvas overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      {/* Draggable floating button */}
      <DraggableCopilotButton />
      {/* Panel opens as full overlay */}
      <AICopilotPanel />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1C2333",
            color: "#F9FAFB",
            border: "1px solid #2D3A52",
            borderLeft: "3px solid #E1261C",
            fontFamily: "IBM Plex Sans",
          },
        }}
      />
    </div>
  );
}

function DraggableCopilotButton() {
  const { copilotOpen, setCopilotOpen } = useSentinelStore();
  const [pos, setPos] = useState(() => {
    if (typeof window === 'undefined') return { x: 800, y: 600 };
    const saved = localStorage.getItem('sv_copilot_pos');
    return saved ? JSON.parse(saved) : { x: window.innerWidth - 195, y: window.innerHeight - 80 };
  });
  const dragging = useRef(false);
  const moved = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    moved.current = false;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      moved.current = true;
      const w = btnRef.current?.offsetWidth ?? 170;
      const h = btnRef.current?.offsetHeight ?? 48;
      const newPos = {
        x: Math.max(8, Math.min(window.innerWidth - w - 8, e.clientX - offset.current.x)),
        y: Math.max(8, Math.min(window.innerHeight - h - 8, e.clientY - offset.current.y)),
      };
      setPos(newPos);
    };
    const onUp = () => {
      if (dragging.current) {
        dragging.current = false;
        // Save position
        setPos((p: {x: number; y: number}) => {
          localStorage.setItem("sv_copilot_pos", JSON.stringify(p));
          return p;
        });
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const handleClick = () => {
    // Only toggle if it wasn't a drag
    if (!moved.current) setCopilotOpen(!copilotOpen);
  };

  return (
    <button
      ref={btnRef}
      onMouseDown={onMouseDown}
      onClick={handleClick}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        cursor: "grab",
        display: "flex",
        alignItems: "center",
        gap: 8,
        paddingLeft: 12,
        paddingRight: 16,
        height: 48,
        borderRadius: 9999,
        background: "linear-gradient(to right, #E1261C, #B91C1C)",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 8px 30px rgba(225,38,28,0.4)",
        fontFamily: "IBM Plex Sans, sans-serif",
        userSelect: "none",
      }}
      title="Drag to move · Click to open"
    >
      <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }}>
        <Sparkles size={14} />
        <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.4)" }} className="animate-ping" />
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 500, letterSpacing: "0.02em" }}>SafeVision Copilot</span>
    </button>
  );
}
