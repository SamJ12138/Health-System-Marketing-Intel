export function ShimmerBlock({ className }) {
  return <div className={`shimmer rounded-lg ${className}`} />;
}

export function LoadingCard() {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <ShimmerBlock className="w-10 h-10 rounded-full" />
        <ShimmerBlock className="h-5 w-40" />
      </div>
      <ShimmerBlock className="h-4 w-full" />
      <ShimmerBlock className="h-4 w-3/4" />
      <ShimmerBlock className="h-4 w-5/6" />
      <div className="flex gap-2 pt-2">
        <ShimmerBlock className="h-6 w-20 rounded-full" />
        <ShimmerBlock className="h-6 w-24 rounded-full" />
      </div>
    </div>
  );
}
