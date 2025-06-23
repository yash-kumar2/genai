const express = require('express')
require('./db/mongoose')
const userRouter = require('./routers/user')
const roadmapRoutes = require('./routers/roadMap')
require('dotenv').config();




const app = express()
const port = process.env.PORT || 3000




app.use(express.json())
app.use(userRouter)
app.use(roadmapRoutes)


app.listen(port, () => {
    console.log('Server is up on port ' + port)
})


const User = require('./models/user')

