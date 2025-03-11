var express = require("express");
var router = express.Router();
const User = require("../models/users.js");
const Message = require("../models/message.js"); // 🔥 Vérification du nom du modèle
const Conversation = require("../models/conversation.js");
const { ObjectId } = require("mongodb");
const Article = require("../models/articles.js");

// 🔹 Créer un nouveau message
router.post("/new", async (req, res) => {
    try {
        const { sender, receiver, content, conversationId } = req.body;

        if (!sender || !receiver || !content || !conversationId) {
            return res.status(400).json({ message: "Tous les champs sont requis." });
        }

        const newMessage = new Message({
            sender,
            receiver,
            content,
            conversationId,
            date: new Date(),
        });

        const message = await newMessage.save();
        res.status(201).json(message);
    } catch (error) {
        console.error("❌ Erreur lors de l'envoi du message :", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Créer une nouvelle conversation
router.post("/new/conversation", async (req, res) => {
    try {
        const { participants, articleId } = req.body;

        if (!participants || participants.length !== 2 || !articleId) {
            return res.status(400).json({ message: "Participants et articleId requis." });
        }

        const newConversation = new Conversation({
            participants,
            articleId,
            createdAt: new Date(),
        });

        const conversation = await newConversation.save();
        res.status(201).json(conversation);
    } catch (error) {
        console.error("❌ Erreur lors de la création de la conversation :", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Récupérer tous les messages d'une conversation
router.get("/get/:conversationId", async (req, res) => {
    try {
        const { conversationId } = req.params;

        if (!ObjectId.isValid(conversationId)) {
            return res.status(400).json({ message: "conversationId invalide." });
        }

        const messages = await Message.find({ conversationId: new ObjectId(conversationId) }).sort({ date: 1 });

        if (!messages || messages.length === 0) {
            return res.status(404).json({ message: "Aucun message trouvé pour cette conversation." });
        }

        res.status(200).json(messages);
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des messages :", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Récupérer toutes les conversations d'un utilisateur
router.get("/get/conversations/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: "userId requis." });
        }

        const conversations = await Conversation.find({ participants: userId });

        if (!conversations || conversations.length === 0) {
            return res.status(404).json({ message: "Aucune conversation trouvée." });
        }

        res.status(200).json(conversations);
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des conversations :", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Récupérer une conversation entre un vendeur et un acheteur pour un article
router.get("/get/conversation/:sellerId/:buyerId/:articleId", async (req, res) => {
    try {
        const { sellerId, buyerId, articleId } = req.params;

        if (!ObjectId.isValid(articleId)) {
            return res.status(400).json({ message: "articleId invalide." });
        }

        console.log(`🔍 Recherche d'une conversation entre ${sellerId} et ${buyerId} pour l'article ${articleId}`);

        const conversation = await Conversation.findOne({
            participants: { $all: [sellerId, buyerId] },
            articleId: new ObjectId(articleId),
        });

        if (!conversation) {
            console.log("⚠️ Aucune conversation trouvée.");
            return res.status(404).json({ message: "Aucune conversation trouvée pour cet article." });
        }

        res.status(200).json(conversation);
    } catch (error) {
        console.error("❌ Erreur lors de la récupération de la conversation :", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Démarrer une nouvelle conversation entre un vendeur et un acheteur
router.post("/start", async (req, res) => {
    try {
        const { sellerId, buyerId, articleId } = req.body;

        if (!sellerId || !buyerId || !articleId) {
            return res.status(400).json({ message: "sellerId, buyerId et articleId requis." });
        }

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

        res.status(201).json(conversation);
    } catch (error) {
        console.error("❌ Erreur lors de la création de la conversation :", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Route pour envoyer un message avec Socket.io
router.post("/", async (req, res) => {
    try {
        const { conversationId, sender, receiver, content } = req.body;

        if (!conversationId || !sender || !receiver || !content) {
            return res.status(400).json({ error: "Tous les champs sont requis." });
        }

        const newMessage = new Message({
            conversationId,
            sender,
            receiver,
            content,
            date: new Date(),
        });

        await newMessage.save();
        console.log("📩 Message envoyé :", newMessage);
        res.status(201).json(newMessage);
    } catch (error) {
        console.error("❌ Erreur lors de l'envoi du message :", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

module.exports = router;

