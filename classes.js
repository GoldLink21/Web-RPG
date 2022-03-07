function nextId(type='generic'){
    if(nextId["ID"+type]===undefined)
        nextId["ID"+type]=(function*(){var id=0;while(true)yield id++;})()
    return nextId["ID"+type].next().value
}


var Tn={SIZE:35}
/**@type {Entity[]} */
var entities=[]
/**@type {Entity[]} */
var allEntities=[]
class Entity{
    constructor(x=0,y=0,width=16,height=16,color='white',{name='Unknown Person',stopsPlayer=true,startStats=new Stats(),imgSrc,onInteract}={}){
        this.width=width
        this.height=height
        this.x=(x*Tn.SIZE+Tn.SIZE/2-width/2)
        this.y=(y*Tn.SIZE+Tn.SIZE/2-height/2)
        this.color=color
        this.active=true
        this.toRemove=false
        this.stopsPlayer=stopsPlayer
        this.stats=startStats
        this.stats.initial=Object.assign({},this.stats)
        this.inventory=new Inventory()
        this.id=nextId("entity")
        allEntities.push(this)
        this.name=name
        this.h3D=3
        if(onInteract)
            this.onInteract=onInteract
        this.setImg(imgSrc)
    }
    setImg(src){
        if(src!==undefined){
            this.img=new Image(this.width,this.height)
            this.img.src='gfx/'+src
            this.imgSrc='gfx/'+src
        }
        else
            this.img=undefined
    }
    get center(){
        return v(this.x+this.width/2,this.y+this.height/2)
    }
    collides(other){
        if(!this.active)
            return false
        return!(((this.y+this.height)<(other.y))||
            (this.y>(other.y+other.height))||
            ((this.x+this.width)<other.x)||
            (this.x>(other.x+other.width)));
    }
    draw(){
        if(this.active){
            shadow(2)
            if(game.entity3D&&this.h3D>0){
                shadow()
                ctx.fillStyle=this.color
                drawCube(this.x,this.y,this.width,this.height,this.h3D,true,true,this.img)
            }else{
                if(this.img){
                    ctx.drawImage(this.img,this.x,this.y,this.width,this.height)
                    shadow()
                }else{
                    ctx.fillStyle=this.color
                    ctx.fillRect(this.x,this.y,this.width,this.height)
                    shadow()
                    ctx.strokeRect(this.x,this.y,this.width,this.height)
                }
            }
        }
    }
    /**@param {this} t */
    onInteract(t){}
    move(){}
    setPosition(x,y){
        if(x<0||x>=board[0].length||y<0||y>=board.length)
            return false
        this.x=(x*Tn.SIZE+Tn.SIZE/2-this.width/2)
        this.y=(y*Tn.SIZE+Tn.SIZE/2-this.height/2)
    }
    addItem(i){
        this.inventory.add(i)
        return this
    }
    hasItem(i,count){
        return Boolean(this.inventory.has(i,count))
    }
    checkCollisions(){}
    addTo(ref){
        var a=Area.get(ref)
        if(a!==undefined)
            a.addEnt(this)
        else return false
    }
    withId(id){
        this.id=id
        return this
    }
    withDepth(val){
        this.h3D=val
        return this
    }
    getCorners(){
        return getRounded(this)
    }
    checkTileCollisions(){
        var corners=this.getCorners()
        var ret=true
        for(let i=0;i<corners.length;i++){
            if(!this.checkTile(corners[i].x,corners[i].y))
                ret=false
        }
        return ret
    }
    checkTile(x,y){
        var cur=b(x,y)
        if(cur.is(Tn.wall))
            return false
        else return true
    }
    distanceFrom(other){
        return Math.hypot(this.center.x-other.center.x,this.center.y-other.center.y)
    }
    static getById(id){
        return entities.find(ent=>ent.id===id)
    }
    static moveAndCollisions(){
        for(let i=0;i<entities.length;i++){
            entities[i].move()
            entities[i].checkCollisions()
            if(entities[i].toRemove)
                entities.splice(i--,1)
        }
    }
    static getAllLocations(){
        return entities.map(ent=>{
            var rp=roundPoint(ent.x,ent.y)
            return v(rp[0],rp[1])
        })
    }
    giveAllToPlayer(){
        if(this.constructor.name!=='Player'&&this.inventory.length>0){
            this.inventory.getTxt()
            while(this.inventory.length>0){
                player.addItem(this.inventory.items.shift())
            }
        }
    }
    giveCopyToPlayer(){
        if(this.constructor.name!=='Player'){
            this.inventory.items.forEach(i=>{
                player.addItem(i.copy())
            })
            this.inventory.getTxt()
        }
    }
    tell(str,btnStr,onclickExtra=()=>{}){
        //tell(str,btnStr,this.name,onclickExtra)
        tell.noBtn(str)

        tell.addButton(btnStr,onclickExtra)
        tell.setSpeaker(this.name)
    }
    dialogue(...strs){
        dialogueNamed(this.name,...strs)
    }
}

