import {Injectable} from '@angular/core';
import {EncodingProperty} from '../models/encoding-property.model';
import {Correction, Mode} from '../models/project.model';
import {CodewordBlock, CodewordGroup, CorrectionCodeword, ICodeword, MessageCodeword, StuffCodeword} from '../models/codeword.model';
import { CorrectionModule, FormatModule, MessageModule, StuffModule, VersionModule } from '../models/module.model';
import { Project } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class EncodeService {
    private static getNumericCharacterCountBinaryString (size: number, inputLength: number): string {
        let bitsNo: number;
        if (size <= 9) {
            bitsNo = 10;
        } else if (size <= 26) {
            bitsNo = 12;
        } else {
            bitsNo = 14;
        }
        return inputLength.toString(2).padStart(bitsNo, '0');
    }

    private static getNumericInputBinaryString (input: string): string {
        let binaryInput: string = '';
        for (let i: number = 0; i < Math.ceil(input.length / 3); i++) {
            let group: number;
            if (i * 3 + 3 < input.length) {
                group = parseInt(input.substring(i * 3, i * 3 + 3));
            } else {
                group = parseInt(input.substr(i * 3));
            }
            if (group >= 100) {
                binaryInput += group.toString(2).padStart(10, '0');
            } else if (group >= 10) {
                binaryInput += group.toString(2).padStart(7, '0');
            } else {
                binaryInput += group.toString(2).padStart(4, '0');
            }
        }
        return binaryInput;
    }

    private static getNumericBinaryString (size: number, input: string): string {
        return '0001' + this.getNumericCharacterCountBinaryString(size, input.length) + this.getNumericInputBinaryString(input);
    }

    private static getAlphanumericCharacterCountBinaryString(size: number, inputLength: number): string {
        let bitsNo: number;
        if (size <= 9) {
            bitsNo = 9;
        } else if (size <= 26) {
            bitsNo = 11;
        } else {
            bitsNo = 13;
        }
        return inputLength.toString(2).padStart(bitsNo, '0');
    }

    private static getAlphanumericVal (character: string): number {
        let alphanumericVal: number = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'.indexOf(character);
        if (alphanumericVal === -1) console.error('invalid ALPHANUMERIC character', character);
        return alphanumericVal;
    }

    private static getAlphanumericInputBinaryString (input: string): string {
        let binaryInput: string = '';
        for (let i: number = 0; i < input.length; i += 2) {
            if (i + 1 === input.length) {
                binaryInput += this.getAlphanumericVal(input.charAt(i))
                    .toString(2)
                    .padStart(6, '0');
                break;
            } else {
                binaryInput += (this.getAlphanumericVal(input.charAt(i)) * 45 + this.getAlphanumericVal(input.charAt(i + 1)))
                    .toString(2)
                    .padStart(11, '0');
            }
        }
        return binaryInput;
    }

    private static getAlphanumericBinaryString (size: number, input: string): string {
        return '0010' + this.getAlphanumericCharacterCountBinaryString(size, input.length) + this.getAlphanumericInputBinaryString(input);
    }

    private static getByteCharacterCountBinaryString (size: number, inputLength: number): string {
        let bitsNo: number;
        if (size <= 9) {
            bitsNo = 8;
        } else {
            bitsNo = 16;
        }
        return inputLength.toString(2).padStart(bitsNo, '0');
    }

    private static getByteInputBinaryString (input: string): string {
        let bytes = new TextEncoder().encode(input);
        let binaryInput: string = '';
        for (let byte of bytes) {
            binaryInput += byte.toString(2).padStart(8, '0');
        }
        return binaryInput;
    }

    private static getByteBinaryString (size: number, input: string): string {
        return '0100' + this.getByteCharacterCountBinaryString(size, input.length) + this.getByteInputBinaryString(input);
    }

    private static getModReminderBinaryString (length: number): string {
        if (length % 8 == 0) return '';
        let modularLength: number = Math.ceil(length / 8) * 8 - length;
        return new Array(modularLength + 1).join('0');
    }

    static getMessageBinaryString (mode: Mode, size: number, input: string): string {
        let messageBinaryString: string = '';
        switch (mode) {
            case Mode.NUMERIC:
                messageBinaryString = this.getNumericBinaryString(size, input);
                break;
            case Mode.ALPHANUMERIC:
                messageBinaryString = this.getAlphanumericBinaryString(size, input);
                break;
            case Mode.BYTE:
                messageBinaryString = this.getByteBinaryString(size, input);
                break;
        }
        messageBinaryString += '0000';
        messageBinaryString += this.getModReminderBinaryString(messageBinaryString.length);
        if (messageBinaryString.length % 8 != 0) console.error('getMessageBinaryString length ' + messageBinaryString.length + ' not correct');
        console.debug('message binary string ' + messageBinaryString);
        return messageBinaryString;
    }

    static getTotalCodewordsCount (encodingProperty: EncodingProperty) {
        return (
            encodingProperty.blocksInGroup1 * encodingProperty.dataCodewordsPerBlockInGroup1 +
            encodingProperty.blocksInGroup2 * encodingProperty.dataCodewordsPerBlockInGroup2
        );
    }

    static getStuffBinaryString (dataCodewordsCount: number, totalCodewordsCount: number) {
        let stuffingCodewordsCount: number = totalCodewordsCount - dataCodewordsCount;
        let stuff236: string = '11101100';
        let stuff17: string = '00010001';
        let stuffBinaryString: string = '';
        while (stuffingCodewordsCount > 0) {
            if (stuffingCodewordsCount == 0) break;
            stuffBinaryString += stuff236;
            stuffingCodewordsCount--;
            if (stuffingCodewordsCount == 0) break;
            stuffBinaryString += stuff17;
            stuffingCodewordsCount--;
        }
        if (stuffBinaryString.length % 8 != 0) console.error('getStuffBinaryString length ' + stuffBinaryString.length + ' not correct');
        console.debug('stuff binary string ' + stuffBinaryString);
        return stuffBinaryString;
    }

    static getCodewords (messageBinaryString: string, stuffBinarySting: string): ICodeword[] {
        let binaryString: string = messageBinaryString + stuffBinarySting;
        let codewords: ICodeword[] = new Array<ICodeword>(binaryString.length / 8);
        for (let i: number = 0; i < codewords.length; i++) {
            let binarySubString = binaryString.substring(i * 8, i * 8 + 8);
            if (i < messageBinaryString.length / 8) {
                codewords[i] = new MessageCodeword();
                codewords[i].modules = new Array<MessageModule>(8);
                for (let j: number = 0; j < codewords[i].modules.length; j++) {
                    if (binarySubString.charAt(j) === '1') codewords[i].modules[j] = new MessageModule(true);
                    else if (binarySubString.charAt(j) === '0') codewords[i].modules[j] = new MessageModule(false);
                }
            } else {
                codewords[i] = new StuffCodeword();
                codewords[i].modules = new Array<StuffModule>(8);
                for (let j: number = 0; j < codewords[i].modules.length; j++) {
                    if (binarySubString.charAt(j) === '1') codewords[i].modules[j] = new StuffModule(<StuffCodeword>codewords[i], true);
                    else if (binarySubString.charAt(j) === '0') codewords[i].modules[j] = new StuffModule(<StuffCodeword>codewords[i], false);
                }
            }
            codewords[i].value = parseInt(binarySubString, 2);
        }
        console.debug('codewords ', codewords);
        return codewords;
    }

    static getCodewordGroups (codewords: ICodeword[], encodingProperty: EncodingProperty, project: Project): CodewordGroup[] {
        let groups: CodewordGroup[] = [];
        let i: number = 0;
        let groupCount = encodingProperty.blocksInGroup2 === 0 ? 1 : 2;
        for (let g: number = 0; g < groupCount; g++) {
            groups[g] = new CodewordGroup();
            groups[g].project = project;
            groups[g].blocks = [];
            let blocksCount: number;
            let dataCodewordsCount: number;
            if (g === 0) {
                blocksCount = encodingProperty.blocksInGroup1;
                dataCodewordsCount = encodingProperty.dataCodewordsPerBlockInGroup1;
            } else if (g === 1) {
                blocksCount = encodingProperty.blocksInGroup2;
                dataCodewordsCount = encodingProperty.dataCodewordsPerBlockInGroup2;
            }
            for (let b: number = 0; b < blocksCount; b++) {
                groups[g].blocks[b] = new CodewordBlock();
                groups[g].blocks[b].group = groups[0];
                groups[g].blocks[b].codewords = [];
                for (let c: number = 0; c < dataCodewordsCount; c++, i++) {
                    groups[g].blocks[b].codewords[c] = codewords[i];
                    if (codewords[i] instanceof StuffCodeword) {
                        (<StuffCodeword>groups[g].blocks[b].codewords[c]).block = groups[g].blocks[b];
                    }
                }
                groups[g].blocks[b].correctionCodewords = this.initCorrectionCodewords(encodingProperty.errorCorrectionCodewordsPerBlock);
                this.getCorrectionCodewords(groups[g].blocks[b].codewords, groups[g].blocks[b].correctionCodewords);
            }
        }
        console.debug('codewordsGroups', groups);
        return groups;
    }

    private static getGF256Log (val: number): number {
        if (val == 1) return 0;
        let exponent: number = 1;
        while (val != 2) {
            let temp: number = val ^ 285;
            if (temp > 255 && temp % 2 == 0) val = temp;
            val = Math.floor(val / 2);
            exponent++;
        }
        return exponent;
    }

    private static getGF256Antilog (exponent: number): number {
        if (exponent == 0) return 1;
        let val: number = 2;
        for (let i: number = 1; i < exponent; i++) {
            val = val * 2;
            if (val > 255) val = val ^ 285;
        }
        return val;
    }

    private static getGenerationCodewords (correctionCodewordsCount: number): number[] {
        let generationCodewords: number[] = Array<number>(correctionCodewordsCount + 1).fill(0);
        for (let x: number = 1; x < correctionCodewordsCount; x++) {
            generationCodewords[x + 1] = generationCodewords[x] + x;
            for (let y: number = x; y > 0; y--) {
                generationCodewords[y] = this.getGF256Log(
                    this.getGF256Antilog(generationCodewords[y]) ^ this.getGF256Antilog(generationCodewords[y - 1] + x)
                );
            }
        }
        console.debug('generationCodewords', generationCodewords);
        return generationCodewords;
    }

    static initCorrectionCodewords (correctionCodewordsCount: number): CorrectionCodeword[] {
        let correctionCodewords: CorrectionCodeword[] = [];
        for (let c: number = 0; c < correctionCodewordsCount; c++) {
            correctionCodewords[c] = new CorrectionCodeword();
            correctionCodewords[c].modules = [];
            for (let b: number = 0; b < 8; b++) {
                correctionCodewords[c].modules[b] = new CorrectionModule(true);
            }
        }
        return correctionCodewords;
    }

    static getCorrectionCodewords (codewords: ICodeword[], correctionCodewords: CorrectionCodeword[]): void {
        let generationCodewords: number[] = this.getGenerationCodewords(correctionCodewords.length);
        let length: number = codewords.length > generationCodewords.length ? codewords.length + 1 : generationCodewords.length + 1;
        let tempCorrectionCodewords: CorrectionCodeword[] = Array<CorrectionCodeword>(length);
        for (let i: number = 0; i < tempCorrectionCodewords.length; i++) {
            tempCorrectionCodewords[i] = new CorrectionCodeword();
            if (i < codewords.length) {
                tempCorrectionCodewords[i].value = codewords[i].value;
            } else {
                tempCorrectionCodewords[i].value = 0;
            }
        }
        for (let x: number = 0; x < codewords.length; x++) {
            let firstCodeword: number = tempCorrectionCodewords[0].value;
            if (firstCodeword == 0) {
                for (let i: number = 0; i < tempCorrectionCodewords.length; i++) {
                    if (i + 1 == tempCorrectionCodewords.length) {
                        tempCorrectionCodewords[i].value = 0;
                    } else {
                        tempCorrectionCodewords[i] = tempCorrectionCodewords[i + 1];
                    }
                }
            } else {
                for (let y: number = 1; y < length; y++) {
                    if (y < generationCodewords.length) {
                        tempCorrectionCodewords[y - 1].value =
                            tempCorrectionCodewords[y].value ^ this.getGF256Antilog((this.getGF256Log(firstCodeword) + generationCodewords[y]) % 255);
                    } else {
                        tempCorrectionCodewords[y - 1].value = tempCorrectionCodewords[y].value;
                    }
                }
            }
        }
        tempCorrectionCodewords = tempCorrectionCodewords.slice(0, generationCodewords.length - 1);
        for (let c: number = 0; c < tempCorrectionCodewords.length; c++) {
            let binaryString = tempCorrectionCodewords[c].value.toString(2).padStart(8, '0');
            for (let b: number = 0; b < binaryString.length; b++) {
                if (binaryString.charAt(b) === '1') correctionCodewords[c].modules[b].value = true;
                else if (binaryString.charAt(b) === '0') correctionCodewords[c].modules[b].value = false;
            }
        }
        console.debug('correctionCodewords', correctionCodewords);
    }

    static getCodewordsInterleaved (groups: CodewordGroup[]): ICodeword[] {
        let totalCodewordsCount: number = 0;
        let maxCodewordsPerBlockCount: number = 0;
        groups.forEach(group =>
            group.blocks.forEach(block => {
                totalCodewordsCount += block.codewords.length;
                if (maxCodewordsPerBlockCount < block.codewords.length) {
                    maxCodewordsPerBlockCount = block.codewords.length;
                }
            })
        );
        let codewords: ICodeword[] = [];
        let i: number = 0;
        for (let c: number = 0; c < maxCodewordsPerBlockCount; c++) {
            for (let g: number = 0; g < groups.length; g++) {
                for (let b: number = 0; b < groups[g].blocks.length; b++) {
                    if (c < groups[g].blocks[b].codewords.length) {
                        codewords[i] = groups[g].blocks[b].codewords[c];
                        i++;
                    }
                }
            }
        }
        let totalCorrectionCodewordsCount: number = 0;
        let maxCorrectionCodewordsPerBlockCount: number = 0;
        groups.forEach(group =>
            group.blocks.forEach(block => {
                totalCorrectionCodewordsCount += block.correctionCodewords.length;
                if (maxCorrectionCodewordsPerBlockCount < block.correctionCodewords.length) {
                    maxCorrectionCodewordsPerBlockCount = block.correctionCodewords.length;
                }
            })
        );
        let correctionCodewords: CorrectionCodeword[] = [];
        i = 0;
        for (let c: number = 0; c < maxCorrectionCodewordsPerBlockCount; c++) {
            for (let g: number = 0; g < groups.length; g++) {
                for (let b: number = 0; b < groups[g].blocks.length; b++) {
                    if (c < groups[g].blocks[b].correctionCodewords.length) {
                        correctionCodewords[i] = groups[g].blocks[b].correctionCodewords[c];
                        i++;
                    }
                }
            }
        }
        return [...codewords, ...correctionCodewords];
    }

    static genFormatInfo (correction: Correction): FormatModule[] {
        let correctionBinaryString: string = '';
        switch (correction) {
            case Correction.LOW:
                correctionBinaryString = '01';
                break;
            case Correction.MEDIUM:
                correctionBinaryString = '00';
                break;
            case Correction.QUARTILE:
                correctionBinaryString = '11';
                break;
            case Correction.HIGH:
                correctionBinaryString = '10';
                break;
        }
        let formatInfo: FormatModule[] = [];
        for (let i: number = 0; i < 15; i++) formatInfo[i] = new FormatModule([]);
        for (let i: number = 0; i < 8; i++) {
            let formatInfoBinaryString = correctionBinaryString + i.toString(2).padStart(3, '0');
            let correction: number = parseInt(correctionBinaryString + i.toString(2).padStart(3, '0'), 2) << 10;
            let generator: number = 1335;
            while (Math.floor(Math.log2(correction)) + 1 > 10) {
                correction = correction ^ (generator << (Math.floor(Math.log2(correction)) - 10));
            }
            formatInfoBinaryString = formatInfoBinaryString + correction.toString(2).padStart(10, '0');
            let formatInfoStr: string = (parseInt(formatInfoBinaryString, 2) ^ 21522).toString(2).padStart(15, '0');
            //console.debug('formatInfoStr', i, formatInfoStr);
            for (let j: number = 0; j < 15; j++) {
                if (formatInfoStr.charAt(j) === '1') formatInfo[j].masks[i] = true;
                else if (formatInfoStr.charAt(j) === '0') formatInfo[j].masks[i] = false;
            }
        }
        console.debug('formatInfo', formatInfo);
        return formatInfo;
    }

    static genVersionInfo (size: number): VersionModule[] {
        if (size < 7) {
            console.debug('versionInfo', '- not applicable');
            return undefined;
        }
        let correction: number = size << 12;
        let generator: number = 7973;
        while (Math.floor(Math.log2(correction)) + 1 > 12) {
            correction = correction ^ (generator << (Math.floor(Math.log2(correction)) + 1 - (Math.floor(Math.log2(generator)) + 1)));
        }
        let versionInfoStr: string = size.toString(2).padStart(6, '0') + correction.toString(2).padStart(12, '0');
        let versionInfo: VersionModule[] = [];
        for (let i: number = 0; i < 18; i++) {
            if (versionInfoStr.charAt(i) === '1') versionInfo[i] = new VersionModule(true);
            else if (versionInfoStr.charAt(i) === '0') versionInfo[i] = new VersionModule(false);
        }
        console.debug('versionInfo', versionInfo);
        return versionInfo;
    }
}
