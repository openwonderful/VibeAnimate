import { registerRoot } from 'remotion'
// Global stylesheet — DOM/SVG scenes depend on its @keyframes (synced to the
// anim clock per frame by RemotionTimeDriver via syncCssAnimations).
import '../index.css'
import RemotionRoot from './Root'

registerRoot(RemotionRoot)
