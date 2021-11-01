const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const router = express.Router();
const keys = require('../../config/keys');
const verify = require('../../utilities/verify-token');
const Message = require('../../models/Message');
const Conversation = require('../../models/Conversation');
const GlobalMessage = require('../../models/GlobalMessage');
const {log} = require("nodemon/lib/utils");

let jwtUser = null;

// Token verfication middleware
router.use(function (req, res, next) {
    try {
        jwtUser = jwt.verify(verify(req), keys.secretOrKey);
        next();
    } catch (err) {
        console.log(err);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({message: 'Unauthorized'}));
        res.sendStatus(401);
    }
});

// Get global messages
router.get('/global', (req, res) => {
    GlobalMessage.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'from',
                foreignField: '_id',
                as: 'fromObj',
            },
        },
    ])
        .project({
            'fromObj.password': 0,
            'fromObj.__v': 0,
            'fromObj.date': 0,
        })
        .exec((err, messages) => {
            if (err) {
                console.log(err);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({message: 'Failure'}));
                res.sendStatus(500);
            } else {
                res.send(messages);
            }
        });
});

// Post global message
router.post('/global', (req, res) => {
    let message = new GlobalMessage({
        from: jwtUser.id,
        body: req.body.body,
    });

    req.io.sockets.emit('messages', req.body.body);

    message.save(err => {
        if (err) {
            console.log(err);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({message: 'Failure'}));
            res.sendStatus(500);
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({message: 'Success'}));
        }
    });
});

// Get conversations list
router.get('/conversations', (req, res) => {
    let from = mongoose.Types.ObjectId(jwtUser.id);
    Conversation.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'recipients',
                foreignField: '_id',
                as: 'recipientObj',
            },
        },
    ])
        .match({recipients: {$all: [{$elemMatch: {$eq: from}}]}})
        .project({
            'recipientObj.password': 0,
            'recipientObj.__v': 0,
            'recipientObj.date': 0,
        })
        .exec((err, conversations) => {
            if (err) {
                console.log(err);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({message: 'Failure'}));
                res.sendStatus(500);
            } else {
                res.send(conversations);
            }
        });
});

// Get messages from conversation
// based on to & from
router.get('/conversations/query', (req, res) => {
    let user1 = mongoose.Types.ObjectId(jwtUser.id);
    let user2 = mongoose.Types.ObjectId(req.query.userId);
    Message.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'to',
                foreignField: '_id',
                as: 'toObj',
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: 'from',
                foreignField: '_id',
                as: 'fromObj',
            },
        },
    ])
        .match({
            $or: [
                {$and: [{to: user1}, {from: user2}]},
                {$and: [{to: user2}, {from: user1}]},
            ],
        })
        .project({
            'toObj.password': 0,
            'toObj.__v': 0,
            'toObj.date': 0,
            'fromObj.password': 0,
            'fromObj.__v': 0,
            'fromObj.date': 0,
        })
        .exec((err, messages) => {
            if (err) {
                console.log(err);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({message: 'Failure'}));
                res.sendStatus(500);
            } else {
                res.send(messages);
            }
        });
});

// Post private message
router.post('/', (req, res) => {
    let from = mongoose.Types.ObjectId(jwtUser.id);
    let to = mongoose.Types.ObjectId(req.body.to);

    Conversation.findOneAndUpdate(
        {
            recipients: {
                $all: [
                    {$elemMatch: {$eq: from}},
                    {$elemMatch: {$eq: to}},
                ],
            },
        },
        {
            recipients: [jwtUser.id, req.body.to],
            lastMessage: req.body.body,
            date: Date.now(),
        },
        {upsert: true, new: true, setDefaultsOnInsert: true},
        function (err, conversation) {
            if (err) {
                console.log(err);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({message: 'Failure'}));
                res.sendStatus(500);
            } else {
                let message = new Message({
                    conversation: conversation._id,
                    to: req.body.to,
                    from: jwtUser.id,
                    body: req.body.body,
                });

                req.io.sockets.emit('messages', req.body.body);

                message.save(err => {
                    if (err) {
                        console.log(err);
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({message: 'Failure'}));
                        res.sendStatus(500);
                    } else {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(
                            JSON.stringify({
                                message: 'Success',
                                conversationId: conversation._id,
                            })
                        );
                    }
                });
            }
        }
    );
});

//cursor based pagination


router.get('/cursor', async (req, res) => {

    const currentDate = new Date();
    const timestamp = String(currentDate.getTime());
    let chatDate = req.query.chatDate;
    if (!chatDate) {
        chatDate = timestamp;
    }
    let chatDate2 = String(chatDate - 86400000);

    GlobalMessage.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'from',
                foreignField: '_id',
                as: 'fromObj',
            },
        },


        {$match: {date: {$gte: chatDate2, $lte: timestamp}}},
    ])
        .project({
            'fromObj.password': 0,
            'fromObj.__v': 0,
            'fromObj.date': 0,
        })
        .sort({_id: -1}).exec(function (err, messages) {
        if (err) {
            console.log(err);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({message: 'Failure'}));
            res.sendStatus(500);
        } else {
            res.send(messages.reverse());
        }

    });
});

//for get data on scroll Top
router.get('/pagination', async (req, res) => {

    let currentDate = new Date();
    let time = String(currentDate.getTime());
    var fromFrontend = req.query.messageLastTimestamp
    if (fromFrontend) {
        time = fromFrontend
    }


    GlobalMessage.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'from',
                foreignField: '_id',
                as: 'fromObj',
            },
        },


        {$match: {date: {$lte: time}}},
    ])
        .project({
            'fromObj.password': 0,
            'fromObj.__v': 0,
            'fromObj.date': 0,
        })
        .sort({_id: -1}).limit(11).exec(function (err, messages) {
        if (err) {
            console.log(err);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({message: 'Failure'}));
            res.sendStatus(500);
        } else {
            time = messages[messages.length - 1].date
            messages.pop();
            var messages = messages.reverse();
            res.send(messages);
        }

    });
});
router.get('/last_data', async (req, res) => {

    let currentDate = new Date();
    let time = String(currentDate.getTime());
    var fromFrontend = req.query.messageLastTimestamp
    if (fromFrontend) {
        time = fromFrontend
    }

    GlobalMessage.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'from',
                foreignField: '_id',
                as: 'fromObj',
            },
        },


        {$match: {date: {$gte: time}}},
    ])
        .project({
            'fromObj.password': 0,
            'fromObj.__v': 0,
            'fromObj.date': 0,
        })
        .sort({_id: -1}).limit(11).exec(function (err, messages) {
        if (err) {
            console.log(err);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({message: 'Failure'}));
            res.sendStatus(500);
        } else {
            messages.pop();
            var messages = messages.reverse();
            res.send(messages);
        }

    });
});

//for get date on scroll Top

router.get('/date', async (req, res) => {

    let currentDate = new Date();
    let time = String(currentDate.getTime());
    var fromFrontend = req.query.messageLastTimestamp
    if (fromFrontend) {
        time = fromFrontend
    }




    GlobalMessage.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'from',
                foreignField: '_id',
                as: 'fromObj',
            },
        },


        {$match: {date: {$lte: time}}},
    ])
        .project({
            'fromObj.password': 0,
            'fromObj.__v': 0,
            'fromObj.date': 0,
        })
        .sort({_id: -1}).limit(11).exec(function (err, messages) {
        if (err) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({message: 'Failure'}));
            res.sendStatus(500);
        } else {
            time = messages[messages.length - 1].date
            last = messages[0].date
            res.send({time});
        }

    });
});
module.exports = router;
