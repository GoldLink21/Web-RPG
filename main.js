const version='0.1.0';

/**Tells whether to use the set debug settings */
var doDebug=true

//#region misc0
/**Enum for directions */
const Dir={Up:'up',Down:'down',Left:'left',Right:'right'};

if(localStorage['version']===undefined)
    localStorage['version']=version;

if(localStorage['version']!==version){
    var points=localStorage['version'].split('.'),
        cur=version.split('.');
    //Clear time if has a different update with bigger fixes or new levels
    if(points[0]!==cur[0]||points[1]!==cur[1])
        localStorage['lowTime']='9999:99.99';
    localStorage['version']=version;
}

/**Enum for difficulty */
const Difficulty={Easy:'easy',Normal:'normal',Hard:'hard'}

/**Enum for menu */
const Menu={
    title:'title',
    inGame:'inGame',
    pause:'pause',
}

var menu=Menu.title
/**@type {CanvasRenderingContext2D} */
var ctx

function Tile(name,color,hasImage,otherProps){
    this.name=name;
    //Allows many colors to be passed in to let randomization to happen
    if(Array.isArray(color))
        this.color=rndArrEle(color)
    else
        this.color=color
    if(Array.isArray(hasImage))
        this.hasImage=rndArrEle(hasImage)
    else
        this.hasImage=hasImage
    this.size=35;this.width=this.size;this.height=this.size;

    this.is=function(...others){
        for(let i=0;i<others.length;i++){
            if(typeof others[i]==='string'&&others[i]===this.name)
                return true
            if(this.name===others[i].name)
                return true
        }
        return false
    }
    this.subIs=function(...others){
        for(let i=0;i<others.length;i++){
            if(typeof others[i]==='string'){
                if(this.subName&&others[i]===this.subName)
                    return true
            }if(this.subName&&this.subName===others[i].subName){
                return true
            }
        }
        return false
    }
    this.tower=function(height){
        this.h3D=height
        return this
    }
    this.setColor=function(color){
        this.color=color
        return this
    }
    Object.assign(this,otherProps)
}
/**@returns {Tile} */
function subTile(tile,subName,otherProps){
    return Object.assign(tile,{subName:subName},otherProps)
}

function rndArrEle(arr){
    return arr[Math.floor(Math.random()*arr.length)]
}

function rndCol(rs=[0,255],gs=[0,255],bs=[0,255]){
    return `rgb(${(Array.isArray(rs))?rndArrEle(aR(rs[0],rs[1])):rs},`+
        `${(Array.isArray(gs))?rndArrEle(aR(gs[0],gs[1])):gs},${(Array.isArray(bs))?rndArrEle(aR(bs[0],bs[1])):bs})`
}

class Col{
    constructor(r=0,g=r,b=g,a=1){
        this.r=r
        this.g=g
        this.b=b
        this.a=a
        var t=['r','g','b','a']
        for(let i=0;i<t.length;i++){
            this[t[i].toUpperCase()]=function(val,max){
                if(t[i]!=='a'){
                    this[t[i]]=(max)?rndArrEle(aR(val,max)):val
                    return this
                }else{
                    if(max){
                        var rng=((max)?Math.abs(max-val):val)
                        var start=((max)?Math.min(max,val):val)
                        this['a']=start+Math.random()*rng
                    }else{
                        this.a=val
                    }
                    return this
                }
            }
        }
    }
    [Symbol.toPrimitive](){
        return `rgba(${this.r},${this.g},${this.b},${this.a})`
    }
    R(val,max){return this}
    G(val,max){return this}
    B(val,max){return this}
    A(val,max){return this}
}
/*
const Colors={
    get pathGrey(){return rndCol([160,170],[160,170],[160,170])},
    wallGrey:'rgb(78,78,78)',
    hiddenGrey:'rgb(65,65,65)',
    noRockGrey:'rgb(135,135,135)',
    lightWood:'#c19a6f',//(193,154,111)
    darkWood:'#664a2b',
    load:'peru',
    get grass(){return rndCol(0,[160,250],0)}//0, [160,250], 0
}
*/
const Colors={
    get pathGrey(){return new Col().R(160,170).G(160,170).B(160,170)},
    get wallGrey(){return new Col(78)},
    get hiddenGrey(){return new Col(65)},
    get noRockGrey(){return new Col(135)},
    get lightWood(){return new Col(193,154,111)},
    get darkWood(){return new Col(102,74,43)},
    get load(){return new Col(205,133,63)},
    get grass(){return new Col().G(160,250)}
}

//#endregion