/**Intended to be entities made of multiple parts so movement could possibly be synced */
class Composite{
    constructor(...children){
        /**@type {Entity[]|Composite[]} */
        this.children=[]
        this.inventory=new Inventory()
        this.id=nextId('composite')
        flatten(children).forEach(child=>{
                this.children.push(child)
        })
        this.children.forEach(child=>{
            child.inventory.addAllTo(this.inventory)
            delete child.inventory
        })
        this.stopsPlayer=true
    }
    withDepth(val){
        this.children.forEach(kid=>kid.withDepth(val))
    }
    get center(){
        var xs=this.children.reduce((e,n)=>e.center.x)
        var ys=this.children.reduce((e,n)=>e.center.y)
        return v(xs,ys)
    }
    get width(){
        return this.children.reduce((val,x)=>Math.max(val,x.width),0)
    }
    get height(){
        return this.children.reduce((val,x)=>Math.max(val,x.height),0)
    }
    distanceFrom(other){
        return Math.hypot(this.center.x-other.center.x,this.center.y-other.center.y)
    }
    move(){}
    draw(){this.children.forEach(child=>child.draw())}
    checkCollisions(){
        this.children.forEach(c=>c.checkCollisions())
    }
    collides(other){
        return this.children.some(c=>c.collides(other))
    }
    onInteract(t){
        this.children.forEach(c=>{
            c.onInteract(c)
        })
    }
    get x(){
        return this.center.x-this.width/2
    }
    get y(){
        return this.center.y-this.height/2
    }
    moveIn(x,y){
        this.map(c=>{
            if(x!==0)
                c.x+=x
            if(y!==0)
                c.y+=y
        })
    }
    set x(val){
        var dx=val-this.center.x+this.width/2
        this.map(c=>c.x+=dx)
    }
    set y(val){
        var dy=val-this.center.y+this.height/2
        this.map(c=>c.y+=dy)
    }
    getCorners(){
        return getRounded(this)
    }
    /**@param {function(Entity)} callback*/
    map(callback){
        this.children.forEach(child=>{
            callback(child)
        })
    }
    withId(id){
        this.id=id;return this;
    }
}

class Stats{
    constructor(props={}){
        Object.assign(this,props)
        this.initial=Object.assign({},props)
    }
    compare(other){
        var compared=new Stats(this)
        for(var stat in compared){
            if(stat in this&&stat!=='initial')
                compared[stat]-=other[stat]
        }
        delete compared.initial
        return compared
    }
    addProp(prop,val){
        this[prop]=val
    }
    remProp(prop){
        if(prop in this)
            delete this[prop]
    }
}

