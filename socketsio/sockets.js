const { Server } = require("socket.io");
const Conversation = require("../models/conversation");
const Message = require("../models/message");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`🟢 Un utilisateur connecté : ${socket.id}`);

    socket.on("start_conversation", async (data) => {
      const { articleId, sellerId, buyerId } = data;

      try {
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
          console.log("Nouvelle conversation créée:", conversation);
        } else {
          conversation = existingConversation;
          console.log("Conversation existante récupérée:", conversation);
        }

        socket.emit("conversation_started", { conversationId: conversation._id });
      } catch (error) {
        console.error("Erreur lors de la création de la conversation:", error);
      }
    });

    socket.on("send_message", async (data) => {
      const { conversationId, sender, receiver, content } = data;

      try {
        const newMessage = new Message({ conversationId, sender, receiver, content });
        await newMessage.save();
        console.log("Message sauvegardé dans MongoDB:", newMessage);

        io.to(conversationId).emit("receive_message", newMessage);
      } catch (error) {
        console.error("Erreur lors de l'envoi du message:", error);
      }
    } );

    socket.on("disconnect", () => {
      console.log(`🔴 Utilisateur déconnecté : ${socket.id}`);
    });
  });
};