import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        
        // Test database connection by retrieving collection names
        const collections = await mongoose.connection.db.collections();
        console.log(`Available collections: ${collections.map(c => c.collectionName).join(', ')}`);
        
        return conn;
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
