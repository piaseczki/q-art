import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule} from '@angular/common/http'; 
import { ICodeword, StuffCodeword } from './models/codeword.model';
import { ImageLayer } from './models/layer.model';
import { EncodingProperty } from './models/encoding-property.model';
import { Correction, Mode, Project } from './models/project.model';
import { DrawService, Color, Coord } from './services/draw.service';
import { EncodeService } from './services/encode.service';
import { MatrixService } from './services/matrix.service';
import { Pixel } from './models/pixel.model';
import { BrowserQRCodeReader } from '@zxing/library';
import Decoder from '@zxing/library/esm/core/qrcode/decoder/Decoder';

@Component({
  selector: 'app-generator',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, HttpClientModule, CommonModule],
  templateUrl: './generator.component.html',
  styleUrl: './generator.component.css'
})

export class Generator implements OnInit {

    @ViewChild('canvas') canvas: ElementRef;
    @ViewChild('canvasHidden') canvasHidden: ElementRef;
    @ViewChild('validIndicatior') validIndicator: ElementRef;
    @ViewChild('coordIndicator') coordIndicator: ElementRef;
    @ViewChild('fileInput') fileInput: ElementRef;
    @ViewChild('dotSizeRange') dotSizeRange: ElementRef;

    encodingPropertiesCSV: string;
    ctx: CanvasRenderingContext2D;
    ctxHidden: CanvasRenderingContext2D;
    decoder: Decoder;
    browserCodeReader: BrowserQRCodeReader;
    project: Project;
    rotation: number;
    scale: number;
    drawMode: string;
    brushSize: number;
    selectedImage: number;
    isPreview: boolean;
    forceSafe: boolean;
    
    generatorForm = this.formBuilder.group({
        message: new FormControl<string>(null),
        mode: new FormControl<Mode>(null),
        correction: new FormControl<Correction>(null),
        size: new FormControl<number>(null),
        maskNo: new FormControl<number>(null),
        bezel: new FormControl<number>(null),
        scale: new FormControl<number>(null),
        rotation: new FormControl<number>(null),
        dotSize: new FormControl<number>(null),
        subdivision: new FormControl<number>(null),
        drawMode: new FormControl<string>(null),
        forceSafe: new FormControl<boolean>(null),
        brushSize: new FormControl<number>(null),
    });

    constructor(private formBuilder: FormBuilder, private httpClient: HttpClient) { }

    ngOnInit(): void {
        this.decoder = new Decoder();
        this.browserCodeReader = new BrowserQRCodeReader();
        this.rotation = 0;
        this.scale = 34;
        this.drawMode = 'black';
        this.brushSize = 0;
        this.forceSafe = false;

        this.project = new Project();
        this.project.message = 'HELLO WORLD';
        this.project.size = 1;
        this.project.generator = this;
        this.project.mode = Mode.ALPHANUMERIC;
        this.project.correction = Correction.LOW;
        this.project.maskNo = 1;
        this.project.bezel = 3;
        this.project.subdivision = 3;
        this.project.dotSize = 1;
        this.project.images = new Array<ImageLayer>();

        let img: ImageLayer = new ImageLayer("img1");
        //img.origin = new Coord(1 + 2/3, 1 + 2/3);
        //img.matrix = [[new ImageBit(true)]];
        // img.matrix.push([new ImageBit(true), new ImageBit(true), new ImageBit(true)]);
        // img.matrix.push([new ImageBit(true), new ImageBit(true), new ImageBit(true)]);
        // img.matrix.push([new ImageBit(true), new ImageBit(true), new ImageBit(true)]);

        this.project.images.push(img);

        this.generatorForm.get('message').setValue(this.project.message);
        this.generatorForm.get('size').setValue(this.project.size);
        this.generatorForm.get('mode').setValue(this.project.mode);
        this.generatorForm.get('correction').setValue(this.project.correction);
        this.generatorForm.get('maskNo').setValue(this.project.maskNo);
        this.generatorForm.get('bezel').setValue(this.project.bezel);
        this.generatorForm.get('subdivision').setValue(this.project.subdivision);
        this.generatorForm.get('dotSize').setValue(this.project.dotSize);
        this.generatorForm.get('scale').setValue(this.scale);
        this.generatorForm.get('rotation').setValue(this.rotation);
        this.generatorForm.get('drawMode').setValue(this.drawMode);
        this.generatorForm.get('brushSize').setValue(this.brushSize);
        this.generatorForm.get('forceSafe').setValue(this.forceSafe);
    }

    async ngAfterViewInit(): Promise<void> {
        this.encodingPropertiesCSV = await this.getEncodingProperties();
        this.project.encodingProperty = this.loadEncodingProperty(this.project.correction, this.project.size);
        this.ctx = (<HTMLCanvasElement>this.canvas.nativeElement).getContext('2d');
        this.ctxHidden = (<HTMLCanvasElement>this.canvasHidden.nativeElement).getContext('2d');
        this.generate();
        this.setSubdivision(this.project.subdivision);
        DrawService.manageDrawEvents(this);
    }

