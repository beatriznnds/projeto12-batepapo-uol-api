import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import dayjs from 'dayjs';
import { userSchema, messageSchema } from './validations.js';

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
	db = mongoClient.db("batepapo-uol");
});

app.post('/participants', async (req, res) => {
    const { name } = req.body;
    const validUser = userSchema.validate({ name: name });
    if (validUser.error) {
        return res.sendStatus(422);
    };
    try {
        const verificateUser = await db.collection("participants").findOne({ name: name });
        if (verificateUser) {
            return res.sendStatus(409);
        }
        await db.collection("participants").insertOne({name: name, lastStatus: Date.now()});
        await db.collection("messages").insertOne({from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format("HH:MM:SS")});
        res.sendStatus(201);
    } catch (err) {
        res.sendStatus(500);
    }
});

app.get('/participants', async (req, res) => {
    try {
        const participants = await db.collection("participants").find({}).toArray();
        res.send(participants);
    } catch (err) {
        res.sendStatus(500);
    }  
});

app.post('/messages', async (req, res) => {
    const { to, text, type } = req.body;
    const from = req.headers.user;
    const validMessage = messageSchema.validate({ to: to, text: text, type: type, from: from});
    if (validMessage.error) {
        return res.sendStatus(422);
    };
    const verificateSender = await db.collection("participants").findOne({ name: from });
    if (!verificateSender) {
        return res.sendStatus(404);
    };
    
    try {
        await db.collection("messages").insertOne({from: from, to: to, text: text, type: type, time: dayjs().format("HH:MM:SS")});
        res.sendStatus(201);
    } catch (err) {
        res.sendStatus(500);
    }
});

app.get('/messages', async (req, res) => {
    const limit = parseInt(req.query.limit);
    const messages = await db.collection("messages").find({}).toArray();
    const user = req.headers.body;
    try {
        const filteredMessages = messages.filter(message => message.from === user && message.to === user && message.type === 'message');
        if (!limit) {
            res.send(filteredMessages)
        } else {
            const lastMessages = filteredMessages.reverse();
            res.send(lastMessages.slice(0, limit));
        }
    } catch (err) {
        res.status(500).send();
    }
});

app.post('/status', async (req, res) => {
    const { user } = req.headers;
    const participantsColection = db.collection("participants");
    const verificateSenderUser = await participantsColection.findOne({ name: user });
    if (!verificateSenderUser) {
        return res.sendStatus(404);
    };
    try {
        await participantsColection.updateOne({
            name: user
        }, { $set: Date.now()});
        res.sendStatus(200)
    } catch (err) {
        res.sendStatus(500);
    }
});

async function removeInactiveUsers () {
    const allParticipants = await db.collection("participants").find({}).toArray();
    try {
        for (let i = 0; i < allParticipants.length; i++) {
            if (Date.now() - allParticipants[i].lastStatus > 10000) {
                await db.collection("participants").deleteOne({ _id: new ObjectId(allParticipants[i]._id)});
                await db.collection("messages").insertOne({from: allParticipants[i].name, to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs().format('HH:MM:SS')})
            }
        }
    } catch (err) {
        res.send(err)    
    }
};

setInterval(removeInactiveUsers, 15000);

app.listen(5000);