class Item{
    constructor(name,count=1,{img,stats=new Stats(),getText}={}){
        this.name=name
        if(img)
            this.img=img
        this.stats=stats
        this.count=count
        this.getText=getText
        if(getText===undefined){
            if(count===1){
                this.getText='You got a'
                if(['a','e','i','o','u'].includes(this.name.toLowerCase().charAt(0)))
                    this.getText+='n'
            
                this.getText+=' '+this.name
            }else{
                this.getText="You got "+count+' of '+name
            }
        }else this.getText=getText
    }
    copy(){
        return new Item(this.name,this.count,{img:this.img,stats:this.stats,getText:this.getText})
    }
    toString(){
        if(this.count>1)
            return this.count+ ' of '+this.name
        return this.name
    }
    [Symbol.toPrimitive](){
        return this.toString()
    }
}

const Items={
    key(type,count){return new Item(type+' Key',count)},

}

class Inventory{
    constructor(...items){
        /**@type {Item[]} */
        this.items=[]
        this.add(items)
    }
    [Symbol.iterator](){
        return this.items.values()
    }
    add(...items){
        flatten(items).forEach(item=>{
            if(this.has(item.name)){
                var c=Number(this.find(item.name).count)+Number(item.count)
                this.find(item.name).count=c
            }else this.items.push(item)
        })
        return this
    }
    get(i){
        return this.items[i]
    }
    has(name,count=1){
        return this.items.some(i=>{return i.name===name&&i.count>=count})
    }
    find(name){
        return this.items.find(i=>i.name===name)
    }
    removeIfHas(name,count=1){
        if(this.has(name,count)){
            var i=this.find(name)
            i.count-=count;
            if(i.count<1)
                this.items.splice(this.getIndexOf(name),1)[0]
            return true
        }else return false
    }
    getIndexOf(name){
        for(let i=0;i<this.items.length;i++)
            if(this.items[i].name===name)
                return i
        return false
    }
    get length(){return this.items.length}
    toString(){
        if(this.length===0)
            return 'Nothing'
        if(this.length===1)
            return this.items[0].toString()
        return this.items.slice(0,this.items.length-1).map(i=>i.toString()).join(', ')+' and '+this.items[this.items.length-1].toString()
    }
    getTxt(){
        var itemGroupMax=3
        if(this.length>0){
            var txt=[]
            this.items.forEach(i=>txt.push(i.getText))
            var txtAll=[]
            var count=0
            while(txt.length>0){
                if(count===0)
                    txtAll.push([])
                if(count++<itemGroupMax)
                    txtAll[txtAll.length-1].push(txt.shift())
                else count=0
            }
            dialogue(...txtAll.map(ele=>ele.join('<br><br>')))
        }else{
            return "You got nothing!"
        }
    }
    /**@param {Inventory} other */
    addAllTo(other){
        while(this.items.length>0){
            other.add(this.items.shift())
        }
    }
}

function keyItem(type,img='key.png',count=1){
    return new Item(type+' Key',count,{img:img})
}

//#region Small-Classes
class Counter{
    /**
     * A class for counting times a thing happens and running a function after that
     * @param {number} max The max number of times the counter can count till it does onComplete
     * @param {function} onComplete The function to run once the counter is complete
     */
    constructor(max,onComplete=()=>{}){
        if(max<=0)
            throw new RangeError('Max count must be positive and greater than 0')
        this._max=max
        this._cur=0
        this.onComplete=onComplete
    }
    count(n=1){
        this.cur+=n
        return this
    }
    reset(){
        this.cur=0;
        return this
    }
    toString(){
        return this.cur+'/'+this.max
    }
    set cur(val){
        this._cur=val
        while(this._cur>=this._max){
            this._cur-=this._max
            this.onComplete()
        }
    }
    set max(val){
        if(val<=0)
            throw new RangeError('Max count must be poitive and greater than 0')
        this._max=val
        this.cur=this.cur
    }
    get cur(){return this._cur}
    get max(){return this._max}
}

var images={
    preload(...imgs){
        imgs.forEach(img=>{
            var i=new Image()
            i.src='gfx/'+img
            this[img]=i
        })
    },
    get(str){
        if(this[str])
            return this[str]
        else{
            try{
                images.preload(str)
                return images.get(str)
            }catch(e){
                throw new ReferenceError(`Image of gfx/${str} not preloaded`)
            }
        } 
    }
}

