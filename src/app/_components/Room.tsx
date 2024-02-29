'use client'

import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

export const socket = io()

export default function Room({ 
  roomId 
}: { 
  roomId: string
}) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [name, setName] = useState('')
  const [votes, setVotes] = useState<any>({})
  const [showVotes, setShowVotes] = useState(false)
  const [totals, setTotals] = useState<any>({})
  const [average, setAverage] = useState({ value: 0 })
  const [leaderboard, setLeaderboard] = useState<any>({})

  useEffect(() => {
    if (localStorage.getItem('user'))
      setUser(JSON.parse(localStorage.getItem('user')!))
    else
      setUser(false)

    function onDisconnect(userId: string) {
      setVotes((prev: any) => {
        const newVotes = {...prev}
        delete newVotes[userId]
        return newVotes
      })
    }
    function onJoined(user: any) {
      setVotes((prev: any) => {
        const newVotes = {...prev}
        newVotes[user.id] = {
          name: user.name
        }
        return newVotes
      })
    }
    function onVoteEvent(user: any, vote: number) {
      setVotes((prev: any) => {
        const newVotes = {...prev}
        newVotes[user.id] = { name: user.name, vote }
        return newVotes
      })
    }
    function onRestart() {
      resetVotes()
    }

    socket.on('disconnected', onDisconnect);
    socket.on('vote', onVoteEvent);
    socket.on('joined', onJoined);
    socket.on('restart', onRestart);

    return () => {
      socket.off('disconnected', onDisconnect)
      socket.off('vote', onVoteEvent)
      socket.off('joined', onJoined)
      socket.off('restart', onRestart)
    }
  }, [])

  useEffect(() => {
    function receiveVotes(res: any) {
      const newVotes = res.votes ?? {}
      newVotes[user.id] = { name: user.name }
      setVotes(newVotes)
      setShowVotes(res.showVotes || false)
      setLeaderboard(res.leaderboard || {})
      setLoading(false)
    }

    if (user) {
      socket.emit('join', roomId, user)
      socket.on('receiveVotes', receiveVotes)

      return () => {
        socket.off('receiveVotes', receiveVotes)
      }
    }
  }, [user])

  useEffect(() => {
    function requestVotes(callback: any) {
      callback({ votes, showVotes, leaderboard })
    }

    countVotes()
    getAverage()
    socket.on('requestVotes', requestVotes)

    return () => {
      socket.off('requestVotes', requestVotes)
    }
  }, [votes, showVotes])

  useEffect(() => {
    function onShowVotes() {
      setShowVotes(true)
      updateLeaderboard()
    }

    socket.on('showVotes', onShowVotes);

    return () => {
      socket.off('showVotes', onShowVotes);
    }
  }, [average])

  function handleVote(value: any) {
    if (value == votes[user.id]?.vote)
      value = null
      
    socket.emit('vote', roomId, user, value)
    setVotes((prev: any) => {
      const newVotes = {...prev}
      newVotes[user.id] = { name: user.name, vote: value }
      return newVotes
    })
  }

  function revealCards() {
    setShowVotes(true)
    updateLeaderboard()
    socket.emit('showVotes', roomId)
  }

  function restart() {
    resetVotes()
    socket.emit('restart', roomId)
  }

  function resetVotes() {
    setShowVotes(false)
    setVotes((prev: any) => {
      const newVotes = {...prev}
      for (var key in newVotes) {
        newVotes[key].vote = null
      }
      return newVotes
    })
  }

  function countVotes() {
    const newTotals: Record<number, number> = {}
    for (var key in votes) {
      const vote = votes[key].vote
      if (vote) 
        newTotals[vote] = (newTotals[vote] ?? 0) + 1
    }
    setTotals(newTotals)
  }

  function getAverage() {
    var sum = 0
    var length = 0
    for (var key in votes) {
      const vote = votes[key].vote
      if (vote) {
        sum += vote
        length++
      }
    }
    const average = sum / length
    if (length == 0)
      setAverage({ value: 0})
    else {
      setAverage({ value: Math.round(average * 10) / 10 })
    }
  }

  function updateLeaderboard() {
    const newLeaderboard = {...leaderboard}
    for (var key in votes) {
      const vote = votes[key].vote
      if (vote) {
        const oldValue = newLeaderboard[key]?.value || 0
        const newValue = Math.abs(average.value - vote)
        newLeaderboard[key] = {
          name: votes[key].name,
          value: Math.round((oldValue + newValue) * 10) / 10
        }
      }
    }
    setLeaderboard(newLeaderboard)
  }

  function chooseName() {
    const newUser = { id: crypto.randomUUID(), name }
    localStorage.setItem('user', JSON.stringify(newUser))
    setUser(newUser)
  }

  function renderCard(key: string) {
    if (!votes[key].vote)
      return <div className={`body-card body-card--empty`}></div>
    else if (!showVotes)
      return <div className={`body-card body-card--flipped`}></div>
    else
      return <div className={`body-card`}>{votes[key].vote}</div>
  }

  if (user == false) {
    return (
      <div className="modal">
        <div className="modal__dialog">
          <h2 className="modal__title">Choose your display name</h2>
          <input className="modal__input" type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn btn--primary" onClick={() => chooseName()}>Continue</button>
        </div>
      </div>
    )
  }
  else if (loading) {
    return <></>
  }
  else {
    const myVote = votes[user?.id]?.vote
    const values = [1, 2, 3, 5, 8]
    return (
      <>
        <main className="main">
          <div className="body">
            <div className="table">
              {showVotes ?
                <button className="btn" onClick={() => restart()}>Start new voting</button>
                :
                <button className="btn btn--primary" onClick={() => revealCards()}>Reveal cards</button>
              }
            </div>
            <div className="body-cards">
              {Object.keys(votes).map(key => {
                return (
                  <div className="body-cards__block" key={key}>
                    {renderCard(key)}
                    <span className="body-cards__label">{votes[key].name}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="footer">
            {showVotes ?
              <div className="footer__cards footer__cards--totals">
                {values.map(value => {
                  if (totals[value] > 0) {
                    return (
                      <div className="footer__block">
                        <div className="card">{value}</div>
                        <span className="footer__label">{totals[value]} Vote{totals[value] > 1 && 's'}</span>
                      </div>
                    )
                  }
                })}
                <div className="footer__block">
                  <span className="footer__title">Average</span>
                  <span className="footer__text">{average.value}</span>
                </div>
              </div>
              :
              <div className="footer__cards">
                {values.map(value => {
                  return <button className={`card footer__card ${myVote == value ? 'selected' : ''}`} onClick={() => handleVote(value)}>{value}</button>
                })}
              </div>
            }
          </div>
        </main>

        <div className="leaderboard">
          <div className="leaderboard__header">Leaderboard</div>
          <div className="leaderboard__board">
            {Object.keys(leaderboard)
              .sort((a, b) => leaderboard[b].value - leaderboard[a].value)
              .map((key, index) => {
                return (
                  <div className="leaderboard__item" key={key}>
                    <span className="leaderboard__number">{index+1}.</span>
                    <span className="leaderboard__name">{leaderboard[key].name}</span>
                    <span className="leaderboard__score">{leaderboard[key].value}</span>
                  </div>
                )
              })
            }
          </div>
        </div>
      </>
    )
  }
}
