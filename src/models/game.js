const { Chess } = require('chess.js');
const Challenge =require('./challenge');
const { timeStamp } = require('console');
const { threadId } = require('worker_threads');

class Game
{
    constructor(challenge) 
    {
        this.challenge=challenge;
        //manage if a player is offering draw. If both are offering, game ends in draw.
        this.offeringDraw=[false, false];//[white, black]
        this.id=(Math.random()+1).toString(36).substring(2)+(Math.random()+1).toString(36).substring(2);
        this.coinFlip=Math.floor(Math.random() * 2);
        if(this.coinFlip==0)
        {
            this.white = challenge.senderUser.username
            this.black = challenge.receiverUser.username;
            this.whiteRating=challenge.senderRating();
            this.blackRating=challenge.receiverRating();
        }
        else
        {
            this.white = challenge.receiverUser.username;
            this.black = challenge.senderUser.username;
            this.whiteRating=challenge.receiverRating();
            this.blackRating=challenge.senderRating();
        }
        
        //this.gameOver=false;
        //this.draw=false;
        this.userToMove=this.white;
        this.chess = new Chess();
        this.result="*";
        this.gameMode=this.getGameMode();
        this.chess.header('Date',new Date())
        this.chess.header('GameTime',challenge.time.toString())
        this.chess.header('Result',"*")
        if(this.coinflip==1) 
        {
            this.chess.header('White',challenge.senderUser.username);
            this.chess.header('WhiteElo',challenge.senderRating());
            this.chess.header('Black',challenge.receiverUser.username);
            this.chess.header('BlackElo',challenge.receiverRating());
        }
        else
        {
            this.chess.header('White',challenge.receiverUser.username);
            this.chess.header('WhiteElo',challenge.receiverRating());
            this.chess.header('Black',challenge.senderUser.username);
            this.chess.header('BlackElo',challenge.senderRating());
        }
    }

    getGameMode = () => 
    {
        if(this.challenge.time.minutes<3)
            return "bullet";
        else if(this.challenge.time.minutes<10)
            return "blitz";
        else
            return "rapid";
    }

    offerDraw(username) 
    {
        
        if(username==this.white)
            this.offeringDraw[0]=true;
        else if(username==this.black)
            this.offeringDraw[1]=true;

            console.log(this.offeringDraw)

        if(this.offeringDraw[0]&&this.offeringDraw[1]) 
        {
            console.log("draw");
            this.result="1/2";
            this.gameOver=true;
        }
        return this.result;
    }

    resign(username) 
    {
        
        if(username==this.white)
            this.result="0-1";
        else if(username==this.black)
            this.result="1-0";

            console.log(this.offeringDraw)

        if(this.offeringDraw[0]&&this.offeringDraw[1]) 
        {
            console.log("draw");
            this.result="1/2";
            this.gameOver=true;
        }
        return this.result;
    }

    getState() 
    {
        let movements=this.chess.history();
        
        let state=
        {
            gameOver:this.chess.game_over(),
            checkmate:this.chess.in_checkmate(),
            //draw:this.chess.in_draw()||this.draw,
            userToMove:this.userToMove,
            lastMovement:movements[movements.length-1],
            result:this.result        
        };
        /*if(state.gameOver)
            this.gameOver=true;
        if(state.draw)
            this.draw=true;*/

        return state;
    }

    move(movement)
    {
        if(this.result=="*")
        {
            this.offeringDraw=[false, false];
            console.log("movement:")
            console.log(movement);
            console.log("game.move("+movement+")");        
            this.chess.move(movement);

            console.log(this.chess.history());
            if(this.userToMove==this.white)
            {
                console.log("BlackToMove")
                this.userToMove=this.black;
                console.log(this.userToMove)
            }
            else
            {
                this.userToMove=this.white;
                console.log("White to move");
                console.log(this.userToMove)
            }

            let gameState=this.getState();

            if(gameState.gameOver)
            {
                if(gameState.draw)
                {
                    this.result="1/2";
                }
                else
                {
                    if (this.userToMove==this.black)
                        this.result="1-0";
                    else
                        this.result="0-1"
                }
            }
        }
        //Each time a player moves, any draw offer is no longer valid;    
    }
}

module.exports=Game;