/**Handles all the timing system. While it says milliseconds, it's actually in deciseconds to save on lag and precision */
var Clock1

class Clock{
    constructor(max,onComplete=()=>{}){
        this.milliseconds=0
        this.isPaused=false
        if(max){
            this.max=max
            this.onComplete=onComplete
        }
        this.start()
    }
    start(){
        if(!this.interval){
            this.isPaused=false
            var self=this
            this.interval=setInterval(()=>{
                self.milliseconds++;
                if(self.milliseconds>=self.max){
                    self.onComplete()
                    self.pause()
                }
            },10)
        }
    }
    pause(){
        clearInterval(this.interval);
        this.isPaused=true
        delete this.interval;
    }
    resume(){
        if(this.isPaused)this.start();
    }
    toString(){
        return Clock.parse(this.milliseconds)
    }
    static parse(milli){
        var sec=parseInt((milli/100)),
            min=parseInt(sec/60),
            mil=milli%100
        if(mil.toString().length===1)
            mil='0'+mil
        return min+':'+sec%60+'.'+mil
    }
    static unParse(str){
        var split=str.split(':'),
            t=split[1].split('.')
        return(parseInt(split[0]*6000)+parseInt(t[0]*100)+parseInt(t[1]))
    }
}

Clock1=new Clock()
//#endregion

class Pickup extends Entity{
    /**
     * Objects that appear on the map above a tile and are collected upon player collision. Any functions defined 
     * for preset types of pickups should be prefixed with a p and have the first three parameters x, y, and id
     * @param {string} type The name of the type of object
     * @param {Function} onGrab The function to run when the obj is grabbed. Usually ()=>{counter++}
     * @param {Function} onRemove The function to run when the object gets removed. Usually ()=>{counter=0}
     * @param {string} img The route to the img name for the pickup if available
     * @param {boolean} hidden Tells Whether to make the pickup hidden or not
     * @param {number} id The id for selecting a single pickup 
     * @example function pArmor(x,y,id)//This is the general structure for making a new pickup of any new class. They should not need more input than this
     */
    constructor(x,y,
            {width=10,height=10,color='white',type=nextId("pickupType"),id=nextId("pickup"),onGrab=()=>{},
            isCircle=false,img,hidden=false,active=true}={})
    {
        super(x,y,width,height,color,{stopsPlayer:false})
        this.setPosition(x,y)
        this.onGrab=onGrab
        /**Unique type for specific types of pickups. Used for telling which removal functions to run */
        this.type=type
        /**Unique id for each new Pickup, generated automatically. Can also be set beforehand */
        this.id=id
        this.isCircle=isCircle
        this.hidden=hidden
        this.active=active
        //Only set this.img if there is an img
        if(img)
            this.img=img
        this.toRemove=false
        this.self=this
    }
    withId(id){
        this.id=id
        return this;
    }
    isPlayerCollide(){
        return this.collides(player)
    }
    setActive(bool){
        this.isActive=bool
        this.hidden=!bool
    }
    checkCollisions(){
        if(this.isPlayerCollide()){
            this.toRemove=true;
            this.onGrab();
        }
    }
    /**@param {CanvasRenderingContext2D}ctx*/
    draw(){
        if(this.active){
            if(this.img){
                shadow(3)
                ctx.drawImage(images.get(this.img),this.x,this.y,this.width,this.height)
                shadow(0)
            }else{
                if(this.isCircle){
                    ctx.beginPath();
                    ctx.fillStyle=this.color
                    ctx.ellipse(this.x+this.width/2,this.y+this.height/2,this.width/2,this.height/2,0,0,Math.PI*2)
                    shadow(3)
                    ctx.fill()
                    shadow(0)
                    ctx.stroke()
                    ctx.closePath()
                }else{
                    ctx.fillStyle=this.color
                    shadow(3)
                    ctx.fillRect(this.x,this.y,this.width,this.height)
                    shadow(0)
                    ctx.strokeRect(this.x,this.y,this.width,this.height)
                }
            }
        }
    }
}