//Fancy Tile and subTile system which simplifies code a fair bit
var Tn={
    //These are all tiles with distinct properties
    Wall(color=Colors.wallGrey,hasImage,towerHeight=10)
        {return new Tile('wall',color,hasImage).tower(towerHeight)},
    Path(color=Colors.pathGrey,hasImage)
        {return new Tile('path',color,hasImage)},
    Load(ref,x,y,color=Colors.load,hasImage)
        {return new Tile('load',color,hasImage,{ref:ref,x:x,y:y})},
    Lock(tileUnder=Tn.Path(),keyType='Golden',onUnlockExtra=()=>{},color=tileUnder.color,hasImage='lock.png')
        {return new Tile('lock',color,hasImage,{onUnlockExtra:onUnlockExtra,keyType:keyType,tileUnder:tileUnder})},
    Rock(tileUnder=Tn.Path(),hasImage='rock.png')
        {return new Tile('rock',tileUnder.color,hasImage,{tileUnder:tileUnder})},
    NoRock(color=Colors.noRockGrey,hasImage)
        {return new Tile('noRock',color,hasImage)},
    Portal(type,id,color=Colors.pathGrey,hasImage)
        {return new Tile('portal',color,hasImage,{id:id,type:type})},
    OneWayPortal(x,y,color=Colors.pathGrey,hasImage)
        {return subTile(Tn.Portal('C',-1,color,hasImage),'oneWayPortal',{x:x,y:y})},
    RockSwitch(onActivate=()=>{},keepsRock=false,color='purple',hasImage,tileUnder=Tn.Path())
        {return new Tile('rockSwitch',color,hasImage,{onActivate:onActivate,keepsRock:keepsRock,tileUnder:tileUnder})},
    Pit(){return new Tile('pit','rgb(30,30,30)')},
    TallGrass(height,x,y,color=Colors.grass){return Tn.RockSwitch(()=>{if(b(x,y).h3D>0){b(x,y).h3D-=2 }else b(x,y,Tn.Path(b(x,y).color))},true,color).tower(height)},
    //These are predefined subtypes of other type of tiles which do nothing different. They have no
    //Params because they are the same as just passing in those params on other objects
    Hidden(){return subTile(Tn.Path(Colors.hiddenGrey),'hidden')},
    Grass(){return subTile(Tn.Path(Colors.grass),'grass')},
}
//Makes lowercase properties of everything for the is function
for(let tileType in Tn){
    var name=Tn[tileType]().name
    if(!Tn[name])
        Object.defineProperty(Tn,name,{value:name})
}

Object.defineProperty(Tn,'SIZE',{value:35})//35

/**
 * If just x and y are passed in, then returns board[y][x] which is (x,y)
 * If type is passed in, sets board[y][x] (x,y) to the type passed in
 */
function b(x,y,type){
    //This is used as a setter if type is passed in
    if(x<0||x>=board[0].length||y<0||y>=board.length)
        return 
    if(type!==undefined){
        board[y][x]=type;
    }else
        return board[y][x];
}

var board=setFloorAs(Tn.Path(),1,1)
    /**Holds all the HTML elements */
var HTML={
    /**@type {HTMLDivElement}*/tell:0,
    /**@type {HTMLDivElement}*/board:0,
    /**@type {HTMLDivElement}*/debug:0,
    /**@type {HTMLDivElement}*/time:0,
    /**@type {HTMLDivElement}*/midbar:0,
    /**@type {HTMLDivElement}*/info:0,
    /**@type {HTMLDivElement}*/holder:0,
    /**@type {HTMLCanvasElement}*/canvas:0,
    /**@type {HTMLDivElement}*/help:0,
    /**@type {HTMLDivElement}*/holder:0,
    /**@type {HTMLHeadingElement}*/title:0
}

/**This holds general data about the game */
var game={
    /**Tells if you have beaten the game */
    onEnd:false,
    /**Tells if the player can move */
    canMove:true,
    loops:localStorage['gameLoops']||0,
    /**Determines many things, like respawn behavior and such */
    lowTime:localStorage['lowTime']||'9999:99.99',
    //Tries to render 3d
    try3D:true,
    entity3D:false,
    slantBoard:false,
    offset3D:v(0,0),
    hasShadows:true
}  


/**This holds all variables for debug testing */
var debug={
    /**Determines if a sidebar with extra info can be activated */
    showInfo:true,
    /**Tells if to change the first floor to the value of debug.firstFloor */
    changeFirstFloor:true,
    /**The floor to change the first floor to */
    firstFloor:0,
    /**Infinite Keys */
    infKeys:false,
    /**Tells if you can hit / to load the next floor */
    nextFloor:true,
    /**Sets the floor to load when clicking p */
    quickLoad:'',
    /**Determines if you can quick load a floor */
    doQuickLoad:true,
    /**If you can see the ids for portals */
    showPortalId:false,
    /**If the coordinates of each tile shows up */
    showCoords:true,
    /**Determines if clicking c shows the coords */
    canShowCoords:true,
    /**Can click on a tile to teleport to it */
    clickTele:true,
}

