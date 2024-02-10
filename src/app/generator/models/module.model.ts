import { Generator } from '../generator.component';
import { StuffCodeword } from './codeword.model';
import { Coord, DrawService, Color } from '../services/draw.service';
import { ImageLayer } from './layer.model';
import { Pixel } from './pixel.model';

export class Module {
    
    safeBlack: Color = Color.BLACK;
    safeWhite: Color = Color.WHITE;
    riskBlack: Color = Color.DARK_GREY;
    riskWhite: Color = Color.LIGHT_GREY;

    isSafe (generator: Generator, coord: Coord): boolean {
        let size: number = generator.project.dotSize / generator.project.subdivision;
        let dist: number = (1 - size) / 2;
        return (DrawService.isLesser(coord.x % 1, dist) || 
            DrawService.isLesser(coord.y % 1, dist) ||
            DrawService.isGreaterOrEqual(coord.x % 1, dist + size) || 
            DrawService.isGreaterOrEqual(coord.y % 1, dist + size))
    }

    getValue (mask?: number, coord?: Coord): boolean {
        return false;
    }

    getImageValue (generator: Generator, coord: Coord): boolean {
        let image: ImageLayer = this.getModuleImage (generator, coord);
        let baseValue = this.getValue(generator.project.maskNo, coord);
        if (image === undefined) {
            return baseValue;
        } else {
            let value: number = 0;
            let min: number = (image.matrix.length - generator.project.dotSize) / 2;
            let max: number = min + generator.project.dotSize;
            for (let ix: number = min; DrawService.isLesser(ix, max); ix++) {
                for (let iy: number = min; DrawService.isLesser(iy, max); iy++) {
                    if (image.matrix[ix][iy].getValue() === undefined) {
                        value = value + (baseValue ? 1 : -1); 
                    } else if (image.matrix[ix][iy].getValue()) {
                        value ++;
                    } else if (!image.matrix[ix][iy].getValue()) {
                        value --;
                    }
                }
            }
            return value >= 0;
        }
    }

    draw (generator: Generator, coord: Coord): void {
        generator.ctx.fillStyle = this.getValue(generator.project.maskNo, coord) ? this.safeBlack : this.safeWhite;
        generator.ctx.fillRect(coord.x * generator.scale, coord.y * generator.scale, generator.scale, generator.scale);
        if (!generator.isPreview) {
            let dist: number = (generator.scale - generator.scale * generator.project.dotSize / generator.project.subdivision) / 2;
            let size: number = generator.scale * generator.project.dotSize / generator.project.subdivision;
            generator.ctx.fillStyle = this.getValue(generator.project.maskNo, coord) ? this.riskBlack : this.riskWhite;
            generator.ctx.fillRect(coord.x * generator.scale + dist, coord.y * generator.scale + dist, size, size);
        }
        this.drawImage(generator, coord);
    }

    drawImage (generator: Generator, coord: Coord): void {
        let moduleImage: ImageLayer = this.getModuleImage (generator, coord);
        if (moduleImage !== undefined) {
            moduleImage.draw(generator, this);
        }
    }

    getPixel (generator: Generator, coord: Coord): Pixel {
        let subdivision: number = generator.project.subdivision;
        let image: ImageLayer = generator.project.images[0];
        if (image !== undefined && image.matrix !== undefined && image.origin !== undefined &&
            DrawService.isGreaterOrEqual(coord.x, image.origin.x) &&
            DrawService.isGreaterOrEqual(coord.y, image.origin.y) &&
            DrawService.isLesser(coord.x * subdivision, image.origin.x * subdivision + image.matrix.length) &&
            DrawService.isLesser(coord.y * subdivision, image.origin.y * subdivision + image.matrix[0].length)
        ) {
            return image.matrix[DrawService.tolerate((coord.x - image.origin.x) * subdivision)]
                               [DrawService.tolerate((coord.y - image.origin.y) * subdivision)];
        }
        return undefined;
    }

