const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const todoSchema = new Schema({
    todo: {
        type: String,
        require: true
    },
    userName: {
        type: String,
        require: true
    }
});

module.exports = mongoose.model('todo', todoSchema);