    private getEncodingProperties(): Promise<string> {
        return this.httpClient.get('assets/encoding-properties.csv', {responseType: 'text'}).toPromise().then(res => {
            console.debug(res);
            return res;
        });
    }

    generate(): void {
        let messageBinaryString: string = EncodeService.getMessageBinaryString(this.project.mode, this.project.size, this.project.message);
        let stuffBinaryString: string = EncodeService.getStuffBinaryString(
            messageBinaryString.length / 8,
            EncodeService.getTotalCodewordsCount(this.project.encodingProperty)
        );
        let codewords: ICodeword[] = EncodeService.getCodewords(messageBinaryString, stuffBinaryString);
        this.project.groups = EncodeService.getCodewordGroups(codewords, this.project.encodingProperty, this.project);
        let codewordsInterleaved: ICodeword[] = EncodeService.getCodewordsInterleaved(this.project.groups);
        console.debug('codewordsInterleaved', codewordsInterleaved);
        this.project.formatInfo = EncodeService.genFormatInfo(this.project.correction);
        this.project.versionInfo = EncodeService.genVersionInfo(this.project.size);
        this.project.matrix = MatrixService.initMatrix(this.project.size * 4 + 17, this.project.formatInfo, this.project.versionInfo, codewordsInterleaved);
        this.project.matrix = MatrixService.genBezel(this.project.matrix, this.project.size, this.project.bezel);
        let stuffCodewords: StuffCodeword[] = [];
        DrawService.collectCodewords(this, stuffCodewords);
        DrawService.regenCodewords(stuffCodewords);
        DrawService.redrawAll(this);
        this.printValid();
    }

    printValid(): void {
        if (this.validate()) {
            this.validIndicator.nativeElement.style.backgroundColor = Color.LIGHT_BLUE;
            this.validIndicator.nativeElement.innerText = ' VALID ';
        } else {
            this.validIndicator.nativeElement.style.backgroundColor = Color.LIGHT_RED;
            this.validIndicator.nativeElement.innerText = ' INVALID ';
        }
    }

    private validate(): boolean {
        let validationMatrix: boolean[][] = [];
        for (let x: number = this.project.bezel; x < this.project.matrix.length - this.project.bezel; x++) {
            validationMatrix[x - this.project.bezel] = [];
            for (let y: number = this.project.bezel; y < this.project.matrix[x].length - this.project.bezel; y++) {
                validationMatrix[x - this.project.bezel][y - this.project.bezel] = this.project.matrix[x][y].getImageValue(this, new Coord(x, y));
            }
        }
        let message: string = '';
        try {
            message = this.decoder.decodeBooleanArray(validationMatrix[0].map((col, i) => validationMatrix.map(row => row[i]))).getText();
        } catch (e) {
            //console.error(e);
            return false;
        } 
        return message === this.project.message;
    }

    // validateFull(): boolean {
    //     let image: ImageData = this.ctx.getImageData(0,0, this.ctx.canvas.clientWidth, this.ctx.canvas.clientHeight);
    //     image.src = this.ctx.canvas.toDataURL("image/jpeg");
    //     let message: string = '';
    //     console.error(this.browserCodeReader);
    //     try {
            
    //         message = this.browserCodeReader.decode(image).getText();
    //     } catch (e) {
    //         console.error(e);
    //         return false;
    //     }
    //     return message === this.project.input;
    // }

    printCoord(coord: Coord): void {
        let coordX: any = coord.x === undefined ? 'U' : coord.x;
        let coordY: any = coord.y === undefined ? 'U' : coord.y;
        this.coordIndicator.nativeElement.innerText = coordX.toFixed(2) + ' / ' + coordY.toFixed(2);
    }

    setCursor(cursor: string): void {
        this.canvas.nativeElement.style.cursor = cursor;
    }

    setMessage(message: string): void {
        this.project.message = message;
        this.generate();
    }

    setSize(size: number): void {
        this.moveImageOrigin(this.project.images, (this.project.size - size) * 2);
        this.project.size = size;
        this.project.encodingProperty = this.loadEncodingProperty(this.project.correction, this.project.size);
        this.generate();
    }

    setMode(mode: Mode): void {
        this.project.mode = mode;
        this.generate();
    }

    setCorrection(correctionVal: number): void {
        let correction: Correction;
        switch(correctionVal) {
            case 1 : correction = Correction.LOW; break;
            case 2 : correction = Correction.MEDIUM; break;
            case 3 : correction = Correction.QUARTILE; break;
            case 4 : correction = Correction.HIGH; 
        }
        this.project.correction = correction;
        this.project.encodingProperty = this.loadEncodingProperty(this.project.correction, this.project.size);
        this.generate();
    }

    setMask(maskNo: number): void {
        this.project.maskNo = maskNo;
        this.generate();
    }

    setScale(scale: number): void {
        this.scale = scale;
        DrawService.redrawAll(this);
    }

    setRotation(rotation: number): void {
        this.rotation = rotation;
        DrawService.redrawAll(this);
    }

