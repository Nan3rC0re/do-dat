export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div className="h-8 w-28 bg-gray-100 rounded-lg animate-pulse" />
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-11 bg-gray-50 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
