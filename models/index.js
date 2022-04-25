const mongoose = require('mongoose');

const { Schema } = mongoose;

const UsersSchema = new Schema({
  name : {
    type : String,
    trim : true
  },
  email : {
    type : String,
    trim : true,
    required : true
  },
  password : {
    type : String,
    trim : true,
    required : true
  },
  inbox : [{
      type : mongoose.Types.ObjectId,
      ref: 'Message',
  }],
  sent :[{
      type : mongoose.Types.ObjectId,
      ref: 'Message',
  }]
})

const messagesSchema = new Schema(
  {
    message:{
      type : String,
      required : true,
      trim : true
    },
    sentBy:{
      type : mongoose.Types.ObjectId,
      ref: 'User',
    },
    to :[{
      type : mongoose.Types.ObjectId,
      ref: 'User',
    }],
    forwardedTo : [{
      type : mongoose.Types.ObjectId,
      ref: 'User',
    }],
  },
  { timestamps: true }
);

exports.User = mongoose.model('User',UsersSchema);
exports.Message = mongoose.model('Message',messagesSchema);