class StandSwitch extends Pickup{
    /**
     * Class for pickups that you can't actually pick up, but instead can be activated and deactivated to do stuff.
     * They stay on the map after interactions which allows changing the map while playing. Prefix functions
     * defining switch types with an s
     * @param {number} x Map x
     * @param {number} y Map y
     * @param {Function} onActivate Function used on activation
     * @param {boolean} canDecativeate Tells if you can deactivate the switch for a different action
     * @param {Function} onDeactivate Function used on deactivation if canDeactivate
     * @param {string} inactiveColor The color before activation
     * @param {string} activeColor The color after being activated
     */
    constructor(x,y,
            {onActivate=()=>{},canDeactivate=false,onDeactivate,inactiveColor='blue',
            activeColor='darkblue',addToArr=true,isActive=true,type='switch'}={})
    {
        super(x,y,{width:Tn.SIZE/2,height:Tn.SIZE/2,color:inactiveColor,type:type,onGrab:onActivate,onRemove:()=>{},isCircle:true,addToArr:addToArr,isActive:isActive})
        this.hasActivated=false
        this.canDeactivate=canDeactivate
        this.onDeactivate=onDeactivate
        this.inactiveColor=inactiveColor
        this.activeColor=activeColor
        this.hasUntouchedPlayer=true
    }
    /**Overrides checkPlayerCollision to allow non-removal and step on-step off detection */
    checkCollisions(){
        var pc=this.isPlayerCollide()
        //If collided, hasn't activated and you've stoped touching player
        if(pc&&!this.hasActivated&&this.hasUntouchedPlayer){
            this.color=this.activeColor
            this.hasActivated=true
            this.onGrab()
            this.hasUntouchedPlayer=false
        //If collided and activated and able to deactivate and you've stopped touching the player
        }if(pc&&this.hasActivated&&this.canDeactivate&&this.hasUntouchedPlayer){
            this.hasActivated=false
            //If it can deactivate but onDeactivate isn't defined, then uses onGrab instead
            if(this.onDeactivate)
                this.onDeactivate()
            else 
                this.onGrab()
            this.color=this.inactiveColor
            this.hasUntouchedPlayer=false
        //If not collided and you haven't stopped touching player
        }if(!pc&&!this.hasUntouchedPlayer)
            this.hasUntouchedPlayer=true
    }
}

//#region Predefined-objects

/**Allows the player to block one hit. Ineffective with lava */
function pArmor(x,y){
    return new Pickup(x,y,
        {width:23,height:23,color:'lightgrey',type:'armor',onGrab:()=>{player.armor++},
            onRemove:()=>{player.armor=0}})
}

function pSpeedUp(x,y){
    return new Pickup(x,y,{type:'speedUp',onGrab:()=>{
        player.speed+=2
    },onRemove:()=>{
        player.speed=player.defaultSpeed
    },width:18,height:18})
}

/**
 * Sets a switch that toggles a tile between a path and whatever it was before. Don't use on traps
 * @param {Function} onActivate Ran when activated
 * @param {boolean} canToggle If you can deactivate
 * @param {Function} onDeactivate Ran on deactivation. Runs on top of switching the tile back
 * @param {any} oldType The type to set the tile to when deactivated. Add by hand if switch is placed on level load. 
 *                      Does not matter if !canToggle
 */
function sToggleTile(sx,sy,ox,oy,{onActivate=()=>{},canToggle=false,onDeactivate=()=>{},oldType=b(ox,oy),newType=Tn.Path()}={}){
    return new StandSwitch(sx,sy,{
        onActivate:()=>{
            b(ox,oy,newType)
            onActivate()
        },
        canDeactivate:canToggle,
        onDeactivate:()=>{
            b(ox,oy,oldType)
            onDeactivate()
        }
    })
}

