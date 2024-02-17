import { ObjectId } from "mongodb";
import { client } from "../index.js";

export async function getUserByName(username) {
    return await client
        .db("PMTusers")
        .collection("users")
        .findOne({ username: username });
}
export async function createUser(data) {
    return await client
        .db("PMTusers")
        .collection("users")
        .insertOne(data);
}

export async function getUserById(id) {
    return await client
        .db("PMTusers")
        .collection("users")
        .findOne({ _id: new ObjectId(id) });
}

export async function confirmEmailOTP(data) {
    return await client
        .db("PMTusers")
        .collection("confirmusers")
        .insertOne(data);
}

export async function checkOTP(OTP) {
    return await client
        .db("PMTusers")
        .collection("confirmusers")
        .findOne({ OTP: OTP });
}

export async function updatePassword(id, data) {
    return await client
        .db("PMTusers")
        .collection("users")
        .updateOne({ _id: new ObjectId(id) }, { $set: data });
}
