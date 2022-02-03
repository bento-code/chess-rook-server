
const User = require('./user.js');
const Game=require('./game.js');

class UsersManager
{
    constructor()
    {
        this.challengesPool=new Map();//<id, challenge>
        this.gamesActive=new Map();//<id, Game>
        this.usersOnline=new Map();//<username, {user, socketId, challengesReceived [], challengesSent [], gameActive}>
        this.usersOnline.set("*", {user:new User("*",-1000), socketId:undefined, challengesReceived:[], challengesSent:[]});
        this.blitzUsers=[];//<username, rating>
        this.bulletUsers=[];//<username, rating>
        this.rapidUsers=[];//<username, rating>
        this.size=this.usersOnline.size;
    }

    //Each time a new user is received, 
    //it will be added to the 3 ratings list in a sorted position based on the rating 

    //checkUsername = (element, username) => element.username === username;


    getUserChallengsSent = (username) =>
    {
        let challenges=[];
        let idList=this.usersOnline.get(username).challengesSent;
        for(let i=0;i<idList.length;i++)
        {
            challenges.push(this.challengesPool.get(idList[i]));
        }
        return challenges;
    }
    getUserChallengsReceived = (username) =>
    {
        let challenges=[];
        let idList=this.usersOnline.get(username).challengesReceived;
        for(let i=0;i<idList.length;i++)
        {
            challenges.push(this.challengesPool.get(idList[i]));
        }
        return challenges;
    }

    /**
     Prints challenges active in challengesPool
     */
    printChallenges= () =>
    {
        console.log("\n")
        console.log("+++++++++++++++++++++++++++".bold.red)
        console.log("Challenges Active: ".magenta)
        for(let c of this.challengesPool) 
        {
            console.log("Challenge: "+c[0])
            console.log(c[1].senderUser.username+" to "+c[1].receiverUser.username);
        }
        console.log("+++++++++++++++++++++++++++".bold.red)
        //console.log(usersManager.usersOnline);
        console.log("\n");
    }

    /**
     * Finds the position of a given challengeId in the challengesSent array of usersOnline(username) and returns it
     * @param  {String} username username of target user stored in usersOnline
     * @param  {String} challengeId The id of the challenge to find in challengesSent of user
     * @return {Number} returns index of challengeId in challengesSent
     */
    findUserChallengeSentIndex(challengeId, username)
    {
        let foundIndex;
        foundIndex=this.usersOnline.get(username).challengesSent.findIndex((element)=>element===challengeId);
        return foundIndex;
    }


    /**
     * Finds the position of a given challengeId in the challengesReceived array of usersOnline(username) and returns it
     * @param  {String} username username of target user stored in usersOnline
     * @param  {String} challengeId The id of the challenge to find in challengesSent of user
     * @return {Number} returns index of challengeId in challengesReceived
     */
    findUserChallengeReceivedIndex(challengeId, username)
    {
        let foundIndex;
        foundIndex=this.usersOnline.get(username).challengesReceived.findIndex((element)=>element===challengeId);
        return foundIndex;
    }


    /**
     * Given an accepted challenge, it creates a new game and stores it in gamesActive
     * saving the id of the created game to gameActive in both players in usersOnline.
     * @param  {Chalenge} challenge challenge accepted
     * @return {Game} returns game created
     */
    createGame = (challenge) => 
    {
        /*console.log("============")
        console.log(challenge)
        console.log("============")*/
        let game=new Game(challenge);
        this.gamesActive.set(game.id, game);
        this.usersOnline.get(game.white).gameActive=game.id;
        this.usersOnline.get(game.black).gameActive=game.id;

        return game;

    }


