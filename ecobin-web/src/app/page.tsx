"use client";

/**
 * EcoBin Landing Page — The Antigravity Experience
 *
 * Sections: Navbar → Hero + 3D Bin → Features → How It Works → Stats → Dashboard Preview → Footer
 * All animations are CSS-only except scroll parallax and intersection observer triggers.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ═══════════════════════════════════════════════════════════════
   LANDING PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const pageRef = useRef<HTMLDivElement>(null);

  // ── Parallax scroll effect ──
  useEffect(() => {
    const handleScroll = () => {
      document.documentElement.style.setProperty("--scroll-y", window.scrollY.toString());
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── IntersectionObserver for staggered reveals ──
  // Single observer watches ALL .reveal-on-scroll elements across the entire page
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    // Wait a tick for the DOM to render, then observe all elements
    const timer = setTimeout(() => {
      if (pageRef.current) {
        pageRef.current.querySelectorAll(".reveal-on-scroll").forEach((el) => {
          observer.observe(el);
        });
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  // ── Animated counter for stats ──
  useEffect(() => {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const target = parseInt(el.dataset.target || "0", 10);
          if (isNaN(target)) { el.textContent = el.dataset.target || ""; return; }
          const duration = 1200;
          const start = performance.now();
          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(target * eased).toString();
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
          counterObserver.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );
    document.querySelectorAll(".counter-animate").forEach((el) => counterObserver.observe(el));
    return () => counterObserver.disconnect();
  }, []);

  return (
    <>
      <style jsx global>{`
        /* ═══ LANDING PAGE KEYFRAMES (page-specific only) ═══ */
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes binRotateLanding { 0%{transform:rotateY(-15deg)} 100%{transform:rotateY(15deg)} }
        @keyframes fillRise { 0%,100%{height:20%} 50%{height:65%} }
        @keyframes particleFloat { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(-40px);opacity:0} }
        @keyframes slideInLeft { 0%{transform:translateX(-60px);opacity:0} 100%{transform:translateX(0);opacity:1} }
        @keyframes slideInRight { 0%{transform:translateX(60px);opacity:0} 100%{transform:translateX(0);opacity:1} }
        @keyframes lidBounce { 0%,100%{transform:rotateX(0deg)} 30%{transform:rotateX(-20deg)} 60%{transform:rotateX(-5deg)} }
        @keyframes dashFloat { 0%,100%{transform:perspective(1200px) rotateX(10deg) rotateY(-4deg) translateY(0)} 50%{transform:perspective(1200px) rotateX(10deg) rotateY(-4deg) translateY(-10px)} }
        @keyframes lineGrow { 0%{width:0} 100%{width:100%} }
        @keyframes gridDrift { 0%{transform:translateY(0)} 100%{transform:translateY(40px)} }

        /* ═══ REVEAL ON SCROLL ═══ */
        .reveal-on-scroll { opacity:0; transform:translateY(40px); transition: opacity 0.6s ease, transform 0.6s ease; will-change:transform,opacity; }
        .reveal-on-scroll.revealed { opacity:1; transform:translateY(0); }
        .reveal-on-scroll[data-delay="1"].revealed { transition-delay:0.1s }
        .reveal-on-scroll[data-delay="2"].revealed { transition-delay:0.2s }
        .reveal-on-scroll[data-delay="3"].revealed { transition-delay:0.3s }
        .reveal-on-scroll[data-delay="4"].revealed { transition-delay:0.4s }

        /* ═══ PARALLAX LAYERS ═══ */
        .parallax-grid { transform:translateY(calc(var(--scroll-y,0) * 0.15px)); will-change:transform; }
        .parallax-slow { transform:translateY(calc(var(--scroll-y,0) * 0.08px)); will-change:transform; }

        /* ═══ RESPONSIVE ═══ */
        @media(max-width:768px) {
          .bin3d-container { transform:scale(0.65)!important }
          .hero-headline { font-size:2.5rem!important }
          .feature-grid { transform:none!important }
          .dash-preview { transform:perspective(800px) rotateX(6deg)!important }
          .steps-connector { display:none!important }
        }

        @media(prefers-reduced-motion:reduce) {
          *{ animation:none!important; transition:none!important }
          .reveal-on-scroll { opacity:1; transform:none }
        }
      `}</style>

      <div ref={pageRef} style={{ background: "#060608", color: "#F1F5F9", minHeight: "100vh", overflow: "hidden" }}>

        {/* ════════════════════ NAVBAR ════════════════════ */}
        <NavBar />

        {/* ════════════════════ HERO ════════════════════ */}
        <section
          style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 24px 80px" }}
        >
          {/* Background grid */}
          <div
            className="parallax-grid"
            style={{
              position: "absolute", inset: 0, opacity: 0.3,
              backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",
              backgroundSize: "50px 50px", animation: "gridDrift 12s linear infinite",
            }}
          />
          {/* Ambient orbs */}
          <div style={{ position:"absolute",top:"15%",left:"10%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(16,185,129,0.12) 0%,transparent 65%)",animation:"float 8s ease-in-out infinite",willChange:"transform" }} />
          <div style={{ position:"absolute",bottom:"20%",right:"8%",width:350,height:350,borderRadius:"50%",background:"radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 65%)",animation:"float 10s ease-in-out 2s infinite",willChange:"transform" }} />

          <div style={{ position: "relative", zIndex: 10, maxWidth: 1200, width: "100%", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 60 }}>
            {/* Left: Text */}
            <div style={{ flex: "1 1 420px", minWidth: 300 }}>
              <h1
                className="hero-headline"
                style={{
                  fontFamily: "var(--font-space-grotesk),sans-serif", fontSize: "4.5rem",
                  fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.02em",
                  animation: "slideUp 0.8s ease-out both",
                }}
              >
                Waste sorted.
                <br />
                <span style={{ background: "linear-gradient(135deg,#10B981,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Rewards earned.
                </span>
              </h1>
              <p style={{ fontSize: "1.125rem", color: "#94A3B8", maxWidth: 480, marginTop: 24, lineHeight: 1.7, animation: "slideUp 0.8s ease-out 0.15s both" }}>
                EcoBin&apos;s sensors detect, classify, and route your waste automatically. Sort right, earn EcoCoins.
              </p>
              <div style={{ display: "flex", gap: 16, marginTop: 36, flexWrap: "wrap", animation: "slideUp 0.8s ease-out 0.3s both" }}>
                <Link href="/signup" style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"14px 32px",borderRadius:12,fontWeight:600,fontSize:"0.9375rem",background:"linear-gradient(135deg,#10B981,#059669)",color:"#fff",textDecoration:"none",boxShadow:"0 0 30px rgba(16,185,129,0.25)",willChange:"transform",transition:"transform 0.2s" }}>
                  Get Started <span style={{ fontSize: 18 }}>→</span>
                </Link>
                <a href="#features" style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"14px 32px",borderRadius:12,fontWeight:600,fontSize:"0.9375rem",border:"1px solid rgba(255,255,255,0.12)",color:"#F1F5F9",textDecoration:"none",background:"rgba(255,255,255,0.04)",transition:"border-color 0.2s" }}>
                  See it live
                </a>
              </div>
            </div>

            {/* Right: 3D Bin */}
            <div style={{ flex: "1 1 380px", display: "flex", justifyContent: "center", position: "relative" }}>
              <Bin3D />
            </div>
          </div>
        </section>

        {/* ════════════════════ FEATURES ════════════════════ */}
        <section id="features" style={{ padding: "100px 24px", position: "relative" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2
              className="reveal-on-scroll"
              style={{ fontFamily:"var(--font-space-grotesk),sans-serif",fontSize:"2.5rem",fontWeight:700,textAlign:"center",marginBottom:60 }}
            >
              Why <span style={{color:"#10B981"}}>EcoBin</span>?
            </h2>
            <div
              className="feature-grid"
              style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:24,transform:"perspective(900px) rotateX(4deg)" }}
            >
              {[
                { icon:"⚡",title:"Auto-Sort",desc:"Sensors detect moisture, gas, and metal to classify waste type instantly.",color:"#10B981",bg:"rgba(16,185,129,0.08)",delay:"1" },
                { icon:"🪙",title:"Earn EcoCoins",desc:"10 coins for proper manual sort, 1 coin for auto-sort. Tap your RFID card to claim.",color:"#FBBF24",bg:"rgba(251,191,36,0.08)",delay:"2" },
                { icon:"📊",title:"Live Dashboard",desc:"Real-time bin monitoring from anywhere. Fill levels, alerts, and analytics.",color:"#3B82F6",bg:"rgba(59,130,246,0.08)",delay:"3" },
              ].map((f) => (
                <div
                  key={f.title}
                  className="reveal-on-scroll"
                  data-delay={f.delay}
                  style={{
                    background:"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.08)",
                    borderRadius:20, padding:36, boxShadow:"0 20px 60px rgba(0,0,0,0.4),0 4px 16px rgba(0,0,0,0.2)",
                    willChange:"transform",
                  }}
                >
                  <div style={{ width:56,height:56,borderRadius:16,background:f.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:20 }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontFamily:"var(--font-space-grotesk),sans-serif",fontSize:"1.25rem",fontWeight:600,color:f.color,marginBottom:10 }}>{f.title}</h3>
                  <p style={{ fontSize:"0.9rem",color:"#94A3B8",lineHeight:1.7 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════ HOW IT WORKS ════════════════════ */}
        <section id="how-it-works" style={{ padding:"100px 24px",position:"relative" }}>
          <div style={{ maxWidth:1000,margin:"0 auto" }}>
            <h2 className="reveal-on-scroll" style={{ fontFamily:"var(--font-space-grotesk),sans-serif",fontSize:"2.5rem",fontWeight:700,textAlign:"center",marginBottom:70 }}>
              How it <span style={{color:"#10B981"}}>works</span>
            </h2>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:32,position:"relative" }}>
              {/* Connector line */}
              <div className="steps-connector" style={{ position:"absolute",top:40,left:"12%",right:"12%",height:2,background:"rgba(255,255,255,0.06)",zIndex:0 }}>
                <div style={{ height:"100%",background:"linear-gradient(90deg,#10B981,#3B82F6)",animation:"lineGrow 2s ease-out 0.5s both",willChange:"transform" }} />
              </div>
              {[
                { n:"1",title:"Drop Waste",desc:"Place waste in the EcoBin sensor area",color:"#10B981" },
                { n:"2",title:"Sensors Detect",desc:"Moisture, gas, and metal sensors classify instantly",color:"#F59E0B" },
                { n:"3",title:"Auto-Sorted",desc:"Servo motor routes waste to the correct sector",color:"#3B82F6" },
                { n:"4",title:"Earn Coins",desc:"Tap RFID card within 15 seconds to earn EcoCoins",color:"#FBBF24" },
              ].map((step,i) => (
                <div
                  key={step.n}
                  className="reveal-on-scroll"
                  data-delay={step.n}
                  style={{ position:"relative",zIndex:1,textAlign:"center" }}
                >
                  <div style={{
                    width:64,height:64,borderRadius:"50%",margin:"0 auto 20px",
                    background:`rgba(${step.color === "#10B981" ? "16,185,129" : step.color === "#F59E0B" ? "245,158,11" : step.color === "#3B82F6" ? "59,130,246" : "251,191,36"},0.12)`,
                    border:`2px solid ${step.color}88`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontFamily:"var(--font-space-grotesk),sans-serif",fontSize:"1.5rem",fontWeight:700,color:step.color,
                  }}>
                    {step.n}
                  </div>
                  <h3 style={{ fontFamily:"var(--font-space-grotesk),sans-serif",fontWeight:600,fontSize:"1rem",marginBottom:8 }}>{step.title}</h3>
                  <p style={{ fontSize:"0.8rem",color:"#64748B",lineHeight:1.6 }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════ STATS ════════════════════ */}
        <section style={{ padding:"80px 24px" }}>
          <div style={{ maxWidth:900,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:20 }}>
            {[
              { value:"3",label:"Waste Types",color:"#10B981",glow:"rgba(16,185,129,0.15)" },
              { value:"10",label:"Coins Per Sort",color:"#FBBF24",glow:"rgba(251,191,36,0.15)" },
              { value:"2",label:"Sort Time",color:"#3B82F6",glow:"rgba(59,130,246,0.15)",prefix:"<",suffix:"s" },
              { value:"24",label:"Hour Monitoring",color:"#A78BFA",glow:"rgba(167,139,250,0.15)",suffix:"/7" },
            ].map((stat,i) => (
              <div
                key={stat.label}
                className="reveal-on-scroll"
                data-delay={String(i+1)}
                style={{
                  background:"rgba(255,255,255,0.04)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",
                  borderRadius:20,padding:"32px 24px",textAlign:"center",
                  boxShadow:`0 20px 60px rgba(0,0,0,0.4),0 0 40px ${stat.glow}`,
                  willChange:"transform",
                }}
              >
                <p style={{ fontFamily:"var(--font-space-grotesk),sans-serif",fontSize:"2.5rem",fontWeight:700,color:stat.color }}>
                  {stat.prefix || ""}
                  <span className="counter-animate" data-target={stat.value}>0</span>
                  {stat.suffix || ""}
                </p>
                <p style={{ fontSize:"0.8rem",color:"#64748B",marginTop:6 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ════════════════════ DASHBOARD PREVIEW ════════════════════ */}
        <section style={{ padding:"80px 24px 120px" }}>
          <div style={{ maxWidth:1000,margin:"0 auto" }}>
            <h2 className="reveal-on-scroll" style={{ fontFamily:"var(--font-space-grotesk),sans-serif",fontSize:"2.5rem",fontWeight:700,textAlign:"center",marginBottom:16 }}>
              Live <span style={{color:"#10B981"}}>Dashboard</span>
            </h2>
            <p className="reveal-on-scroll" data-delay="1" style={{ textAlign:"center",color:"#64748B",marginBottom:60,fontSize:"1rem" }}>
              Monitor your bins from anywhere in real-time
            </p>
            <div className="reveal-on-scroll dash-preview" data-delay="2" style={{ willChange:"transform",animation:"dashFloat 6s ease-in-out infinite" }}>
              <DashboardMockup />
            </div>
          </div>
        </section>

        {/* ════════════════════ FOOTER ════════════════════ */}
        <footer style={{ borderTop:"1px solid rgba(255,255,255,0.06)",padding:"60px 24px" }}>
          <div style={{ maxWidth:1000,margin:"0 auto",display:"flex",flexWrap:"wrap",justifyContent:"space-between",alignItems:"center",gap:24 }}>
            <div>
              <p style={{ fontFamily:"var(--font-space-grotesk),sans-serif",fontSize:"1.25rem",fontWeight:700 }}>
                Eco<span style={{color:"#10B981"}}>Bin</span>
              </p>
              <p style={{ fontSize:"0.8rem",color:"#475569",marginTop:4 }}>Making recycling rewarding.</p>
            </div>
            <div style={{ display:"flex",gap:32 }}>
              {["Features","Dashboard","GitHub"].map((l) => (
                <a key={l} href={l === "Dashboard" ? "/dashboard" : l === "GitHub" ? "https://github.com/RAHUL3307-star/eco-pro" : `#${l.toLowerCase()}`}
                  target={l === "GitHub" ? "_blank" : undefined} rel={l === "GitHub" ? "noopener noreferrer" : undefined}
                  style={{ fontSize:"0.85rem",color:"#64748B",textDecoration:"none" }}>{l}</a>
              ))}
            </div>
            <p style={{ fontSize:"0.75rem",color:"#334155",width:"100%",textAlign:"center",marginTop:24 }}>
              © 2026 EcoBin. Built for hackathon by EEE students.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NAVBAR COMPONENT
   ═══════════════════════════════════════════════════════════════ */
function NavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const nav = document.getElementById("eco-nav");
    const onScroll = () => {
      if (!nav) return;
      if (window.scrollY > 40) {
        nav.style.background = "rgba(6,6,8,0.85)";
        nav.style.backdropFilter = "blur(20px)";
        nav.style.borderBottom = "1px solid rgba(255,255,255,0.06)";
      } else {
        nav.style.background = "transparent";
        nav.style.backdropFilter = "none";
        nav.style.borderBottom = "1px solid transparent";
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav id="eco-nav" style={{
      position:"fixed",top:0,left:0,right:0,zIndex:100,padding:"16px 24px",
      display:"flex",alignItems:"center",justifyContent:"space-between",
      transition:"background 0.3s,backdrop-filter 0.3s,border-color 0.3s",
      borderBottom:"1px solid transparent",
    }}>
      <Link href="/" style={{ fontFamily:"var(--font-space-grotesk),sans-serif",fontSize:"1.3rem",fontWeight:700,textDecoration:"none",color:"#F1F5F9",display:"flex",alignItems:"center",gap:4 }}>
        Eco<span style={{color:"#10B981"}}>Bin</span>
        <span style={{ display:"inline-block",width:6,height:6,borderRadius:"50%",background:"#10B981",marginLeft:2 }} />
      </Link>
      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
        {["Features","How it works","Rewards"].map((l) => (
          <a key={l} href={`#${l.toLowerCase().replace(/ /g,"-")}`}
            style={{ display:"none",padding:"8px 16px",fontSize:"0.85rem",color:"#94A3B8",textDecoration:"none" }}
            className="nav-link-desktop"
          >{l}</a>
        ))}
        <Link href="/login" style={{ padding:"8px 20px",borderRadius:10,fontSize:"0.85rem",fontWeight:500,border:"1px solid rgba(255,255,255,0.12)",color:"#F1F5F9",textDecoration:"none" }}>
          Login
        </Link>
        <Link href="/signup" style={{ padding:"8px 20px",borderRadius:10,fontSize:"0.85rem",fontWeight:600,background:"linear-gradient(135deg,#10B981,#059669)",color:"#fff",textDecoration:"none",boxShadow:"0 0 20px rgba(16,185,129,0.2)" }}>
          Get Started
        </Link>
        <button 
          className="mobile-menu-btn" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ display: "none", background: "transparent", border: "none", color: "#F1F5F9", cursor: "pointer", padding: "8px", marginLeft: "4px" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {mobileMenuOpen && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "rgba(6,6,8,0.98)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {["Features","How it works","Rewards"].map((l) => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g,"-")}`}
              onClick={() => setMobileMenuOpen(false)}
              style={{ padding:"12px 0",fontSize:"1rem",color:"#F1F5F9",textDecoration:"none", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >{l}</a>
          ))}
          <Link href="/login" onClick={() => setMobileMenuOpen(false)} style={{ padding:"12px 0",fontSize:"1rem",color:"#F1F5F9",textDecoration:"none", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            Login
          </Link>
        </div>
      )}

      <style jsx>{`
        @media(min-width:768px) {
          .nav-link-desktop { display:inline-flex!important }
        }
        @media(max-width:767px) {
          .mobile-menu-btn { display:block!important }
        }
      `}</style>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════
   3D BIN — Pure CSS 3D object with preserve-3d
   ═══════════════════════════════════════════════════════════════ */
function Bin3D() {
  const sectorColors = ["#10B981","#F59E0B","#3B82F6"];

  return (
    <div style={{ position:"relative" }}>
      {/* Floating badges */}
      {[
        { text:"3 sectors active",x:-70,y:20,d:0 },
        { text:"+10 EcoCoins",x:160,y:-20,d:0.7 },
        { text:"WiFi connected",x:-50,y:180,d:1.4 },
        { text:"85% accuracy",x:170,y:160,d:2.1 },
      ].map((b) => (
        <div key={b.text} style={{
          position:"absolute",left:b.x,top:b.y,zIndex:20,
          padding:"8px 16px",borderRadius:30,fontSize:"0.7rem",fontWeight:600,
          background:"rgba(255,255,255,0.06)",backdropFilter:"blur(12px)",
          border:"1px solid rgba(255,255,255,0.1)",color:"#94A3B8",whiteSpace:"nowrap",
          animation:`float 3s ease-in-out ${b.d}s infinite`,willChange:"transform",
          boxShadow:"0 8px 24px rgba(0,0,0,0.3)",
        }}>
          {b.text}
        </div>
      ))}

      {/* 3D Bin container */}
      <div className="bin3d-container" style={{ perspective:800,width:200,height:240,margin:"0 auto" }}>
        <div style={{
          width:"100%",height:"100%",position:"relative",
          transformStyle:"preserve-3d",
          animation:"binRotateLanding 8s ease-in-out infinite alternate",
          willChange:"transform",
        }}>
          {/* Lid */}
          <div style={{
            position:"absolute",top:-8,left:-8,width:216,height:16,
            background:"rgba(16,185,129,0.15)",
            border:"1px solid rgba(16,185,129,0.25)",borderRadius:"8px 8px 0 0",
            transformOrigin:"bottom center",
            animation:"lidBounce 4s ease-in-out infinite",willChange:"transform",
            transformStyle:"preserve-3d",transform:"translateZ(60px)",
          }} />

          {/* Front face */}
          <div style={{
            position:"absolute",width:200,height:240,
            background:"rgba(16,185,129,0.06)",
            border:"1px solid rgba(16,185,129,0.2)",borderRadius:12,
            transform:"translateZ(60px)",backfaceVisibility:"hidden",
            display:"flex",gap:6,padding:"40px 14px 14px",alignItems:"flex-end",
            overflow:"hidden",
          }}>
            {sectorColors.map((color,i) => (
              <div key={i} style={{ flex:1,height:"100%",position:"relative",borderRadius:6,overflow:"hidden",background:"rgba(255,255,255,0.03)",border:`1px solid ${color}33` }}>
                {/* Fill bar */}
                <div style={{
                  position:"absolute",bottom:0,left:0,right:0,borderRadius:6,
                  background:`linear-gradient(to top,${color}cc,${color}66)`,
                  animation:`fillRise 3s ease-in-out ${i*0.4}s infinite alternate`,willChange:"transform",
                  boxShadow:`0 0 12px ${color}44`,
                }} />
                {/* Particles */}
                {[0,1,2].map((p) => (
                  <div key={p} style={{
                    position:"absolute",bottom:"40%",left:`${20+p*25}%`,
                    width:3,height:3,borderRadius:"50%",background:color,
                    animation:`particleFloat 2s ease-in ${p*0.6+i*0.3}s infinite`,willChange:"transform",opacity:0.7,
                  }} />
                ))}
              </div>
            ))}
          </div>

          {/* Back face */}
          <div style={{
            position:"absolute",width:200,height:240,
            background:"rgba(16,185,129,0.04)",border:"1px solid rgba(16,185,129,0.12)",borderRadius:12,
            transform:"rotateY(180deg) translateZ(60px)",backfaceVisibility:"hidden",
          }} />

          {/* Left face */}
          <div style={{
            position:"absolute",width:120,height:240,left:40,
            background:"rgba(16,185,129,0.03)",border:"1px solid rgba(16,185,129,0.1)",
            transform:"rotateY(-90deg) translateZ(100px)",backfaceVisibility:"hidden",
          }} />

          {/* Right face */}
          <div style={{
            position:"absolute",width:120,height:240,left:40,
            background:"rgba(16,185,129,0.05)",border:"1px solid rgba(16,185,129,0.15)",
            transform:"rotateY(90deg) translateZ(100px)",backfaceVisibility:"hidden",
          }} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD MOCKUP — Pure HTML/CSS fake dashboard
   ═══════════════════════════════════════════════════════════════ */
function DashboardMockup() {
  const sectors = [
    { name:"Organic",fill:72,color:"#10B981",emoji:"🌿" },
    { name:"Inorganic",fill:45,color:"#F59E0B",emoji:"📦" },
    { name:"Metal",fill:88,color:"#3B82F6",emoji:"🔩" },
  ];

  return (
    <div style={{
      background:"rgba(255,255,255,0.03)",backdropFilter:"blur(16px)",
      border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,
      boxShadow:"0 40px 100px rgba(0,0,0,0.6),0 8px 32px rgba(0,0,0,0.3)",
      padding:32,maxWidth:800,margin:"0 auto",
      transform:"perspective(1200px) rotateX(10deg) rotateY(-4deg)",willChange:"transform",
    }}>
      {/* Top bar mock */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24 }}>
        <div>
          <p style={{ fontFamily:"var(--font-space-grotesk),sans-serif",fontWeight:600,fontSize:"0.95rem" }}>
            Welcome back, Rahul
          </p>
          <p style={{ fontSize:"0.7rem",color:"#475569" }}>Real-time monitoring</p>
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          <span style={{ width:8,height:8,borderRadius:"50%",background:"#10B981",boxShadow:"0 0 8px rgba(16,185,129,0.5)" }} />
          <span style={{ fontSize:"0.7rem",color:"#10B981" }}>Online</span>
        </div>
      </div>

      {/* Sector cards */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:20 }}>
        {sectors.map((s) => (
          <div key={s.name} style={{
            background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",
            borderRadius:14,padding:16,
          }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
              <span style={{ fontSize:16 }}>{s.emoji}</span>
              <span style={{ fontSize:"0.75rem",fontWeight:600,color:s.color }}>{s.name}</span>
              {s.fill >= 85 && <span style={{ fontSize:"0.6rem",padding:"2px 6px",borderRadius:4,background:"rgba(239,68,68,0.15)",color:"#EF4444",fontWeight:700 }}>FULL</span>}
            </div>
            <p style={{ fontFamily:"var(--font-space-grotesk),sans-serif",fontSize:"1.5rem",fontWeight:700 }}>{s.fill}%</p>
            <div style={{ height:6,borderRadius:3,background:"rgba(255,255,255,0.06)",marginTop:8 }}>
              <div style={{ height:"100%",borderRadius:3,width:`${s.fill}%`,background:s.color,boxShadow:`0 0 8px ${s.color}44` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom row: coins + activity */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 2fr",gap:16 }}>
        <div style={{ background:"rgba(251,191,36,0.05)",border:"1px solid rgba(251,191,36,0.12)",borderRadius:14,padding:16 }}>
          <p style={{ fontSize:"0.7rem",color:"#64748B" }}>🪙 EcoCoins</p>
          <p style={{ fontFamily:"var(--font-space-grotesk),sans-serif",fontSize:"1.75rem",fontWeight:700,color:"#FBBF24",marginTop:4 }}>240</p>
        </div>
        <div style={{ background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:14,padding:16 }}>
          <p style={{ fontSize:"0.7rem",color:"#64748B",marginBottom:8 }}>Recent Activity</p>
          {[
            { type:"Organic",mode:"Manual",coins:10,time:"2m ago" },
            { type:"Metal",mode:"Auto",coins:0,time:"8m ago" },
          ].map((a,i) => (
            <div key={i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderTop:i ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                <span style={{ width:6,height:6,borderRadius:"50%",background:a.type === "Organic" ? "#10B981" : "#3B82F6" }} />
                <span style={{ fontSize:"0.7rem" }}>{a.type}</span>
                <span style={{ fontSize:"0.6rem",padding:"1px 6px",borderRadius:4,background:a.mode === "Manual" ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",color:a.mode === "Manual" ? "#10B981" : "#64748B" }}>{a.mode}</span>
              </div>
              <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                {a.coins > 0 && <span style={{ fontSize:"0.6rem",color:"#FBBF24",fontWeight:700 }}>+{a.coins}</span>}
                <span style={{ fontSize:"0.6rem",color:"#475569" }}>{a.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
