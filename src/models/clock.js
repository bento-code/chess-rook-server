
var microtime = require('microtime');

console.log("evGen");

// register event listener



class Clock
{
    constructor(game)
    {
        this.ev = require('../events.js');
        this.turn=true //white or black to move

        this.gameId=game.id;
        this.totalWhiteTime=game.challenge.time.toMs();
        this.totalBlackTime=game.challenge.time.toMs();
        //this.totalBlackTime=10000;
        this.increment=game.challenge.time.increment;

        console.log(this.totalWhiteTime)
            
        this.whiteTimeLeft=this.totalWhiteTime;
        this.blackTimeLeft=this.totalBlackTime;

        this.initWhiteTimeStamp=microtime.now();
        this.initBlackTimeStamp=microtime.now();

        this.lastWhiteTimeStamp=this.initWhiteTimeStamp;
        this.lastBlackTimeStamp=this.initBlackTimeStamp;

        this.whiteInterval;
        this.whiteTimer=1;

        this.blackInterval;
        this.blackTimer=1;
    }

    initWhiteClock = () =>
    {
        this.initWhiteTimeStamp=microtime.now();
        this.lastWhiteTimeStamp=this.initWhiteTimeStamp;
        this.whiteInterval=setInterval(() => 
        {
            this.lastWhiteTimeStamp=microtime.now();
            this.whiteTimer=Math.floor((this.lastWhiteTimeStamp-this.initWhiteTimeStamp)/1000);
            this.whiteTimeLeft=this.totalWhiteTime-this.whiteTimer;
            if(this.whiteTimeLeft<=0)
            {
                console.log("Total time!")
                this.ev.emit(`${this.gameId}/timeOver`, true);
                this.totalWhiteTime=0;
                clearInterval(this.whiteInterval);
            }
            else
            {
                //this.printClock();
                /*console.log("Event!")
                ev.emit(this.gameId, String(this.whiteTimeLeft));*/
            }
        }, 50);
    }

    stopWhiteClock = () =>
    {
        clearInterval(this.whiteInterval);
        this.whiteTimeLeft=this.whiteTimeLeft+this.increment
        this.totalWhiteTime=this.whiteTimeLeft;
    }

    initBlackClock = () =>
    {
        this.initBlackTimeStamp=microtime.now();
        this.lastBlackTimeStamp=this.initBlackTimeStamp;
        this.blackInterval=setInterval(() => 
        {
            this.lastBlackTimeStamp=microtime.now();
            this.blackTimer=Math.floor((this.lastBlackTimeStamp-this.initBlackTimeStamp)/1000);
            this.blackTimeLeft=this.totalBlackTime-this.blackTimer;
            if(this.blackTimeLeft<=0)
            {
                console.log("Total time!")
                
                this.ev.emit(`${this.gameId}/timeOver`, false);
                this.totalBlackTime=0;
                clearInterval(this.blackInterval);
            }
            else
            {
                //this.printClock()
                /*console.log("Event!")
                ev.emit(this.gameId, String(this.blackTimeLeft));*/
            }
        }, 50);
    }

    stopBlackClock = () =>
    {
        clearInterval(this.blackInterval);
        this.blackTimeLeft=this.blackTimeLeft+this.increment
        this.totalBlackTime=this.blackTimeLeft;
    }

    initGame = () =>
    {
        this.initWhiteClock();
    }
    /*stop = () =>
    {
        clearInterval(this.blackInterval);
        this.blackTimeLeft=this.blackTimeLeft+this.increment
        this.totalBlackTime=this.blackTimeLeft;
    }*/
    move = () =>
    {
        if(this.turn)
        {
            this.stopWhiteClock();
            this.initBlackClock();
        }
        else
        {
            this.stopBlackClock();
            this.initWhiteClock();
        }
        this.turn=!this.turn;
    }

    printClock = () =>
    {
        console.log(`White: ${this.whiteTimeLeft} - Black: ${this.blackTimeLeft}`)
    }
}
module.exports=Clock;