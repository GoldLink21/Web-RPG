if(!doDebug)
    dialogue('Use arrow keys or wasd to move. Use the spacebar to interact with things',
    'You can also click enter to close or advance text')

var a=new Building('0,0',9,9)
    .desc("Starting area")
    .dir(Dir.Right,8,4,1,4)
    .addEnt(new MovingEntity(new Path(false,v(7,1),v(5,3),v(7,1)),{onInteract:(t)=>{t.tell("I'm a dude. No. The Dude.")},name:'The Dude'}))
    .tile([5,6,6,7],[3,3,2,2],Tn.NoRock(Colors.lightWood))
    .addEnt(new Sign(4,4,'Hi there','How are you?'))
var chest=new Chest(3,2,new Item('A'),new Item('B',3),new Item('C'),new Item('D',4))
//chest.addTo('0,0')

Area.load('0,0')
player.setPosition(1,1)

new Area('1,0',9,8)
    .desc("Outer grass area")
    .setAll(Tn.Grass)
    .bindTo('0,0',Dir.Left)
    .tile(4,6,Tn.Rock(Tn.Grass()))
    .addEnt(fenceSm(3,5,[Dir.Right,Dir.Down]))
    .addEnt(fenceSm(4,5,[Dir.Right,Dir.Left]))
    .addEnt(fenceSm(5,5,[Dir.Left,Dir.Down]))
    .addEnt(fenceSm(3,6,[Dir.Down,Dir.Up]))
    .addEnt(fenceSm(5,6,[Dir.Up,Dir.Down]))
    .locks(7,[3,4],'Golden',Tn.Grass)
    .tile(8,[2,5],Tn.Wall().tower(17))
    .addEnt(new Sign(4,7,'This is an old statue'))
    
new Area('2,0',8,4)
    .desc("Friend Entrance and Guard")
    .setAll(Tn.Grass)
    .bindTo('1,0',Dir.Left)
    .addEnt(new Sign(2,0,'A house'))
    .tile(7,[0,3],Tn.Wall().tower(3))
    .locks(6,[1,2],'Not an item',Tn.Grass)
    .addEnt(new TakeEntity(6,3,()=>{b(6,1,b(6,1).tileUnder);b(6,2,b(6,2).tileUnder)},{name:"Guard",color:'grey',
        beforeTxt:"By orders of the king, no one may pass. Maybe if you brought me somthing fancy, I'd let you through"}
        ,new Item('Fancy Mask')))
    

new Building('1,1',5,7)
    .desc("Holds first key")
    .bindTo('1,0',Dir.Down)
    //.tile(2,4,Tn.Load('1,0',parseInt(Area.get('1,0').map[0].length/2),1))
    .addEnt(keyChest(2,1,'Golden'))


new Building('-1,0',6,6)
    .desc("Trade for mask")
    .bindTo('0,0',Dir.Right)
    //.addEnt(new GiveEntity(1,1,{width:16,height:16,color:'green',name:'Bob'},new Item('I1',2),new Item('I2')))
    .addEnt(new TakeEntity(1,1,()=>{player.tellGive(new Item('Fancy Mask'))},{
        beforeTxt:'I just love ping-pong! I could play all day if I wanted. Sadly my paddle broke though.',
        giveTxt:'Woah, really? Thanks a ton!',
        afterTxt:'Thanks again for the paddle',name:'Bro'},
        new Item('Lucky Paddle')))

new Building('2,1',7,5)
    .desc("Friend gives paddle")
    .bindTo('2,0',Dir.Down)
    .addEnt(new Entity(3,1,15,15,'green',{name:'Buddy',onInteract:(t)=>{
        var i=new Item('Lucky Paddle')
        t.tell('Hey, long time no see. I got you a gift awhile back, so go on and take it now',undefined,()=>{tell(i.getText)})
        player.addItem(i)
        t.onInteract=()=>{t.tell('I already gave you the '+i.name)}
    }}))

new Area('3,0',3,1)
    .bindTo('2,0',Dir.Left)
    .addEnt(new Sign(2,0,'Good job on finishing the demo!','There is much more to come, but this is all I have for now'))
    