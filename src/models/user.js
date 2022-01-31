const Rating=require("./rating");

class User
{
    constructor(username,  rating)//, jwt)
    {
        this.username=username;
        this.rating=rating;
        //this.jwt=jwt;
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