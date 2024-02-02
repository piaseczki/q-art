import { Module } from './module.model';
import { Pixel } from './pixel.model';
import { Coord } from '../services/draw.service';
import { Generator } from '../generator.component';

export interface ILayer { }

export class BaseLayer implements ILayer {

    matrix: Module[][];
}

export class ImageLayer implements ILayer {

    constructor (public name: string){}
    
    origin: Coord;
    matrix: Pixel[][];

    draw (generator: Generator, isSafe: boolean) {
        let subdivision = generator.project.subdivision;
        let localIsSafe: boolean = isSafe;
        let min: number = (generator.project.subdivision - generator.project.dotSize) / 2;
        let max: number = min + generator.project.dotSize;
        for (let ix: number = 0; ix < this.matrix.length; ix++) {
            for (let iy: number = 0; iy < this.matrix[ix].length; iy++) {
                if (!isSafe) {
                    if (ix < min || ix >= max || iy < min || iy >= max) {
                        localIsSafe = true;
                    } else {
                        localIsSafe = false;
                    }
                }
                if (!generator.forceSafe) {
                    this.matrix[ix][iy].draw(generator, 
                        new Coord(ix / subdivision + this.origin.x, iy / subdivision + this.origin.y), localIsSafe);
                } else if (localIsSafe) {
                    this.matrix[ix][iy].draw(generator, 
                        new Coord(ix / subdivision + this.origin.x, iy / subdivision + this.origin.y), localIsSafe);
                }
            }
        }
    }
}