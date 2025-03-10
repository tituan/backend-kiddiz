const Conversation = require('../models/connection'); // Importer le modèle Conversation
const Message = require('../models/message'); // Importer le modèle Message

const sockets = async (io, socket) => {
  // listen for new connections
  socket.on('start_conversation', async (data) => {
    const { articleId, sellerId, buyerId } = data;

    try {
      // check if a conversation already exists
      const existingConversation = await Conversation.findOne({
        participants: { $all: [sellerId, buyerId] },
        articleId,
      });

      let conversation;
      if (!existingConversation) {
        // create a new conversation
        conversation = new Conversation({
          participants: [sellerId, buyerId],
          articleId,
        });
        await conversation.save();
        console.log('Nouvelle conversation créée:', conversation);
      } else {
        conversation = existingConversation;
        console.log('Conversation existante récupérée:', conversation);
      }

      // send a conversation_started event to the client
      socket.emit('conversation_started', { conversationId: conversation._id });
    } catch (error) {
      console.error('Erreur lors de la création de la conversation:', error);
    }
  });

  // listen for new messages
  socket.on('send_message', async (data) => {
    const { conversationId, sender, receiver, content } = data;

    try {
      // save the message in MongoDB
      const newMessage = new Message({
        conversationId,
        sender,
        receiver,
        content,
      });
      await newMessage.save();
      console.log('Message sauvegardé dans MongoDB:', newMessage);

      // send the message to all clients
      io.emit('receive_message', newMessage);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du message:', error);
    }
  });

  
};

module.exports = sockets;