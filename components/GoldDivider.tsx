export default function GoldDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/40" />
      <span className="text-gold text-xs">✦</span>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold/40" />
    </div>
  )
}
