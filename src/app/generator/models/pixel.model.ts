import { Generator } from '../generator.component';
import { Coord, DrawService, Color } from '../services/draw.service';

export class Pixel {

    constructor(public value?: boolean) { }

    getValue (): boolean {
        return this.value;
    }
    
    draw (generator: Generator, coord: Coord, isSafe: boolean): void {
        if (this.getValue() === undefined) {
            return
        }
        if (generator.isPreview) {
            generator.ctx.fillStyle = this.getValue() ? Color.BLACK : Color.WHITE;
        } else if (isSafe) {
            generator.ctx.fillStyle = this.getValue() ? Color.BLUE : Color.LIGHT_BLUE;
        } else if (!isSafe) {
            generator.ctx.fillStyle = this.getValue() ? Color.RED : Color.LIGHT_RED;
        }
        generator.ctx.fillRect(coord.x * generator.scale,coord.y * generator.scale,
                               generator.scale / generator.project.subdivision, generator.scale / generator.project.subdivision);
    }

    getUnmaskedValue (maskNo: number, coord: Coord): boolean {
        return DrawService.applyMask(maskNo, coord, this.value);
    }
}