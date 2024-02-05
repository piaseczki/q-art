import { Injectable } from '@angular/core';
import {
    AlignmentModule,
    Module,
    BezelModule,
    MaskedModule,
    DarkModule,
    EmptyModule,
    FinderModule,
    FormatModule,
    RemainderModule,
    TimingModule,
    VersionModule
} from '../models/module.model';
import { ICodeword } from '../models/codeword.model';
import { Coord } from './draw.service';

@Injectable({ providedIn: 'root' })
export class MatrixService {

    static initMatrix(size: number, formatInfo: FormatModule[], versionInfo: VersionModule[], codewords: ICodeword[]): Module[][] {
        let matrix: Module[][] = [];
        for (let x: number = 0; x < size; x++) {
            matrix[x] = [];
            for (let y: number = 0; y < size; y++) {
                matrix[x][y] = new EmptyModule();
            }
        }
        matrix = this.genFinderPattern(matrix);
        matrix = this.genTimingPattern(matrix);
        matrix = this.genAlignmentPattern(matrix);
        matrix = this.genDarkModule(matrix);
        matrix = this.genFormatPattern(matrix, formatInfo);
        matrix = this.genVersionPattern(matrix, versionInfo);
        matrix = this.genMaskedPattern(matrix, codewords);
        matrix = this.genRemainderPattern(matrix);
        return matrix;
    }

    static genBezel (matrix: Module[][], size: number, bezel: number): Module[][] {
        const totalSize = size * 4 + 17 + bezel * 2;
        const diff: number = (matrix.length - totalSize) / 2;
        let bezelBit: BezelModule = new BezelModule();
        let finderBit: FinderModule = new FinderModule(false);
        if (matrix.length < totalSize) {
            let length: number = matrix.length;
            for (let i: number = 0; i > diff; i--) {
                matrix.unshift(new Array<Module>(length).fill(bezelBit));
                matrix.push(new Array<Module>(length).fill(bezelBit));
            }
            for (let x: number = 0; x < matrix.length; x++) {
                for (let i: number = 0; i > diff; i--) {
                    matrix[x].unshift(bezelBit);
                    matrix[x].push(bezelBit);
                }
            }
            for (let i: number = 0; i < 9; i++) {
                matrix[bezel - 1][bezel - 1 + i] = finderBit;
                matrix[bezel - 1 + i][bezel - 1] = finderBit;
                matrix[matrix.length - bezel][bezel - 1 + i] = finderBit;
                matrix[bezel - 1 + i][matrix.length - bezel] = finderBit;
                matrix[bezel - 1][matrix.length - bezel - i] = finderBit;
                matrix[matrix.length - bezel - i][bezel - 1] = finderBit;
            }
        } else if (matrix.length > totalSize) {
            matrix.splice(matrix.length - diff);
            matrix.splice(0, diff);
            for (let i: number = 0; i < matrix.length; i++) {
                matrix[i].splice(matrix[i].length - diff);
                matrix[i].splice(0, diff);
            }
        }
        return matrix;
    }

    private static genFinderPattern (matrix: Module[][]): Module[][] {
        let m: number = matrix.length;
        for (let x: number = 0; x < m; x == 7 ? (x += m - 15) : x++) {
            for (let y: number = 0; y < m; y == 7 ? (y += m - 15) : y++) {
                if (x <= 7 || y <= 7) {
                    if (
                        x == 7 ||
                        x == m - 8 ||
                        y == 7 ||
                        y == m - 8 ||
                        ((x == 1 || x == 5 || x == m - 6 || x == m - 2) && ((y >= 1 && y <= 5) || (y >= m - 6 && y <= m - 2))) ||
                        ((y == 1 || y == 5 || y == m - 6 || y == m - 2) && ((x >= 1 && x <= 5) || (x >= m - 6 && x <= m - 2)))
                    ) {
                        matrix[x][y] = new FinderModule(false);
                    } else {
                        matrix[x][y] = new FinderModule(true);
                    }
                }
            }
        }
        return matrix;
    }