    getModuleImage2 (generator: Generator, coord: Coord): ImageLayer {
        let image: ImageLayer = generator.project.images[0];
        let subdivision: number = generator.project.subdivision;
        if (image !== undefined && image.matrix !== undefined && image.origin !== undefined &&
            DrawService.isGreater(coord.x + 1, image.origin.x) &&
            DrawService.isGreater(coord.y + 1, image.origin.y) &&
            DrawService.isLesser(coord.x * subdivision, image.origin.x * subdivision + image.matrix.length) &&
            DrawService.isLesser(coord.y * subdivision, image.origin.y * subdivision + image.matrix[0].length)
        ) {
            let emptyPixel: Pixel = new Pixel();
            let subImage: ImageLayer = new ImageLayer("");
            subImage.origin = coord;
            subImage.matrix = new Array<Pixel>(subdivision).fill(emptyPixel)
                              .map(() => new Array<Pixel>(subdivision).fill(emptyPixel));
            let xMin: number = DrawService.tolerate((image.origin.x - coord.x) * subdivision);
            xMin = xMin < 0 ? 0 : xMin;
            let yMin: number = DrawService.tolerate((image.origin.y - coord.y) * subdivision);
            yMin = yMin < 0 ? 0 : yMin;
            let xMax: number = DrawService.tolerate(
                image.origin.x * subdivision + image.matrix.length - coord.x * subdivision);
            xMax = xMax > subdivision ? subdivision : xMax;
            let yMax: number = DrawService.tolerate(
                image.origin.y * subdivision + image.matrix[0].length - coord.y * subdivision);
            yMax = yMax > subdivision ? subdivision : yMax;

            for (let ix: number = xMin; ix < xMax; ix++) {
                for (let iy: number = yMin; iy < yMax; iy++) {
                    let tempCoord = new Coord(ix + DrawService.tolerate((coord.x - image.origin.x) * subdivision), 
                                              iy + DrawService.tolerate((coord.y - image.origin.y) * subdivision));
                    if (image.matrix[tempCoord.x][tempCoord.y] !== undefined && 
                        image.matrix[tempCoord.x][tempCoord.y].getValue() !== undefined
                    ) {
                        subImage.matrix[ix][iy] = image.matrix[tempCoord.x][tempCoord.y];
                    }
                }
            }
            console.info(subImage);
            return subImage;
        }
        return undefined;
    }

