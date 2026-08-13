import { Antigravity } from "@/animations/Antigravity";

export const DynamicBackground = () => (
  <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[radial-gradient(circle_at_top_left,_#17365d_0%,_#071b38_45%,_#020d1e_100%)]">
    <div className="absolute left-1/2 top-1/2 aspect-square h-[min(1180px,155vw)] w-[min(1180px,155vw)] -translate-x-1/2 -translate-y-1/2 opacity-90">
      <Antigravity count={300} magnetRadius={10} ringRadius={10} waveSpeed={0.65} waveAmplitude={1.35} particleSize={2} lerpSpeed={0.1} color="#FF9FFC" autoAnimate particleVariance={1} rotationSpeed={0.12} depthFactor={1.35} pulseSpeed={3} particleShape="capsule" fieldStrength={10} />
    </div>
    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(32,157,215,0.13),transparent_45%,rgba(117,57,145,0.16))]" />
  </div>
);
