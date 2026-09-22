import type { AudioTimeline } from '../../hooks/useAudioTimeline'

interface AudioControlsProps {
  audio: AudioTimeline
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function AudioControls({ audio }: AudioControlsProps) {
  const { currentTime, duration, isPlaying, hasAudio, play, pause, seek } =
    audio

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        borderRadius: 8,
        padding: '8px 16px',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: 13,
        userSelect: 'none',
      }}
    >
      <button
        onClick={isPlaying ? pause : play}
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 4,
          color: '#fff',
          padding: '4px 12px',
          cursor: 'pointer',
          fontSize: 13,
          fontFamily: 'monospace',
        }}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>

      {!hasAudio && (
        <span style={{ color: '#D4A843', fontSize: 11 }}>scrubber</span>
      )}

      <span style={{ minWidth: 80, textAlign: 'center' }}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <div
        style={{
          width: 200,
          height: 6,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 3,
          cursor: 'pointer',
          position: 'relative',
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const ratio = (e.clientX - rect.left) / rect.width
          seek(ratio * duration)
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: '#D4A843',
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  )
}