    getModuleImage (generator: Generator, coord: Coord): ImageLayer {
        let image: ImageLayer = generator.project.images[0];
        let subDiv: number = generator.project.subdivision;
        let dotSize: number = generator.project.dotSize;
        if (image !== undefined && image.matrix !== undefined && image.origin !== undefined &&
            DrawService.isGreater(coord.x + 1, image.origin.x) &&
            DrawService.isGreater(coord.y + 1, image.origin.y) &&
            DrawService.isLesser(coord.x * subDiv, image.origin.x * subDiv + image.matrix.length) &&
            DrawService.isLesser(coord.y * subDiv, image.origin.y * subDiv + image.matrix[0].length)
        ) {
            let emptyPixel: Pixel = new Pixel();
            let moduleImage: ImageLayer = new ImageLayer("");
            if ((subDiv + dotSize) % 2 === 0) {
                moduleImage.origin = coord;
                moduleImage.matrix = new Array<Pixel>(subDiv).fill(emptyPixel)
                                  .map(() => new Array<Pixel>(subDiv).fill(emptyPixel));
            } else {
                let dist: number = 1 / (subDiv * 2);
                moduleImage.origin = new Coord(coord.x - dist, coord.y - dist);
                moduleImage.matrix = new Array<Pixel>(subDiv + 1).fill(emptyPixel)
                                  .map(() => new Array<Pixel>(subDiv + 1).fill(emptyPixel));
            }
            let xMin: number = DrawService.tolerate((image.origin.x - moduleImage.origin.x) * subDiv);
            xMin = xMin < 0 ? 0 : xMin;
            let yMin: number = DrawService.tolerate((image.origin.y - moduleImage.origin.y) * subDiv);
            yMin = yMin < 0 ? 0 : yMin;
            let xMax: number = DrawService.tolerate((image.origin.x - moduleImage.origin.x) * subDiv + image.matrix.length);
            xMax = xMax > moduleImage.matrix.length ? moduleImage.matrix.length : xMax;
            let yMax: number = DrawService.tolerate((image.origin.y - moduleImage.origin.y) * subDiv + image.matrix[0].length);
            yMax = yMax > moduleImage.matrix[0].length ? moduleImage.matrix[0].length : yMax;
            let isEmpty: boolean = true;    
            for (let ix: number = xMin; ix < xMax; ix++) {
                for (let iy: number = yMin; iy < yMax; iy++) {
                    let imageCoord = new Coord(ix + DrawService.tolerate((moduleImage.origin.x - image.origin.x) * subDiv), 
                                               iy + DrawService.tolerate((moduleImage.origin.y - image.origin.y) * subDiv));
                    if (imageCoord.x % 1 !== 0 || imageCoord.y % 1 !== 0 ) {
                        console.info(coord, ix, iy, imageCoord);
                    }
                    if (image.matrix[imageCoord.x][imageCoord.y] !== undefined && 
                        image.matrix[imageCoord.x][imageCoord.y].getValue() !== undefined) {
                        moduleImage.matrix[ix][iy] = image.matrix[imageCoord.x][imageCoord.y];
                        isEmpty = false;
                    }
                }
            }
            if (isEmpty) {
                return undefined;
            } else {
                return moduleImage;
            }
        }
        return undefined;
    }
}

export class EmptyModule extends Module { }

export class FormatModule extends Module {

    constructor (public masks: boolean[]) { 
        super();
    }

    override getValue (maskNo: number): boolean {
        return this.masks[maskNo];
    }
}

export class BezelModule extends Module {

    override isSafe (): boolean {
        return true;
    }

    override draw (generator: Generator, coord: Coord): void {
        generator.ctx.fillStyle = this.safeWhite;
        generator.ctx.fillRect(coord.x * generator.scale, coord.y * generator.scale, generator.scale, generator.scale);
        this.drawImage(generator, coord);
    }
}

export class FunctionModule extends Module {

    constructor (public value: boolean) {  
        super();
    }

    override getValue(): boolean {
        return this.value;
    }
}

export class VersionModule extends FunctionModule { }

export class FinderModule extends FunctionModule { 

    override isSafe (generator: Generator, coord: Coord): boolean {
        let bezel: number = generator.project.bezel;
        let length: number = generator.project.matrix.length;
        let dist: number = 0.5 * generator.project.dotSize / generator.project.subdivision + 0.5;
        return (DrawService.isLesser(coord.x, bezel - dist) ||
            DrawService.isLesser(coord.y, bezel - dist) ||
            DrawService.isGreaterOrEqual(coord.x, bezel + 7 + dist) && DrawService.isLesser(coord.x, bezel + 8) ||
            DrawService.isGreaterOrEqual(coord.y, bezel + 7 + dist) && DrawService.isLesser(coord.y, bezel + 8) ||
            DrawService.isGreaterOrEqual(coord.x, length - bezel - 8) && DrawService.isLesser(coord.x, length - bezel - 7 - dist) ||
            DrawService.isGreaterOrEqual(coord.y, length - bezel - 8) && DrawService.isLesser(coord.y, length - bezel - 7 - dist) ||
            DrawService.isGreaterOrEqual(coord.x, generator.project.matrix.length - bezel + dist) ||
            DrawService.isGreaterOrEqual(coord.y, generator.project.matrix.length - bezel + dist))
    }