//#region misc1

/**Randomizes one array and shuffles the other in the same order */
function shuffleSimilar(arr1,arr2){
    var i,temp,temp2,j,len=arr1.length;
	for (i=0;i<len;i++){
		j = ~~(Math.random()*len);
        temp=arr1[i];
        temp2=arr2[i]
        arr1[i]=arr1[j];
        arr2[i]=arr2[j]
        arr1[j]=temp;
        arr2[j]=temp2
	}
	return arr1;
}

/**Randomizes an array */
function shuffleArr(arr){
    var i,temp,j,len=arr.length;
	for (i=0;i<len;i++){
		j = ~~(Math.random()*len);
        temp=arr[i];
        arr[i]=arr[j];
        arr[j]=temp;
	}
	return arr;
}

/**
 * @returns true only with an n/d chance, else false
 * @param {number} n The numerator of the fractional chance
 * @param {number} d The denominator of the fractional chance
 */
function chance(n,d){return (d)?Math.floor(Math.random()*d)<n:chance(1,n)}

/**
 * Prints out an array into the console based on the backwards array I made. 
 * Only prints len letters of each part
 */
function printArr(arr,len=5){
    var str='\n',
        colors=[]
    arr.forEach(y=>{
        y.forEach(x=>{
            var toAdd=''
            if(x.name.length>=len) toAdd=x.name.substring(0,len)+'  ';
            else toAdd=x.name+'.'.repeat(len-x.name.length)+'  ' 
            str+='%c'+toAdd
            colors.push('color:'+x.color)
        })
        str+='\n'
    })
    console.log(str,...colors);   
}

/**Fancily prints the board in the console */
function printBoard(){
    var str='\n',
        colors=[]

    function sp(txt){
        var ele=document.createElement('div')
        ele.innerHTML=txt
        return ele.innerHTML
    }
    
    board.forEach(y=>{
        y.forEach(x=>{
            var toAdd='',overrideColor=false
            
            toAdd=sp('&#9608;')+sp('&#9608;')
            
            str+='%c'+toAdd
            colors.push(`color:${(overrideColor)?overrideColor:x.color}`)
        })
        str+='\n'
    })
    console.log(str,...colors);   
}

//#endregion

/**Creates all the HTML elements */
function boardInit(){
    /**Helper for making a new div and appending it to parent */
    function addElement(id,parent){
        var ele=document.createElement('div');
        ele.id=id;
        parent.appendChild(ele);
        HTML[id]=ele;
        return ele
    }

    addElement('board',document.body)
    addElement('midbar',HTML.board)

    var titleEle=document.createElement('h1');
    titleEle.innerHTML="RPG"
    HTML.title=titleEle
    HTML.midbar.appendChild(titleEle)
    
    addElement('info',HTML.midbar)
    addElement('time',HTML.midbar)
    addElement('help',HTML.midbar);

    addElement('holder',HTML.board)

    var canvas=document.createElement('canvas')
    canvas.id='canvas'
    HTML.holder.appendChild(canvas)
    HTML.canvas=canvas
    ctx=canvas.getContext('2d')

    if(game.slantBoard){
        canvas.style.transform='skewX(-10deg)'
    }

    var tell=addElement('tell',HTML.holder)
    tell.innerHTML="This is the tell<br>"
    var tellBtn=document.createElement('button')
    tellBtn.innerHTML='Okay'
    tell.style.display='none'
    tell.appendChild(tellBtn)
    tell.style.marginTop=HTML.canvas.style.marginTop

    addElement('debug',HTML.board)

    //Adds an event for if you have click teleporting active
    canvas.addEventListener('click',(event)=>{
        if(debug.clickTele){
            var rect=canvas.getBoundingClientRect()
            var rp=roundPoint(event.x-rect.left-game.offset3D.x,event.y-rect.top-game.offset3D.y)
            player.setPosition(rp.x,rp.y)
        }
    })

    updateInfo()
    setHelpInfo()
}

//#region player

