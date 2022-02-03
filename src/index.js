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

//const getUserUrl='http://localhost:3000/user';
//const signInUrl='http://localhost:3000/signin';

//Don't accept requests unless the server has admin credentials and other server init vars ready
let isServerReady=false;

//We log as admin in API for db update purposes
let adminJWT="";

axios.post(routes.SIGN_IN_URL, 
    {
    username: 'admin',
    password: 'k4$p0lt.3L_'
  })
  .then( (response) => 
  {
      let data=response.data;
      //console.log(data)
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


//const putUserUrl='http://localhost:3000/user';
//const verifyTokenUrl='https://chess-rook-rest-api.herokuapp.com/verifyToken';


/*
var allClients = [];
io.sockets.on('connection', function(socket) {
   allClients.push(socket);

   socket.on('disconnect', function() {
      console.log('Got disconnect!');

      var i = allClients.indexOf(socket);
      allClients.splice(i, 1);
   });
});
*/

let usersManager=new UsersManager(); //<usenrame, {user, socketId, challengesReceived, challengesSent}>



sendUserUpdateToAPI = (user) => 
{
    console.log("sending user update to API...".cyan);
    console.log(user.username);
    //let requestData=socket.handshake.query;
    //console.log(requestData);
    console.log(adminJWT)

    //username, name, surname, email, bulletActualRating, bulletMaxRating, blitzActualRating, blitzMaxRating, rapidActualRating, rapidMaxRating, password, newPassword


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
        //username: "admin",
    }

    console.log("sending token to api...".yellow);

    axios.put(routes.USER_URL, params, config)
    .then(res => 
    {
      //console.log(`statusCode: ${res.status}`);
        console.log('Updated!'.green);
        console.log(res.data);
        //next();
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
    //console.log("INDEX: ".red+senderIndex);
    //console.log(indexes);
    let minIndex=indexes[0];
    let maxIndex=indexes[1];
    //console.log(publicChallenge);
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
                //usersManager.usersOnline.get(array[i].username).challengesReceived.push(challenge.clone());
                io.to(receiver.socketId).emit("updateChallengesReceived", usersManager.getUserChallengsReceived(receiver.user.username));
            }
        }
    }
    
}

/*let pairingLoop= () =>
{
    for(publicChallenge of challengesPool)
    {

    }
}*/

let safeJoin= (data, socket)=>
{

    console.log(data);
    //console.log("\n\n\n\n");console.log(data);console.log("\n\n\n\n");
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
        //data.user.jwt   checkingChange
    );
    //console.log(user);

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
    //console.log(usersManager.usersOnline);
    socket.join("verified");

    /*console.log("|||||||||||||||||||||||||||||||||||||||".cyan);
    console.log(usersManager.bulletUsers);
    console.log("[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]".red);
    console.log(usersManager.blitzUsers);
    console.log("[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]".red);
    console.log(usersManager.rapidUsers);
    console.log("|||||||||||||||||||||||||||||||||||||||".cyan);*/
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
    //console.log(isServerReady)
    if(!isServerReady)
    {
        console.log("Server Not ready!".bold.red)
        throw new Error('server is not ready');
    }
        
    
    console.log("client connecting...".cyan);
    let requestData=socket.handshake.query;
    //console.log(requestData);
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
      //console.log(`statusCode: ${res.status}`);
        console.log('verified!'.green);
        console.log(res.data);
        //console.log(res.data);
        //activeusersManager++;

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
        //socket.data.jwt=data.jwt;

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

        //socket.disconnect(true);

    })
 
})
.on('connection', (socket) =>
{
    //let user=socket.data.user;
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
    //io.to(usersManager.get(challenge.receiverUser.username).socketId).emit("updateChallengesReceived", socket.id, challenge);
    io.to(user.socketId).emit("updateChallengesReceived", receivedChallenges);
    io.to(user.socketId).emit("updateChallengesSent", sentChallenges);





    

    /*socket.emit("updateChallengesReceived", usersManager.usersOnline.get(username).challengesReceived);
    socket.emit("updateChallengesSent", usersManager.usersOnline.get(username).challengesSent);*/

    //console.log(user);

    socket.on("sendChallenge", (senderChallenge) => 
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
            //challenge.senderUser.jwt="0"; checkingChange
            //challenge.receiverUser.jwt="0";  checkingChange
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

                //io.to(usersManager.get(challenge.receiverUser.username).socketId).emit("updateChallengesReceived", socket.id, challenge);
                io.to(receiver.socketId).emit("updateChallengesReceived", receivedChallenges);
                io.to(sender.socketId).emit("updateChallengesSent", sentChallenges);
                //socket.broadcast.emit("updateChallengesReceived", challenge);
            }
        }
        else
        {
            
            console.log("Invalid challenge! ".bold.red);

            io.to(usersManager.usersOnline.get(senderUsername).socketId).emit("invalidChallenge");
            io.to(usersManager.usersOnline.get(senderUsername).socketId).emit("updateChallengesSent", usersManager.getUserChallengsSent(senderUsername));
        }
    })

    socket.on("acceptChallenge", (challengeId) => 
    {
        console.log("Challenge accepted!".bold.cyan);
        //let challenge=usersManager.usersOnline.get(socket.handshake.query.username).challengesReceived[receiverChallengeIndex];
        let challenge=usersManager.challengesPool.get(challengeId);
            let sender=usersManager.usersOnline.get(challenge.senderUser.username)
            let receiver=usersManager.usersOnline.get(socket.handshake.query.username)

            /*let sender=challenge.senderUser;
            let receiver=challenge.receiverUser;*/

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
        
    });


    socket.on("cancelChallenge", (challengeId) => 
    {
        console.log(challengeId)
        if(usersManager.challengesPool.has(challengeId))
        {
            console.log("Challenge canceled!".bold.cyan);
            //let challenge=usersManager.usersOnline.get(socket.handshake.query.username).challengesReceived[receiverChallengeIndex];
            let challenge=usersManager.challengesPool.get(challengeId);
    
            console.log(challenge);
    
            let sender=usersManager.usersOnline.get(challenge.senderUser.username)
    
            usersManager.cancelChallenge(challengeId);
            io.to(sender.socketId).emit("updateChallengesSent", sender.challengesSent);
    
            io.emit.broadcast()
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
        /*console.log("Games active: ")
        console.log(usersManager.gamesActive);*/
        let game=usersManager.gamesActive.get(gameId);
        //console.log(game);
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
        //let player=  
    });

})

io.on('disconnect', (socket) =>
{
    //activeusersManager--;
    console.log("User disconnected, total users active: "+usersManager.size);
})

app.get('/', (req, res) => 
{
    res.send('Welcome to server');
});

http.listen(process.env.PORT || 3200, ()=>
{
    console.log('listening on port 3200!'.bold.yellow+"\n");
})

