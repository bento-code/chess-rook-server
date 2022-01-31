const GameTime=require("./game-time");
const User=require("./user");


class Challenge 
{
    constructor(senderUser, receiverUser, minRatingTarget, maxRatingTarget, time, status, origin, type)
    {
        this.id = (Math.random()+1).toString(36).substring(2)+(Math.random()+1).toString(36).substring(2);
        console.log("id:", this.id);
        this.minRatingTarget=minRatingTarget;
        this.maxRatingTarget=maxRatingTarget;
        this.time=time;
        this.senderUser=senderUser;
        this.receiverUser=receiverUser;
        this.status=status;
        this.origin=origin;
        this.type=type;
    }

    usedRatingByTime = () =>
    {
        if(this.time.minutes<3)
            return this.senderUser.rating.bulletActualRating;
        else if(this.time.minutes<10)
            return this.senderUser.rating.blitzActualRating;
        else
            return this.senderUser.rating.rapidActualRating;
    }

    senderRating= () =>
    {
        if(this.time.minutes<3)
            return this.senderUser.rating.bulletActualRating;
        else if(this.time.minutes<10)
            return this.senderUser.rating.blitzActualRating;
        else
            return this.senderUser.rating.rapidActualRating;
    }

    

    receiverRating= () =>
    {
        if(this.time.minutes<3)
            return this.receiverUser.rating.bulletActualRating;
        else if(this.time.minutes<10)
            return this.receiverUser.rating.blitzActualRating;
        else
            return this.receiverUser.rating.rapidActualRating;
    }




    challengeCategoryByTime = () =>
    {
        if(this.time.minutes<3)
            return "bullet";
        else if(this.time.minutes<10)
            return "blitz";
        else
            return "rapid";
    }



    searchRangesToString = ()=>
    {
        return String(this.minRatingTarget)+"/+"+String(this.maxRatingTarget);
    }



    usedRatingToString = ()=>
    {
        {
            if((this.type=="public")&&(this.origin=="sent"))
                return this.searchRangesToString();
            else
                return String(this.usedRatingByTime());
        }
    }

    clone = ()=>
    {
        let cloned=new Challenge
        (
            
            this.senderUser.clone(),
            this.receiverUser.clone(), 
            this.minRatingTarget, 
            this.maxRatingTarget,
            this.time.clone(), 
            this.status, 
            this.origin, 
            this.type
        );
        cloned.id=this.id;
        return cloned;
    }
}
module.exports = Challenge;