    /**
     * make a valid movement in the board stored in gamesAcitve(gameId)
     * @param  {String} gameId id of the target active game
     * @param  {String} movement movement in algebraic notation with format like "e2e4"
     * @return {String} returns game result: {\*, 1-0, 0-1, 1/2} if(\*) game still active, else, game over.
     * 1-0 means white wins, 1/2 draw and 0-1 black wins
     */
    move = (gameId, movement) => 
    {
        console.log("usersManager.move("+gameId+", "+movement+")");
        let game=this.gamesActive.get(gameId);
        game.move(movement);

        console.log("result:")
        console.log(game.result)

        return game.result;//{*, 1-0, 0-1, 1/2} if(*) keep playing, else, game over
    }


    /**
     *Updates users ratings using Arpad's ELO function to calculate the rating variation
     *Given two ratings and the value of the standard deviation (usually 400) 
     *it returns the score expected for each game (just score ignoring if wins or draws).
     *If 0.6 for white we expect white to score 6/10 and black 4/10 in a 10-game match.
     *Value change=(expected-obtained)*K
     *If the expected white scrore is 0.34 and win, white=white+(1-0.34)*K, black=black-(1-0.66)*K
     *K is the coefficient of variation giving more or less volatility to ratings. Common values are between 10 and 40
     * @param  {String} white white player username
     * @param  {String} black black player username
     * @param  {String} gameMode {rapid, blitz or bullet}
     * @param  {String} result result {1-0, 1/2, 0-1}
     * @param  {Number} K coefficient of variation
     * @param  {Number} deviation rating difference for 2 deviations (usually 400). 1 deviation means expectedScore=0.75
     * @return {undefined}
     */
    updateNewRatings = (white, black, gameMode, result, K, deviation) => 
    {
        let ratings;
        let variation=0;
        console.log("updating ratings...")
        let whiteUser=this.usersOnline.get(white).user;
        let blackUser=this.usersOnline.get(black).user;
        let whiteRating, blackRating;
        let score;
        if(result=="1-0")
            score=1;
        else if(result=="1/2")
            score=0.5;
        else
            score=0;
        
        if(gameMode ==="bullet")
        {
            whiteRating=whiteUser.rating.bulletActualRating;
            blackRating=blackUser.rating.bulletActualRating;
            ratings=this.calculateNewRatings(whiteRating, blackRating, score, K, deviation);
            variation=ratings[0]-whiteRating;
            whiteUser.rating.bulletActualRating=ratings[0];
            console.log("white: "+ratings[0]+", black: "+ratings[1]);          
            blackUser.rating.bulletActualRating=ratings[1];

            if(whiteUser.rating.bulletActualRating>whiteUser.rating.bulletMaxRating)
                whiteUser.rating.bulletMaxRating=whiteUser.rating.bulletActualRating
            if(blackUser.rating.bulletActualRating>blackUser.rating.bulletMaxRating)
                blackUser.rating.bulletMaxRating=blackUser.rating.bulletActualRating

        }
        else if(gameMode ==="blitz")
        {
            whiteRating=whiteUser.rating.blitzActualRating;
            blackRating=blackUser.rating.blitzActualRating;
            ratings=this.calculateNewRatings(whiteRating, blackRating, score, K, deviation);
            variation=ratings[0]-whiteRating;
            whiteUser.rating.blitzActualRating=ratings[0];
            console.log("white: "+ratings[0]+", black: "+ratings[1])          
            blackUser.rating.blitzActualRating=ratings[1];

            if(whiteUser.rating.blitzActualRating>whiteUser.rating.blitzMaxRating)
            whiteUser.rating.blitzMaxRating=whiteUser.rating.blitzActualRating
        if(blackUser.rating.blitzActualRating>blackUser.rating.blitzMaxRating)
            blackUser.rating.blitzMaxRating=blackUser.rating.blitzActualRating
        }
        else
        {
            whiteRating=whiteUser.rating.rapidActualRating;
            blackRating=blackUser.rating.rapidActualRating;
            ratings=this.calculateNewRatings(whiteRating, blackRating, score, K, deviation);
            variation=ratings[0]-whiteRating;
            whiteUser.rating.rapidActualRating = ratings[0];
            console.log("white: "+ratings[0]+", black: "+ratings[1])          
            blackUser.rating.rapidActualRating = ratings[1];

            if(whiteUser.rating.rapidActualRating>whiteUser.rating.rapidMaxRating)
            whiteUser.rating.rapidMaxRating=whiteUser.rating.rapidActualRating
        if(blackUser.rating.rapidActualRating>blackUser.rating.rapidMaxRating)  
            blackUser.rating.rapidMaxRating=blackUser.rating.rapidActualRating
        }
        console.log(this.bulletUsers);
        return {whiteNewRating:ratings[0], blackNewRating:ratings[1], variation:variation}

    }


