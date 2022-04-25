require('dotenv').config();

const express =  require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');


const utils = require('./utils');

const { User, Message } = require('./models');
const { use } = require('express/lib/application');

const app = express();

app.use(cors());

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended : true}));




// app.get('/',(req,res,next)=>{

//   // const user = new User({
//   //   name: "john doe",
//   //   email : "john@gamil.com",
//   //   password : "john"
//   // });
//   // user.save()
//   // .then((result)=>{
//   //   if(result){
//   //     res.json({
//   //       message: "User Created",
//   //       user
//   //     });
//   //   }
//   // })
//   // res.json({
//   //   messages :['message1','message2']
//   // })
//   next();
// });

//middleware that checks if JWT token exists and verifies it if it does exist.
//In all future routes, this helps to know if the request is authenticated or not.
app.use(function (req, res, next) {
  // check header or url parameters or post parameters for token
  var token = req.headers['authorization'];
  if (!token) return next(); //if no token, continue

  token = token.replace('Bearer ', '');
  jwt.verify(token, process.env.JWT_SECRET, function (err, user) {
    if (err) {
      return res.status(401).json({
        error: true,
        message: "Invalid user."
      });
    } else {
      req.user = user; //set the user to req so other routes can use it
      next();
    }
  });
});

app.post('/login', async (req, res, next)=>{
  const email = req.body.email;
  const password = req.body.password;
  if(!email || !password){
    return res.status(400).json({
      "message" : "please provide email and password"
    });
  }
  const user = await User.findOne({email});
  
  if(!user || user.password != password){
    return res.status(401).json({"message" : "email or password is wrong"});
  }
  // generate token
  const token = utils.generateToken(user);
  // get basic user details
  const userObj = utils.getCleanUser(user);
  // return the token along with user details
  return res.json({ user: userObj, token });
});

// verify the token and return it if it's valid
app.get('/verifyToken', function (req, res) {
  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token;
  if (!token) {
    return res.status(400).json({
      error: true,
      message: "Token is required."
    });
  }
  // check token that was passed by decoding token using secret
  jwt.verify(token, process.env.JWT_SECRET, function (err, user) {
    if (err) return res.status(401).json({
      error: true,
      message: "Invalid token."
    });

    // return 401 status if the userId does not match.
    if (user.userId !== userData.userId) {
      return res.status(401).json({
        error: true,
        message: "Invalid user."
      });
    }
    // get basic user details
    var userObj = utils.getCleanUser(userData);
    return res.json({ user: userObj, token });
  });
});

app.get('/messages',async (req, res)=>{
  const email = req.query.emailId;
  const user = await User.findOne({email})
  .populate('inbox')
  .populate('sent')
  .lean();
  console.log(email);
  console.log(user);
  const INBOX = user.inbox.map((m)=>{
    if(m.forwardedTo.includes(user._id)){
      return {...m,forwarded : true}
    }
    return m;
  });
  console.log(INBOX);
  if(!user){
    return res.status(404).json({
      message : "error while getting messages"
    });
  }
  res.json({
    message : "got messages successfully",
    inbox : INBOX,
    sent : user.sent
  });
  
});

app.get('/message',async(req, res, next)=>{
  const messageId = req.query.messageId;
  const message = await Message.findById(messageId)
  .populate('sentBy')
  .populate('to');
  if(!message){
    return res.status(400).json({
      "message" : "error getting message"
    });
  }
  console.log(message);
  res.json({
    "message" : "found message",
    "m": message
  });
});

app.post('/message',async (req, res, next)=>{
  const message = req.body.message;
  const sentBy = req.body.sentBy;
  const to = req.body.to;

  if(!message || !sentBy || !to ){
    return res.json({
      "message" : "form is not filled please try again"
    });
  }
  const sender = await User.findOne({email : sentBy});
  const reciever = await User.findOne({email : to});
  console.log('sentBy : ',sentBy);
  console.log('to : ',to);
  console.log('senser : ',sender);
  console.log('reciever: ',reciever);
  if(!sender || !reciever){
    return res.status(400).json({
      message : "error while sending messages"
    });
  }
  const messageDoc = await new Message({
    message,
    sentBy : sender._id,
    to : [reciever._id]
  }).save();
  console.log(messageDoc);
  if(messageDoc){
    await User.findOneAndUpdate({email : to }, 
      { $push :{ inbox : messageDoc._id}});
    await User.findOneAndUpdate({email : sentBy }, { $push :{ sent : messageDoc._id}});
  }
  res.json({
    message : "message sent successfully",
    messageDoc
  });
});

app.put('/forward',async (req, res, next)=>{
  const messageId = req.body.messageId;
  const forwardedTo = req.body.forwardedTo;
console.log(req.body);
  if(!messageId  || !forwardedTo){
    res.status(400).json(
      {
        "messsage" : "error while forwarding"
      }
    )
  }
  const user = await User.findOne({ email : forwardedTo});
  const message = await Message.findById(messageId);
  if(message && message.forwardedTo.includes(user._id)){
    return res.json({
      "message" : "message already forwarded"
    });
  }
  await User.findOneAndUpdate({email : forwardedTo},{  $push :{ inbox : messageId}
  });
  await Message.findByIdAndUpdate(messageId,{
    $push :{ forwardedTo : user._id}
  });
  res.json({
    "message" : "message forwarded successfully"
  });
});

mongoose.connect(process.env.MONGO_URL,()=>{
  app.listen(8000, ()=>{
  console.log('server started at 8000');
});
});