class Player extends Entity{
    constructor(){
        super(0,0,16,16,'steelblue',false,new Stats())
        this.dir=Dir.Up
        this.lastDeathSource='none'
        this.keys=0
        this.gay=false
        this.speed=5
        this.defaultSpeed=5
        this.armor=0
        this.activeItem=undefined
        this.h3D=3
        this.portal={
            hasTele:false,
            id:-1,
            type:''
        }
        this.colors={
            /**Standard color of the player */
            default:'steelblue',
            /**When the player has armor */
            armor:'grey',
        }
        this.canMove={
            up:false,down:false,left:false,right:false
        }
    }
    useActive(){
        if(this.activeItem&&this.active){
            this.activeItem.activate()
        }
    }
    move(){
        var dx=0,dy=0;
        //This is the actual movement calculation
        if(game.canMove){
            if(player.canMove.up) dy-=1;
            if(player.canMove.down) dy+=1;
            if(player.canMove.left) dx-=1;
            if(player.canMove.right) dx+=1;
        }
        
        //Only moving a single direction and you're not blocking
        if(dx===0^dy===0){
            if(dx!==0){
                switch(dx){
                    case 1:player.dir=Dir.Right;break;
                    case -1:player.dir=Dir.Left;break;
                }
                player.x+=dx*player.speed;
            }else{
                switch(dy){
                    case 1:player.dir=Dir.Down;break;
                    case -1:player.dir=Dir.Up;break;
                }
                player.y+=dy*player.speed;
            }
        }
        //Determines if the player can move, and if so then does
        if(!player.checkTileCollisions()||player.checkEntityCollisions()){
            if(dx===0^dy===0){
                player.x-=(dx*player.speed);
                player.y-=(dy*player.speed);
            }
        }
        //Runs some checks for stuff
        checkOnPortal();
        updateInfo()

        Entity.moveAndCollisions()

        //Pick the color only if you can see the player
        if(this.active)
            player.setColor()
    }
    setColor(){
        //Follows priority of armor, gay, then normal
        if(player.armor>0){
            if(player.color!==player.colors.armor)
                player.color=player.colors.armor
        }else if(player.gay){
            var ctx=HTML.canvas.getContext('2d')
            var grad=ctx.createLinearGradient(player.x,player.y,player.x+player.width,player.y)
            var col=['red','orange','yellow','green','blue','violet']
            var inc=1/(col.length-1)
            for(let i=0;i<=1;i+=inc){
                i=Math.round(i*10)/10
                grad.addColorStop(i,col[i*5])
            }
            player.color=grad
        }else{
            if(player.color!==player.colors.default)
                player.color=player.colors.default
        }
    }
    checkTileCollisions(){
        var pPoints=this.getCorners();
        for(var i=0;i<pPoints.length;i++){
            var y=pPoints[i].y,x=pPoints[i].x;
            if(!this.checkTile(x,y))return false
        }
        return true
    }
    checkTileCollisions2(){
        var pts=this.getCorners()
        return pts
    }
    checkEntityCollisions(){
        //I check if the other collides so I can do more specific checking with
        //Things like composites
        return entities.some(ent=>ent.stopsPlayer&&ent.collides(this))
    }
    onSpacePress(){
        var e=entities.find(ent=>this.distanceFrom(ent)<player.width+Math.max(ent.width,ent.height)/2)
        if(e!==undefined)e.onInteract(e)
    }
    checkTile(x,y){
        //First make sure it's in bounds so no errors are thrown
        if(x<0||y<0||x>=board[0].length||y>=board.length)
            return false;
        //These are the tiles that you can walk on with nothing happening
        var cur=b(x,y)
        if(cur===undefined)
            return false
        if(cur.is(Tn.path,Tn.noRock))
            return true;
        else if(cur.is(Tn.wall))
            return false
        //Keys and locks
        else if(cur.is(Tn.lock)){
            if(player.hasItem(cur.keyType+' Key')){
                player.inventory.removeIfHas(cur.keyType+' Key')
                cur.onUnlockExtra()
                b(x,y,cur.tileUnder)
                return false;
            }else return false
        //Lava
        }else if(cur.is(Tn.rock)){
            var xCheck=x,yCheck=y;
            switch(player.dir){
                case Dir.Up:yCheck--;break;
                case Dir.Down:yCheck++;break;
                case Dir.Left:xCheck--;break;
                case Dir.Right:xCheck++;break;
            }
            if(checkRockTile(xCheck,yCheck)){
                var next=b(xCheck,yCheck)
                if(next.is(Tn.rockSwitch)){
                    next.onActivate()
                    if(next.keepsRock){
                        var t=cur.tileUnder
                        var t2=b(xCheck,yCheck)
                        b(xCheck,yCheck,Tn.Rock(b(xCheck,yCheck),b(x,y).hasImage))
                        b(x,y,t)
                        b(xCheck,yCheck).tileUnder=t2
                    }else{
                        b(xCheck,yCheck,next.tileUnder)
                        b(x,y,cur.tileUnder)
                    }
                }else if(next.is(Tn.pit)){
                    b(xCheck,yCheck,b(x,y).tileUnder)
                    b(x,y,b(x,y).tileUnder)
                }else{
                    var t=cur.tileUnder
                    var t2=b(xCheck,yCheck)
                    b(xCheck,yCheck,Tn.Rock(b(xCheck,yCheck),b(x,y).hasImage))
                    b(x,y,t)
                    b(xCheck,yCheck).tileUnder=t2
                }
                return false;
            }
        //Portals
        }else if(cur.is(Tn.portal)){
            if(!player.portal.hasTele||cur.id!==player.portal.id||cur.type!==player.portal.type){
                if(cur.type==='C'){
                    player.portal.type='C'
                    player.portal.id=-1;
                    player.setPosition(cur.x,cur.y)
                }
                player.portal.id=cur.id
                player.portal.hasTele=true;
                var point=getOtherPortal(cur)
                if(point){
                    player.portal.type=b(point[0],point[1]).type
                    player.setPosition(point[0],point[1])
                    return false
                }
                return true
            }
            return true;
        }else if(cur.is(Tn.load)){
            Area.load(cur.ref)
            var sp=cur.ref.split(',')
            if(sp.length===2&&!isNaN(sp[0]&&!isNaN(sp[1]))){
                mapX=Number(sp[0])
                mapY=Number(sp[1])
            }
            player.setPosition(cur.x,cur.y)
        }
        //Anything that doesn't return true by here returns undefined, which counts as false in an if so you can't move there
    }
    tellGive(...items){
        new Chest(undefined,undefined,...items).giveAllToPlayer()
    }
}

