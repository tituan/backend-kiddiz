const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    articles: [{ type: mongoose.Schema.Types.ObjectId, ref: "articles" }],
    orderStatus: { type: String },
    orderDate: { type: Date},
    deliveryDate: { type: Date},
    deliveryType: { type: String},
}, { timestamps: true }); 

// timestamps active automatiquement deux champs : createdAt: Date de création du document && updatedAt: Date de dernière mise à jour
// il s'agit d'une feature de Mongoose
// Exemple : lors de la modification de l'orderStatus, updatedAt sera modifié automatiquement

const Order = mongoose.model('orders', orderSchema);

module.exports = Order;