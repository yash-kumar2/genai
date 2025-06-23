const express = require('express');
require('./db/mongoose');
const userRouter = require('./routers/user');
const roadmapRoutes = require('./routers/roadMap');
require('dotenv').config();
const cors = require('cors'); // ✅ Add this line

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true 
}));

app.use(express.json());
app.use(userRouter);
app.use(roadmapRoutes);

app.listen(port, () => {
    console.log('Server is up on port ' + port);
});

const User = require('./models/user');
