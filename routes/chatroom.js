var express = require("express");
var router = express.Router();
const User = require("../models/users.js");
const Messages = require("../models/messages.js");
const Conversation = require("../models/conversation.js");
const { ObjectId } = require("mongodb");
const Article = require("../models/articles.js");


// Create a new message
router.post("/new", async (req, res) => {
    try {
        const { sender, receiver, content } = req.body;
        const newMessages = new Message({
        sender,
        receiver,
        content,
        date: new Date(),
        });
        const message = await newMessages.save();
        res.status(200).json(message);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
    });

    // Get all messages for a conversation ID
    router.get("/get/:id", async (req, res) => {
        try {
            const messages = await Messages.find({ conversationId: req.params.id });
            res.status(200).json(messages);
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }   );

    // Get all conversations for a user ID  
    router.get("/get/conversations/:id", async (req, res) => {
        try {
            const conversations = await Conversation.find({ participants: req.params.id });
            res.status(200).json(conversations);
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    });

    // Start a new conversation between two users
    router.post("/start", async (req, res) => {
        try {
            const { sellerId, buyerId, articleId } = req.body;
            const existingConversation = await Conversation.findOne({
            participants: { $all: [sellerId, buyerId] },
            articleId,
            });
            let conversation;
            if (!existingConversation) {
            conversation = new Conversation({
                participants: [sellerId, buyerId],
                articleId,
            });
            await conversation.save();
            } else {
            conversation = existingConversation;
            }
            res.status(200).json(conversation);
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    });

    module.exports = router;