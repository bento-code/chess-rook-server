const GameTime=require("./game-time");
const User=require("./game-time");
const Challenge=require("./challenge");

class PublicChallenge
{
    constructor(challenge)
    {
        this.challenge=challenge;
        this.senderRating=challenge.usedRatingByTime();
        this.minRatingValid=this.senderRating+challenge.minRatingTarget;
        this.maxRatingValid=this.senderRating+challenge.maxRatingTarget;
    }
    clone() 
    {
        let cloned=new PublicChallenge(this.challenge.clone(), this.senderRating, this.minRatingValid, this.maxRatingValid);
        return cloned;
    }
}

module.exports = PublicChallenge;
