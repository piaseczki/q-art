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

    draw (generator: Generator, parentModule: Module) {
        let subdivision = generator.project.subdivision;
        for (let ix: number = 0; ix < this.matrix.length; ix++) {
            for (let iy: number = 0; iy < this.matrix[ix].length; iy++) {
                let coord: Coord = new Coord(ix / subdivision + this.origin.x, iy / subdivision + this.origin.y);
                this.matrix[ix][iy].draw(generator, coord, parentModule.isSafe(generator, coord));
            }
        }
    }
}