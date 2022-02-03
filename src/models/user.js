const Rating=require("./rating");

class User
{
    constructor(username,  rating)
    {
        this.username=username;
        this.rating=rating;
    }
    clone()
    {
        let cloned;

        if(typeof(this.rating)==="object")
            cloned=new User(this.username, this.rating.clone());
        else
            cloned=new User(this.username, this.rating);
        return cloned;
    }
}
module.exports=User