    private static genAlignmentPattern (matrix: Module[][]): Module[][] {
        if (matrix.length < 25) return matrix;
        let length: number = matrix.length - 13;
        let spacesCount: number = Math.ceil(length / 28);
        let coordinates: number[] = [6];
        if (spacesCount == 1) {
            coordinates.push(length + 6);
        } else if (spacesCount == 2) {
            coordinates.push(length / 2 + 6);
            coordinates.push(length + 6);
        } else if (matrix.length == 145) {
            coordinates = [6, 34, 60, 86, 112, 138];
        } else {
            loop: for (let a: number = 28; spacesCount * a >= length; a -= 2) {
                for (let b: number = 28; b + (spacesCount - 1) * a >= length; b -= 2) {
                    if (b + (spacesCount - 1) * a == length) {
                        coordinates[1] = b + 6;
                        for (let i: number = 2; i < spacesCount + 1; i++) {
                            coordinates[i] = coordinates[i - 1] + a;
                        }
                        if (b - a == 0) {
                            break loop;
                        }
                    }
                }
            }
        }
        let s: number = matrix.length;
        const whiteBit: AlignmentModule = new AlignmentModule(false);
        const blackBit: AlignmentModule = new AlignmentModule(true);
        for (let x: number = 0; x < coordinates.length; x++) {
            for (let y: number = 0; y < coordinates.length; y++) {
                if (
                    !(coordinates[x] < 7 && coordinates[y] > s - 8) &&
                    !(coordinates[x] < 7 && coordinates[y] < 7) &&
                    !(coordinates[x] > s - 8 && coordinates[y] < 7)
                ) {
                    for (let a: number = -2; a < 3; a++) {
                        for (let b: number = -2; b < 3; b++) {
                            if ((a >= -1 && a <= 1 && (b == -1 || b == 1)) || (b >= -1 && b <= 1 && (a == -1 || a == 1))) {
                                matrix[coordinates[x] + a][coordinates[y] + b] = whiteBit;
                            } else {
                                matrix[coordinates[x] + a][coordinates[y] + b] = blackBit;
                            }
                        }
                    }
                }
            }
        }
        //console.debug('alignment coordinates', coordinates)
        return matrix;
    }

    private static genTimingPattern (matrix: Module[][]): Module[][] {
        const whiteBit: TimingModule = new TimingModule(false);
        const blackBit: TimingModule = new TimingModule(true);
        for (let i: number = 8; i < matrix.length - 8; i++) {
            if (i % 2 == 0) {
                matrix[6][i] = blackBit;
                matrix[i][6] = blackBit;
            } else {
                matrix[6][i] = whiteBit;
                matrix[i][6] = whiteBit;
            }
        }
        return matrix;
    }

    private static genDarkModule (matrix: Module[][]): Module[][] {
        matrix[8][matrix.length - 8] = new DarkModule();
        return matrix;
    }

    private static genFormatPattern (matrix: Module[][], formatInfo: FormatModule[]): Module[][] {
        let s: number = matrix.length;
        for (let i: number = 0; i < formatInfo.length; i++) {
            if (i < 6) matrix[i][8] = formatInfo[i];
            else if (i >= 6 && i < 8) matrix[i + 1][8] = formatInfo[i];
            else if (i == 8) matrix[8][7] = formatInfo[i];
            else if (i > 8) matrix[8][14 - i] = formatInfo[i];

            if (i < 7) matrix[8][s - 1 - i] = formatInfo[i];
            else if (i >= 7) matrix[s - 15 + i][8] = formatInfo[i];
        }
        return matrix;
    }

    private static genVersionPattern (matrix: Module[][], versionInfo: VersionModule[]): Module[][] {
        if (matrix.length < 45) return matrix;
        let s: number = matrix.length;
        for (let i: number = 0; i < versionInfo.length; i++) {
            matrix[Math.floor(i / 3)][s - 11 + (i % 3)] = versionInfo[17 - i];
            matrix[s - 11 + (i % 3)][Math.floor(i / 3)] = versionInfo[17 - i];
        }
        return matrix;
    }

