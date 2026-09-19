const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/araweb-ecommerce', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    const db = mongoose.connection.db;
    const orders = await db.collection('orders').find().sort({ createdAt: -1 }).limit(1).toArray();
    console.log(JSON.stringify(orders[0].orderItems, null, 2));
    process.exit(0);
});