    override draw (generator: Generator, coord: Coord): void {
        let bezel: number = generator.project.bezel;
        let length: number = generator.project.matrix.length;
        let scale: number = generator.scale;
        let dist: number = 0.5 * generator.project.dotSize / generator.project.subdivision + 0.5;
        if (generator.isPreview) {
            generator.ctx.fillStyle = this.getValue() ? this.safeBlack : this.safeWhite;
            generator.ctx.fillRect(coord.x * scale, coord.y * scale, scale, scale);
        } else {
            generator.ctx.fillStyle = this.safeWhite;
            generator.ctx.fillRect(coord.x * scale, coord.y * scale, scale, scale);
            generator.ctx.fillStyle = this.riskWhite;
            if (DrawService.isEqual(coord.x, bezel - 1) && (DrawService.isEqual(coord.y, bezel - 1)) ||
                DrawService.isEqual(coord.x, bezel - 1) && (DrawService.isEqual(coord.y, length - bezel - 8)) ||
                DrawService.isEqual(coord.x, length - bezel - 8) && (DrawService.isEqual(coord.y, bezel - 1))) {
                generator.ctx.fillRect((coord.x + 1 - dist) * scale, (coord.y + 1 - dist) * scale, dist * scale, dist * scale);
            } else if (DrawService.isEqual(coord.x, bezel - 1) && (DrawService.isEqual(coord.y, bezel + 7)) ||
                DrawService.isEqual(coord.x, bezel - 1) && (DrawService.isEqual(coord.y, length - bezel)) ||
                DrawService.isEqual(coord.x, length - bezel - 8) && (DrawService.isEqual(coord.y, bezel + 7))) {
                generator.ctx.fillRect((coord.x + 1 - dist) * scale, coord.y* scale, dist * scale, dist * scale);
            } else if (DrawService.isEqual(coord.x, bezel + 7) && (DrawService.isEqual(coord.y, bezel - 1)) ||
                DrawService.isEqual(coord.x, bezel + 7) && (DrawService.isEqual(coord.y, length - bezel - 8)) ||
                DrawService.isEqual(coord.x, length - bezel) && (DrawService.isEqual(coord.y, bezel - 1))) {
                generator.ctx.fillRect(coord.x * scale, (coord.y + 1 - dist) * scale, dist * scale, dist * scale);
            } else if (DrawService.isEqual(coord.x, bezel + 7) && (DrawService.isEqual(coord.y, bezel + 7)) ||
                DrawService.isEqual(coord.x, bezel + 7) && (DrawService.isEqual(coord.y, length - bezel)) ||
                DrawService.isEqual(coord.x, length - bezel) && (DrawService.isEqual(coord.y, bezel + 7))) {
                generator.ctx.fillRect(coord.x * scale, coord.y* scale, dist * scale, dist * scale);
            } else if (DrawService.isEqual(coord.x, bezel - 1) ||
                DrawService.isEqual(coord.x, length - bezel - 8)) {
                generator.ctx.fillRect((coord.x + 1 - dist) * scale, coord.y * scale, dist * scale, scale);
            } else if (DrawService.isEqual(coord.x, bezel + 7) ||
                DrawService.isEqual(coord.x, length - bezel)) {
                generator.ctx.fillRect(coord.x * scale, coord.y * scale, dist * scale, scale);
            } else if (DrawService.isEqual(coord.y, bezel - 1) ||
                DrawService.isEqual(coord.y, length - bezel - 8)) {
                generator.ctx.fillRect(coord.x * scale, (coord.y + 1 - dist) * scale, scale, dist * scale);
            } else if (DrawService.isEqual(coord.y, bezel + 7) ||
                DrawService.isEqual(coord.y, length - bezel)) {
                    generator.ctx.fillRect(coord.x * scale, coord.y * scale, scale, dist * scale);
            } else {
                generator.ctx.fillStyle = this.getValue() ? this.riskBlack : this.riskWhite;
                generator.ctx.fillRect(coord.x * scale, coord.y * scale, scale, scale);
            }
        }
        this.drawImage(generator, coord);
    }
}

