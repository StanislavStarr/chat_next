const { WebSocketServer } = require("ws")

const wss = new WebSocketServer({ port: 8081 })

wss.on("connection", (socket) => {
  socket.on("message", (message) => {
    let clientId

    try {
      const payload = JSON.parse(message.toString())
      clientId = payload.clientId
    } catch {
      return
    }

    if (typeof clientId !== "string") {
      return
    }

    socket.send(
      JSON.stringify({
        type: "typing",
        clientId,
        isTyping: true,
      }),
    )

    setTimeout(() => {
      if (socket.readyState === 1) {
        socket.send(
          JSON.stringify({
            type: "typing",
            clientId,
            isTyping: false,
          }),
        )
        socket.send(message.toString())
      }
    }, 1_500 + Math.random() * 500)
  })

  setTimeout(() => {
    socket.terminate()
  }, 25_000 + Math.random() * 10_000)
})
