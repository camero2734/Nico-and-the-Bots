module.exports = async function (bgURL, fgURL, topLeft, topRight, botLeft, botRight, bgIsLocal, fgIsLocal) {

    try {
        const { createCanvas, loadImage, Image, registerFont } = require('canvas');
        const snekfetch = require("snekfetch");

        let bgBuffer = bgIsLocal ? bgURL : (await snekfetch.get(bgURL)).body;
        let fgBuffer = fgIsLocal ? fgURL : (await snekfetch.get(fgURL)).body;
    
        let bg = new Image();
        let fg = new Image();
        bg.src = bgBuffer;
        fg.src = fgBuffer;
    
        let canvas = createCanvas(bg.width, bg.height);
        let ctx = canvas.getContext("2d");
    
        ctx.drawImage(bg, 0, 0);
    
        let total = fg.width;
        for (let i = 0; i < total; i += 0.2) {
            let percent = (i) / total;
            let startPoint = percentLinePoint(topLeft, topRight, percent);
            let endPoint = percentLinePoint(botLeft, botRight, percent);
    
            ctx.save();
            ctx.translate(startPoint.x, startPoint.y);
            let angle = -Math.PI / 2 + getAngle(startPoint, endPoint);
            if (angle <= -Math.PI / 2) angle += Math.PI;
            ctx.rotate(angle);
            ctx.drawImage(fg, i, 0, 1, fg.height, 0, 0, 1, distance(startPoint, endPoint));
            ctx.restore();
        }
        return canvas.toBuffer();
    } catch (err) {
        console.log(err);
        return undefined;
    }

    function percentLinePoint(p1, p2, percent) {
        let newX = (p2.x - p1.x) * percent + p1.x;
        let newY = ((p2.y - p1.y) / (p2.x - p1.x)) * (newX - p1.x) + p1.y;
        return { x: newX, y: newY };
    }

    function getAngle(p1, p2) {
        let delY = p2.y - p1.y;
        let delX = p2.x - p1.x;
        return Math.atan(delY / delX);
    }

    function distance(p1, p2) {
        let delY = p2.y - p1.y;
        let delX = p2.x - p1.x;
        return Math.sqrt(delY * delY + delX * delX);
    }
}