export class AlignmentModule extends FunctionModule { }

export class TimingModule extends FunctionModule { }

export class DarkModule extends FunctionModule {

    constructor () {
        super(true);
    }
}

export class MaskedModule extends Module {

    coord: Coord; 

    constructor (public value: boolean) { 
        super();
    }

    override getValue (maskNo: number): boolean {
        return DrawService.applyMask(maskNo, this.coord, this.value);
    }
}

export class DataModule extends MaskedModule {

}

export class MessageModule extends MaskedModule {

    override riskBlack: Color = Color.DARK_GREY;
    override riskWhite: Color = Color.LIGHT_GREY;
}

export class StuffModule extends MaskedModule {

    constructor (public codeword: StuffCodeword, public override value: boolean) {
        super(value);
    }

    override isSafe (): boolean {
        return true;
    }

    override draw (generator: Generator, coord: Coord): void {
        generator.ctx.fillStyle = this.getValue(generator.project.maskNo) ? this.safeBlack : this.safeWhite;
        generator.ctx.fillRect(coord.x * generator.scale, coord.y * generator.scale, generator.scale, generator.scale);
        this.drawImage(generator, coord);
    }

    isDot (generator: Generator, coord: Coord): boolean {
        if (generator !== undefined && coord !== undefined) {
            let size: number = generator.project.dotSize / generator.project.subdivision;
            let dist: number = (1 - size) / 2;
            if (DrawService.isLesser(coord.x % 1, dist) || 
                DrawService.isLesser(coord.y % 1, dist) ||
                DrawService.isGreaterOrEqual(coord.x % 1, dist + size) || 
                DrawService.isGreaterOrEqual(coord.y % 1, dist + size)) {
                return false;
            }
        }
        return true;
    }

    // getImageValue (generator: Generator): boolean {
    //     let imageBit: ImageBit = this.getImage(generator, 
    //         new Coord (this.coord.x + generator.project.bezel, this.coord.y + generator.project.bezel))
    //     if (imageBit === undefined) {
    //         return this.value;
    //     } else {
    //         return imageBit.getUnmaskedValue(generator.project.maskNo, this.coord)
    //     }
    // }

    override getImageValue (generator: Generator): boolean {
        return super.getImageValue(generator, new Coord(this.coord.x + generator.project.bezel, this.coord.y + generator.project.bezel)); 
    }

    getImageValueUnmasked (generator: Generator): boolean {
        return DrawService.applyMask(generator.project.maskNo, this.coord, this.getImageValue(generator));
    }
}

export class CorrectionModule extends MaskedModule {

    override riskBlack: Color = Color.DARK_GREY;
    override riskWhite: Color = Color.LIGHT_GREY;
    
    redraw (generator: Generator): void {
        this.draw(generator, new Coord(this.coord.x + generator.project.bezel, this.coord.y + generator.project.bezel));

        // let xMin: number = this.coord.x > 0 ? -1 : 0;
        // let yMin: number = this.coord.y > 0 ? -1 : 0;
        // let xMax: number = this.coord.x + 1 < generator.project.matrix.length ? 2 : 1;
        // let yMax: number = this.coord.y + 1 < generator.project.matrix.length ? 2 : 1;
        // for (let ix: number = xMin; ix < xMax; ix++) {
        //     for (let iy: number = yMin; iy < yMax; iy++) {
        //         let coord: Coord = new Coord(this.coord.x + ix + generator.project.bezel, this.coord.y + iy + generator.project.bezel);
        //         //DrawService.drawBit(generator, coord);
        //         this.draw(generator, coord);
        //     }
        // }
    }
}

export class RemainderModule extends MaskedModule {

    override isSafe (): boolean {
        return true;
    }

    constructor(public override coord: Coord) {
        super(false);
    }
}