var player=new Player()

/**Get's the coord of the other portal for the same type */
function getOtherPortal(obj){
    for(let i=0;i<board.length;i++){
        for(let j=0;j<board[0].length;j++){
            var temp=b(j,i);
            //If it's a portal too, isn't the same type, but has the same id, then return (x,y) as an array
            if(temp.is(Tn.portal)&&temp.type!==obj.type&&temp.id===obj.id){
                return [j,i]
            }
        }
    }
}
/**Sets player.portal.hasTele to false if not on a portal and haven't teleported yet*/
function checkOnPortal(){
    var p=getRounded(player);
    for(let i=0;i<p.length;i++){
        var x=p[i].x,y=p[i].y;
        if(b(x,y).is(Tn.portal))
            return;
    }
    player.portal.hasTele=false;
}

function uniqArr(a){
    var seen = {};
    return a.filter(function(item) {
        var k = JSON.stringify(item);
        return seen.hasOwnProperty(k) ? false : (seen[k] = true);
    })
}

function flatten(arr){
    var copy=arr.flat()
    while(copy.some(ele=>Array.isArray(ele))){
        copy=copy.flat()
    }
    return copy
}

function checkRockTile(x,y){
    //Make sure it's in bounds
    if(x<0||y<0||x>board[0].length-1||y>board.length-1)
        return false;
    //Pushable on paths and lava only
    if(b(x,y).is(Tn.path,Tn.rockSwitch,Tn.pit)){
        //Disable movement if there is an entity there
        var locs=Entity.getAllLocations()
        for(let i=0;i<locs.length;i++)
            if(locs[i].x===x&&locs[i].y===y)
                return false
        
        return true;
    }
}

//#endregion

/**
 * @type {v()[]} an array of the rounded points of each corner of the object 
 * @requires obj to have width and height property
 */
function getRounded(obj){
    var x=obj.x,y=obj.y,width=obj.width,height=obj.height;
    return uniqArr([roundPoint(x,y),roundPoint(x+width,y),roundPoint(x+width,y+height),roundPoint(x,y+height)])
}

/**@type {v()} the tile coord of the point */
function roundPoint(x,y){return v(Math.floor(x/Tn.SIZE),Math.floor(y/Tn.SIZE));}
/**@type {v()} the exact coord of the map point from the center of the tile */
function unroundPoint(x,y,obj){
    return v(x*Tn.SIZE+Tn.SIZE/2-((obj)?obj.width/2:0),y*Tn.SIZE+Tn.SIZE/2-((obj)?obj.height/2:0))
}


var startTime=Date.now(),
    curTime=Date.now(),
    timeDuration=0

