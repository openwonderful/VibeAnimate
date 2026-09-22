import { createScene } from "../../scenes/createScene"

function Scene1() {
  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      backgroundColor: "#050A1F",
      position: "relative",
      overflow: "hidden"
    }}>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.3; }
        }
        @keyframes floatCloud {
          0% { transform: translateX(0); }
          50% { transform: translateX(50px); }
          100% { transform: translateX(0); }
        }
        @keyframes waveMove {
          0% { transform: translateX(0); }
          50% { transform: translateX(-20px); }
          100% { transform: translateX(0); }
        }
        @keyframes ribbonSway {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(20px) rotate(2deg); }
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes craneFly {
          0% { transform: translate(0, 0); }
          50% { transform: translate(-20px, -10px); }
          100% { transform: translate(0, 0); }
        }
      `}</style>
      
      {/* Layer 1: Stars */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: "radial-gradient(1px 1px at 20px 30px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 40px 70px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 50px 160px, #ffffff, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 90px 40px, #ffffff, rgba(0,0,0,0))",
        backgroundRepeat: "repeat",
        backgroundSize: "200px 200px",
        animation: "twinkle 4s infinite"
      }} />
      
      {/* Layer 2: Moon */}
      <div style={{
        position: "absolute",
        top: "10%",
        right: "15%",
        width: "120px",
        height: "120px",
        borderRadius: "50%",
        backgroundColor: "#FFF9D2",
        boxShadow: "0 0 40px 10px rgba(255, 249, 210, 0.4)"
      }} />
      
      {/* Layer 3: Clouds */}
      <div style={{
        position: "absolute",
        top: "20%",
        left: "10%",
        width: "300px",
        height: "50px",
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: "25px",
        filter: "blur(8px)",
        animation: "floatCloud 10s ease-in-out infinite"
      }} />
      <div style={{
        position: "absolute",
        top: "35%",
        right: "5%",
        width: "400px",
        height: "60px",
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: "30px",
        filter: "blur(10px)",
        animation: "floatCloud 15s ease-in-out infinite reverse"
      }} />
      
      {/* Layer 4: Distant Mountains */}
      <svg width="100%" height="100%" style={{position: "absolute", top: 0, left: 0}}>
        <path d="M0 800 Q 200 700 400 750 T 800 700 T 1200 720 T 1600 680 T 1920 750 L 1920 1080 L 0 1080 Z" fill="#0C1533" />
      </svg>
      
      {/* Layer 5: Midground Mountains */}
      <svg width="100%" height="100%" style={{position: "absolute", top: 0, left: 0}}>
        <path d="M-100 900 Q 200 780 500 850 T 1000 780 T 1500 850 T 2000 800 L 2000 1080 L -100 1080 Z" fill="#13244F" />
      </svg>

      {/* Layer 6: Baekdu with Crater Lake */}
      <svg width="100%" height="100%" style={{position: "absolute", top: 0, left: 0}}>
        <path d="M 500 1080 L 800 600 L 900 600 Q 950 630 1000 600 L 1100 600 L 1400 1080 Z" fill="#1A2B5E" />
        <ellipse cx="950" cy="610" rx="80" ry="15" fill="#4B8BBE" />
      </svg>
      
      {/* Layer 7: Foreground Mountains */}
      <svg width="100%" height="100%" style={{position: "absolute", top: 0, left: 0}}>
        <path d="M -200 1080 L 200 800 Q 300 820 400 800 L 800 1080 Z" fill="#091228" />
        <path d="M 1200 1080 L 1600 750 Q 1700 770 1800 750 L 2200 1080 Z" fill="#091228" />
      </svg>

      {/* Layer 8: Cranes */}
      <svg width="100%" height="100%" style={{position: "absolute", top: 0, left: 0, animation: "craneFly 8s ease-in-out infinite"}}>
        <path d="M 300 400 Q 330 380 350 400 Q 330 420 300 400 Z" fill="#FFFFFF" />
        <path d="M 320 370 Q 340 350 360 370 Q 340 390 320 370 Z" fill="#FFFFFF" />
        <path d="M 400 450 Q 430 430 450 450 Q 430 470 400 450 Z" fill="#FFFFFF" />
      </svg>

      {/* Layer 9: Blossoms */}
      <svg width="100%" height="100%" style={{position: "absolute", top: 0, left: 0}}>
        <circle cx="100" cy="900" r="5" fill="#FFAEC9" />
        <circle cx="120" cy="920" r="4" fill="#FFAEC9" />
        <circle cx="90" cy="930" r="6" fill="#FFAEC9" />
        <circle cx="150" cy="850" r="3" fill="#FFAEC9" />
        <circle cx="170" cy="880" r="5" fill="#FFAEC9" />
      </svg>

      {/* Layer 10: Waves */}
      <svg width="100%" height="100%" style={{position: "absolute", top: 0, left: 0, animation: "waveMove 6s ease-in-out infinite"}}>
        <path d="M 0 1000 Q 100 980 200 1000 T 400 1000 T 600 1000 T 800 1000 T 1000 1000 T 1200 1000 T 1400 1000 T 1600 1000 T 1800 1000 T 2000 1000 L 2000 1080 L 0 1080 Z" fill="#0F1C3F" />
      </svg>
      <svg width="100%" height="100%" style={{position: "absolute", top: 0, left: 0, animation: "waveMove 5s ease-in-out infinite reverse"}}>
        <path d="M 0 1030 Q 150 1010 300 1030 T 600 1030 T 900 1030 T 1200 1030 T 1500 1030 T 1800 1030 T 2100 1030 L 2100 1080 L 0 1080 Z" fill="#0A1430" />
      </svg>

      {/* Layer 11: Ribbons */}
      <svg width="100%" height="100%" style={{position: "absolute", top: 0, left: 0, animation: "ribbonSway 4s ease-in-out infinite", transformOrigin: "right top"}}>
        <path d="M 1920 200 Q 1500 250 1200 100 T 500 200" fill="none" stroke="#E34B54" strokeWidth="8" />
        <path d="M 1920 220 Q 1500 270 1200 120 T 500 220" fill="none" stroke="#005A9C" strokeWidth="8" />
      </svg>
      
      {/* Layer 12: Dancheong border */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, height: "20px",
        backgroundImage: "linear-gradient(90deg, #18A05E 25%, #E34B54 25%, #E34B54 50%, #005A9C 50%, #005A9C 75%, #F0B428 75%)",
        backgroundSize: "80px 20px"
      }} />
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0, height: "20px",
        backgroundImage: "linear-gradient(90deg, #18A05E 25%, #E34B54 25%, #E34B54 50%, #005A9C 50%, #005A9C 75%, #F0B428 75%)",
        backgroundSize: "80px 20px"
      }} />

      {/* Layer 13: Typography */}
      <div style={{
        position: "absolute",
        top: "40%", left: "50%", transform: "translate(-50%, -50%)",
        color: "rgba(255, 255, 255, 0.8)", fontSize: "72px", fontFamily: "serif", letterSpacing: "20px",
        writingMode: "vertical-rl", textOrientation: "upright",
        animation: "fadeIn 3s ease-in-out forwards", opacity: 0, animationDelay: "1s"
      }}>
        아리랑
      </div>

      {/* Layer 14: Hanji Texture */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(240, 235, 220, 0.05)",
        mixBlendMode: "overlay",
        pointerEvents: "none"
      }} />

    </div>
  )
}

// Scene length lives in the manifest entry (`durationSec`), not in the shell
// meta — createScene only configures the container/canvas.
export default createScene({
  background: "#050A1F",
}, Scene1)
