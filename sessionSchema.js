const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const sessionSchema = new Schema({
    _id: String
},
    {
        strict: false
    })

module.export = mongoose.model("session", sessionSchema);
