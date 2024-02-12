import { Injectable } from '@angular/core';
import { Module, StuffModule } from '../models/module.model';
import { Pixel} from '../models/pixel.model';
import { CodewordBlock, StuffCodeword } from '../models/codeword.model';
import { ImageLayer } from '../models/layer.model';
import { Generator } from '../generator.component';
import { fromEvent } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DrawService {

    public static readonly TOLERANCE:number = 0.000001;
       
    public static tolerate (num: number): number {
        let roundNum = Math.round(num);
        let diff = Math.abs(roundNum - num);
        if (diff > DrawService.TOLERANCE) {
            return num;
        } else {
            return roundNum;
        }
    }

    public static isEqual (val1: number, val2: number): boolean {
        if (Math.abs(val1 - val2) < DrawService.TOLERANCE) {
            return true;
        } else {
            return false;
        }
    }

    public static isGreater (val1: number, val2: number): boolean {
        if (DrawService.isEqual(val1, val2)) {
            return false;
        } else if (val1 > val2) {
            return true;
        } else if (val1 < val2) {
            return false;
        }
        return undefined;
    }

    public static isGreaterOrEqual (val1: number, val2: number): boolean {
        if (DrawService.isEqual(val1, val2)) {
            return true;
        } else if (val1 > val2) {
            return true;
        } else if (val1 < val2) {
            return false;
        }
        return undefined;
    }

    public static isLesser (val1: number, val2: number): boolean {
        if (DrawService.isEqual(val1, val2)) {
            return false;
        } else if (val1 > val2) {
            return false;
        } else if (val1 < val2) {
            return true;
        }
        return undefined;
    }

    public static isLesserOrEqual (val1: number, val2: number): boolean {
        if (DrawService.isEqual(val1, val2)) {
            return true;
        } else if (val1 > val2) {
            return false;
        } else if (val1 < val2) {
            return true;
        }
        return undefined;
    }

    static manageDrawEvents (generator: Generator): void {
        let isMouseDown: boolean = false;
        let isMouseOverMenu: boolean = false;
        let coord: Coord = new Coord(undefined, undefined);
        let prevCoord: Coord = new Coord(undefined, undefined);
        fromEvent(document, 'mousedown').subscribe((e: MouseEvent) => {
            if (isMouseOverMenu) return;
            isMouseDown = true;
            if (generator.drawMode !== 'drag') {
                this.draw(generator, coord);
                this.drawCursor(generator, coord, prevCoord);
            } else {
                this.drag(generator, coord, prevCoord, isMouseDown);
            }
            generator.printCoord(coord);
        });
        fromEvent(document, 'mousemove').subscribe((e: MouseEvent) => {
            if (isMouseOverMenu) return;
            prevCoord.x = coord.x;
            prevCoord.y = coord.y;
            coord = this.getCoord(e, generator);
            if (coord.x === prevCoord.x && coord.y === prevCoord.y) return;
            if (generator.drawMode !== 'drag') {
                if (isMouseDown) {
                    this.draw(generator, coord);
                }
                this.drawCursor(generator, coord, prevCoord);
            } else {
                this.drag(generator, coord, prevCoord, isMouseDown);
            }
            generator.printCoord(coord);
        });
        fromEvent(document, 'mouseup').subscribe(() => {
            isMouseDown = false;
            if (generator.drawMode === 'drag') {
                this.drag(generator, coord, prevCoord, isMouseDown);
            }
        });
        fromEvent(generator.menu.nativeElement, 'mouseenter').subscribe(() => {
            isMouseOverMenu = true;
        });
        fromEvent(generator.menu.nativeElement, 'mouseleave').subscribe(() => {
            isMouseOverMenu = false;
        });
    }
    
    private static getCoord (e: MouseEvent, generator: Generator): Coord {
        const rect: ClientRect = generator.ctx.canvas.getBoundingClientRect();
        let x: number = e.clientX - rect.left - generator.ctx.canvas.width / 2;
        let y: number = e.clientY - rect.top - generator.ctx.canvas.height / 2;
        let xRotated: number = x * Math.cos((-generator.rotation * Math.PI) / 180) - y * Math.sin((-generator.rotation * Math.PI) / 180);
        let yRotated: number = x * Math.sin((-generator.rotation * Math.PI) / 180) + y * Math.cos((-generator.rotation * Math.PI) / 180);
        let xTranslated: number = xRotated + generator.ctx.canvas.width / 2;
        let yTranslated: number = yRotated + generator.ctx.canvas.height / 2;
        let xScaled: number = xTranslated / generator.scale;
        let yScaled: number = yTranslated / generator.scale;
        let xSubdivided: number;
        let ySubdivided: number;
        if ((generator.project.subdivision + generator.project.dotSize) % 2 == 0 || generator.project.subdivision == 1) {
            xSubdivided = Math.floor(xScaled * generator.project.subdivision) / generator.project.subdivision;
            ySubdivided = Math.floor(yScaled * generator.project.subdivision) / generator.project.subdivision;
        } else {
            xSubdivided = Math.round(xScaled * generator.project.subdivision) / generator.project.subdivision - 1 / (generator.project.subdivision * 2);
            ySubdivided = Math.round(yScaled * generator.project.subdivision) / generator.project.subdivision - 1 / (generator.project.subdivision * 2);
        }
        return new Coord(xSubdivided, ySubdivided);
    }

    private static draw (generator: Generator, coord: Coord): void {
        let subdivision: number = generator.project.subdivision;
        let xMin: number = coord.x - generator.brushSize / subdivision;
        xMin = xMin < 0 ? 0 : xMin;
        let yMin: number = coord.y - generator.brushSize / subdivision;
        yMin = yMin < 0 ? 0 : yMin;
        let xMax: number = DrawService.tolerate(coord.x + (generator.brushSize + 1) / subdivision);
        xMax = xMax > generator.project.matrix.length ? generator.project.matrix.length: xMax;
        let yMax: number = DrawService.tolerate(coord.y + (generator.brushSize + 1) / subdivision);
        yMax = yMax > generator.project.matrix.length ? generator.project.matrix.length: yMax;
        let codewords: StuffCodeword[] = [];
        for (let ix: number = xMin; DrawService.isLesser(ix, xMax); ix = DrawService.tolerate(ix + 1 / subdivision)) {
            for (let iy: number = yMin; DrawService.isLesser(iy, yMax);  iy = DrawService.tolerate(iy + 1 / subdivision)) {
                let tempCoord: Coord = new Coord(ix, iy);
                this.collectCodewordsForDraw(generator, tempCoord, codewords);
                this.editImage(generator, tempCoord);
            }
        }
        this.regenCodewords(codewords);
        generator.printValid();
    }

    private static drawCursor (generator: Generator, coord: Coord, prevCoord: Coord): void {
        if (prevCoord !== undefined && prevCoord.x !== undefined && prevCoord.y !== undefined) {
            let xMin: number = Math.floor(prevCoord.x - generator.brushSize - 1);
            xMin = xMin < 0 ? 0 : xMin;
            let yMin: number = Math.floor(prevCoord.y - generator.brushSize - 1);
            yMin = yMin < 0 ? 0 : yMin;
            let xMax: number = Math.floor(prevCoord.x + generator.brushSize + 2);
            xMax = xMax > generator.project.matrix.length ? generator.project.matrix.length : xMax;
            let yMax: number = Math.floor(prevCoord.y + generator.brushSize + 2);
            yMax = yMax > generator.project.matrix.length ? generator.project.matrix.length : yMax; 
            for (let ix: number = xMin; ix < xMax; ix++) {
                for (let iy: number = yMin; iy < yMax; iy++) {
                    generator.project.matrix[ix][iy].draw(generator, new Coord(ix, iy));
                }
            }
        }
        let subdivision: number = generator.project.subdivision;
        let xMin: number = DrawService.tolerate(coord.x - generator.brushSize / subdivision);
        xMin = xMin < 0 ? 0 : xMin;
        let yMin: number = DrawService.tolerate(coord.y - generator.brushSize / subdivision);
        yMin = yMin < 0 ? 0 : yMin;
        let xMax: number = DrawService.tolerate(coord.x + (generator.brushSize + 1) / subdivision);
        xMax = xMax > generator.project.matrix.length ? generator.project.matrix.length : xMax;
        let yMax: number = DrawService.tolerate(coord.y + (generator.brushSize + 1) / subdivision);
        yMax = yMax > generator.project.matrix.length ? generator.project.matrix.length : yMax;
        for (let ix: number = xMin; DrawService.isLesser(ix, xMax); ix = DrawService.tolerate(ix + 1 / subdivision)) {
            for (let iy: number = yMin; DrawService.isLesser(iy, yMax); iy = DrawService.tolerate(iy + 1 / subdivision)) {
                this.drawCursorBit(generator, new Coord(ix, iy));
            }
        }
    }
    
    private static drag (generator: Generator, coord: Coord, prevCoord: Coord, isMouseDown: boolean): void {
        let image: ImageLayer = generator.project.images[0];
        if (image === undefined || image.matrix === undefined || coord.x < 0 || coord.y < 0 ||
            coord.x >= generator.project.matrix.length || coord.y >= generator.project.matrix[0].length
        ) return;
        let pixel: Pixel = generator.project.matrix[Math.floor(coord.x)][Math.floor(coord.y)].getPixel(generator, coord);
        if (pixel === undefined || pixel.getValue() === undefined) {
            generator.setCursor('auto');
        } else {
            generator.setCursor('grab');
        }
        let prevPixel: Pixel = generator.project.matrix[Math.floor(coord.x)][Math.floor(coord.y)].getPixel(generator, coord);  
        if (isMouseDown && prevPixel !== undefined) {
            generator.setCursor('grabbing');
            let codewords: StuffCodeword[] = [];
            this.collectCodewords(generator, codewords);
            image.origin.x = DrawService.tolerate(image.origin.x + coord.x - prevCoord.x);
            image.origin.y = DrawService.tolerate(image.origin.y + coord.y - prevCoord.y);
            this.collectCodewords(generator, codewords);
            this.regenCodewords(codewords);
            this.redrawAll(generator);
            generator.printValid();
            console.debug('image', generator.project.images[0]);
        }
    }

    private static drawCursorBit (generator: Generator, coord: Coord): void {
        let bgColor: string;
        let fgColor: string;
        let floorCoord: Coord = new Coord(Math.floor(coord.x), Math.floor(coord.y));
        if (generator.drawMode === 'black') {
            if (generator.project.matrix[floorCoord.x][floorCoord.y].isSafe(generator, coord)) {
                fgColor = Color.BLUE;
                bgColor = Color.LIGHT_BLUE;
            } else {
                fgColor = Color.RED;
                bgColor = Color.LIGHT_RED;
            }
        } else if (generator.drawMode === 'white') {
            if (generator.project.matrix[floorCoord.x][floorCoord.y].isSafe(generator, coord)) {
                fgColor = Color.LIGHT_BLUE;
                bgColor = Color.BLUE;
            } else {
                fgColor = Color.LIGHT_RED;
                bgColor = Color.RED;
            }
        } else if (generator.drawMode === 'erase') {
            if (generator.project.matrix[floorCoord.x][floorCoord.y].getValue(generator.project.maskNo)) {
                if (generator.project.matrix[floorCoord.x][floorCoord.y].isSafe(generator, coord)) {
                    fgColor = Color.BLACK
                    bgColor = Color.LIGHT_BLUE;
                } else {
                    fgColor = Color.GREY;
                    bgColor = Color.LIGHT_RED;
                }
            } else {
                if (generator.project.matrix[floorCoord.x][floorCoord.y].isSafe(generator, coord)) {
                    fgColor = Color.WHITE;
                    bgColor = Color.BLUE;
                } else {
                    fgColor = Color.LIGHT_GREY;
                    bgColor = Color.RED;
                }
            }
        }
        generator.ctx.fillStyle = bgColor;
        generator.ctx.fillRect(coord.x * generator.scale, coord.y * generator.scale, 
            generator.scale / generator.project.subdivision, generator.scale / generator.project.subdivision);
        generator.ctx.fillStyle = fgColor;
        generator.ctx.fillRect(coord.x * generator.scale + 2, coord.y * generator.scale + 2, 
            generator.scale / generator.project.subdivision - 4, generator.scale / generator.project.subdivision - 4);
    }

    private static editImage (generator: Generator, coord: Coord): void {
        let image: ImageLayer =  generator.project.images[0];
        let subdivision: number = generator.project.subdivision;
        if (generator.drawMode === 'erase') {
            if (image.matrix === undefined ||
                DrawService.isLesser(coord.x, image.origin.x) ||
                DrawService.isGreaterOrEqual(coord.x, image.origin.x + image.matrix.length / subdivision) || 
                DrawService.isLesser(coord.y, image.origin.y) || 
                DrawService.isGreaterOrEqual(coord.y, image.origin.y + image.matrix[0].length / subdivision)) return;
            if (image.matrix.length <= 1 && image.matrix[0].length <= 1) {
                image.matrix = undefined;
                image.origin = undefined;
            } else {
                image.matrix[DrawService.tolerate((coord.x - image.origin.x) * subdivision)]
                            [DrawService.tolerate((coord.y - image.origin.y) * subdivision)].value = undefined;
                if (DrawService.isEqual(coord.x * subdivision, image.origin.x * subdivision)) {
                    while (image.matrix[0].every(x => x.value === undefined)) {
                        image.origin.x = DrawService.tolerate(image.origin.x + 1 / subdivision);
                        image.matrix.shift();
                    }
                } else if (DrawService.isEqual(coord.x * subdivision, image.origin.x * subdivision + image.matrix.length - 1)) {
                    while (image.matrix[image.matrix.length - 1].every(x => x.value === undefined)) {
                        image.matrix.pop();
                    }
                }
                if (DrawService.isEqual(coord.y * subdivision, image.origin.y * subdivision)) {
                    while (image.matrix.every(x => x[0].value === undefined)) {
                        image.origin.y = DrawService.tolerate(image.origin.y + 1 / subdivision);
                        image.matrix.forEach(x => x.shift());
                    }
                } else if (DrawService.isEqual(coord.y * subdivision, image.origin.y * subdivision + image.matrix.length - 1)) {
                    while (image.matrix.every(x => x[image.matrix[0].length - 1].value === undefined)) {
                        image.matrix.forEach(x => x.pop());
                    }
                }
            }
        } else if (image.matrix === undefined) {
            image.origin = coord;
            if (generator.drawMode === 'black') {
                image.matrix = [[new Pixel(true)]];
            } else if (generator.drawMode === 'white') {
                image.matrix = [[new Pixel(false)]];
            }
        } else {
            let emptyImageBit: Pixel = new Pixel();
            if (DrawService.isLesser(coord.x, image.origin.x)) {
                let xMax: number = DrawService.tolerate((image.origin.x - coord.x) * subdivision);
                for (let x: number = 0; x < xMax; x++) {
                    image.matrix.unshift(new Array<Pixel>(image.matrix[0].length).fill(emptyImageBit));
                }
                image.origin.x = coord.x;
            } else if (DrawService.isGreaterOrEqual(coord.x * subdivision, image.origin.x * subdivision + image.matrix.length)) {
                let xMin: number = DrawService.tolerate(image.origin.x * subdivision + image.matrix.length);
                let xMax: number = DrawService.tolerate(coord.x * subdivision) + 1;
                for (let x: number = xMin; x < xMax; x++) {
                    image.matrix.push(new Array<Pixel>(image.matrix[0].length).fill(emptyImageBit));
                }
            }
            if (DrawService.isLesser(coord.y, image.origin.y)) {
                let yMax: number = DrawService.tolerate((image.origin.y - coord.y) * subdivision);
                for (let x: number = 0; x < image.matrix.length; x++) {
                    for (let y: number = 0; y < yMax; y++) {
                        image.matrix[x].unshift(emptyImageBit);
                    }
                }
                image.origin.y = coord.y;
            } else if (DrawService.isGreaterOrEqual(coord.y * subdivision, image.origin.y * subdivision + image.matrix[0].length)) {
                let yMin: number = DrawService.tolerate(image.origin.y * subdivision + image.matrix[0].length);
                let yMax: number = DrawService.tolerate(coord.y * subdivision) + 1;
                for (let x: number = 0; x < image.matrix.length; x++) {
                    for (let y: number = yMin; y < yMax; y++) {
                        image.matrix[x].push(emptyImageBit);
                    }
                }
            }
            if (generator.drawMode === 'black') {
                image.matrix[DrawService.tolerate((coord.x - image.origin.x) * subdivision)]
                            [DrawService.tolerate((coord.y - image.origin.y) * subdivision)] = new Pixel(true);
            } else if (generator.drawMode === 'white') {
                image.matrix[DrawService.tolerate((coord.x - image.origin.x) * subdivision)]
                            [DrawService.tolerate((coord.y - image.origin.y) * subdivision)] = new Pixel(false);
            }
        }
        generator.project.images[0] = image;
    }

    private static collectCodewordsForDraw (generator: Generator, coord: Coord, codewords: StuffCodeword[]): void {
        let baseBit = generator.project.matrix[Math.floor(coord.x)][Math.floor(coord.y)];
        if (!(baseBit instanceof StuffModule)) return;
        let stuffBit: StuffModule = <StuffModule>baseBit;
        if (!stuffBit.isDot(generator, coord)) return;
        let newBitValue: boolean;
        if (generator.drawMode === "black") {
            newBitValue = true;
        } else if (generator.drawMode === "white") {
            newBitValue = false;
        } else if (generator.drawMode === "erase"){
            newBitValue = generator.project.matrix[Math.floor(coord.x)][Math.floor(coord.y)]
                          .getValue(generator.project.maskNo);
        }
        let oldbitVal: boolean = stuffBit.getImageValue(generator);
        if (oldbitVal === newBitValue) return;
        if (codewords.indexOf(stuffBit.codeword) === -1) {
            codewords.push(stuffBit.codeword);
        }       
    }

    static collectCodewords (generator: Generator, codewords: StuffCodeword[]): void {
        let image: ImageLayer = generator.project.images[0];
        let bezel: number = generator.project.bezel;
        let subdivision: number = generator.project.subdivision;
        if (image === undefined || image.matrix === undefined || image.origin === undefined) return;
        let xMin: number = image.origin.x < bezel ? bezel : image.origin.x;
        let yMin: number = image.origin.y < bezel ? bezel : image.origin.y;
        let xMax: number = image.origin.x + image.matrix.length / subdivision;
        xMax = xMax > generator.project.matrix.length - bezel ? generator.project.matrix.length - bezel : xMax;
        let yMax: number = image.origin.y + image.matrix[0].length / subdivision;
        yMax = yMax > generator.project.matrix[0].length - bezel ? generator.project.matrix[0].length - bezel : yMax;
        xMin = Math.floor(xMin);
        yMin = Math.floor(yMin);
        xMax = Math.ceil(xMax);
        yMax = Math.ceil(yMax);
        for (let ix: number = xMin; ix < xMax; ix++) {
            for (let iy: number = yMin; iy < yMax; iy++) {
                let module: Module = generator.project.matrix[ix][iy];
                if (module instanceof StuffModule && 
                    module.getImageValue(generator) !== undefined) {
                    let stuffBit = <StuffModule>module;
                    if (codewords.indexOf(stuffBit.codeword) === -1) {
                        codewords.push(stuffBit.codeword);
                    }
                }
            }
        }
    }

    static regenCodewords (codewords: StuffCodeword[]) {
        if (codewords === undefined || codewords.length === 0) return;
        let blocks: CodewordBlock[] = [];
        codewords.forEach(c => {
            c.regenCodeword();
            if (blocks.indexOf(c.block) === -1) blocks.push(c.block);
        });
        console.debug("regenCodewords", codewords);
        blocks.forEach(b => b.regenCorrectionCodewords());
    }

    private static rotateContext (ctx: CanvasRenderingContext2D, rotation: number, canvasWidth: number): void {
        ctx.translate(canvasWidth / 2, canvasWidth / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-canvasWidth / 2, -canvasWidth / 2);
    }

    static redrawAll (generator: Generator): void {
        generator.ctx.canvas.width = generator.project.matrix.length * generator.scale;
        generator.ctx.canvas.height = generator.project.matrix.length * generator.scale;
        this.rotateContext(generator.ctx, generator.rotation, generator.project.matrix.length * generator.scale);
        for (let x: number = 0; x < generator.project.matrix.length; x++) {
            for (let y: number = 0; y < generator.project.matrix[x].length; y++) {
                generator.project.matrix[x][y].draw(generator, new Coord(x, y));
            }
        }
    }

    public static applyMask (maskNo: number, coord: Coord, value: boolean): boolean {
        let x: number = coord.x;
        let y: number = coord.y;
        switch (maskNo) {
            case 0: return ((x + y) % 2 == 0) !== value;
            case 1: return (y % 2 == 0) !== value;
            case 2: return (x % 3 == 0) !== value;
            case 3: return ((x + y) % 3 == 0) !== value;
            case 4: return ((Math.floor(y / 2) + Math.floor(x / 3)) % 2 == 0) !== value;
            case 5: return (((x * y) % 2) + ((x * y) % 3) == 0) !== value;
            case 6: return ((((x * y) % 2) + ((x * y) % 3)) % 2 == 0) !== value;
            case 7: return ((((x + y) % 2) + ((x * y) % 3)) % 2 == 0) !== value;
        }
        return undefined;
    }
}

export class Coord {

    constructor (public x: number, public y: number) { }
}

class ColorScheme {

    foreground: Color;
    background: Color;
}

export const enum Color {

    BLACK = '#000000',
    WHITE = '#FFFFFF',
    RED = '#c5002c',
    LIGHT_RED = '#ffaab3',
    GREEN = '#286d00',
    LIGHT_GREEN = '#5dff00', 
    BLUE = '#09008c',
    LIGHT_BLUE = '#95d4ff',
    YELLOW = '#FFFF00',
    CYAN = '#00FFFF',
    MAGENTA = '#FF00FF',
    GREY = '#404040',
    LIGHT_GREY = '#cdcdcd',
    DARK_GREY = '#404040',
    LIGHTYELLOW = '#FFFF99'
}
