export default function Skeleton({ width = '100%', height = 20, radius = 8, style = {} }) {
  return (
    <div style={{
      width,
      height,
      borderRadius: radius,
      background: 'linear-gradient(90deg, var(--color-surface) 25%, var(--color-surface-2) 50%, var(--color-surface) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s ease infinite',
      ...style,
    }} />
  )
}
