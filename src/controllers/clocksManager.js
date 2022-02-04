const { Console } = require('console');
var ev = require('../events.js');

class ClocksManager
{
    constructor(io, usersManager, adminJWT)
    {
        this.adminJWT=adminJWT;
        this.routes =require('../routes');
        this.axios = require('axios');
        this.ev=require('../events.js');
        this.usersManager=usersManager;
        this.io=io;
        //this.clocks=new Map() //<gameId, clock>
        //this.clocksListeners=new Map() //<gameId, listener>
    }

    addTimeOverListener(gameId)
    {
        console.log("Adding listener to gameId: "+gameId);
        ev.on(`${gameId}/gameOver`, (game, result) =>
        {
            console.log("Game over event!");
            this.gameOver(game, result);
        });
    }

    /*responseGameOver(clock)
    {
        thi
        //this.games.set(clock.gameId, clock);
    }*/
    /*move(gameId)
    {

    }*/
    gameOver=(game, result)=>
    {
        console.log("@@@@@@@@@@@@@@@@@@@@TIME OVER@@@@@@@@@@@@@@@@@@@")
        console.log(game);
        console.log(result);
        console.log("@@@@@@@@@@@@@@@@@@@/TIME OVER@@@@@@@@@@@@@@@@@@@")
        console.log("sending game over to both players!")
        let updatedData=this.usersManager.updateNewRatings(game.white, game.black, game.gameMode, result, 30, 400);
        this.updateUsersToAPI(game.white, game.black);
        let sendableGameOver={whiteUsername:game.white, whiteNewRating:updatedData.whiteNewRating, whiteVariation:updatedData.variation, blackUsername:game.black,  blackNewRating:updatedData.blackNewRating, blackVariation:-updatedData.variation, result:game.result}
        console.log(sendableGameOver);
        console.log(game.id)
        this.io.in(game.id).emit('gameOver', sendableGameOver);
    }

    sendUserUpdateToAPI = (user) => 
    {
        console.log("sending user update to API...".cyan);
        console.log(user.username);
        console.log(this.adminJWT)

        let config=
        {
            headers: 
            {
               Authorization: "Bearer " + this.adminJWT
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

        this.axios.put(this.routes.USER_URL, params, config)
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


    updateUsersToAPI = (username1, username2) => 
    {
        let user1=this.usersManager.usersOnline.get(username1).user;
        let user2=this.usersManager.usersOnline.get(username2).user;

        this.sendUserUpdateToAPI(user1);
        this.sendUserUpdateToAPI(user2);
    }
}
module.exports=ClocksManager;