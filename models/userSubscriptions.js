const mongoose = require('mongoose');

const userSubscriptionSchema = mongoose.Schema({
    userFollower: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    userFollowed: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
});

const UserSubscription = mongoose.model('userSubscriptions', userSubscriptionSchema);

module.exports = UserSubscription;