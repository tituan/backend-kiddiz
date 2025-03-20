var express = require("express");
var router = express.Router();
const User = require("../models/users.js");
const Message = require("../models/message.js");
const Conversation = require("../models/conversation.js");
const Article = require("../models/articles.js");

// Créer un nouveau message
router.post("/new", async (req, res) => {
  try {
    const { sender, content, conversationId } = req.body;
    if (!sender || !content || !conversationId) {
      return res.status(400).json({ message: "Tous les champs sont requis." });
    }

    const senderDoc = await User.findOne({ token: sender }).select("_id firstname lastname");

    const conversation = await Conversation.findById(conversationId);

    const receiverId = conversation.participants.find((e) => e.toString() !== senderDoc._id.toString());

    const receiverDoc = await User.findById(receiverId).select("firstname lastname _id");

    if (!senderDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    const newMessage = new Message({
      sender: senderDoc._id,
      receiver: receiverDoc._id,
      content,
      conversationId,
    });

    const message = await newMessage.save();

    res.status(201).json({
      content: message.content,
      conversationId: message.conversationId,
      date: message.timestamp,
      isOwnMessage: true,
      sender: { name: senderDoc.firstname + " " + senderDoc.lastname }, 
      receiver: { name: receiverDoc.firstname + " " + receiverDoc.lastname }
    });

  } catch (error) {
    console.error("Erreur lors de l'envoi du message :", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Créer une nouvelle conversation
router.post("/new/conversation/:articleId/:token", async (req, res) => {
  try {
    const articleId = req.params.articleId;
    const token = req.params.token;
    let participantIds = [];

    const article = await Article.findOne({ _id: articleId });

    const seller = article.user
    const buyer = await User.findOne({ token: token }).select("_id")

    participantIds.push(buyer);
    participantIds.push(seller);


    const newConversation = new Conversation({
      participants: participantIds,
      articleId,
      createdAt: new Date(),
    });

    const conversation = await newConversation.save();
    res.status(201).json(conversation);
  } catch (error) {
    console.error("Erreur lors de la création de la conversation :", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// But => récupérer toutes les conversation d'un user depuis l'écran global des messages
router.get("/list/:token", async (req, res) => {
  try {
    const user = await User.findOne({ token: req.params.token }).select("_id")
    console.log(user)
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    const allConversations = await Conversation.find({ participants: user._id }).lean();
    const conversationIds = allConversations.map((e) => e._id)

    const conversationsList = await Message.aggregate([
      {
        $match: {
          conversationId: {
            $in: conversationIds
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "sender"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "receiver",
          foreignField: "_id",
          as: "receiver"
        }
      },
      {
        $lookup: {
          from: "conversations",
          localField: "conversationId",
          foreignField: "_id",
          as: "conversation"
        }
      },
      {
        $addFields: {
          receiver: {
            $first: "$receiver"
          },
          sender: {
            $first: "$sender"
          },
          conversation: {
            $first: "$conversation"
          }
        }
      },
      {
        $lookup: {
          from: "articles",
          localField: "conversation.articleId",
          foreignField: "_id",
          as: "article"
        }
      },
      {
        $addFields: {
          article: {
            $first: "$article"
          }
        }
      },
      {
        $project: {
          conversationId: 1,
          content: 1,
          sender: {
            name: {
              $concat: [
                "$sender.firstname",
                " ",
                "$sender.lastname"
              ]
            },
            _id: "$sender._id",

          },
          receiver: {
            name: {
              $concat: [
                "$receiver.firstname",
                " ",
                "$receiver.lastname"
              ]
            },
            _id: "$receiver._id",
          },
          articleName: "$article.title",
          articleUri: {
            $first: "$article.pictures"
          },
          date: "$timestamp"
        }
      },
      {
        $group: {
          _id: "$conversationId",
          messages: {
            $push: {
              conversationId: "$conversationId",
              sender: "$sender",
              receiver: "$receiver",
              articleName: "$articleName",
              articleUri: "$articleUri",
              content: "$content",
              date: "$date"
            }
          }
        }
      }
    ])

    const formattedConversations = conversationsList.map((c) => {
      
      const messages = c.messages.sort((a, b) => b.date - a.date);
      const lastMessage = messages[0];
      console.log({ _id: c._id, otherPerson: lastMessage.receiver._id.toString() === user._id.toString() ? lastMessage.sender.name : lastMessage.receiver.name, lastMessage:  messages[0] });
      const otherPerson = lastMessage.receiver._id.toString() === user._id.toString() ? lastMessage.sender.name : lastMessage.receiver.name
      return { _id: c._id, 
        otherPerson, 
        lastMessage: {
            conversationId: lastMessage.conversationId,
            sender: { name: lastMessage.sender.name },
            receiver: { name: lastMessage.receiver.name },
            articleName: lastMessage.articleName,
            articleUri: lastMessage.articleUri,
            content: lastMessage.content,
            date: lastMessage.date
      } }
    }).sort((a, b) => b.lastMessage?.date - a.lastMessage?.date)
    

    res.json({ success: true, formattedConversations })
  } catch (e) {
    console.log(e.message);

    res.status(500).json({ success: false, error: e.message })
  }
})

// Récupérer tous les messages d'une conversation
router.get("/messages/:token/:conversationId", async (req, res) => {
  try {
    const { token, conversationId } = req.params;
    const messages = await Message.find({ conversationId }).sort({ timestamp: -1 }).populate("sender")
    const formattedMessages = messages.map((m) => {
      const { content, timestamp, sender } = m;
      return {
        content,
        date: timestamp,
        isOwnMessage: sender.token === token
      }
    })


    res.json({ success: true, messages: formattedMessages });
  } catch (error) {
    console.error("Erreur lors de la récupération des messages :", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// nouvelle route avec user token qui va chercher l'id du user et ajouter l'artcile id au click sur le btn nous contacter
router.get("/:token/:articleId", async (req, res) => {
  try {
    const { token, articleId } = req.params;

    const buyer = await User.findOne({ token: token });

    const buyerID = buyer._id;

    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: "Article non trouvé." });
    }

    const sellerID = article.user;

    const conversation = await Conversation.findOne({
      articleId: articleId,
      participants: { $all: [buyerID, sellerID] }
    });

    if (conversation) {
      const filteredConversation = {
        _id: conversation._id,
        articleId: conversation.articleId,
        createdAt: conversation.createdAt,
      }
      return res.json(filteredConversation);
    }

    console.log("Aucune conversation trouvée.");
    return res.status(404).json({ message: "Aucune conversation trouvée." });

  } catch (error) {
    console.error("Erreur lors de la récupération de la conversation :", error);
    return res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

module.exports = router;