    /**
     *Using Arpad ELO's function to calculate the rating variation
     *Given two ratings and the value of 2 deviations
     *it returns the score expected for each game (just score ignoring if wins or draws).
     *If 0.6 for white we expect white to score 6/10 and black 4/10 in a 10-game match.
     *Value change=(expected-obtained)*K
     *If the expected white scrore is 0.34 and win, white=white+(1-0.34)*K, black=black-(1-0.66)*K
     *K is the coefficient of variation giving more or less volatility to ratings. 
     *Common values are between 10 and 40
     * @param  {Number} whiteRating white rating
     * @param  {Number} blackRating black rating
     * @param  {Number} score white score {1, 0.5, 0}
     * @param  {Number} deviation rating difference for 2 deviations (usually 400). 1 deviation means expectedScore=0.75
     * @param  {Number} K  coefficient of rating variation
     * @return {[Number, Number]} returns the new ratings of [white, black]
     */
    calculateNewRatings = (whiteRating, blackRating, score, K, deviation) => 
    {
        console.log("Old Ratings: ["+whiteRating+", "+blackRating+"]");
        console.log("Score: "+score);
        let whiteScore=score;
        let blackScore=1-score;
        let whiteExpected=this.getExpectedScore(whiteRating, blackRating, deviation);
        let blackExpected=1-whiteExpected;
        console.log("Expected Scores: ["+whiteExpected+", "+blackExpected+"]")
        let newRatings=[Math.round(whiteRating+K*(whiteScore-whiteExpected)), Math.round(blackRating+K*(blackScore-blackExpected))];
        console.log("New Ratings: ["+newRatings[0]+", "+newRatings[1]+"]");
        return newRatings;
    }


    /**
     * Calculates the expected score for white player using a logistic curve;
     * @param  {Number} whiteRating white rating
     * @param  {Number} blackRating black rating
     * @param  {Number} deviation rating difference for 2 deviations (usually 400). 1 deviation means expectedScore=0.75
     * @return {Number} returns expected score for white. Black is 1-score
     */
    getExpectedScore = (whiteRating, blackRating, deviation)=>
    {
        return 1/(1+Math.pow(10, (blackRating-whiteRating)/deviation));
    }

    /**
     * Optimization can be done here in notifications. The actual complexity is O(m*n) 
     * (even more if we consier the notification loop in index.js) 
     * where m is the average of challenges per user and n the users.
     * The algorithm will be improved creating a Map(challengeId, [users]) resolving the recieversToNotify directly. 
     * This doesn't have a huge impact in the RAM usage size given the actual number of users.
     * Another solution could be store only {challengeId:username} 
     * and access whole users in O(n) using usersOnline(username) in index or here.
    */
    cancelChallenge=(challengeId, sender)=>
    {
        let challenge = this.challengesPool.get(challengeId);

        console.log("###########################".red)
        console.log(challenge);
        console.log(sender);
        console.log("###########################".red)

        let index =-1;
        for(let i=0;i<sender.challengesSent.length; i++)
        {
            let c=sender.challengesSent[i]
            if(c==challengeId)
            {
                index=i;
                break;
            }
        }

        if (index > -1) 
        {
            
            sender.challengesSent.splice(index, 1);
        }

        console.log("++++++++++++++++++".red)
        console.log(sender.user.username.bold.red+" canceled");
        console.log("++++++++++++++++++".red)

        let receiversToNotify=[];

        console.log("target: "+challengeId)
        for(let userOnline of this.usersOnline)
        {
            console.log(userOnline[0].yellow)
            console.log(userOnline[1].challengesReceived);
            let index = userOnline[1].challengesReceived.indexOf(challengeId);
            if (index > -1 && userOnline[1].user.username!=="*") 
            {
                console.log("Match!")
                userOnline[1].challengesReceived.splice(index, 1);
                receiversToNotify.push(userOnline[1]);
            }   
        }

        console.log(receiversToNotify)
        return receiversToNotify;
    }

