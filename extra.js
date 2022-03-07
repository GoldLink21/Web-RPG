const extra={
    goSpooky(){
        constDraw.push(()=>{
            ctx.resetTransform()
            ctx.fillStyle=new Col().A(0.5,1)
            ctx.fillRect(0,0,HTML.canvas.width,HTML.canvas.height)
        })
    },
    greyFilter(alpha){
        constDraw.push(()=>{
            ctx.resetTransform()
            ctx.fillStyle=new Col().A(alpha)
            ctx.fillRect(0,0,HTML.canvas.width,HTML.canvas.height)
        })
    },
    colorFilter(col){
        constDraw.push(()=>{
            ctx.resetTransform()
            ctx.fillStyle=col
            ctx.fillRect(0,0,HTML.canvas.width,HTML.canvas.height)
        })
    }
}