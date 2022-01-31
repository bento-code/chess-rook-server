class GameTime
{
    
    constructor(hours,minutes,seconds, increment)
    {
        this.hours=hours;
        this.minutes=minutes;
        this.seconds=seconds;
        this.increment=increment;
    }

    clone()
    {
        let cloned=new GameTime(this.hours,this.minutes,this.seconds,this.increment);
        return cloned;
    }

    toString = () =>
    {
        let time=this.minutes+"+";

        if(this.increment>0)
        {
            time=time+this.increment;            
        }

        else
        {
            time=time+this.seconds;
        }

        /*if(this.seconds<10)
        {
            time=time+"0";
        }
        time=time+this.seconds;*/

        return time;
    }

}

module.exports=GameTime