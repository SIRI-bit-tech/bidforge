"use client"

import Link from "next/link"

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="text-2xl font-semibold">You are offline</div>
        <p className="text-sm text-muted-foreground">
          Please check your connection. Some content may be unavailable until you are back online.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => location.reload()} className="px-4 py-2 rounded-md bg-gray-900 text-white">
            Retry
          </button>
          <Link href="/" className="px-4 py-2 rounded-md border">
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
