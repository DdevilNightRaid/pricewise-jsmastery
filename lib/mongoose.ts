import mongoose from "mongoose";

let isConnected = false; // Variable to track connection status

export const connectToDB = async () => {
    mongoose.set('strictQuery', true);

    if(!process.env.MONGODB_URI) return console.log('MONGODB_URI is not defined');

    if(isConnected) return console.log('=> using existing db connection');

    try {
        await mongoose.connect(process.env.MONGODB_URI);        
        isConnected = true;
        console.log('Mongodb Connected');
    } catch (error) {
        console.log(error);
    }
}