    private static genMaskedPattern (matrix: Module[][], codewords: ICodeword[]): Module[][] {
        let s: number = matrix.length;
        let x: number = matrix.length - 1;
        let y: number = matrix.length - 1;
        for (let c: number = 0; c < codewords.length; c++) {
            for (let b: number = 0; b < 8; b++) {
                if (matrix[x][y] instanceof EmptyModule) {
                    this.setModuleToMatrix(matrix, codewords[c].modules[b], new Coord(x, y));
                } else if (
                    x > 14 &&
                    x + 1 < s &&
                    y - 1 >= 0 &&
                    matrix[x + 1][y - 1] instanceof AlignmentModule &&
                    y - 1 >= 0 &&
                    matrix[x][y - 1] instanceof EmptyModule
                ) {
                    y -= 1;
                    this.setModuleToMatrix(matrix, codewords[c].modules[b], new Coord(x, y));
                } else if (
                    x > 14 &&
                    x + 1 < s &&
                    y + 1 < s &&
                    matrix[x + 1][y + 1] instanceof AlignmentModule &&
                    y + 1 < s &&
                    matrix[x][y + 1] instanceof EmptyModule
                ) {
                    y += 1;
                    this.setModuleToMatrix(matrix, codewords[c].modules[b], new Coord(x, y));
                } else if (
                    x > 14 &&
                    x + 1 < s &&
                    y - 1 >= 0 &&
                    matrix[x + 1][y - 1] instanceof AlignmentModule &&
                    y - 2 >= 0 &&
                    matrix[x][y - 2] instanceof EmptyModule
                ) {
                    y -= 2;
                    this.setModuleToMatrix(matrix, codewords[c].modules[b], new Coord(x, y));
                } else if (
                    x > 14 &&
                    x + 1 < s &&
                    y + 1 < s &&
                    matrix[x + 1][y + 1] instanceof AlignmentModule &&
                    y + 2 < s &&
                    matrix[x][y + 2] instanceof EmptyModule
                ) {
                    y += 2;
                    this.setModuleToMatrix(matrix, codewords[c].modules[b], new Coord(x, y));
                } else if (
                    x - 1 >= 0 &&
                    y - 2 >= 0 &&
                    matrix[x - 1][y - 2] instanceof VersionModule &&
                    x - 2 >= 0 &&
                    y - 7 >= 0 &&
                    matrix[x - 2][y - 7] instanceof EmptyModule
                ) {
                    x -= 2;
                    y -= 7;
                    this.setModuleToMatrix(matrix, codewords[c].modules[b], new Coord(x, y));
                } else if (
                    x + 1 < s &&
                    y + 1 < s &&
                    matrix[x + 1][y + 1] instanceof VersionModule &&
                    y + 1 < s &&
                    matrix[x][y + 1] instanceof EmptyModule
                ) {
                    y += 1;
                    this.setModuleToMatrix(matrix, codewords[c].modules[b], new Coord(x, y));
                } else if (x + 1 < s && y - 1 >= 0 && matrix[x + 1][y - 1] instanceof EmptyModule) {
                    x += 1;
                    y -= 1;
                    this.setModuleToMatrix(matrix, codewords[c].modules[b], new Coord(x, y));
                } else if (x + 1 < s && y + 1 < s && matrix[x + 1][y + 1] instanceof EmptyModule) {
                    x += 1;
                    y += 1;
                    this.setModuleToMatrix(matrix, codewords[c].modules[b], new Coord(x, y));
                } else if (x + 1 < s && y - 2 >= 0 && matrix[x + 1][y - 2] instanceof EmptyModule) {
                    x += 1;
                    y -= 2;
                    this.setModuleToMatrix(matrix, codewords[c].modules[b], new Coord(x, y));
                } else if (x + 1 < s && y + 2 < s && matrix[x + 1][y + 2] instanceof EmptyModule) {
                    x += 1;
                    y += 2;
                    this.setModuleToMatrix(matrix, codewords[c].modules[b], new Coord(x, y));
                } else if (x + 1 < s && y - 6 >= 0 && matrix[x + 1][y - 6] instanceof EmptyModule) {
                    x += 1;
                    y -= 6;
                    this.setModuleToMatrix(matrix, codewords[c].modules[b], new Coord(x, y));
                } else if (x + 1 < s && y + 6 < s && matrix[x + 1][y + 6] instanceof EmptyModule) {
                    x += 1;
                    y += 6;
                    this.setModuleToMatrix(matrix, codewords[c].modules[b], new Coord(x, y));
                } else if (x - 1 >= 0 && matrix[x - 1][y] instanceof EmptyModule) {
                    x -= 1;
                    this.setModuleToMatrix(matrix, codewords[c].modules[b], new Coord(x, y));
                } else if (x - 1 >= 0 && y - 8 >= 0 && matrix[x - 1][y - 8] instanceof EmptyModule) {
                    x -= 1;
                    y -= 8;
                    this.setModuleToMatrix(matrix, codewords[c].modules[b], new Coord(x, y));
                } else if (x - 2 >= 0 && matrix[x - 2][y] instanceof EmptyModule) {
                    x -= 2;
                    this.setModuleToMatrix(matrix, codewords[c].modules[b], new Coord(x, y));
                }
            }
        }
        return matrix;
    }

    private static setModuleToMatrix (matrix: Module[][], bit: Module, coord: Coord): void {
        if (bit instanceof MaskedModule) {
            (<MaskedModule>bit).coord = coord;
        } 
        matrix[coord.x][coord.y] = bit;
    }

    private static genRemainderPattern (matrix: Module[][]): Module[][] {
        let s: number = matrix.length;
        let counter: number = 0;
        for (let x: number = 0; x < 2; x++) {
            for (let y: number = s - 15; y < s - 8; y++) {
                if (matrix[x][y] instanceof EmptyModule) {
                    let remainderBit: RemainderModule = new RemainderModule(new Coord(x, y));
                    matrix[x][y] = remainderBit;
                    counter++;
                }
            }
        }
        console.debug('reminder bits count', counter);
        return matrix;
    }
}