/**Updates the info on the info HTML */
function updateInfo(){
    var ele = document.getElementById('info');
    var str=`Keys: ${player.keys}`
    
    if(game.loops>0)
        str+=`,  Game Loops: ${game.loops}`;

    if(ele.innerHTML!==str)
        ele.innerHTML=str;

    //Holds the counting feature
    str='Time: '+Clock1.toString()
    if(game.lowTime!=='9999:99.99')
        str+='<br>Fastest Time: '+game.lowTime
    
    //Only do it if there's something new to change
    if(HTML.time.innerHTML!==str)
        HTML.time.innerHTML=str
    if(debug.showInfo)
        updateDebugInfo()
    else if(!debug.showInfo&&HTML.debug.style.display!=='none')
        HTML.debug.style.display='none'
}



var _debugStrFunc=[
    ()=>`Player Coords: ${player.x} ${player.y}`,
    ()=>`Player dir: ${player.dir}`,
    ()=>`player.portal.hasTele: ${player.portal.hasTele}`,
    ()=>`Player Armor: ${player.armor}`,
    ()=>`Map Coords: ${mapX+','+mapY}`,
    ()=>`Area desc: ${(curArea!==undefined)?curArea.description:''}`,
    ()=>'Inventory<br>'+player.inventory.items.map(i=>i.toString()).join('<br>')+'<br>',
    
]
/**Pass in a function that returns a string. Adds something to the side bar for debug */
function debugStr(func){
    _debugStrFunc.push(func)
}
/**This new system for debug info allows active altering of the debug window */
function updateDebugInfo(){
    if(HTML.debug.style.display!=='block')
        HTML.debug.style.display='block'
    var str=''
    _debugStrFunc.forEach(func=>{str+='<br>'+func()})
    if(HTML.debug.innerHTML!==str)
        HTML.debug.innerHTML=str
}

/**
 * Adds a key at tile x and y for the floor. Do not use the new keyword
 * @param {number} x The x coord of the key
 * @param {number} y The y coord of the key
 */
function pKey(x,y,type='Golden'){
    return new Pickup(x,y,{width:15,height:20,color:'goldenrod',type:'key',onGrab:()=>
        {player.addItem(keyItem(type))},onRemove:()=>{player.keys=0},img:'key.png'})
}

/**
 * Adds multiple keys at once 
 * @argument Points [x1,y1],[x2,y2],... 
 */
function addKeys(){
    var ret=[]
    Array.from(arguments).forEach(key=>{
        if(key.x!==undefined&&key.y!==undefined)
            ret.push(pKey(key.x,key.y))
        else
            ret.push(pKey(key[0],key[1]))
    })
    return ret
}

function getAllTileOfType(...types){
    var ret=[]
    board.forEach(x=>{
        x.forEach(y=>{
            if(y.is(...types))
                ret.push(y)
        })
    })
    return ret
}

function shadow(x=0,y=x){
    if(!game.hasShadows)
        return
    ctx.shadowOffsetX=x
    ctx.shadowOffsetY=y
    return ctx
}

document.addEventListener('keydown',(event)=>{
    if(!consoleFocused){
        eventHelper(event,true)
    }
});
document.addEventListener('keyup',(event)=>{
    if(!consoleFocused){
        if(event.key===' '){
            if(tell.isOpen())
                tell.close()
            else
                player.onSpacePress()
        }
        eventHelper(event,false);
        }if(event.key==='c'&&debug.canShowCoords){
            debug.showCoords^=true;
        }if(event.key==='i'&&doDebug){
            debug.showInfo^=true
        }if(event.key==='`'){
            toggleConsole()
        }
        if(event.key==='Enter'&&tell.isOpen())
            tell.close()
    }
)

/**Helper function for adding movement event listeners to remove repetition */
function eventHelper(event,bool){
    if(['ArrowUp','w','W'].includes(event.key))
        player.canMove.up=bool
    else if(['ArrowDown','s','S'].includes(event.key))
        player.canMove.down=bool
    else if(['ArrowRight','d','D'].includes(event.key))
        player.canMove.right=bool
    else if(['ArrowLeft','a','A'].includes(event.key))
        player.canMove.left=bool
}

//#region drawing

/**
 * @param {any} x The x to draw or the object to draw
 * @param {number|boolean} y The y to draw or if the color of the object shouldn't be used
 */
function rect(x,y,width,height,color){
    if(typeof x==='object'){
        y=x.y
        width=x.width
        height=x.height
        x=x.x
    }
    if(color)
        ctx.fillStyle=color;
    shadow(2)
    ctx.fillRect(x,y,width,height)
    shadow(0)
    ctx.strokeRect(x,y,width,height)
}

