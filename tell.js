function bt(str,onclickExtra=()=>{}){
    var btn=document.createElement('button')
    btn.innerHTML=str
    btn.addEventListener('click',()=>{
        onclickExtra()
        HTML.tell.style.display='none'
        setMovement(true)
    })
    return btn
}
function d(str,...btns){return{str:str,btns:btns}}
var t=[]

var hasNextDialogue=false

const tellFuncs={
    curDialogue:[],
    curDialogueIndex:0,
    setDialogue(...strs){
        var o=strs.map(e=>{return {str:e,speaker:undefined}})
        this.curDialogue=o
        this.curDialogueIndex=0
        this.next()
        return this
    },
    clearDialogue(){
        this.curDialogue=[]
        this.curDialogueIndex=0
        return this
    },
    setDialogueSpeaker(speaker,...strs){
        var o=strs.map(e=>{return {speaker:speaker,str:e}})
        this.curDialogue=o
        this.curDialogueIndex=0
        this.next()
        return this
    },
    addTxt(str,speaker){
        this.curDialogue.push({str:str,speaker:speaker})
        return this
    },
    /**Clicks the last element, which tends to be a button */
    close(){
        HTML.tell.lastChild.click()
        return this
    },
    hide(){
        HTML.tell.style.display='none'
        setMovement(true)
    },
    setSpeaker(speaker){
        var e=document.createElement('span')
        e.id='tellSpan'
        e.innerHTML='&emsp;'+speaker+'&emsp;'
        HTML.tell.firstElementChild.before(e)
        return this
    },
    isOpen:()=>(HTML.tell.style.display!=='none'),
    addButton(str='Okay',onclickExtra=()=>{}){
        var btn=document.createElement('button')
        btn.innerHTML=str
        btn.onclick=()=>{
            HTML.tell.style.display='none'
            setMovement(true)
            onclickExtra()
        }
        HTML.tell.appendChild(btn)
        return this
    },
    inventory(){
        var str=player.inventory.items.map(i=>i.toString()).join('<br>')
        if(str==='')
            str="Nothing"
        tell("<br>"+str,'Done','Inventory')
    },
    next(){
        //console.log(tell.curDialogue,tell.curDialogueIndex)
        var nxt=tell.curDialogue[tell.curDialogueIndex]
        if(tell.curDialogueIndex<tell.curDialogue.length-1){
            tell(nxt.str,'Next',nxt.speaker,tell.next)
            tell.curDialogueIndex++
        }else 
            tell(nxt.str,'Okay',nxt.speaker,()=>{tell.close();tellFuncs.clearDialogue()})
        return this;
    },
    noBtn(str,speaker){
        tell(str,undefined,speaker)
        HTML.tell.lastChild.remove()
    }
}


function tell(str='NoMesages',btnStr='Okay',speaker,onclickExtra=()=>{}){
    setMovement(false)
    /**@type {HTMLDivElement} */
    var t=HTML.tell
    t.innerHTML=''
    
    t.innerHTML+='<span style="left:0px">'+str+'</span><br>'
    if(speaker){
        tell.setSpeaker(speaker)
        //t.innerHTML+='<span id="tellSpan" style="text-align:left;border:1px solid black;width:auto;float:left">'+speaker+'</span><br><br>'
    }
    tell.addButton(btnStr,onclickExtra,true)
    t.style.display='block'
    return tellFuncs
}
Object.assign(tell,tellFuncs)

function dialogue(...strs){
    hasNextDialogue=true
    var funcs=[]
    for(let i=0;i<strs.length;i++)
        funcs.push(()=>{
            if(i===strs.length-1)
                hasNextDialogue=false;
            tell(strs[i],(i===strs.length-1)?undefined:'Next',undefined,funcs[i+1])
        })   
    tell(strs[0],(strs.length>1)?'Next':undefined,undefined,funcs[1])
}

function dialogueNamed(name,...strs){
    var funcs=[]
    for(let i=0;i<strs.length;i++)
        funcs.push(()=>{tell(strs[i],(i===strs.length-1)?undefined:'Next',name,funcs[i+1])})   
    tell(strs[0],(strs.length>1)?'Next':undefined,name,funcs[1])
}

/**Use await with this in an if statement to get a straight up true or false when clicking yes or no */
async function checkA(str,btnYes='yes',btnNo='no',onclickYes=()=>{},onclickNo=()=>{}){
    var t=HTML.tell
    return new Promise((resolve,reject)=>{
        setMovement(false)
        
        t.innerHTML=str
        t.appendChild(document.createElement('br'))
        var btnAcc=document.createElement('button')
        btnAcc.innerHTML=btnYes
        btnAcc.addEventListener('click',()=>{
            resolve(true)
        })

        t.appendChild(btnAcc)

        var btnDec=document.createElement('button')
        btnDec.innerHTML=btnNo
        btnDec.addEventListener('click',()=>{
            resolve(false)
        })
        t.appendChild(btnDec)
        t.style.display='block'        
    }).then(val=>{
        if(val)
            onclickYes()
        else 
            onclickNo()
        t.style.display='none'
        setMovement(true)
        return val
    })
}

function check(str='NoMesages',btnYes='Yes',btnNo='No',onclickYes=()=>{},onclickNo=()=>{},speaker){
    tell.setDialogueSpeaker(speaker,str)
    HTML.tell.lastChild.remove()
    tell.addButton(btnYes,onclickYes)
    tell.addButton(btnNo,onclickNo)
}