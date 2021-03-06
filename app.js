import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import dayjs from 'dayjs';
import { userSchema, messageSchema } from './validations.js';
import { stripHtml } from "string-strip-html";

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
        const verifyUser = await db.collection("participants").findOne({ name: name });
        if (verifyUser) {
            return res.sendStatus(409);
        }
        await db.collection("participants").insertOne({name: stripHtml(name).result.trim(), lastStatus: Date.now()});
        await db.collection("messages").insertOne({from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format("HH:mm:ss")});
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
        const message = {from: stripHtml(from).result.trim(), to: stripHtml(to).result.trim(), text: stripHtml(text).result.trim(), type: type, time: dayjs().format("HH:mm:ss")};
        const result = await db.collection("messages").insertOne(message);
        res.sendStatus(201);
    } catch (err) {
        res.sendStatus(500);
    }
});

app.get('/messages', async (req, res) => {
    const limit = parseInt(req.query.limit);
    const messages = await db.collection("messages").find({}).toArray();
    const user = req.headers.user;
    try {
        const filteredMessages = messages.filter(message => message.from === user || message.to === user || message.to === 'Todos');
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
    const verifySenderUser = await participantsColection.findOne({ name: user });
    if (!verifySenderUser) {
        return res.sendStatus(404);
    };
    try {
        await participantsColection.updateOne({
            name: user
        }, { $set: {time: Date.now()}});
        res.sendStatus(200);
    } catch (err) {
        res.sendStatus(500);
    }
});

app.delete('/messages/:id', async (req,res) => {
    const { user } = req.headers;
    const { id } = req.params;
    const verifySenderMessage = await db.collection("messages").findOne({  _id: new ObjectId(id) });
    if (!verifySenderMessage) {
        return res.sendStatus(404);
    };
    try {
        if (verifySenderMessage.from !== user ) {
            return res.sendStatus(401);
        } else {
           await db.collection("messages").deleteOne({_id: new ObjectId(id)});
        }
    } catch (err) {
        return res.sendStatus(500);
    }

});


async function removeInactiveUsers () {
    const allParticipants = await db.collection("participants").find({}).toArray();
    try {
        for (const participant of allParticipants) {
            if (Date.now() - participant.lastStatus > 10000) {
                await db.collection("participants").deleteOne({ _id: new ObjectId(participant._id)});
                await db.collection("messages").insertOne({from: participant.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs().format("HH:mm:ss")})
            }
        }
    } catch (err) {
        res.send(err)    
    }
};

setInterval(removeInactiveUsers, 15000);

app.listen(5000);