/**
 * Spawns a certain pickup at (px,py) if there isn't already one there
 * @param {Function} construct The function or constructor to run when making the new Pickup
 * @param {any} nId The id to make the pickup so only one may spawn
 */
function sPickupSpawn(sx,sy,px,py,construct,nId=nextId("pickup")){
    return new StandSwitch(sx,sy,{canDeactivate:true,onActivate:(id=nId)=>{
        if(!Entity.getById(id))
            new construct(px,py).withId(nId)
    }})
}

/**Spawns armor at (px,py) only if the player has less armor than n */
function sArmorMax(sx,sy,px,py,n,nId=nextId("pickup")){
    return new StandSwitch(sx,sy,{canDeactivate:true,onActivate:()=>{
        if(player.armor<n&&!Entity.getById(nId))
            pArmor(px,py).withId(nId)
    }})
}

//#endregion

//#region Enemy

/**Mostly used for positions in Enemy Movement. Short for vector */
function v(x=0,y=0){return new class Vector{constructor(){this.x=x;this.y=y}}}

class Path{
    constructor(doesLoop,...points){
        this.doesLoop=doesLoop
        this.cur=0
        this.dir=Path.dirs.fwd
        this.points=points
    }
    next(){
        if(!this.doesLoop){
            this.cur++
            if(this.cur===this.points.length)
                this.cur=0
            return this.points[this.cur]
        }else{
            if(this.dir===Path.dirs.fwd){
                if(this.cur===this.points.length-1){
                    this.dir=Path.dirs.bkwd
                    this.cur--
                }else this.cur++
            }else if(this.dir===Path.dirs.bkwd){
                if(this.cur===0){
                    this.dir=Path.dirs.fwd
                    this.cur++
                }else this.cur--
            }
            return this.points[this.cur]
        }
    }
    add(...vects){
        vects.forEach(vect=>this.points.push(vect))
    }
    getAllPoints(){
        
    }
    /**Tells if moving foward through the points or backwards */
    static get dirs(){return {fwd:'fwd',bkwd:'bkwd'}}
    /**Tells if to go up/down then left/right or the other way around */
    static get styles(){return {vertHoriz:'vertHoriz',horizVert:'horizVert'}}
}

