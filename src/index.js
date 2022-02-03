const User = require('./models/user.js');
const Rating= require('./models/rating.js');
const Challenge = require('./models/challenge.js');
const PublicChallenge=require('./models/publicChallenge.js');
const UsersManager=require('./models/usersManager.js');

const colors = require('colors');
const routes =require('./routes');


const app = require('express')();
const http = require('http').Server(app);
const axios = require('axios');
const GameTime = require('./models/game-time.js');
const io =require('socket.io')(http,
{
    cors: {
        origin:true,
        credentials: true,
        methods: ["GET", "POST"]
    }
});

//Don't accept requests unless the server has admin credentials and other server init vars ready
let isServerReady=false;

//Log as admin in API for db update purposes
let adminJWT="";

axios.post(routes.SIGN_IN_URL, 
    {
    username: 'admin',
    password: 'k4$p0lt.3L_'
  })
  .then( (response) => 
  {
      let data=response.data;
      console.log(data)
    if(data.logged)
    {
      console.log("Server logged as admin!".bold.green);
      adminJWT=data.jwt
      isServerReady=true;
    }
    else
    {
      console.log("Invalid admin credentials!".bold.red);
    }
  })
  .catch((error) => {
    console.log(error);
});

let usersManager=new UsersManager(); //<username, {user, socketId, challengesReceived, challengesSent}>



sendUserUpdateToAPI = (user) => 
{
    console.log("sending user update to API...".cyan);
    console.log(user.username);
    console.log(adminJWT)

    let config=
    {
        headers: 
        {
           Authorization: "Bearer " + adminJWT
        }
    }
    let params=
    {
        username:user.username,
        bulletActualRating:user.rating.bulletActualRating,
        bulletMaxRating:user.rating.bulletMaxRating,
        blitzActualRating:user.rating.blitzActualRating,
        blitzMaxRating:user.rating.blitzMaxRating,
        rapidActualRating:user.rating.rapidActualRating,
        rapidMaxRating:user.rating.rapidMaxRating
    }

    console.log("sending token to api...".yellow);

    axios.put(routes.USER_URL, params, config)
    .then(res => 
    {
        console.log('Updated!'.green);
        console.log(res.data);
    })
    .catch(error => 
    {
        console.log(error);

        const err = new Error("not authorized");
        err.data = { error: "Invalid jwt!" }; // additional details
        console.log("failed on verifying token".red);
        console.log("disconnected".bold.red);
    })
}


let updateUsersToAPI = (username1, username2) => 
{
    let user1=usersManager.usersOnline.get(username1).user;
    let user2=usersManager.usersOnline.get(username2).user;

    sendUserUpdateToAPI(user1);
    sendUserUpdateToAPI(user2);
}

let updateUsersChallenged = (publicChallenge) => 
{
    let challenge=publicChallenge.challenge;
    challenge.origin="received";
    challenge.status="pending";
    let category=challenge.challengeCategoryByTime();
    let array;

    if(category=="bullet")
        array=usersManager.bulletUsers;
    else if(category=="blitz")
        array=usersManager.blitzUsers;
    else
        array=usersManager.rapidUsers;

    let min=publicChallenge.minRatingValid;
    let max=publicChallenge.maxRatingValid;
    let indexes=usersManager.binarySearchChallengesLimits(min, max, array);
    let senderIndex=usersManager.findUserInArray(publicChallenge.challenge.senderUser.username, array);

    let minIndex=indexes[0];
    let maxIndex=indexes[1];

    console.log(array);
    console.log("from user ["+minIndex+"] to ["+maxIndex+"] excluded: "+senderIndex);

    if(maxIndex>-1)
        usersManager.updatePublicChallengesReceived(minIndex, maxIndex, array, challenge, senderIndex);
    
    console.log("Sending challenges update to sender: ".magenta+challenge.senderUser.username.magenta);
    io.to(usersManager.usersOnline.get(challenge.senderUser.username).socketId).emit("updateChallengesSent", usersManager.getUserChallengsSent(challenge.senderUser.username));
   

    if(maxIndex>-1)
    {
        console.log("Sending challenges update to all receivers: ".magenta);     

        for(let i=minIndex; i<=maxIndex;i++)
        {
            if(senderIndex!=i)
            {
                let receiver=usersManager.usersOnline.get(array[i].username);
                io.to(receiver.socketId).emit("updateChallengesReceived", usersManager.getUserChallengsReceived(receiver.user.username));
            }
        }
    }
    
}

