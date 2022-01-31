class Rating {
    constructor(bulletActualRating, bulletMaxRating, blitzActualRating, blitzMaxRating, rapidActualRating, rapidMaxRating)
    {
        this.bulletActualRating=bulletActualRating;
        this.bulletMaxRating=bulletMaxRating;
        this.blitzActualRating=blitzActualRating;
        this.blitzMaxRating=blitzMaxRating;
        this.rapidActualRating=rapidActualRating;
        this.rapidMaxRating=rapidMaxRating;
    }
    clone() 
    {
        let cloned=new Rating(this.bulletActualRating, this.bulletMaxRating, this.blitzActualRating, this.blitzMaxRating, this.rapidActualRating, this.rapidMaxRating);
        return cloned;
    }
}
module.exports=Rating