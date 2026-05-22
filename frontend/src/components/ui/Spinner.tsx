export default function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-gray-300 border-t-zoom-blue ${className}`}
      style={{ width: 20, height: 20 }}
    />
  );
}
