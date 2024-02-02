import {Correction} from "./project.model";

export interface IEncodingProperty {
  size?: number;
  correction?: Correction;
  numericCharacterCapacity?: number;
  alphanumericCharacterCapacity?: number;
  byteCharacterCapacity?: number;
  kanjiCharacterCapacity?: number;
  errorCorrectionCodewordsPerBlock?: number;
  blocksInGroup1?: number;
  dataCodewordsPerBlockInGroup1?: number;
  blocksInGroup2?: number;
  dataCodewordsPerBlockInGroup2?: number;
}

export class EncodingProperty implements IEncodingProperty{
  constructor(
    public characterCapacity?: number,
    public errorCorrectionCodewordsPerBlock?: number,
    public blocksInGroup1?: number,
    public dataCodewordsPerBlockInGroup1?: number,
    public blocksInGroup2?: number,
    public dataCodewordsPerBlockInGroup2?: number
  ) {}
}