export interface LrcLine {
  time: number
  text: string
}

export function parseLrc(content: string): LrcLine[] {
  return content
    .split('\n')
    .map((line) => {
      const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)/)
      if (!match) return null
      const minutes = parseInt(match[1])
      const seconds = parseInt(match[2])
      const frac = match[3].length === 2 ? parseInt(match[3]) * 10 : parseInt(match[3])
      return {
        time: minutes * 60 + seconds + frac / 1000,
        text: match[4].trim(),
      }
    })
    .filter((x): x is LrcLine => x !== null)
}
