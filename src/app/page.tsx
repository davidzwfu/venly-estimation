'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { socket } from '@/app/_components/Room'
import Spinner from '@/app/_components/Spinner'

export default function Page() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    socket.emit('leave')
  }, [])

  function handleCreate() {
    setLoading(true)
    const roomId = crypto.randomUUID()
    router.push(`/room/${roomId}`)
  }

  return (
    <div className="main">
      <div className="body">
        <div className="create-game">
          <button className="btn btn--primary" onClick={() => handleCreate()} disabled={loading}>
            {loading ? <Spinner /> : 'Create room'}
          </button>
        </div>
      </div>
    </div>
  )
}
