/*
This is all the floors in game and some of the functions related to making floors
*/

var mapX=0,mapY=0
/**@type {Area[]} */
var areas=[]
/**@type {String} */
var curAreaRef='0,0'
/**@type {Area} */
var curArea

class Area{
    constructor(ref,width=9,height=9){
        if(Area.get(ref)!==undefined)
            throw new Error('Area with ref '+ref+' is already defined')
        this.map=setFloorAs(Tn.Path,width,height)
        /**@type {Entity[]} */
        this.entities=[]
        this.ref=ref
        areas.push(this)
        this.width=width
        this.height=height

        var y=~~(this.map.length/2),
            x=~~(this.map[0].length/2)

        /**This is a single x and y for the general center of the area */
        this.center=v(x,y)

        //Make into array of points
        if(this.width%2===0)x=[x-1,x]
        else x=[x]
        if(this.height%2===0)y=[y-1,y]
        else y=[y]

        /**If even width or height, this accounts for both center locations */
        this.centerPts=v(x,y)
    }
    /**Adds a direction based load tile  */
    dir(dir,x,y,nx,ny){
        var sp=this.ref.split(',')
        var mx=(dir===Dir.Right)?Number(sp[0])+1:(dir===Dir.Left)?Number(sp[0])-1:sp[0],
                my=(dir===Dir.Up)?Number(sp[1])+1:(dir===Dir.Down)?Number(sp[1])-1:sp[1]
        this.tile(x,y,Tn.Load(mx+','+my,nx,ny))
        return this
    }
    tile(x=[],y=[],type=Tn.Path){
        if(Array.isArray(x)){
            if(Array.isArray(y))
                for(let i=0;i<x.length;i++)
                    this.map[y[i]][x[i]]=tCopy(type);
            else
                for(let i=0;i<x.length;i++)
                    this.map[y][x[i]]=tCopy(type);
        }else if(Array.isArray(y))
            for(let i=0;i<y.length;i++)
                this.map[y[i]][x]=tCopy(type);
        else
            this.map[y][x]=tCopy(type);
        return this
    }
    addEnt(...ents){
        flatten(ents).forEach(ent=>{
            this.entities.push(ent)
        })
        return this
    }
    setAll(type){
        this.map.forEach(ele=>{
            for(let i=0;i<ele.length;i++)
                ele[i]=tCopy(type)
        })
        return this
    }
    setBorder(type){
        for(let i=0;i<this.map.length;i++)
            for(let j=0;j<this.map[0].length;j++)
                if(j===0||j===this.map[0].length-1||i===0||i===this.map.length-1)
                    this.tile(j,i,type)
        return this
    }
    /**@returns {Area|undefined} */
    static get(ref){
        return areas.find(area=>area.ref===ref)
    }
    static load(ref){
        var a=Area.get(ref)
        if(a!==undefined){
            //Because I set them like this, it is the same object
            //  This means changes to one affects the other
            entities=a.entities
            board=a.map
            curAreaRef=a.ref
            curArea=a
        }
    }
    loadCenter(ref,dir,nx,ny){
        var a=Area.get(ref)
        if(a!==undefined){
            var xs,ys
            if(dir===Dir.Down){
                xs=this.centerPts.x
                ys=this.map.length-1
            }else if(dir===Dir.Up){
                xs=this.centerPts.x
                ys=0
            }else if(dir===Dir.Right){
                xs=this.map[0].length-1
                ys=this.centerPts.y
            }else if(dir===Dir.Left){
                xs=0
                ys=this.centerPts.y
            }
            var refChange=1
            if(Array.isArray(xs)&&xs.length===2){
                if(a.centerPts.x.length===1)
                    refChange=0
                if(dir===Dir.Up){
                    this.tile(xs[0],ys,Tn.Load(ref,nx-refChange,ny))
                    this.tile(xs[1],ys,Tn.Load(ref,nx,ny))
                }else if(dir===Dir.Down){
                    this.tile(xs[0],ys,Tn.Load(ref,nx-refChange,ny))
                    this.tile(xs[1],ys,Tn.Load(ref,nx,ny))
                }
            }else if(Array.isArray(ys)&&ys.length===2){
                if(a.centerPts.y.length===1)
                    refChange=0
                if(dir===Dir.Right){
                    this.tile(xs,ys[0],Tn.Load(ref,nx,ny-refChange))
                    this.tile(xs,ys[1],Tn.Load(ref,nx,ny))
                }else if(dir===Dir.Left){
                    this.tile(xs,ys[0],Tn.Load(ref,nx,ny-refChange))
                    this.tile(xs,ys[1],Tn.Load(ref,nx,ny))
                }
            }else
                this.tile(xs,ys,Tn.Load(ref,nx,ny))
            return this
        }else return false
    }
    bindTo(ref,dir){
        Area.bindAreas(this.ref,ref,dir)
        return this
    }
    /**In code descritption of what area it is */
    desc(str){this.description=str;return this}
    static bindAreas(ref1,ref2,dir){
        var a1=Area.get(ref1),
            a2=Area.get(ref2)
        if(a1!==undefined&&a2!==undefined){
            //1 is ref2 loc spawn 2 is ref1 loc spawn
            var x1,x2,y1,y2
            if(dir===Dir.Up){
                x1=a2.center.x
                y1=a2.height-2
                x2=a1.center.x
                y2=1
            }else if(dir===Dir.Down){
                x1=a2.center.x
                y1=1
                x2=a1.center.x
                y2=a1.height-2
            }else if(dir===Dir.Right){
                x1=1
                y1=a2.center.y
                x2=a1.width-2
                y2=a1.center.y
            }else if(dir===Dir.Left){
                x1=a2.width-2
                y1=a2.center.y
                x2=1
                y2=a1.center.y
            }
            a1.loadCenter(ref2,dir,x1,y1)
            a2.loadCenter(ref1,flipDir(dir),x2,y2)
        }else return false
    }
    locks(xs,ys,keyType,tileUnder){
        this.tile(xs,ys,Tn.Lock(tCopy(tileUnder),keyType,()=>{
            curArea.tile(xs,ys,tCopy(tileUnder))
        }))
        return this
    }
}

