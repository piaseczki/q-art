import { Generator } from '../generator.component';
import { Project } from './project.model'
import { CorrectionModule, MaskedModule, MessageModule, StuffModule } from './module.model';
import { Pixel } from './pixel.model';
import { EncodeService } from '../services/encode.service';
import { Coord, DrawService } from '../services/draw.service';

export interface ICodeword {

    value: number;
    modules: MaskedModule[];
}

export class MessageCodeword implements ICodeword {

    value: number;
    modules: MessageModule[];
}

export class StuffCodeword implements ICodeword {

    block: CodewordBlock;
    value: number;
    modules: StuffModule[];

    regenCodeword (): void {
        this.value = this.modules.map(
            module => <number>(module.getImageValueUnmasked(this.block.group.project.generator) ? 1 : 0)
            ).reduce((x, y) => (x << 1) | y);
    }
}

export class CorrectionCodeword implements ICodeword {

    value: number;
    modules: CorrectionModule[];

    draw (generator: Generator): void {
        this.modules.forEach(b => b.redraw(generator));
    }
}

export class CodewordGroup {

    project: Project;
    blocks: CodewordBlock[];

    regenCodewords (): void {
        this.blocks.forEach(b => b.regenCodewords());
    }

    regenCorrectionCodewords (): void {
        this.blocks.forEach(b => b.regenCorrectionCodewords());
    }
}

export class CodewordBlock {

    group: CodewordGroup;
    codewords: ICodeword[];
    correctionCodewords: CorrectionCodeword[];

    regenCodewords (): void {
        this.codewords.forEach(c => {
            if (c instanceof StuffCodeword) {
                (<StuffCodeword>c).regenCodeword();
            }
        });
        console.debug('regenCodewords', this.codewords);
    }

    regenCorrectionCodewords (): void {
        console.debug("regenCorrectionCodewords", this.codewords);
        EncodeService.getCorrectionCodewords(this.codewords, this.correctionCodewords);
        this.redrawCorrectionCodewords();
    }

    private redrawCorrectionCodewords(): void {
        this.correctionCodewords.forEach(c => c.draw(this.group.project.generator));
    }
}
