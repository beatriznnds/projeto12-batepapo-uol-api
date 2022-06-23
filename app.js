import express from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from 'dayjs';
import { userSchema } from './validations.js';

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
        res.sendStatus(422);
        return;
    };
    try {
        const verificateUser = await db.collection("participants").findOne({ name: name });
        if (verificateUser) {
            res.sendStatus(409);
            return;
        }
        await db.collection('participants').insertOne({name: name, lastStatus: Date.now()});
        await db.collection('messages').insertOne({from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('HH:MM:SS')});
        res.sendStatus(200);
    } catch {
        res.sendStatus(500);
    }
});

app.listen(5000);