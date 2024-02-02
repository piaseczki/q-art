import { EncodingProperty } from './encoding-property.model';
import { CodewordGroup } from './codeword.model';
import { ILayer, ImageLayer } from '../models/layer.model';
import { Module, FormatModule, VersionModule } from './module.model';
import { Generator } from '../generator.component';

export const enum Encoding {
    VOID_SCRAMBLE = 'SCRAMBLE_STUFF'
}

export const enum InputType {
    TEXT = 'TEXT',
    URL = 'URL',
    EMAIL = 'EMAIL',
    TELEPHONE_NO = 'TELEPHONE_NO',
    GEOPOSITION = 'GEOPOSITION',
    BANK_ACCOUNT = 'BANK_ACCOUNT'
}

export const enum Mode {
    NUMERIC = 'NUMERIC',
    ALPHANUMERIC = 'ALPHANUMERIC',
    BYTE = 'BYTE',
    KANJI = 'KANJI'
}

export const enum Correction {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    QUARTILE = 'QUARTILE',
    HIGH = 'HIGH'
}

export const enum Status {
    ON = 'ON',
    OFF = 'OFF',
    DELETED = 'DELETED'
}

export const enum Access {
    PRIVATE = 'PRIVATE',
    PUBLIC = 'PUBLIC'
}

export class Project {
    generator: Generator;
    name: string;
    description: string;
    encoding: Encoding;
    inputType: InputType;
    mode: Mode;
    correction: Correction;
    status: Status;
    acces: Access;
    message: string;
    size: number;
    maskNo: number;
    bezel: number;
    subdivision: number;
    dotSize: number;
    alpha: number;
    savedAt: number;
    createdAt: number;
    encodingProperty: EncodingProperty;
    groups: CodewordGroup[];
    formatInfo: FormatModule[];
    versionInfo: VersionModule[];
    matrix: Module[][];
    images: ImageLayer[];
    layers: ILayer[];

    regenCodewords() {
        this.groups.forEach(g => g.regenCodewords());
    }

    regenCorrectionCodewords() {
        this.groups.forEach(g => g.regenCorrectionCodewords());
    }
}