"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setValidSession(!!session);
      setChecking(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidSession(true);
        setChecking(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    setError("");
    if (!password) { setError("Please enter a new password."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); }
    else { setSuccess(true); setTimeout(() => router.push("/"), 3000); }
  };

  const inputStyle: React.CSSProperties = { width:"100%", background:"#f8faff", border:"1px solid #bfdbfe", borderRadius:10, padding:"0.7rem 1rem", color:"#1e3a5f", fontSize:"0.9rem", outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box" };
  const labelStyle: React.CSSProperties = { display:"block", fontSize:"0.78rem", fontWeight:700, letterSpacing:0.8, textTransform:"uppercase", color:"#64748b", marginBottom:"0.4rem" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#F0F7FF;color:#1e3a5f;font-family:'DM Sans',sans-serif;}
        .btn{cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1.2rem 2.5rem",background:"rgba(255,255,255,0.95)",borderBottom:"1px solid #dbeafe",boxShadow:"0 1px 12px rgba(30,58,95,0.06)"}}>
        <div onClick={()=>router.push("/")} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2rem",letterSpacing:2,cursor:"pointer"}}>
          <span style={{color:"#1e3a5f"}}>Play</span><span style={{color:"#84CC16"}}>Up</span>
        </div>
      </nav>

      <div style={{minHeight:"calc(100vh - 65px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
        <div style={{background:"white",borderRadius:20,padding:"2.5rem",width:"100%",maxWidth:420,border:"1px solid #dbeafe",boxShadow:"0 4px 20px rgba(30,58,95,0.1)"}}>

          {checking ? (
            <div style={{textAlign:"center",padding:"2rem"}}>
              <div style={{width:36,height:36,border:"3px solid #dbeafe",borderTopColor:"#84CC16",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/>
            </div>
          ) : success ? (
            <div style={{textAlign:"center"}}>
              <div style={{width:64,height:64,borderRadius:"50%",background:"#EAF3DE",border:"2px solid #84CC16",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2rem",margin:"0 auto 1.2rem"}}>✅</div>
              <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.5rem"}}>Password Updated!</h2>
              <p style={{color:"#64748b",fontSize:"0.9rem",lineHeight:1.6,marginBottom:"1.5rem"}}>Your password has been changed successfully. Redirecting you to PlayUp...</p>
              <button className="btn" onClick={()=>router.push("/")} style={{padding:"0.7rem 1.5rem",background:"#1e3a5f",color:"white",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.9rem"}}>Go to PlayUp</button>
            </div>
          ) : !validSession ? (
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:"2.5rem",marginBottom:"1rem"}}>⚠️</div>
              <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.5rem"}}>Link Expired</h2>
              <p style={{color:"#64748b",fontSize:"0.9rem",lineHeight:1.6,marginBottom:"1.5rem"}}>This password reset link has expired or already been used. Please request a new one.</p>
              <button className="btn" onClick={()=>router.push("/")} style={{padding:"0.7rem 1.5rem",background:"#84CC16",color:"#1e3a5f",border:"none",borderRadius:999,fontWeight:700,fontSize:"0.9rem"}}>Back to PlayUp</button>
            </div>
          ) : (
            <>
              <div style={{textAlign:"center",marginBottom:"2rem"}}>
                <div style={{width:56,height:56,borderRadius:"50%",background:"#EAF3DE",border:"2px solid #84CC16",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem",margin:"0 auto 1rem"}}>🔐</div>
                <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,color:"#1e3a5f",marginBottom:"0.3rem"}}>Set New Password</h2>
                <p style={{color:"#64748b",fontSize:"0.88rem"}}>Choose a strong password for your PlayUp account.</p>
              </div>

              {error && <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"0.7rem 1rem",marginBottom:"1rem",fontSize:"0.85rem",color:"#dc2626"}}>{error}</div>}

              <div style={{marginBottom:"1rem"}}>
                <label style={labelStyle}>New Password</label>
                <input type="password" placeholder="Min. 6 characters" value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle}/>
              </div>
              <div style={{marginBottom:"1.5rem"}}>
                <label style={labelStyle}>Confirm Password</label>
                <input type="password" placeholder="Type it again" value={confirm} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleReset()} style={inputStyle}/>
              </div>

              <button className="btn" onClick={handleReset} disabled={loading}
                style={{width:"100%",padding:"0.85rem",background:loading?"#97C459":"#84CC16",color:"#1e3a5f",border:"none",borderRadius:10,fontWeight:700,fontSize:"1rem",opacity:loading?0.8:1}}>
                {loading?"Updating...":"Update Password"}
              </button>

              <div style={{textAlign:"center",marginTop:"1rem"}}>
                <span onClick={()=>router.push("/")} style={{fontSize:"0.82rem",color:"#64748b",cursor:"pointer"}}>← Back to PlayUp</span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