class Building extends Area{
    constructor(ref,width,height,pCol=Colors.lightWood,wCol=Colors.darkWood){
        super(ref,width,height)
        this.setAll(Tn.Path(pCol))
        this.setBorder(Tn.Wall(wCol))
    }
}

//#region helper-functions

/**
 * @returns {object[][]} A new array of the value type
 * @param {string} type The value of all items in the new array
 * @param {number} width The width to make the array
 * @param {number} height The height to make the array
 */
function setFloorAs(type,width=9,height=9){
    let temp=[];
    for(let i=0;i<height;i++){
        temp[i]=[];
        for(let j=0;j<width;j++)
            tile(temp,j,i,type)
    }
    return temp;
}

/**
 * Sets the text of the help info to str. If -1 is passed in, will hide the element 
 * @param {string|false} str The string to make the help info, or hides it if false or nothing is passed in
 */
function setHelpInfo(str){
    var ele=HTML.help
    if(!str)
        ele.hidden=true;
    else{
        ele.textContent=str
        ele.hidden=false;
    }
}

/**Takes either a function or a premade tile */
function tCopy(type){
    var ret
    if(typeof type==='function')
        ret= Object.create(type())
    else 
        ret=Object.create(type)
    if(typeof ret.color==='object')
        ret.color=Object.create(ret.color)
    return ret
}

/**
 * Changes the x and y's of arr to be the type
 * @param {object[][]} arr The array to edit
 * @param {number|number[]} x The value(s) of x that you want the tiles to be
 * @param {number|number[]} y The value(s) of y that you want the tiles to be
 * @param {object} type The type from the var Tn. Defaults to Tn.Path
 * @example tile(temp,0,[1,2,3],Tn.Wall) //sets (0,1) (0,2) (0,3) to Tn.Wall
 * @example tile(temp,[1,2],[3,4],Tn.Lava) // sets (1,3) && (2,4) to Tn.Lava
 */
function tile(arr=[[]],x=[],y=[],type=Tn.Path){
    if(Array.isArray(x)){
  	    if(Array.isArray(y))
            for(let i=0;i<x.length;i++)
                //Goes through using each x and y as a pair, meaning they are all points
      	        arr[y[i]][x[i]]=tCopy(type);
        else
            for(let i=0;i<x.length;i++)
                //Means that y is constant so all x's are at that y 
      	        arr[y][x[i]]=tCopy(type);
    }else if(Array.isArray(y))
        for(let i=0;i<y.length;i++)
            //Means the x is constant and so all y's go at that x
    	    arr[y[i]][x]=tCopy(type);
    else
        //Two constants passed in so it's just one point
  	    arr[y][x]=tCopy(type);
}

/**
 * Adds two way portals at p1 and p2 with the id passed in
 * @param {object[][]} arr The array to add to
 * @param {number[]} p1 [x,y] of the first portal, i.e Portal A 
 * @param {number[]} p2 [x,y] of the second portal, i.e Portal B
 * @param {number} id The id of the portals to link them together 
 */
function portals(arr,p1,p2,id=nextId("portal")){
    arr[p1[1]][p1[0]]=Tn.Portal('A',id);
    arr[p2[1]][p2[0]]=Tn.Portal('B',id);
}

/**Short for array range. Makes an array with numbers from start-end */
function aR(start,end){
    var index=0,arr=[];
    for(let i=start;(start<end)?(i<end+1):(i>end-1);(start<end)?(i++):(i--))
        arr[index++]=i
    return arr;
}
//#endregion