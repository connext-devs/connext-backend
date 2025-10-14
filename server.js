const {
    app
} = require('./app')
const {
    Server
} = require('socket.io')
const http = require('http')

const PORT = 3000 || process.env.PORT
const server =http.createServer(app)

// socket.io init
const io = new Server(server, {
    cors: {
        origin: "*", // or restrict to your frontend
    },
});


require("./src/sockets/chat.socket")(io);

server.listen(PORT, () => {
    console.log(`Connected to port:${PORT}`);
})


module.exports = app