class MovingEntity extends Entity{
    constructor(path,{onInteract,moveStyle=Path.styles.vertHoriz,speed=5,width=15,height=15,color='orange',flipMoveStyle=true,name}={}){
        super(path.points[0].x,path.points[0].y,width,height,color,{name:name,onInteract:onInteract})
        this.path=path
        this.curGoal=this.path.points[0]
        this.speed=speed
        this.width=width
        this.height=height
        this.color=color
        this.isMoving=false
        if(flipMoveStyle){
            if(moveStyle===Path.styles.horizVert)
                this.moveStyle=Path.styles.vertHoriz
            else if(moveStyle===Path.styles.vertHoriz)
                this.moveStyle=Path.styles.horizVert
        }else
            this.moveStyle=moveStyle
        this.flipMoveStyle=flipMoveStyle
        this.dx=0
        this.dy=0
    }
    setPosition(x,y){
        this.x=(x*Tn.SIZE+Tn.SIZE/2-this.width/2)
        this.y=(y*Tn.SIZE+Tn.SIZE/2-this.height/2)
    }
    move(){
        this.glideTo(this.curGoal.x,this.curGoal.y)
        if(!this.isMoving){
            if((this.path.cur===this.path.points.length-1||this.path.cur===0)&&this.flipMoveStyle){
                if(this.moveStyle===Path.styles.horizVert)
                    this.moveStyle=Path.styles.vertHoriz
                else if(this.moveStyle===Path.styles.vertHoriz)
                    this.moveStyle=Path.styles.horizVert
            }
            this.curGoal=this.path.next()
        }

    }
    glideTo(x,y){
        if(!this.isPlayerCollide()){
            var urp=unroundPoint(x,y,this)
            var t=this
            function m(xyb){
                if(xyb==='x'){
                    t.isMoving=true
                    if(t.x<urp.x){
                        t.x+=t.speed
                        if(t.x>urp.x)
                            t.x=urp.x
                        if(t.isPlayerCollide())
                            t.x-=t.speed
                    }else{
                        t.x-=t.speed
                        if(t.x<urp.x)
                            t.x=urp.x
                        if(t.isPlayerCollide())
                            t.x+=t.speed
                    }
                }else if(xyb==='y'){
                    t.isMoving=true
                    if(t.y<urp.y){
                        t.y+=t.speed
                        if(t.y>urp.y)
                            t.y=urp.x
                        if(t.isPlayerCollide())
                            t.y-=t.speed
                    }else{
                        t.y-=t.speed
                        if(t.y<urp.y)
                            t.y=urp.y
                        if(t.isPlayerCollide())
                            t.y+=t.speed
                    }
                }
            }
            if(this.moveStyle===Path.styles.horizVert){
                if(this.x!==urp.x)
                    m('x')
                else if(this.y!==urp.y)
                    m('y')
                else
                    this.isMoving=false
            }else if(this.moveStyle===Path.styles.vertHoriz){
                if(this.y!==urp.y)
                    m('y')
                else if(this.x!==urp.x)
                    m('x')
                else
                    this.isMoving=false
            }
        }
    }
    isPlayerCollide(){
        return!(((this.y+this.height)<(player.y))||
            (this.y>(player.y+player.height))||((this.x+this.width)<player.x)||(this.x>(player.x+player.width)));
    }
}

class Sign extends Composite{
    constructor(x,y,...txt){
        super(new Entity(x,y,4,Tn.SIZE-3,Colors.darkWood).withDepth(0),new Entity(x,y-0.2,Tn.SIZE-8,2*Tn.SIZE/5,Colors.darkWood))
        this.txt=txt
    }
    onInteract(){if(typeof this.txt[0]==='function')this.txt[0]();else dialogue(...this.txt)}
}

/**Did not use a class immediately because it could return 2 entities */
function fenceSm(x,y,dirs){
    var ret=[],
        w=4,h=Tn.SIZE
    
    class FenceSm extends Entity{
        constructor(x,y,w,h){super(x,y,w,h,Colors.darkWood)}
    }

    if(Array.isArray(dirs)){
        if(dirs.includes(Dir.Up)&&dirs.includes(Dir.Down)){
            ret.push(new FenceSm(x,y,w,h))
        }else if(dirs.includes(Dir.Up)){
            ret.push(new FenceSm(x,y-.25,w,h/2))
        }else if(dirs.includes(Dir.Down)){
            ret.push(new FenceSm(x,y+.25,w,h/2))
        }
        if(dirs.includes(Dir.Right)&&dirs.includes(Dir.Left)){
            ret.push(new FenceSm(x,y,h,w,Colors.darkWood))
        }else if(dirs.includes(Dir.Right)){
            ret.push(new FenceSm(x+.25,y,h/2,w))
        }else if(dirs.includes(Dir.Left)){
            ret.push(new FenceSm(x-.25,y,h/2,w))
        }
    }
    return ret
}

/**Use .5s for whole lengths of tiles */
class FenceLong extends Entity{
    constructor(dir,start,end,constant){
        if(dir===Dir.Left||dir===Dir.Right)
            super((end+start)/2,constant,Tn.SIZE*(end-start),4,Colors.darkWood)
        else if(dir===Dir.Up||dir===Dir.Down)
            super(constant,(end+start)/2,4,Tn.SIZE*(end-start),Colors.darkWood)
        this.dir=dir
    }
    lengthen(amount){
        amount*=Tn.SIZE
        if(this.dir===Dir.Left||this.dir===Dir.Right){
            this.width+=amount
            this.x-=amount/2
        }else if(this.dir===Dir.Up||this.dir===Dir.Down){
            this.height+=amount
            this.y-=amount/2
        }
        return this
    }
}