function imgRotated(img,x,y,width,height,deg){
    if(typeof deg==='string')
        deg=dirToDeg(deg)
    ctx.save()
    ctx.translate(x+width/2,y+height/2)
    ctx.rotate(Math.PI*deg/180)
    ctx.drawImage(img,-width/2,-height/2,width,height)
    ctx.restore()
}
/**Holds functions for drawing stuff post drawing everything else. Must be added every frame
 * @type {Function[]} */
var drawAfter=[]
/**@type {{x:number,y:number,h:number,right:boolean,bottom:boolean}} */
var cubesAfter=[]
/**@type {Function[]} */
var constDraw=[]

function drawTiles(){
    drawAfter=[]
    cubesAfter=[]
    var by=0,bx=0;
    board.forEach(y=>{
        bx=0;
        y.forEach(x=>{
            //Draw tiles first
            ctx.fillStyle=x.color;
            rect(bx*Tn.SIZE,by*Tn.SIZE,Tn.SIZE,Tn.SIZE)
            //Images go on top
            if(x.hasImage){
                shadow(2)
                //Any tile with a dir property can be drawn rotated
                if(x.dir)
                    imgRotated(images.get(x.hasImage),bx*Tn.SIZE,by*Tn.SIZE,Tn.SIZE-1,Tn.SIZE-1,dirToDeg(x.dir))
                else
                    ctx.drawImage(images.get(x.hasImage),bx*Tn.SIZE,by*Tn.SIZE,Tn.SIZE-1,Tn.SIZE-1)
                shadow()
                ctx.strokeRect(bx*Tn.SIZE,by*Tn.SIZE,Tn.SIZE,Tn.SIZE)
            }   
            //Draw Portal ids
            if(x.is(Tn.portal)&&(debug.showPortalId||debug.showCoords)){
                if(x.type==='A')
                    ctx.strokeStyle='blue'
                else if(x.type==='B')
                    ctx.strokeStyle='brown'
                else if(x.type==='C')
                    ctx.strokeStyle='forestgreen'
                ctx.strokeText(x.id,(bx+1)*Tn.SIZE-12,(by+1)*Tn.SIZE-3)
                ctx.strokeStyle='black'
            }
            //Draw coords on tiles
            if(debug.showCoords){
                ctx.strokeStyle='rgba(10,10,10,0.5)'
                ctx.strokeText("("+bx+','+by+')',bx*Tn.SIZE+2,by*Tn.SIZE+10)
                ctx.strokeStyle='black'
            }

            if(game.try3D&&x.h3D!==undefined){
                var showRight=b(bx+1,by)===undefined||
                        b(bx+1,by).h3D===undefined||b(bx+1,by).h3D<x.h3D
                var showBottom=b(bx,by+1)===undefined||
                        b(bx,by+1).h3D===undefined||b(bx,by+1).h3D<x.h3D

                cubesAfter.push({x:bx*Tn.SIZE,y:by*Tn.SIZE,w:Tn.SIZE,h:Tn.SIZE,d:x.h3D,color:x.color,right:showRight,bottom:showBottom,img:x.hasImage})
            }

            bx++
        }) 
        by++
    })
}

function shape(...pts){
    if(pts.length===0)
        return
    var fst=pts.shift()
    ctx.beginPath()
    ctx.moveTo(fst.x,fst.y)
    pts.forEach(pt=>{
        ctx.lineTo(pt.x,pt.y)
    })
    ctx.lineTo(fst.x,fst.y)
    if(pts.length>1)
        ctx.fill()
    ctx.stroke()
    ctx.closePath()
}
function drawCube(x,y,w,h,depth=8.75,drawBottom=true,drawRight=true,img){
    if(depth<0)
        return
    //x*=Tn.SIZE
    //y*=Tn.SIZE
    //var w=Tn.SIZE
    //var h=Tn.SIZE
    
    var d=-Math.hypot(depth,depth)
    ctx.fillRect(x+d,y+d,w,h)
    var im
    if(img!==undefined){
        if(img.constructor.name==='HTMLImageElement'){
            im=img
        }else{
            var im=new Image(w,h)
            im.src="gfx/"+img.split('/').pop()
        }
        shadow(3)
        ctx.drawImage(im,x+d,y+d)
        shadow()
    }
    ctx.strokeRect(x+d,y+d,w,h)   
    
    
    if(drawBottom)
        shape(v(x,y+h),v(x+w,y+h),v(x+w+d,y+h+d),v(x+d,y+d+h))
    if(drawRight)
        shape(v(x+w+d,y+d),v(x+w,y),v(x+w,y+h),v(x+w+d,y+h+d))
}

