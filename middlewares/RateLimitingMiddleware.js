const AccessModel = require('../models/AccessModel');

const rateLimiting = async (req, res, next) => {
    const sessionId = req.session.id;

    // Rate limiting logic
    // Check if the user todo create before or not
    const sessionDb = await AccessModel.findOne({ sessionId: sessionId });

    //if sessionD is null, that means user is accessing the server for the first time, create a fresh entry in accessmodel
    if (!sessionDb) {
        // Create a new entry in sessionDb
        const accessDb = new AccessModel({
            sessionId: sessionId,
            time: Date.now()
        })

        await accessDb.save();
        next();
        return;
    } else {
        //if entry was there, then we need to compare the time
        const previousTime = sessionDb.time;
        const currentTime = Date.now();
        const timeDifference = currentTime - previousTime;

        // If timeDifference < 2 sec the user doesn't allow to create the todo back to back
        if (timeDifference < 2000) {
            return res.send({
                status: 401,
                message: "Too many request, Please try in some time"
            })
        } else {
            //allow the person to make request but before that update the time to latest
            try {
                await AccessModel.findOneAndUpdate(
                    { sessionId: sessionId },
                    { time: Date.now() }
                );
                next();
            } catch (error) {
                return res.send({
                    status: 500,
                    message: "Database error in access model",
                    error: error,
                });
            }
        }
    }
}

module.exports = { rateLimiting }