class Chest extends Entity{
    constructor(x,y,...inventory){
        super(x,y,Tn.SIZE*0.6,Tn.SIZE*0.6,Colors.darkWood,{name:'Chest',imgSrc:'chestClosed.png'})
        this.addItem(...inventory)
        this.open=false
    }
    giveAllToPlayer(){
        super.giveAllToPlayer()
        if(!this.open){
            var i=new Image(this.width,this.height)
            i.src='gfx/chestOpen.png'
            this.img=i
            this.open=true
        }
    }
    addItem(...items){
        items.forEach(item=>this.inventory.add(item))
        if(this.open){
            this.open=false
            this.img=new Image()
            this.img.src='gfx/chestClosed.png'
        }
        return this
    }
    onInteract(){
        this.giveAllToPlayer()
    }
}

function keyChest(x,y,type,count=1){
    return new Chest(x,y,Items.key(type,count))
}

//#endregion

class PickupItem extends Pickup{
    constructor(x,y,width,height,item,color){
        super(x,y,{width:width,height:height,img:item.img,color:color})
        this.item=item
        this.onGrab=function(){
            player.addItem(item)
            tell(item.getText)
        }
    }
}
/*
new Entity(2,1,15,15,'green',{onInteract:(t)=>{
            var i=new Item('Random thing')
            tell('Hi, Have this',undefined,'Nice Guy',()=>{tell(i.getText)})
            player.addItem(i)
            t.onInteract=()=>{tell('I already gave you the '+i.name)}
}})*/
class GiveEntity extends Entity{
    constructor(x,y,{width,height,color,beforeTxt='Here, have this',
                afterTxt,name,}={},...items){
        super(x,y,width,height,color,{name:name})
        this.addItem(items)
        this.beforeTxt=beforeTxt
        if(!afterTxt)
            this.afterTxt=this.inventory.toString()
        else
            this.afterTxt=afterTxt
    }
    onInteract(t){
        tell(this.beforeTxt,'Thanks',this.name,()=>{
            t.giveCopyToPlayer()
            t.onInteract=()=>{
                t.tell('I already gave you '+t.inventory.toString())
            }
        })
    }
}
class TakeEntity extends Entity{
    constructor(x,y,funcAfter,{width,height,color,beforeTxt,giveTxt,afterTxt,name="???"}={},...items){
        super(x,y,width,height,color,{name:name})
        if(items.length===0)
            items.push(new Item('undefined item'))
        this.addItem(...items)
        this.funcAfter=funcAfter
        if(beforeTxt===undefined)
            this.beforeTxt='Hey, do you have '+this.inventory.toString()+'?'
        else
            this.beforeTxt=beforeTxt
        if(giveTxt===undefined)
            this.giveTxt='Thanks for the '+this.inventory.toString()+'. Let me help you.'
        else
            this.giveTxt=giveTxt
        if(afterTxt===undefined)
            this.afterTxt='Thanks again for the '+this.inventory.toString()
        else 
            this.afterTxt=afterTxt
        this.hasInteracted=false
        this.gottenItems=false
    }
    onInteract(t){
        if(!this.hasInteracted)
            this.tell(this.beforeTxt,'Okay',()=>{t.hasInteracted=true})
        else if(!this.gottenItems){
            var has=true
            for(let i=0;i<this.inventory.length;i++){
                if(!player.hasItem(this.inventory.get(i).name,this.inventory.get(i).count)){
                    has=false
                }
            }
            if(has){
                this.inventory.items.forEach(item=>{
                    player.inventory.removeIfHas(item.name,item.count)
                })
                this.tell(this.giveTxt,undefined,this.funcAfter)
                this.gottenItems=true
            }else
                this.tell(this.beforeTxt)
        }else
            this.tell(this.afterTxt)
    }
}