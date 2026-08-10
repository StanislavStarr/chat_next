const { WebSocketServer } = require("ws")

const wss = new WebSocketServer({ port: 8081 })
const histories = new Map()
const pendingResponses = new Set()
const subscriptions = new Map()

function getHistory(meetingId) {
  if (!histories.has(meetingId)) {
    histories.set(meetingId, [])
  }

  return histories.get(meetingId)
}

function send(socket, event) {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(event))
  }
}

function subscribe(socket, meetingId) {
  if (!subscriptions.has(meetingId)) {
    subscriptions.set(meetingId, new Set())
  }

  subscriptions.get(meetingId).add(socket)
}

function broadcast(meetingId, event) {
  subscriptions.get(meetingId)?.forEach((socket) => send(socket, event))
}

function handleMessage(socket, payload) {
  const { meetingId, clientId, text, createdAt } = payload

  if (
    typeof meetingId !== "string" ||
    typeof clientId !== "string" ||
    typeof text !== "string" ||
    typeof createdAt !== "string"
  ) {
    return
  }

  const history = getHistory(meetingId)
  const responseId = `echo-${clientId}`
  const existingResponse = history.find((message) => message.id === responseId)

  if (existingResponse) {
    send(socket, {
      type: "message",
      meetingId,
      message: existingResponse,
    })
    return
  }

  if (!history.some((message) => message.id === clientId)) {
    history.push({
      id: clientId,
      meetingId,
      clientId,
      text,
      author: "user",
      status: "delivered",
      createdAt,
    })
  }

  const responseKey = `${meetingId}:${clientId}`

  subscribe(socket, meetingId)
  broadcast(meetingId, {
    type: "typing",
    meetingId,
    clientId,
    isTyping: true,
  })

  if (pendingResponses.has(responseKey)) {
    return
  }

  pendingResponses.add(responseKey)

  setTimeout(() => {
    const response = {
      id: responseId,
      meetingId,
      clientId,
      text,
      author: "consultant",
      status: "delivered",
      createdAt: new Date().toISOString(),
    }

    getHistory(meetingId).push(response)
    pendingResponses.delete(responseKey)

    broadcast(meetingId, {
      type: "typing",
      meetingId,
      clientId,
      isTyping: false,
    })
    broadcast(meetingId, {
      type: "message",
      meetingId,
      message: response,
    })
  }, 1_500 + Math.random() * 500)
}

wss.on("connection", (socket) => {
  socket.on("message", (rawMessage) => {
    let payload

    try {
      payload = JSON.parse(rawMessage.toString())
    } catch {
      return
    }

    if (payload.type === "join" && typeof payload.meetingId === "string") {
      subscribe(socket, payload.meetingId)
      send(socket, {
        type: "history",
        meetingId: payload.meetingId,
        messages: getHistory(payload.meetingId),
      })
      return
    }

    if (payload.type === "message") {
      handleMessage(socket, payload)
    }
  })

  setTimeout(() => {
    socket.terminate()
  }, 25_000 + Math.random() * 10_000)

  socket.on("close", () => {
    subscriptions.forEach((sockets, meetingId) => {
      sockets.delete(socket)

      if (sockets.size === 0) {
        subscriptions.delete(meetingId)
      }
    })
  })
})
