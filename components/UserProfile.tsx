'use client'

import { useAuth } from '@/lib/auth-context'

export function UserProfile() {
  const { user, signOut } = useAuth()

  if (!user) return null

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm">
        <div className="font-medium text-gray-900">{user.email}</div>
      </div>
      <button
        onClick={signOut}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Sign out
      </button>
    </div>
  )
}