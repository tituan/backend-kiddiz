

const { Server } = require("socket.io");
const Message = require("../models/message");
const Conversation = require("../models/conversation");

module.exports = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // À adapter en prod
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`🟢 Nouvel utilisateur connecté : ${socket.id}`);

    /**
     * 🔹 Rejoindre une conversation
     */
    socket.on("join_conversation", (conversationId) => {
      if (!conversationId) return;

      socket.join(conversationId);
      console.log(`✅ Utilisateur ${socket.id} a rejoint la conversation ${conversationId}`);
    });

    /**
     * 📩 Envoi d'un message
     */
    socket.on("send_message", async (data) => {
      try {
        const { conversationId, sender, receiver, content } = data;

        // Vérification des données
        if (!conversationId || !sender || !receiver || !content) {
          return socket.emit("error", { message: "Données manquantes pour envoyer le message" });
        }

        // Création et sauvegarde du message
        const newMessage = new Message({ conversationId, sender, receiver, content });
        await newMessage.save();

        // Envoyer uniquement aux utilisateurs de la conversation
        socket.to(conversationId).emit("receive_message", newMessage);

        console.log(`📨 Message envoyé dans conversation ${conversationId} par ${sender}`);
      } catch (error) {
        console.error("❌ Erreur lors de l’envoi du message:", error);
        socket.emit("error", { message: "Erreur serveur lors de l'envoi du message" });
      }
    });

    /**
     * 🔴 Déconnexion d'un utilisateur
     */
    socket.on("disconnect", () => {
      console.log(`🔴 Utilisateur déconnecté : ${socket.id}`);
    });
  });

  return io;
};
