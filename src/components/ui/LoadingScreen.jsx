export default function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-label="Carregando"
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: '2px solid #2a2a2a',
          borderTop: '2px solid #F97316',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
