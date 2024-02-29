const express = require('express')
const http = require('http');
const next = require('next')
const { Server } = require("socket.io");

const port = process.env.PORT || 3000
const dev = process.env.NODE_ENV !== 'production'
const nextApp = next({ dev })
const nextHandler = nextApp.getRequestHandler()

nextApp.prepare().then(() => {
  const app = express()
  const server = http.createServer(app)
  const io = new Server(server)

  io.on('connection', (socket) => {

    socket.on('join', (room, user) => {
      getVotes(socket, room)
      socket.data.userId = user.id
      socket.data.room = room
      socket.join(room)
      socket.in(room).emit('joined', user)
    })

    socket.on('leave', () => {
      socket.in(socket.data.room).emit('disconnected', socket.data.userId)
    })
  
    socket.on('disconnect', () => {
      socket.in(socket.data.room).emit('disconnected', socket.data.userId)
    })
  
    socket.on('vote', (room, user, vote) => {
      socket.in(room).emit('vote', user, vote)
    })
  
    socket.on('showVotes', (room) => {
      socket.in(room).emit('showVotes')
    })
  
    socket.on('restart', (room) => {
      socket.in(room).emit('restart')
    })
  })

  app.all('*', (req, res) => nextHandler(req, res));

  server.listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
  });
})

async function getVotes(socket, room) {
  try {
    const sockets = await socket.in(room).fetchSockets()
    const res = await Promise.any(
      sockets.map(item => {
        return item.timeout(10000).emitWithAck('requestVotes')
      })
    )
    socket.emit('receiveVotes', res)
  }
  catch (err) {
    socket.emit('receiveVotes', { votes: {}, showVotes: false })
  }
}