let safeJoin= (data, socket)=>
{

    console.log(data);
    let user=new User
    (
        data.user.username, 
        new Rating
        (
            data.user.rating.bulletActualRating,
            data.user.rating.bulletMaxRating,
            data.user.rating.blitzActualRating,
            data.user.rating.blitzMaxRating,
            data.user.rating.rapidActualRating,
            data.user.rating.rapidMaxRating
        ), 
    );

    let userMsg="joining "+user.username+"..."
    console.log(userMsg.bold.cyan);

    console.log(socket.id);
    usersManager.addUserOnline
    (
        user.username, 
        {
            user:user, 
            socketId:socket.id, 
            challengesReceived:[], 
            challengesSent:[],
            gameActive:""
        }
    );
    socket.join("verified");

}


let gameOver=(game, result)=>
{
    console.log("sending game over to both players!")
    let updatedData=usersManager.updateNewRatings(game.white, game.black, game.gameMode, result, 30, 400);
    updateUsersToAPI(game.white, game.black);
    let sendableGameOver={whiteUsername:game.white, whiteNewRating:updatedData.whiteNewRating, whiteVariation:updatedData.variation, blackUsername:game.black,  blackNewRating:updatedData.blackNewRating, blackVariation:-updatedData.variation, result:game.result}
    console.log(sendableGameOver);
    console.log(game.id)
    io.in(game.id).emit('gameOver', sendableGameOver);

}