function getTallestTile(){
    var tallest=0
    board.forEach(y=>{
        y.forEach(x=>{
            if(x.h3D!==undefined&&x.h3D>tallest)
                tallest=x.h3D
        })
    })
    return tallest
}
function getTallestCorner(){
    var tallest=0
    board[0].forEach(x=>{
        if(x.h3D!==undefined&&x.h3D>tallest)
                tallest=x.h3D
    })
    for(let i=0;i<board.length;i++){
        var x=board[i][0]
        if(x.h3D!==undefined&&x.h3D>tallest)
                tallest=x.h3D
    }
    return Math.hypot(tallest,tallest)
}

function drawAll(){
    var border
    if(game.try3D)
        border=getTallestCorner()
    else
        border=0
    if(HTML.canvas.height!==board.length*Tn.SIZE+border){
        HTML.canvas.height=board.length*Tn.SIZE+border
        game.offset3D.x=border
    }if(HTML.canvas.width!==board[0].length*Tn.SIZE+border){
        HTML.canvas.width=board[0].length*Tn.SIZE+border
        game.offset3D.y=border
    }
    ctx.save()
    ctx.translate(border,border)
    //Clear the board first
    ctx.clearRect(0,0,HTML.canvas.width,HTML.canvas.height)

    ctx.shadowColor='black'  
    
    //Draw all the tiles first
    drawTiles()
    player.draw()
    entities.forEach(ent=>ent.draw())


    constDraw.forEach(func=>func())

    if(game.try3D){
        cubesAfter.forEach(cu=>{
            ctx.fillStyle=cu.color
            drawCube(cu.x,cu.y,cu.w,cu.h,cu.d,cu.bottom,cu.right,cu.img)
        })
    }
    
    drawAfter.forEach(func=>func())
    
    ctx.restore()
}



function dirToDeg(dir){
    switch(dir){
        case Dir.Right:return 90;
        case Dir.Left:return -90;
        case Dir.Down:return 180;
        case Dir.Up:return 0;
    }
}
function flipDir(dir){
    switch(dir){
        case Dir.Right:return Dir.Left
        case Dir.Left:return Dir.Right
        case Dir.Up:return Dir.Down
        case Dir.Down:return Dir.Up
    }
}

//#endregion

if(!doDebug){
    debug.doQuickLoad=false
    debug.infKeys=false
    debug.nextFloor=false
    debug.showCoords=false
    debug.showInfo=false
    debug.showPortalId=false
    debug.changeFirstFloor=false
    debug.canShowCoords=false
    debug.clickTele=false
}

var move=false
function setMovement(bool){
    if(bool){
        if(!move){
            move=setInterval(player.move,60)
            Clock1.resume()
        }
    }else{
        clearInterval(move)
        move=false
        Clock1.pause()
    }
}
function animate(){
    requestAnimationFrame(animate)
    drawAll()
}
boardInit();
var move=setInterval(()=>{player.move()},60);
animate()

//#region console

var ec=new Merged(HTML.midbar,debug.externalConsole)
var consoleFocused=false

ec.addCommand('tell',(...strs)=>{tell(strs.join(' '))},'t','Pops up a tell window with the words after as the content')

ec.addCommand('key',(type,n=1)=>{
    if(!isNaN(n)){
        var i=new Item(type+' Key',n)
        player.addItem(i)
        ec.setOutput('Added '+i.toString()+' to player')
    }else
        ec.error('Invalid Number: '+n)
},'k','Adds a type of key to the player, and has optional amount of keys',1,2)

ec.addCommand('armor',(n)=>{
    (!isNaN(n))?ec.setOutput('Added '+((player.armor+=Number(n)))+' armor to player'):
        ec.error('Invalid Number: '+n)
},'ar','Gives armor to the player, which has no use currently',1)

ec.addCommand('teleport',(x,y)=>{
    (player.setPosition(x,y)===false)?ec.error("Invalid positioning of "+x+','+y):ec.setOutput('Teleported to '+x+','+y)
},'tp','Teleports the player to an x and y coordinate',2)

ec.addCommand('togglecoords',()=>{
    ec.setOutput('Set show coords to '+(debug.showCoords=!debug.showCoords))},'tc','Shows the coordinates',0)

ec.addCommand('loadArea',(area,x,y)=>{Area.load(area);if(x!==undefined&&y!==undefined)player.setPosition(x,y)},
        'la','Loads an area and optionally sets player position',1,3)

ec.addCommand('item',(name,n=1)=>{player.addItem(new Item(name,n))},'i','Gives the player an item',1,2)

document.addEventListener('consoleFocus',()=>{consoleFocused=true})
document.addEventListener('consoleBlur',()=>{consoleFocused=false})

function toggleConsole(){(ec.isVisible)?ec.hide():ec.show()}

//#endregion
