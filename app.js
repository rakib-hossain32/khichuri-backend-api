require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI environment variable is not set. Please set it.');
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- Mongoose Schemas and Models ---
const productSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    image: String,
    recipe: { type: String, default: '' },
    discount: { type: Number, default: 0 },
    reviews: {
        type: [{
            author: String,
            rating: Number,
            comment: String,
            date: { type: Date, default: Date.now }
        }],
        default: []
    }
});
productSchema.virtual('id').get(function() { return this._id.toHexString(); });
productSchema.set('toJSON', { virtuals: true });
const Product = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({
    customerName: String,
    email: String, // গ্রাহকের ইমেইল
    address: String,
    phone: String,
    items: [{
        productId: String,
        name: String,
        qty: Number,
        price: Number,
        discount: Number
    }],
    total: Number,
    paymentMethod: String,
    status: { type: String, default: 'পেন্ডিং' },
}, { timestamps: true });
orderSchema.virtual('id').get(function() { return this._id.toHexString(); });
orderSchema.set('toJSON', { virtuals: true });
const Order = mongoose.model('Order', orderSchema);

const nodemailer = require('nodemailer');

// --- Nodemailer Transport ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendCancellationEmail = async (to, orderId) => {
    if (!to) {
        console.log(`Cannot send email for order ${orderId}: No email address provided.`);
        return;
    }
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: `আপনার "খিচুড়ি ঘর" এর অর্ডার #${orderId} বাতিল করা হয়েছে`,
        html: `
            <h3>আপনার অর্ডার বাতিল করা হয়েছে</h3>
            <p>দুঃখিত, আপনার অর্ডার #${orderId} আমাদের পক্ষ থেকে বাতিল করা হয়েছে।</p>
            <p>অর্ডার সংক্রান্ত কোনো প্রশ্ন থাকলে, আমাদের সাথে যোগাযোগ করুন।</p>
            <p>ধন্যবাদান্তে,</p>
            <p><b>খিচুড়ি ঘর</b></p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Cancellation email sent successfully to:', to);
    } catch (error) {
        console.error('Error sending cancellation email:', error);
    }
};

const sendCompletionEmail = async (to, orderId) => {
    if (!to) {
        console.log(`Cannot send email for order ${orderId}: No email address provided.`);
        return;
    }
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: `আপনার "খিচুড়ি ঘর" এর অর্ডার #${orderId} সম্পন্ন হয়েছে`,
        html: `
            <h3>আপনার অর্ডারটি সফলভাবে সম্পন্ন হয়েছে!</h3>
            <p>আপনার অর্ডার #${orderId} প্রস্তুত এবং ডেলিভারির জন্য পাঠানো হয়েছে।</p>
            <p>আমাদের সাথে থাকার জন্য ধন্যবাদ।</p>
            <p>ধন্যবাদান্তে,</p>
            <p><b>খিচুড়ি ঘর</b></p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Completion email sent successfully to:', to);
    } catch (error) {
        console.error('Error sending completion email:', error);
    }
};

const sendPreparingEmail = async (to, orderId) => {
    if (!to) {
        console.log(`Cannot send email for order ${orderId}: No email address provided.`);
        return;
    }
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: `আপনার "খিচুড়ি ঘর" এর অর্ডার #${orderId} প্রস্তুত হচ্ছে`,
        html: `
            <h3>আপনার অর্ডারটি প্রস্তুত করা হচ্ছে!</h3>
            <p>আমরা আপনার অর্ডার #${orderId} পেয়েছি এবং এটি এখন প্রস্তুত করা হচ্ছে।</p>
            <p>ধন্যবাদান্তে,</p>
            <p><b>খিচুড়ি ঘর</b></p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Preparing email sent successfully to:', to);
    } catch (error) {
        console.error('Error sending preparing email:', error);
    }
};

const sendShippedEmail = async (to, orderId) => {
    if (!to) {
        console.log(`Cannot send email for order ${orderId}: No email address provided.`);
        return;
    }
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: `আপনার "খিচুড়ি ঘর" এর অর্ডার #${orderId} পাঠানো হয়েছে`,
        html: `
            <h3>আপনার অর্ডারটি পাঠানো হয়েছে!</h3>
            <p>আপনার অর্ডার #${orderId} ডেলিভারির জন্য পাঠানো হয়েছে এবং শীঘ্রই আপনার কাছে পৌঁছাবে।</p>
            <p>আমাদের সাথে থাকার জন্য ধন্যবাদ।</p>
            <p>ধন্যবাদান্তে,</p>
            <p><b>খিচুড়ি ঘর</b></p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Shipped email sent successfully to:', to);
    } catch (error) {
        console.error('Error sending shipped email:', error);
    }
};

// --- New Message Schema and Model ---
const messageSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: String, default: () => new Date().toLocaleString('bn-BD') }
});
messageSchema.virtual('id').get(function() { return this._id.toHexString(); });
messageSchema.set('toJSON', { virtuals: true });
const Message = mongoose.model('Message', messageSchema);


// --- Initial Data (Optional - for first time seed) ---
async function seedProducts() {
    try {
        const count = await Product.countDocuments();
        if (count === 0) {
            const initialProducts = [
                { name: "গরুর মাংস খিচুড়ি", description: "সুস্বাদু গরুর মাংস এবং মশলা দিয়ে তৈরি মজাদার খিচুড়ি। এটি আপনার ক্ষুধা নিবারণ করবে এবং একটি সম্পূর্ণ খাবার হিসাবে কাজ করবে। আমরা সেরা মানসম্মত গরুর মাংস এবং প্রাকৃতিক মশলা ব্যবহার করি।", price: 250, discount: 10, image: "https://placehold.co/600x400/6B8E23/FFFFFF?text=Beef+Khichuri" },
                { name: "ডিম খিচুড়ি", description: "ডিম এবং সবজি দিয়ে তৈরি হালকা ও পুষ্টিকর খিচুড়ি। সকাল বা বিকালের নাস্তার জন্য উপযুক্ত। শিশুরা এটি খুব পছন্দ করে।", price: 180, discount: 0, image: "https://placehold.co/600x400/FFD700/6B8E23?text=Egg+Khichuri" },
                { name: "নিরামিষ খিচুড়ি", description: "বিভিন্ন ধরণের তাজা সবজি দিয়ে তৈরি স্বাস্থ্যকর নিরামিষ খিচুড়ি। যারা নিরামিষ পছন্দ করেন তাদের জন্য এটি একটি দারুণ বিকল্প।", price: 200, discount: 5, image: "https://placehold.co/600x400/FDF9F3/6B8E23?text=Veg+Khichuri" },
                { name: "মুরগির মাংস খিচুড়ি", description: "দেশি মুরগির মাংসের অসাধারণ স্বাদে ভরপুর এই খিচুড়ি আপনার মন জয় করবে। পারিবারিক ভোজ বা বন্ধুদের সাথে আড্ডার জন্য আদর্শ।", price: 220, discount: 0, image: "https://placehold.co/600x400/6B8E23/FFFFFF?text=Chicken+Khichuri" },
                { name: "ভুনা খিচুড়ি", description: "বিশেষ মশলা এবং কৌশলে তৈরি ভুনা খিচুড়ি, এক অন্যরকম স্বাদ। প্রতিটি দানা যেন স্বাদের বিস্ফোরণ ঘটায়।", price: 230, discount: 8, image: "https://placehold.co/600x400/FFD700/6B8E23?text=Bhuna+Khichuri" },
                { name: "মশলা খিচুড়ি", description: "একদম গরম গরম এবং মশলাদার খিচুড়ি যা আপনার মন চাঙ্গা করে তুলবে। শীতের সন্ধ্যায় এর স্বাদ অতুলনীয়।", price: 190, discount: 0, image: "https://placehold.co/600x400/FDF9F3/6B8E23?text=Spicy+Khichuri" }
            ];
            await Product.insertMany(initialProducts);
            console.log('Initial products seeded successfully!');
        }
    } catch (error) {
        console.error('Error seeding products:', error);
    }
}
mongoose.connection.on('connected', seedProducts);


// --- API Routes for Products (No Change) ---
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().lean();
        res.json(products);
    } catch (err) { res.status(500).json({ message: err.message }); }
});
app.post('/api/products', async (req, res) => {
    const product = new Product(req.body);
    try {
        const newProduct = await product.save();
        res.status(201).json(newProduct);
    } catch (err) { res.status(400).json({ message: err.message }); }
});

// PUT route for updating a product
app.put('/api/products/:id', async (req, res) => {
    try {
        const { name, description, price, image, discount, recipe } = req.body;
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id, 
            { name, description, price, image, discount, recipe }, 
            { new: true, runValidators: true }
        );
        if (!updatedProduct) return res.status(404).json({ message: 'Product not found' });
        res.json(updatedProduct);
    } catch (err) { res.status(400).json({ message: err.message }); }
});
app.delete('/api/products/:id', async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) return res.status(404).json({ message: 'Product not found' });
        res.status(204).send();
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Add a review to a product
app.post('/api/products/:id/reviews', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const { author, rating, comment } = req.body;
        
        if (!author || !rating || !comment) {
            return res.status(400).json({ message: 'Author, rating, and comment are required.' });
        }

        const newReview = {
            author,
            rating,
            comment,
        };

        product.reviews.push(newReview);
        await product.save();

        const addedReview = product.reviews[product.reviews.length - 1];
        res.status(201).json(addedReview);
    } catch (error) {
        res.status(500).json({ message: 'Error adding review', error: error.message });
    }
});

// --- API Routes for Orders ---
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ timestamp: -1 }).lean();
        res.json(orders);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/orders', async (req, res) => {
    const order = new Order(req.body);
    try {
        const newOrder = await order.save();
        res.status(201).json(newOrder);
    } catch (err) { res.status(400).json({ message: err.message }); }
});

// PUT route for updating an order
app.put('/api/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const newStatus = req.body.status;

        const originalOrder = await Order.findById(orderId);
        if (!originalOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const updatedOrder = await Order.findByIdAndUpdate(orderId, req.body, { new: true });

        // স্ট্যাটাস পরিবর্তন হলে ইমেইল পাঠান
        if (newStatus !== originalOrder.status) {
            const shortId = updatedOrder._id.toString().substring(0, 8);
            if (newStatus === 'বাতিল') {
                await sendCancellationEmail(updatedOrder.email, shortId);
            } else if (newStatus === 'সম্পন্ন') {
                await sendCompletionEmail(updatedOrder.email, shortId);
            } else if (newStatus === 'প্রস্তুত হচ্ছে') {
                await sendPreparingEmail(updatedOrder.email, shortId);
            } else if (newStatus === 'পাঠানো হয়েছে') {
                await sendShippedEmail(updatedOrder.email, shortId);
            }
        }

        res.json(updatedOrder);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});



// --- New API Routes for Messages ---
// Submit a new message
app.post('/api/messages', async (req, res) => {
    const message = new Message(req.body);
    try {
        const newMessage = await message.save();
        res.status(201).json(newMessage);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get all messages (for admin panel)
app.get('/api/messages', async (req, res) => { // <-- এই রুটটি যোগ করুন
    try {
        const messages = await Message.find().sort({ timestamp: -1 }).lean();
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('API endpoints are available at:');
    console.log(`  - Products: http://localhost:${PORT}/api/products`);
    console.log(`  - Orders: http://localhost:${PORT}/api/orders`);
    console.log(`  - Messages: http://localhost:${PORT}/api/messages`); // New
});