io.use((socket, next) => 
{
    if(!isServerReady)
    {
        console.log("Server Not ready!".bold.red)
        throw new Error('server is not ready');
    }
        
    
    console.log("client connecting...".cyan);
    let requestData=socket.handshake.query;
    let config=
    {
        headers: 
        {
           Authorization: "Bearer " + requestData.jwt
        },
        params:
        {
            username: requestData.username
        }
     }

    console.log("sending token to api...".yellow);

    axios.get(routes.USER_URL, config)
    .then(res => 
    {
        console.log('verified!'.green);
        console.log(res.data);

        let data=
        {
            user:
            {
                username:res.data.user.username,
                rating:
                {
                    bulletActualRating:res.data.user.bulletActualRating,
                    bulletMaxRating:res.data.user.bulletMaxRating,
                    blitzActualRating:res.data.user.blitzActualRating,
                    blitzMaxRating:res.data.user.blitzMaxRating,
                    rapidActualRating:res.data.user.rapidActualRating,
                    rapidMaxRating:res.data.user.rapidMaxRating
                }
            }
        }

        safeJoin(data, socket);
        let user=usersManager.usersOnline.get(res.data.user.username).user;
        socket.data.user=user;

        console.log("User connected, total users active: "+`${usersManager.size-1}`.green);
        console.log("bullet".cyan)
        console.log(usersManager.bulletUsers);
        next();
    })
    .catch(error => 
    {
        console.log(error);

        const err = new Error("not authorized");
        err.data = { error: "Invalid jwt!" }; // additional details
        console.log("failed on verifying token".red);
        console.log("disconnected".bold.red);
        next(err);
    })
 
})
.on('connection', (socket) =>
{
    console.log("connected!".bold.green+"\n");

    let username=socket.handshake.query.username;
    console.log(username);
    let user=usersManager.usersOnline.get(username);


    let receivedChallenges=usersManager.getUserChallengsReceived(user.user.username);
    let sentChallenges=usersManager.getUserChallengsSent(user.user.username);

    console.log("Sent: ")
    console.log(sentChallenges);
    console.log("Received: ")
    console.log(receivedChallenges);


    console.log("Sending challenges sent update to user: ".magenta+username.magenta);
    console.log("Sending challenges received update to user: ".magenta+username.magenta);

    console.log(user.socketId)
    io.to(user.socketId).emit("updateChallengesReceived", receivedChallenges);
    io.to(user.socketId).emit("updateChallengesSent", sentChallenges);

    socket.on("sendChallenge", (senderChallenge) => 
    {
        try
        {
            console.log(senderChallenge);
            let senderUsername=senderChallenge.senderUser.username;
            let receiverUsername=senderChallenge.receiverUser.username;
            console.log("challenge received: "+senderUsername+" to "+receiverUsername);
            if(usersManager.has(receiverUsername)&&usersManager.has(senderUsername)&&(receiverUsername!=senderUsername))
            {
                console.log("challenge valid!".green);
                console.log("min rating target: " + senderChallenge.minRatingTarget);
                console.log("max rating target: " + "+"+senderChallenge.maxRatingTarget);
                let challenge=new Challenge
                (
                    usersManager.usersOnline.get(senderUsername).user.clone(), 
                    usersManager.usersOnline.get(receiverUsername).user.clone(), 
                    senderChallenge.minRatingTarget, 
                    senderChallenge.maxRatingTarget,
                    new GameTime
                    (
                        senderChallenge.time.hours, 
                        senderChallenge.time.minutes, 
                        senderChallenge.time.seconds, 
                        senderChallenge.time.increment
                    ), 
                    senderChallenge.status, 
                    senderChallenge.origin, 
                    senderChallenge.type
                );
                console.log("..........................................".bold.red);
                console.log(challenge);
                console.log("..........................................".bold.red);
    
                usersManager.challengesPool.set(challenge.id, challenge);
    
                let receiver=usersManager.usersOnline.get(challenge.receiverUser.username);
                let sender=usersManager.usersOnline.get(challenge.senderUser.username);
                
                if(challenge.type=="public")
                {
                    usersManager.usersOnline.get(challenge.senderUser.username).challengesSent.push(challenge.id);
                    let publicChallenge=new PublicChallenge(challenge.clone());
                    updateUsersChallenged(publicChallenge);
                    usersManager.printChallenges();
                }
                else
                {
                    usersManager.usersOnline.get(challenge.senderUser.username).challengesSent.push(challenge.id);
                    usersManager.usersOnline.get(challenge.receiverUser.username).challengesReceived.push(challenge.id);
                    
                    let receiverChallenge=challenge.clone();
                    receiverChallenge.origin="received";
                    receiverChallenge.status="pending";
    
                    
    
                    console.log("Sending challenges update to receiver: ".magenta+receiver.user.username.magenta);
                    console.log("Sending challenges update to sender: ".magenta+sender.user.username.magenta);
                    usersManager.printChallenges();
                    
                    let receivedChallenges=usersManager.getUserChallengsReceived(receiver.user.username);
                    let sentChallenges=usersManager.getUserChallengsSent(sender.user.username);
    
                    io.to(receiver.socketId).emit("updateChallengesReceived", receivedChallenges);
                    io.to(sender.socketId).emit("updateChallengesSent", sentChallenges);
                }
            }
            else
            {
                
                console.log("Invalid challenge! ".bold.red);
    
                io.to(usersManager.usersOnline.get(senderUsername).socketId).emit("invalidChallenge");
                io.to(usersManager.usersOnline.get(senderUsername).socketId).emit("updateChallengesSent", usersManager.getUserChallengsSent(senderUsername));
            }
        }
        catch(e)
        {

        }
    })

    socket.on("acceptChallenge", (challengeId) => 
    {
        try
        {
            console.log("Challenge accepted!".bold.cyan);
            let challenge=usersManager.challengesPool.get(challengeId);
            let sender=usersManager.usersOnline.get(challenge.senderUser.username)
            let receiver=usersManager.usersOnline.get(socket.handshake.query.username)

            let game=usersManager.acceptChallenge(challengeId, socket.handshake.query.username);
            
            io.to(receiver.socketId).emit("updateChallengesReceived", receiver.challengesReceived);
            io.to(sender.socketId).emit("updateChallengesSent", sender.challengesSent);
            io.to(receiver.socketId).emit("challengeAcceptedReceiver");
            io.to(sender.socketId).emit("challengeAcceptedSender");

            let receiverSocket = io.sockets.sockets.get(receiver.socketId);
            let senderSocket= io.sockets.sockets.get(sender.socketId);

            console.log("Sockets starting game:")
            console.log(receiver.socketId);
            console.log(sender.socketId)
            console.log("==================".green);


            receiverSocket.join(game.id);
            senderSocket.join(game.id);

            console.log("sending new game event to players:")
            let sendableGame=
            {
                white:game.white,
                whiteRating:game.whiteRating,
                black:game.black,
                blackRating:game.blackRating,
                clock:
                {
                    hours:game.challenge.time.hours,
                    minutes:game.challenge.time.minutes,
                    seconds:game.challenge.time.seconds,
                    increment:game.challenge.time.increment
                }

            }

            console.log(sendableGame);
            io.to(game.id).emit("newGame", sendableGame);
            console.log("New game sent!");
            console.log(io.sockets.adapter.rooms);
            console.log("To move: "+game.userToMove);

        }
        catch(e)
        {
            console.log(e);
        }
        
        
    });

    socket.on("cancelChallenge", (index) => 
    {
        try
        {
            console.log(index);
            let username=socket.handshake.query.username;
            let challenges=usersManager.usersOnline.get(username).challengesSent;



            console.log(usersManager.usersOnline.get(username));
            let challengeId="";
            if(index<challenges.length)
                challengeId=usersManager.usersOnline.get(username).challengesSent[index];
    
            console.log(challengeId)
            if(usersManager.challengesPool.has(challengeId))
            {
                console.log("Challenge canceled!".bold.cyan);
                //let challenge=usersManager.usersOnline.get(socket.handshake.query.username).challengesReceived[receiverChallengeIndex];
                let challenge=usersManager.challengesPool.get(challengeId);
        
                console.log(challenge);
        
                let sender=usersManager.usersOnline.get(username)
        
                let receiversToNotify=usersManager.cancelChallenge(challengeId, sender);

                for(let receiver of receiversToNotify)
                    io.to(receiver.socketId).emit("updateChallengesReceived", receiver.challengesReceived);

                io.to(sender.socketId).emit("updateChallengesSent", sender.challengesSent);
        
                //io.emit.broadcast()
            }
        }
        catch(e)
        {
            console.log(e)
        }
        
    
    });


    socket.on("offerDraw", ()=>
    {
        let gameId=usersManager.usersOnline.get(socket.handshake.query.username).gameActive;
        let game=usersManager.gamesActive.get(gameId);
        let result=game.offerDraw(socket.handshake.query.username);
        console.log(result);
        if(result=="*")
        {
            console.log("sending draw request")
            socket.broadcast.to(gameId).emit('offeredDraw');
        }
        else //result == "1/2" because both players offered draw
        {
            gameOver(game, result)
        }
    })

    socket.on("resign", ()=>
    {
        let gameId=usersManager.usersOnline.get(socket.handshake.query.username).gameActive;
        let game=usersManager.gamesActive.get(gameId);
        let result=game.resign(socket.handshake.query.username);
        
        console.log("resigned")

        gameOver(game, result);

    })



    socket.on("sendMove", (movement) => 
    {
        
        let gameId=usersManager.usersOnline.get(socket.handshake.query.username).gameActive;
        console.log("Game id: ")
        console.log(gameId);
        let game=usersManager.gamesActive.get(gameId);

        if(game.userToMove===socket.handshake.query.username)
        {
            let result=usersManager.move(gameId, movement); 
            console.log(result);
            //result: {*, 1-0, 0-1, 1/2} if "*" => keep playing, else, game over

            socket.broadcast.to(gameId).emit('receiveMove', movement);
            if(result=="*")
            {
                console.log("sending move to the other player!")
                //keep game
            }
            else 
            {
                gameOver(game, result)
            }
        }
    });

})

io.on('disconnect', (socket) =>
{
    console.log("User disconnected, total users active: "+usersManager.size);
    //TODO
})

app.get('/', (req, res) => 
{
    res.send('Welcome to server');
});

http.listen(process.env.PORT || 3200, ()=>
{
    console.log('listening on port 3200!'.bold.yellow+"\n");
})

