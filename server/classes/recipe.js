const Recipe = class{
    constructor(name, desc, prc, categ, time, srv, src,vid, cal, mTime, img){
        this.name = name;
        this.desc = desc;
        this.prc = prc;
        this.categ = categ;
        this.time = time;
        this.srv = srv;
        this.src = src;
        this.vid = vid;
        this.cal = cal;
        this.mTime = mTime;
        this.img = img;
    }

    getRecName(){
        return this.name;
    }
    getRecDesc(){
        return this.desc;
    }
    getRecPrc(){
        return this.prc;
    }
    getRecCateg(){
        return this.categ;
    }
    getRecTime(){
        return this.time;
    }
    getRecSrc(){
        return this.src;
    }
    getRecSrv(){
        return this.srv;
    }
    getRecCal(){
        return this.cal;
    }
    getRecVid(){
        return this.vid;
    }
    getRecMTime(){
        return this.mTime;
    }
    getRecImg(){
        return this.img;
    }

}
const Ing = class{
    constructor(quant, unit, name, ins){
        this.quant = quant;
        this.unit = unit;
        this.name = name;
        this.ins = ins;
    }

    getIngQuant(){
        return this.quant;
    }
    getIngUnit(){
        return this.unit;
    }
    getIngName(){
        return this.name;
    }
    getIngIns(){
        return this.ins;
    }
}
module.exports = {
    Recipe: Recipe,
    Ing: Ing
}