    acceptChallenge = (challengeId, receiverUsername)=>
    {
        console.log("++++++++++++++++++".green)
        console.log(receiverUsername.bold.green+" accepted");
        console.log("++++++++++++++++++".green)
        let challenge = this.challengesPool.get(challengeId);
        console.log(challenge);
        let receiver=this.usersOnline.get(receiverUsername);
        let sender=this.usersOnline.get(challenge.senderUser.username);

        challenge.receiverUser=receiver.user

        console.log(sender.user.username+" => ".red+receiver.user.username);

        let receiverChallengeIndex=this.findUserChallengeReceivedIndex(challengeId, receiver.user.username);
        let senderChallengeIndex=this.findUserChallengeSentIndex(challengeId, sender.user.username);

        receiver.challengesReceived.splice(receiverChallengeIndex, 1);
        sender.challengesSent.splice(senderChallengeIndex, 1);
        challenge.status="accepted";

        let game=this.createGame(challenge);
        return game;

    }

    findUserInArray = (username, array)=>
    {
        for(let i=0;i<array.length;i++)
        {
            if(array[i].username===username)
            {
                return i;
            }
        }
        return -1;
    }


    findUserIndexes = (username) =>
    {

        let indexes=[];

        for(let i=0;i<this.bulletUsers.length;i++)
        {
            console.log(`${username}, ${this.bulletUsers[i].username}`.cyan)
            if(this.bulletUsers[i].username === username)
            {
                indexes.push(i);
                break;
            };
        }
        for(let i=0;i<this.blitzUsers.length;i++)
        {
            if(this.blitzUsers[i].username === username)
            {
                indexes.push(i);
                break;
            };
        }
        for(let i=0;i<this.rapidUsers.length;i++)
        {
            if(this.rapidUsers[i].username === username)
            {
                indexes.push(i);
                break;
            };
        }

        return indexes;
    }
    

    removeUserFromArrays = (username) =>
    {
        console.log(`removing: ${username}`.red)
        let indexes=this.findUserIndexes(username);
        this.bulletUsers.splice(indexes[0], 1);
        this.blitzUsers.splice(indexes[1], 1);
        this.rapidUsers.splice(indexes[2], 1);
    }


    has(username)
    {
        let result=this.usersOnline.has(username);
        return result;
    }

    addUserToArrays(user)
    {
        console.log("adding user");
        this.binaryInsert(user.rating.bulletActualRating, {username:user.username,rating:user.rating.bulletActualRating}, this.bulletUsers);
        this.binaryInsert(user.rating.blitzActualRating, {username:user.username,rating:user.rating.blitzActualRating}, this.blitzUsers);
        this.binaryInsert(user.rating.rapidActualRating, {username:user.username,rating:user.rating.rapidActualRating}, this.rapidUsers);
        //console.log(this.usersOnline);
        //console.log(this.bulletUsers);
        //console.log(this.blitzUsers);
        //console.log(this.rapidUsers);
    }

    addUserOnline(username, params)
    {
        if(!this.has(username))
        {
            this.addUserToArrays(params.user);
            this.usersOnline.set(username, params);
            this.size++;
        }
        else
        {
            this.updateSocket(username, params.socketId)
        }
        
        //console.log()
    }