    setBezel(bezel: number): void {
        this.moveImageOrigin(this.project.images, this.project.bezel - bezel);
        this.project.bezel = bezel;
        this.project.matrix = MatrixService.genBezel(this.project.matrix, this.project.size, this.project.bezel);
        DrawService.redrawAll(this);
    }

    setBrushSize(brushSize: number): void {
        this.brushSize = brushSize;
    }

    setSubdivision(subdivision: number): void {
        //this.project.dotSize = Math.ceil(subdivision / 2);
        this.setDotSize(1);
        if (subdivision < 3) {
            this.dotSizeRange.nativeElement.disabled = true;
        } else {
            this.dotSizeRange.nativeElement.disabled = false;
            this.dotSizeRange.nativeElement.value = this.project.dotSize;
            this.dotSizeRange.nativeElement.max = subdivision - 1;
        }
        this.project.subdivision = subdivision;
        let stuffCodewords: StuffCodeword[] = [];
        DrawService.collectCodewords(this, stuffCodewords);
        DrawService.regenCodewords(stuffCodewords);
        DrawService.redrawAll(this);
    }

    setDotSize(dotSize: number): void {
        this.project.dotSize = dotSize;
        DrawService.redrawAll(this);
    }

    setDrawMode(drawMode: string): void {
        this.drawMode = drawMode;
    }

    setIsPreview(isPreview: boolean): void {
        this.isPreview = isPreview;
        DrawService.redrawAll(this);
    }

    setForceSafe(forceSafe: boolean): void {
        this.forceSafe = forceSafe;
        DrawService.redrawAll(this);
    }

    onFileInputChange(e: Event): void {
        let file: File = (<HTMLInputElement>e.target).files[0];
        let img: HTMLImageElement = new Image();
        img.src = URL.createObjectURL(file);     
        img.onload = () => {
            this.ctxHidden.drawImage(img, 0, 0);
            let imgData: ImageData = this.ctxHidden.getImageData(0, 0, img.width, img.height);
            let image: ImageLayer = new ImageLayer(file.name.slice(0,-4));
            image.origin = new Coord(Math.ceil(-img.width / 2 / this.project.subdivision + this.project.matrix.length / 2), 
                                       Math.ceil(-img.height / 2 / this.project.subdivision + this.project.matrix[0].length / 2));
            image.matrix = new Array(img.width).fill(false).map(() => new Array(img.height));
            for (let x: number = 0, i: number = 0; x < img.height; x++) {
                for (let y: number = 0; y < img.width; y++, i += 4) {
                    image.matrix[y][x] = new Pixel();
                    if (imgData.data[i + 3] === 255) {
                        if (imgData.data[i] === 0 && 
                            imgData.data[i + 1] === 0 && 
                            imgData.data[i + 2] === 0) {
                            image.matrix[y][x].value = true;
                        } else if (imgData.data[i] === 255 && 
                            imgData.data[i + 1] === 255 && 
                            imgData.data[i + 2] === 255) {
                            image.matrix[y][x].value = false;
                        }
                    }
                }
            }
            this.project.images[0] = image;
            URL.revokeObjectURL(img.src);
            this.fileInput.nativeElement.value = '';
            let stuffCodewords: StuffCodeword[] = [];
            DrawService.collectCodewords(this, stuffCodewords);
            DrawService.regenCodewords(stuffCodewords);
            DrawService.redrawAll(this);
            this.printValid();
            console.debug("import image file " + file.name, imgData.data);
        }
    }

    loadEncodingProperty(correction: Correction, size: number): EncodingProperty {
        let property: EncodingProperty = new EncodingProperty();
        if(this.encodingPropertiesCSV === undefined) return property;
        let propsSplitLines: string[] = this.encodingPropertiesCSV.split('\n');
        let correctionVal: number;
        switch (correction) {
            case Correction.LOW:
                correctionVal = 0;
                break;
            case Correction.MEDIUM:
                correctionVal = 1;
                break;
            case Correction.QUARTILE:
                correctionVal = 2;
                break;
            case Correction.HIGH:
                correctionVal = 3;
                break;
        }
        let lineNo = (size - 1) * 4 + correctionVal;
        let propsLine = propsSplitLines[lineNo];
        let propsLineSplit = propsLine.split(',');
        property.errorCorrectionCodewordsPerBlock = parseInt(propsLineSplit[0]);
        property.blocksInGroup1 = parseInt(propsLineSplit[1]);
        property.dataCodewordsPerBlockInGroup1 = parseInt(propsLineSplit[2]);
        property.blocksInGroup2 = parseInt(propsLineSplit[3]);
        property.dataCodewordsPerBlockInGroup2 = parseInt(propsLineSplit[4]);
        return property;
    }

    private moveImageOrigin (images: ImageLayer[], distance: number) {
        if (images !== undefined && images[0] !== undefined && images[0].origin !== undefined) {
            images[0].origin.x -= distance;
            images[0].origin.y -= distance;
        }
    }
}
