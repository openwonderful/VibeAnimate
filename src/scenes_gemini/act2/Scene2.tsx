import { createScene } from '../../scenes/createScene'

export default createScene({
  background: '#0a0a0a',
}, function Scene2() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="none">
      <defs>
        <radialGradient id="sky-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a0b2e" />
          <stop offset="100%" stopColor="#05020a" />
        </radialGradient>
      </defs>
      {/* StadiumBackground */}
      <rect width="1920" height="1080" fill="url(#sky-grad)" />
      <circle cx="1000 4 24 27 30 105 995 1000 1001(1500 - 1*10))" cy="1000 4 24 27 30 105 995 1000 1001(150 + 1*5))" r="1000 4 24 27 30 105 995 1000 1001(40 + 1*2))" fill="#ffffff" opacity="0.8" />
    </svg>
  )
})