    delete(username)
    {
        this.usersOnline.delete(username);
        this.removeUserFromArrays(username);
        this.size--;
    }

    updateSocket(username, socketId)
    {
        this.usersOnline.get(username).socketId=socketId;
    }

    //Insert a new user in the array specified in O(n) complexity time
    binaryInsert(value, user, array, startVal, endVal)
    {
        

        let length = array.length;
        let start = typeof(startVal) != 'undefined' ? startVal : 0;
        let end = typeof(endVal) != 'undefined' ? endVal : length - 1;
        let m = start + Math.floor((end - start)/2);
        
        if(length == 0)
        {
            array.push(user);
            return;
        }
    
        if(value >= array[end].rating)
        {
            array.splice(end + 1, 0, user);
            return;
        }
    
        if(value <= array[start].rating)
        {
            array.splice(start, 0, user);
            return;
        }
    
        if(start >= end)
        {
            return;
        }
    
        if(value <= array[m].rating)
        {
            this.binaryInsert(value, user, array, start, m - 1);
            return;
        }
    
        if(value >= array[m].rating)
        {
            this.binaryInsert(value, user, array, m + 1, end);
            return;
        }
    }





    binarySearchMax = (value, array, startVal, endVal) => 
    {
        let length = array.length;
        let start = typeof(startVal) != 'undefined' ? startVal : 0;
        let end = typeof(endVal) != 'undefined' ? endVal : length - 1;
        let mid = start + Math.floor((end - start)/2);
        let diff=(end-start);

        /*console.log(`(max: ${value}, start: ${start}, end: ${end}, mid: ${mid}, diff: ${diff})`);
        console.log(array);*/

        if((length == 0)||(length == 1)||(array==="undefined"))
        {
            console.log("case null");
            return -1;
        }

        if(diff==1)
        {
            if(value >= array[end].rating)
                return end;
            else
                return start;
        }

        if(array[mid].rating <= value)
            return this.binarySearchMax(value, array, mid, end)
        else
            return this.binarySearchMax(value, array, start, mid);
    }

    binarySearchMin = (value, array, startVal, endVal) => 
    {

        let length = array.length;
        let start = typeof(startVal) != 'undefined' ? startVal : 0;
        let end = typeof(endVal) != 'undefined' ? endVal : length - 1;
        let mid = start + Math.floor((end - start)/2);
        let diff=(end-start);

        /*console.log(`(min: ${value}, start: ${start}, end: ${end}, mid: ${mid}, diff: ${diff})`);
        console.log(array);*/

        if((length == 0)||(length == 1)||(array==="undefined"))
        {
            console.log("case null");
            return -1;
        }

        if(diff==1)
        {
            if(value<= array[start].rating)
                return start;
            else
                return end;
        }

        if(array[mid].rating>=value)
        {
            return this.binarySearchMin(value, array, start, mid)
        }
        else
        {
            return this.binarySearchMin(value, array, mid, end);
        }
            
    }

    binarySearchChallengesLimits = (min, max, array) =>
    {
        let indexes=[this.binarySearchMin(min, array),this.binarySearchMax(max, array)];
        /*console.log("=======================".red);
        console.log(indexes);*/
        return indexes;

    }

    updatePublicChallengesReceived(minIndex, maxIndex, array, challenge, senderIndex)
    {
        for(let i=minIndex; i<=maxIndex;i++)
        {
            
            if(i!=senderIndex)
            {
                console.log(i);
                let receiverChallenge=challenge.clone();
                receiverChallenge.origin="received";
                receiverChallenge.receiverUser=this.usersOnline.get(array[i].username).user.clone();
                receiverChallenge.receiverUser.jwt=0;

                this.usersOnline.get(array[i].username).challengesReceived.push(challenge.id);
            }
                
        }
    }
    

}



module.exports=UsersManager;