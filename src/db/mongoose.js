const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://yashk6767:1234@cluster0.h788twk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));
