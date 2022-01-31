const User=require("./game-time");

class UsersSortedByRating
{
    constructor()
    {
        this.blitzUsers=[];
        this.bulletUsers=[];
        this.rapidUsers=[];
    }

    //Each time a new user is recieved, 
    //it will be added to the 3 ratings list in a sorted position based on the rating 
    add(user)
    {
        console.log("adding user");
        this.binaryInsert(user.rating.bulletActualRating, user, this.bulletUsers, "bulletActualRating");
        this.binaryInsert(user.rating.blitzActualRating, user, this.blitzUsers, "blitzActualRating");
        this.binaryInsert(user.rating.rapidActualRating, user, this.rapidUsers, "rapidActualRating");
    }

    //Insert a new user in the array specified in O(log(n) complexity)
    binaryInsert(value, user, array, ratingType, startVal, endVal)
    {
        console.log(".");

        var length = array.length;
        var start = typeof(startVal) != 'undefined' ? startVal : 0;
        var end = typeof(endVal) != 'undefined' ? endVal : length - 1;
        var m = start + Math.floor((end - start)/2);
        
        if(length == 0)
        {
            array.push(user);
            return;
        }
    
        if(value > array[end].rating[ratingType])
        {
            array.splice(end + 1, 0, user);
            return;
        }
    
        if(value < array[start].rating[ratingType])
        {
            array.splice(start, 0, user);
            return;
        }
    
        if(start >= end){
            return;
        }
    
        if(value < array[m].rating[ratingType]){
            binaryInsert(value, user, array, start, m - 1);
            return;
        }
    
        if(value > array[m].rating[ratingType]){
            binaryInsert(value, user, array, m + 1, end);
            return;
        }
    
        //we don't insert duplicates
    }





}

module.exports = UsersSortedByRating;